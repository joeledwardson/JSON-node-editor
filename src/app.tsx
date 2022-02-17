import * as Rete from "rete";
import * as Data from "./data/attributes";
import * as Sockets from "./sockets/sockets";
import { ReteReactComponent as ReteComponent } from "rete-react-render-plugin";
import { JSONValue } from "./jsonschema";
import "./styles.css";
import { DisplayBase } from "./components/display";
import { MyComponent } from "./components/component";
import { BaseComponent, getConnectedData } from "./components/base";
import { SomeJSONSchema } from "ajv/dist/types/json-schema";

// const addType = (newType: string) => componentsList.push(newType);

export function init(
  schema: SomeJSONSchema | null,
  editor: Rete.NodeEditor,
  engine: Rete.Engine
) {
  const stringSchema: SomeJSONSchema = { type: "string" };
  // const nullSchema: SomeJSONSchema = {type: ""}
  const numberSchema: SomeJSONSchema = { type: "number" };
  const objectSchema: SomeJSONSchema = { type: "object", required: [] };
  const intSchema: SomeJSONSchema = { type: "integer" };
  const boolSchema: SomeJSONSchema = { type: "boolean" };
  const arraySchema: SomeJSONSchema = { type: "array", items: { anyOf: [] } };
  arraySchema.items.anyOf = [
    { type: "null" },
    numberSchema,
    objectSchema,
    intSchema,
    boolSchema,
    arraySchema,
  ];

  const sampleSchema: SomeJSONSchema = {
    type: "object",
    properties: {
      firstName: {type: "number"},
    },
    required: [],
    additionalProperties: false,
  };

  // create stock components
  var components: Array<ReteComponent> = [
    new MyComponent("Text", stringSchema, Sockets.addSocket("Text").socket),
    new MyComponent("Number", numberSchema, Sockets.addSocket("Number").socket),
    new MyComponent("Boolean", boolSchema, Sockets.addSocket("Boolean").socket),
    new MyComponent("List", arraySchema, Sockets.addSocket("List").socket),
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
          data: this.schema as any
        },
        required: ["data"],
        additionalProperties: false,
      }
      Data.getGeneralAttributes(node).componentSchema = {
        type: "object",
        properties: {
          foo: {type: "integer"},
          bar: {type: "string", nullable: true}
        },
        required: ["foo"],
        additionalProperties: false
      }
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
