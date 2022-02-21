import * as Rete from "rete";
import * as Data from "./data/attributes";
import * as Sockets from "./sockets/sockets";
import * as Schema from "./jsonschema";
import { ReteReactComponent as ReteComponent } from "rete-react-render-plugin";
import { JSONValue } from "./jsonschema";
import "./styles.css";
import { DisplayBase, getOutput } from "./components/display";
import { MyComponent } from "./components/component";
import { BaseComponent, getConnectedData } from "./components/base";
import { SomeJSONSchema } from "ajv/dist/types/json-schema";
import { JsonStringPointer, JsonPointer } from "json-ptr";

// const addType = (newType: string) => componentsList.push(newType);

function getDefinitions(
  schema: SomeJSONSchema,
  locations: JsonStringPointer[]
): Map<string, SomeJSONSchema> {
  let namedDefs: Map<string, SomeJSONSchema> = new Map();
  locations.forEach((loc) => {
    let defs = JsonPointer.get(schema, loc);
    if (defs && typeof defs === "object" && !Array.isArray(defs)) {
      Object.entries(defs).forEach(([k, v]) => {
        let obj = Schema.getObject(v);
        if (obj && typeof obj["type"] === "string") {
          if (
            [
              "string",
              "number",
              "integer",
              "boolean",
              "array",
              "object",
            ].includes(obj["type"])
          ) {
            if(typeof obj["title"] === "string" && !namedDefs.has(obj["title"])) {
              namedDefs.set(obj["title"], obj as SomeJSONSchema);
              obj["namedIdentifier"] = obj["title"];
            } else if(!namedDefs.has(k)) {
              namedDefs.set(k, obj as SomeJSONSchema);
              obj["namedIdentifier"] = k;
            }
            
            
          }
        }
      });
    }
  });
  return namedDefs;
}

export function init(
  schema: SomeJSONSchema | null,
  editor: Rete.NodeEditor,
  engine: Rete.Engine,
  namedLocations: JsonStringPointer[] = ["#/definitions", "#/$defs"]
) {
  let namedDefs: Map<string, SomeJSONSchema> = new Map();
  if (schema) {
    namedDefs = getDefinitions(schema, namedLocations);
  }

  const sampleSchema: SomeJSONSchema = {
    type: "object",
    properties: {
      firstName: { type: "number" },
    },
    required: [],
  };

  // create stock components
  var components: Array<ReteComponent> = [
    new MyComponent(
      "Text",
      Schema.stringSchema,
      Sockets.addSocket("Text").socket
    ),
    new MyComponent(
      "Number",
      Schema.numberSchema,
      Sockets.addSocket("Number").socket
    ),
    new MyComponent(
      "Boolean",
      Schema.boolSchema,
      Sockets.addSocket("Boolean").socket
    ),
    new MyComponent(
      "List",
      Schema.arraySchema,
      Sockets.addSocket("List").socket
    ),
    new MyComponent("Object", sampleSchema, Sockets.addSocket("Object").socket),
  ];

  // if(schema) {
  //   // add to socket and type lists for each schema definition
  //   // n.b. this must be done before comopnent creation so that they dont try to access each others sockets before creation!
  //   Object.keys(schema).forEach(key => {
  //     addSocket(key);
  //   });

  //   // create dynamic components for each schema definition
  //   Object.entries(schema).forEach(([key, spec]) => components.push(new DynamicComponent(key, spec)));
  // }

  // add root component
  class RootComponent extends MyComponent {
    addParent(node: Rete.Node): void {}
    internalBuilder(node: Rete.Node, editor: Rete.NodeEditor) {
      Data.getGeneralAttributes(node).componentSchema = {
        type: "object",
        properties: {
          data: this.schema as any,
        },
        required: ["data"],
        additionalProperties: false,
      };
      super.internalBuilder(node, editor);
    }
    getData(node: Rete.Node, editor: Rete.NodeEditor) {
      return super.getData(node, editor)["data"] ?? null;
    }
  }
  components.push(new RootComponent("root", sampleSchema, null));

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
