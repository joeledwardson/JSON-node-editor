import * as Rete from "rete";
import * as Data from "./data/attributes";
import * as Sockets from "./sockets/sockets";
import * as Schema from "./jsonschema";
import { ReteReactComponent as ReteComponent } from "rete-react-render-plugin";
import { JSONValue, JSONTypeMap, MyJSONSchema } from "./jsonschema";
import "./styles/styles.scss";
import "./app.scss"
import { RootComponent, SchemaComponent } from "./components/component";
import { BaseComponent, getConnectedData } from "./components/base";
import { JsonStringPointer, JsonPointer } from "json-ptr";
import { JSONSchema7 } from "json-schema";

/** process named identifier to avoid conflicts with existing nodes */
function processName(name: string): string {
  return `#${name}`;
}

/** get map of node name to schema definition from specified locations */
function getDefinitions(
  schema: Schema.MyJSONSchema,
  locations: JsonStringPointer[]
): Map<string, Schema.MyJSONSchema> {
  let namedDefs: Map<string, Schema.MyJSONSchema> = new Map();

  const processEntry = (entry: MyJSONSchema, key: string) => {
    let typ = entry["type"];
    if (typeof typ === "string") {
      // check type is valid
      if (!["string", "number", "integer", "boolean", "array", "object"].includes(typ)) {
        return;
      }
      let done = false;
      let name = "";
      
      // try to use "title" property for node name
      let title = entry["title"];
      if (typeof title === "string") {
        name = processName(title);
        if(!namedDefs.has(name)) {
          // if title does not exist in map then use it
          namedDefs.set(name, entry);
          entry.customNodeIdentifier = name;
          done = true;
        }
      }

      // if "title" did not work, try to use key instead
      if(!done) {
        name = processName(key);
        if (!namedDefs.has(name)) {
          // if key does not use in map then use it
          namedDefs.set(name, entry);
          entry.customNodeIdentifier = name;
        }
      }
    }
  };

  locations.forEach((loc) => {
    // get location in schema
    let defs = JsonPointer.get(schema, loc);
    if (defs && typeof defs === "object" && !Array.isArray(defs)) {
      // location is a valid object
      Object.entries(defs).forEach(([k, v]) => {
        if(v && typeof v === "object" && !Array.isArray(v)) {
          // definition is a valid object, process it
          processEntry(v, k);
        }
      });
    }
  });
  return namedDefs;
}


export function init(
  schema: JSONSchema7 | null,
  editor: Rete.NodeEditor,
  engine: Rete.Engine,
  namedLocations: JsonStringPointer[] = ["#/definitions", "#/$defs"]
) {
  let namedDefs: Map<string, Schema.MyJSONSchema> = new Map();
  if (schema) {
    namedDefs = getDefinitions(schema, namedLocations);
  }

  // create stock components
  const newBaseComponent = (typ: Schema.MyTypeName, schema: MyJSONSchema) => new SchemaComponent(
    JSONTypeMap[typ],
    schema,
    Sockets.addSocket(JSONTypeMap[typ]).socket,
    true
  )
  var components: Array<ReteComponent> = [
    newBaseComponent("string", Schema.stringSchema),
    newBaseComponent("number", Schema.numberSchema),
    newBaseComponent("boolean", Schema.boolSchema),
    newBaseComponent("array", Schema.arraySchema),
    newBaseComponent("object", Schema.objectSchema)
  ];

  // add named components
  namedDefs.forEach((namedSchema, key) => {
    let socket = Sockets.addSocket(key).socket;
    components.push(new SchemaComponent(key, namedSchema, socket, false));
  })

  // add root component
  components.push(new RootComponent("root", schema ?? Schema.anySchema, null, false));

  // register each component to engine and editor
  components.forEach((c) => {
    editor.register(c);
    engine.register(c);
  });

  const updateConnectionNode = (conn: Rete.Connection) => {
    if(conn.input.node) {
      let component = editor.getComponent(conn.input.node.name);
      if(component instanceof SchemaComponent) {
        if(component.allowOverride) {
          component.internalBuilder(conn.input.node, editor);
          conn.input.node.update();
        }
      }
    }
  } 

  editor.on(["connectioncreated"], async (connection: Rete.Connection) => {
    updateConnectionNode(connection);
  });

  editor.on(["connectionremoved"], async (connection: Rete.Connection) => {
    updateConnectionNode(connection);
  });

  // on connection added
  editor.on(
    ["connectionremove", "connectionremoved", "connectioncreated"],
    async (connection: Rete.Connection) =>
      setTimeout(async () => {
        console.log("connection processing");
        // await engine.abort();
        [connection.input.node, connection.output.node].forEach(
          (node) => node && editor?.view.updateConnections({ node })
        );
      }, 10)
  );
}

export function getJSONData(editor: Rete.NodeEditor): JSONValue {
  let rootNode = editor.nodes.find((n) => n.name == "root");
  if (rootNode) {
    let rootComponent = editor.components.get("root") as BaseComponent;
    if (rootComponent.getData) {
      return rootComponent.getData(rootNode, editor);
    }
  }
  return null;
}
