import * as Rete from "rete";
import * as Data from './data/attributes';
import * as Sockets from "./sockets/sockets";
import { ReteReactComponent as ReteComponent } from "rete-react-render-plugin";
import { getJSONSocket, isObject, JSONObject, JSONValue } from "./jsonschema";
import './styles.css';
import { DisplayBase } from "./components/display";
import { MyComponent } from './components/component';
import { BaseComponent, getConnectedData } from "./components/base";


// const addType = (newType: string) => componentsList.push(newType);


export function init(schema: JSONObject | null, editor: Rete.NodeEditor, engine: Rete.Engine) {
  
  // create stock components
  var components: Array<ReteComponent> = [
    new MyComponent("Text", {type: "string"}, Sockets.stringSocket),
    new MyComponent("Number", {type: "number"}, Sockets.numberSocket),
    new MyComponent("Boolean", {type: "boolean"}, Sockets.boolSocket),
    new MyComponent("List", {type: "array"}, Sockets.listSocket),
    new MyComponent("Object", {type: "object", "properties": {
      "firstName": {
        "type": "string",
        "description": "The person's first name."
      },
      "lastName": {
        "type": "string",
        "description": "The person's last name."
      },
      "age": {
        "description": "Age in years which must be equal to or greater than zero.",
        "type": "integer",
        "minimum": 0
      }
    }, "required": ["age"]}, Sockets.objectSocket)
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
  class RootComponent extends BaseComponent {
    data = {component: DisplayBase}
    constructor() {
      super('root');
    }
    internalBuilder(node: Rete.Node, editor: Rete.NodeEditor) {
      let socket = getJSONSocket(schema);
      if(socket) {
        node.addOutput(new Rete.Output("data", "Data", socket));
      }
      // set type definition to be read by any child elements
      Data.getOutputMap(node).push({
        outputKey: "data",
        outputSchema: schema
      })
    }
    getData(node: Rete.Node, editor: Rete.NodeEditor) {
      if(node.outputs.get("data").hasConnection()) {
        return getConnectedData(node.outputs.get("data"), editor);
      } else {
        return null;
      }
    }
  }
  components.push(new RootComponent());

  // combine each socket with the "any" socket
  Sockets.sockets.forEach(s => Sockets.anySocket.combineWith(s.socket));

  // register each component to engine and editor
  components.forEach((c) => {
    editor.register(c);
    engine.register(c);
  });


  editor.on(
    ["connectioncreated"],
    async (connection: Rete.Connection) => {
      // await engine.abort();

      // run connection created processor on output node if function is defined
      let oFuncs = Data.nodeConnectionFuns[connection.output.node.name];
      if(oFuncs && oFuncs.created) {
        oFuncs.created(connection, editor, false);
      }

      // run connection created processor on input node if function is defined
      let iFuncs = Data.nodeConnectionFuns[connection.input.node.name];
      if(iFuncs && iFuncs.created) {
        iFuncs.created(connection, editor, true);
      }

    }
  )

  editor.on(
    ["connectionremoved"],
    async (connection: Rete.Connection) => {
      // await engine.abort();

      // run connection removed processor on output node if function is defined
      let oFuncs = Data.nodeConnectionFuns[connection.output.node.name];
      if(oFuncs && oFuncs.removed) {
        oFuncs.removed(connection, editor, false);
      }

      // run connection created processor on input node if function is defined
      let iFuncs = Data.nodeConnectionFuns[connection.input.node.name];
      if(iFuncs && iFuncs.removed) {
        iFuncs.removed(connection, editor, true);
      }
    }
  );

  // on connection added
  editor.on(["connectionremove", "connectionremoved", "connectioncreated"], async(connection: Rete.Connection) => 
    setTimeout(
      async () => {
        console.log("connection processing");
        // await engine.abort();
        [connection.input.node, connection.output.node].forEach(node => node && editor?.view.updateConnections({node}));
      },
      10
    )
  );

}



export function getJSONData(editor: Rete.NodeEditor): JSONValue {
  let rootNode = editor.nodes.find(n => n.name=="root")
  if(rootNode) {
    let rootComponent = editor.components.get("root") as BaseComponent; 
    if(rootComponent.getData) {
      return rootComponent.getData(rootNode, editor);
    }
  }
  return null;        
}