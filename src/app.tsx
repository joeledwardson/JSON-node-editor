import * as Rete from "rete";
import * as Data from './data/attributes';
import { sockets, addSocket, anySocket } from "./sockets/sockets";
import * as BasicComponents from "./components/basic";
import { ComponentDict } from "./components/dictionary";
import { ComponentList } from "./components/list";
import { ComponentDynamic, addType } from './components/dynamic';
import { ReteReactComponent as ReteComponent } from "rete-react-render-plugin";
import { getJSONSocket, getJSONSocket2, isObject, JSONObject, JSONValue } from "./jsonschema";
import './styles.css';
import { DisplayBase } from "./display";


export function init(schema: JSONObject | null, editor: Rete.NodeEditor, engine: Rete.Engine) {
  
  // create stock components
  var components: Array<ReteComponent> = [
    new BasicComponents.ComponentNum(), 
    new BasicComponents.ComponentText(),
    new BasicComponents.ComponentBool(),
    new BasicComponents.ComponentNull(),
    new ComponentList(),
    new ComponentDict(),
  ];

  if(schema) {
    // add to socket and type lists for each schema definition
    Object.keys(schema).forEach(key => {
      addSocket(key);
      addType(key);
    });

    // create dynamic components for each schema definition
    Object.entries(schema).forEach(([key, spec]) => components.push(new ComponentDynamic(key, spec)));    
  }

  // add root component
  class RootComponent extends BasicComponents.ComponentBase {
    data = {component: DisplayBase}
    constructor() {
      super('root');
    }
    _builder(node: Rete.Node, editor: Rete.NodeEditor) {
      let socket = getJSONSocket(schema);
      node.addOutput(new Rete.Output("data", "Data", socket));
      // set type definition to be read by any child elements
      Data.getOutputMap(node).push({
        outputKey: "data",
        schema: schema
      })
    }
  }
  components.push(new RootComponent());

  // combine each socket with the "any" socket
  sockets.forEach(s => anySocket.combineWith(s.socket));

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
