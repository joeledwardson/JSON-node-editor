import * as Rete from "rete";
import * as Data from "./data/attributes";
import * as Sockets from "./sockets/sockets";
import * as Schema from "./jsonschema";
import { ReteReactComponent as ReteComponent } from "rete-react-render-plugin";
import { JSONValue, JSONTypeMap, MyJSONSchema } from "./jsonschema";
import "./styles.css";
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
  var components: Array<ReteComponent> = [
    new SchemaComponent(
      JSONTypeMap["string"],
      Schema.stringSchema,
      Sockets.addSocket(JSONTypeMap["string"]).socket
    ),
    new SchemaComponent(
      JSONTypeMap["number"],
      Schema.numberSchema,
      Sockets.addSocket(JSONTypeMap["number"]).socket
    ),
    new SchemaComponent(
      JSONTypeMap["boolean"],
      Schema.boolSchema,
      Sockets.addSocket(JSONTypeMap["boolean"]).socket
    ),
    new SchemaComponent(
      JSONTypeMap["array"],
      Schema.arraySchema,
      Sockets.addSocket(JSONTypeMap["array"]).socket
    ),
    new SchemaComponent(
      JSONTypeMap["object"],
      Schema.objectSchema, 
      Sockets.addSocket(JSONTypeMap["object"]).socket
    ),
  ];

  // add named components
  namedDefs.forEach((namedSchema, key) => {
    let socket = Sockets.addSocket(key).socket;
    components.push(new SchemaComponent(key, namedSchema, socket));
  })

  // add root component
  components.push(new RootComponent("root", schema ?? Schema.anySchema, null));

  // combine each socket with the "any" socket
  Sockets.sockets.forEach((s) => Sockets.anySocket.combineWith(s.socket));

  // register each component to engine and editor
  components.forEach((c) => {
    editor.register(c);
    engine.register(c);
  });

  editor.on(["connectioncreated"], async (connection: Rete.Connection) => {
    // await engine.abort();
    // // run connection created processor on output node if function is defined
    // let oFuncs = Data.nodeConnectionFuns[connection.output.node.name];
    // if (oFuncs && oFuncs.created) {
    //   oFuncs.created(connection, editor, false);
    // }
    // // run connection created processor on input node if function is defined
    // let iFuncs = Data.nodeConnectionFuns[connection.input.node.name];
    // if (iFuncs && iFuncs.created) {
    //   iFuncs.created(connection, editor, true);
    // }
  });

  editor.on(["connectionremoved"], async (connection: Rete.Connection) => {
    // await engine.abort();
    // // run connection removed processor on output node if function is defined
    // let oFuncs = Data.nodeConnectionFuns[connection.output.node.name];
    // if (oFuncs && oFuncs.removed) {
    //   oFuncs.removed(connection, editor, false);
    // }
    // // run connection created processor on input node if function is defined
    // let iFuncs = Data.nodeConnectionFuns[connection.input.node.name];
    // if (iFuncs && iFuncs.removed) {
    //   iFuncs.removed(connection, editor, true);
    // }
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
