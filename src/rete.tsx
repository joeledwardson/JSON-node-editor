import Rete from "rete";
import { ComponentNum, ComponentAdd, ComponentDict, ComponentDictKey } from "./mycomponents";
import ReactRenderPlugin from 'rete-react-render-plugin';
import AreaPlugin from 'rete-area-plugin';
import ConnectionPlugin from 'rete-connection-plugin';
import ContextMenuPlugin, {ContextParams} from 'rete-context-menu-plugin';
import HistoryPlugin from 'rete-history-plugin';


export async function createEditor(container: HTMLElement) {
  var components = [
    new ComponentNum(), 
    new ComponentAdd(), 
    new ComponentDict(),
    new ComponentDictKey()
  ];

  console.log("creating editor...");
  var editor = new Rete.NodeEditor("demo@0.1.0", container);
  editor.use(ReactRenderPlugin);
  editor.use(AreaPlugin);
  editor.use(ConnectionPlugin);
  editor.use(ContextMenuPlugin);
  editor.use(HistoryPlugin);

  var engine = new Rete.Engine("demo@0.1.0");

  components.map((c) => {
    editor.register(c);
    engine.register(c);
  });

  var n1 = await components[0].createNode({ num: 2 });
  var n2 = await components[0].createNode({ num: 3 });
  var add = await components[1].createNode();
  var o = await components[2].createNode({});
  var dk = await components[3].createNode({});

  n1.position = [80, 200];
  n2.position = [80, 400];
  add.position = [500, 240];

  editor.addNode(n1);
  editor.addNode(n2);
  editor.addNode(add);
  editor.addNode(o);
  editor.addNode(dk);

  function editorConnect(o: string, i: string): void  {
    const o1 = n1.outputs.get(o);
    const i1 = add.inputs.get(i);
    o1 && i1 && editor.connect(o1, i1);
  }

  editorConnect("num", "num1");
  editorConnect("num", "num2");

  editor.on(
    ["process", "nodecreated", "noderemoved", "connectioncreated", "connectionremoved"],
    async () => {
      console.log("process");
      await engine.abort();
      await engine.process(editor.toJSON());
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
