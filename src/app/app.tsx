import * as Rete from "rete";
import * as Data from './data/attributes';
import { sockets, addSocket, anySocket } from "./sockets/sockets";
import * as BasicComponents from "./components/basic";
import { ComponentDict } from "./components/dictionary";
import { ComponentList } from "./components/list";
import { ComponentDynamic, addType } from './components/dynamic';

import ReactRenderPlugin from 'rete-react-render-plugin';
import AreaPlugin from 'rete-area-plugin';
import ConnectionPlugin from 'rete-connection-plugin';
import ContextMenuPlugin from 'rete-context-menu-plugin';
import HistoryPlugin from 'rete-history-plugin';
import { ReteReactComponent as ReteComponent } from "rete-react-render-plugin";
import { JSONObject, JSONValue } from "./jsonschema";


const AdvancedSelectionPlugin = require('@mbraun/rete-advanced-selection-plugin').default;
const SelectionPlugin: any = require('rete-drag-selection-plugin').default; 


const sampleDefs = {
  "RFMvAvg": {
    "title": "RFMvAvg",
    "description": "moving average of parent values",
    "type": "object",
    "additionalProperties": false,
    "isClassDefinition": true,
    "required": ["cache_count"],
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
  },
  'sample_dict': {
    "title": "hello",
    "required": "children",
    "properties": {
      "a": {
        "type": "object",
        "additionalProperties": {
          "type": "object",
          "additionalProperties": {
            "type": "integer"
          }
        }
      }
    }
  },
  "a": {
    "title": "A",
    "type": "object",
    "properties": {
      "a": {
        "title": "A",
        "anyOf": [
          {
            "type": "object",
            "additionalProperties": {
              "type": "integer"
            }
          },
          {
            "type": "object",
            "additionalProperties": {
              "type": "object",
              "additionalProperties": {
                "type": "string"
              }
            }
          }
        ]
      }
    },
    "required": [
      "a"
    ]
  },
  "C": {
    "title": "C",
    "type": "object",
    "properties": {
      "a": {
        "title": "A",
        "type": "object",
        "additionalProperties": {
          "anyOf": [
            {
              "type": "integer"
            },
            {
              "type": "string"
            }
          ]
        }
      },
      "b": {
        "title": "B",
        "type": "integer"
      }
    },
    "required": [
      "a",
      "b"
    ]
  },
  "e": {
    "title": "E",
    "type": "object",
    "properties": {
      "a": {
        "title": "A",
        "anyOf": [
          {
            "type": "object",
            "additionalProperties": {
              "anyOf": [
                {
                  "type": "integer"
                },
                {
                  "type": "string"
                }
              ]
            }
          },
          {
            "type": "object",
            "additionalProperties": {
              "type": "string"
            }
          },
          {
            "type": "integer"
          }
        ]
      },
      "b": {
        "title": "B",
        "type": "integer"
      }
    },
    "required": [
      "a",
      "b"
    ]
  },
  "hello": {
    "title": "Hello",
    "type": "object",
    "properties": {
        "name": {
            "title": "Name",
            "type": "string"
        },
        "another": {
            "title": "Another",
            "type": "string"
        },
        "pls": {
            "title": "Pls",
            "default": "hello",
            "type": "string"
        },
        "count": {
            "title": "Count",
            "type": "integer"
        },
        "seven": {
            "title": "Seven",
            "default": 7,
            "type": "integer"
        },
        "d": {
            "title": "D",
            "type": "object"
        }
    },
    "required": [
        "name",
        "count"
    ]
  }
}

export function init(schema: JSONObject | null, editor: Rete.NodeEditor) {
  
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

  // combine each socket with the "any" socket
  sockets.forEach(s => anySocket.combineWith(s.socket));

  // register each component to engine and editor
  components.forEach((c) => {
    editor.register(c);
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

export async function createEditor(container: HTMLElement) {
  
  // TODO - shift drag select not working
  console.log("creating editor...");
  var editor = new Rete.NodeEditor("demo@0.1.0", container);
  editor.use(ReactRenderPlugin);
  editor.use(AreaPlugin, {
    background: true, 
    snap: true,
    scaleExtent: {
      min: 0.5,
      max: 1,
    },
    translateExtent: { 
      width: 5000, 
      height: 4000 
    },
  });
  editor.use(ConnectionPlugin);
  editor.use(ContextMenuPlugin, {searchBar: true});
  editor.use(HistoryPlugin);
  editor.use(SelectionPlugin, { enabled: true });
  editor.use(AdvancedSelectionPlugin);

  init(sampleDefs, editor);

  editor.on('process', () => {
    console.log('editor process');
  });

  editor.on(
    ["process", "nodecreated", "noderemoved", "connectioncreated", "connectionremoved"],
    async () => {
      console.log("editor change");
      // await engine.abort();
      // await engine.process(editor.toJSON());
    }
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
