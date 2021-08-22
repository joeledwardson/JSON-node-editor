import * as Rete from "rete";
import * as Data from './data/component';
import { sockets, addSocket, anySocket } from "./sockets/sockets";
import * as BasicComponents from "./components/basic";
import * as AdvancedComponents from './components/advanced';
import { ComponentDynamic, addType } from './components/dynamic';
import { VariableType } from "./data/component";

import ReactRenderPlugin from 'rete-react-render-plugin';
import AreaPlugin from 'rete-area-plugin';
import ConnectionPlugin from 'rete-connection-plugin';
import ContextMenuPlugin from 'rete-context-menu-plugin';
import HistoryPlugin from 'rete-history-plugin';
import { ReteComponent } from "../rete/component";


const AdvancedSelectionPlugin = require('@mbraun/rete-advanced-selection-plugin').default;
const SelectionPlugin: any = require('rete-drag-selection-plugin').default; 


const sampleDefs = {
  "RFMvAvg": {
    "title": "RFMvAvg",
    "description": "moving average of parent values",
    "type": "object",
    "additionalProperties": false,
    "isClassDefinition": true,
    "properties": {
      "custom_ftr_identifier": {
        "title": "Custom Ftr Identifier",
        "type": "string"
      },
      "cache_count": {
        "title": "Cache Count",
        "description": "number of caching points",
        "default": 2,
        "type": "integer"
      },
      "cache_secs": {
        "title": "Cache Secs",
        "type": "number"
      },
      "cache_insidewindow": {
        "title": "Cache Insidewindow",
        "type": "boolean"
      }
    }
  }
}


export async function createEditor(container: HTMLElement) {
  // let objectSpecs = new Map<string, Map<string, VariableType>>();
  // objectSpecs.set('objA', new Map([
  //   [
  //     'sub_features_config',
  //     {
  //       types: ['Dictionary', 'None'],
  //       default: 'None',
  //       dictTypes: ['Text']
  //     }
  //   ], [
  //     'ftr_identifier',
  //     {
  //       types: ['Text'],
  //       default: 'pls',
  //     }
  //   ], [
  //     'cache_count',
  //     {
  //       types: ['Number'],
  //       default: 2
  //     }
  //   ], [
  //     'cache_secs',
  //     {
  //       types: ['Number', 'None'],
  //       default: 3
  //     }
  //   ]
  // ]));

  Object.keys(sampleDefs).forEach(key => {
    addSocket(key);
    addType(key);
  });
  sockets.forEach(s => anySocket.combineWith(s.socket));
  

  var components: Array<ReteComponent> = [
    // new MyComponents.ComponentAdd(), 
    // new MyComponents.ComponentDictKey(),
    // new MyComponents.ComponentListItem(),
    new BasicComponents.ComponentNum(), 
    new BasicComponents.ComponentText(),
    new BasicComponents.ComponentBool(),
    new BasicComponents.ComponentNull(),
    new AdvancedComponents.ComponentList(),
    new AdvancedComponents.ComponentDict(),
    new AdvancedComponents.ComponentFunctionBlock(),
    new AdvancedComponents.ComponentFunctionVar()
  ];
  Object.entries(sampleDefs).forEach(([key, spec]) => components.push(new ComponentDynamic(key, spec)));
  // objectSpecs.forEach((spec, key) => components.push(new ComponentDynamic(key, spec)));

  // TODO - shift drag select not working
  console.log("creating editor...");
  var editor = new Rete.NodeEditor("demo@0.1.0", container);
  editor.use(ReactRenderPlugin);
  editor.use(AreaPlugin);
  editor.use(ConnectionPlugin);
  editor.use(ContextMenuPlugin);
  editor.use(HistoryPlugin);
  editor.use(SelectionPlugin, { enabled: true });
  editor.use(AdvancedSelectionPlugin);

  var engine = new Rete.Engine("demo@0.1.0");

  components.map((c) => {
    editor.register(c);
    engine.register(c);
  });

  var n1 = await components[0].createNode({ num: 2 });
  var n2 = await components[0].createNode({ num: 3 });
  // var add = await components[1].createNode();
  var o = await components[1].createNode({});
  var dk = await components[2].createNode({});

  n1.position = [80, 200];
  n2.position = [80, 400];
  o.position = [-200, 200];

  editor.addNode(n1);
  editor.addNode(n2);
  // editor.addNode(add);
  editor.addNode(o);
  editor.addNode(dk);

  // function editorConnect(o: string, i: string): void  {
  //   const o1 = n1.outputs.get(o);
  //   const i1 = add.inputs.get(i);
  //   o1 && i1 && editor.connect(o1, i1);
  // }

  // editorConnect("num", "num1");
  // editorConnect("num", "num2");

  editor.on(
    ["connectioncreated"],
    async (connection: Rete.Connection) => {
      await engine.abort();
      [connection.input.node, connection.output.node].forEach(n => {
        if(n && Data.getConnectionFuncs(n) && Data.getConnectionFuncs(n)["created"]) {
          Data.getConnectionFuncs(n)["created"](connection);
        }
      })
    }
  )

  editor.on(
    ["connectionremoved"],
    async (connection: Rete.Connection) => {
      await engine.abort();
      [connection.input.node, connection.output.node].forEach(n => {
        if(n && Data.getConnectionFuncs(n) && Data.getConnectionFuncs(n)["removed"]) {
          Data.getConnectionFuncs(n)["removed"](connection);
        }
      })
    }
  )


  editor.on(
    ["process", "nodecreated", "noderemoved", "connectioncreated", "connectionremoved"],
    async () => {
      console.log("process");
      await engine.abort();
      await engine.process(editor.toJSON());
    }
  );

  // on connection added
  editor.on(["connectionremove", "connectionremoved", "connectioncreated"], async(connection: Rete.Connection) => 
    setTimeout(
      async () => {
        console.log("connection processing");
        await engine.abort();
        [connection.input.node, connection.output.node].forEach(node => node && editor?.view.updateConnections({node}));
      },
      10
    )
  );

  editor.on('error', (args: string | Error) => {
    console.log(`foun an error: ${args}`);
    return null;
  })

  // disable zoom on double click
  editor.on('zoom', ({ source }) => {
      return source !== 'dblclick';
  });

  editor.view.resize();
  editor.trigger("process");
  AreaPlugin.zoomAt(editor, editor.nodes);
  console.log("finished creating editor...");

  return editor;
}
