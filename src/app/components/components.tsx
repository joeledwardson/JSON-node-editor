import * as Rete from "rete";
import { ComponentBase } from "../../rete/component";
import { ControlBase } from "../../rete/control";
import MySocket, { sockets } from "../sockets/sockets";
import { OptionLabel } from "../controls/display";
import * as Controls from  "../controls/controls";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import { DisplayBase, DisplayListBase, ListAction } from "./display";
import { v4 as uuidv4 } from 'uuid';
import { getOutputControls } from "./outputcontrols";

/** list of available types */
export let TypeList: Array<string> = [
  "Text",
  "Number",
  "Boolean",
  "Dictionary",
  "List",
  "None"
]

/** convert types to option label/value pairs with a blank at the start */
function typeLabels(): Array<OptionLabel> {
  return [{
    label: "",
    value: ""
  }].concat(TypeList.map(v => ({
    label: v,
    value: v
  })));
}

/** control changer function to dynamically create an output "Value" with corresponding socket type to "Type Selection" control */
function selectChanger(comp: ComponentBase, node: Rete.Node)  {
  const editor: Rete.NodeEditor | null = comp.editor;
  const nodeUpdator = () => comp.update && comp.update();

  return (ctrl: ControlBase, emitter: Rete.NodeEditor, key: string, data: any) => {
    ctrl.props.value = data; // update Control props value for display on re-rendering
    node.data[key] = data;  // update stored node value
    ctrl.update && ctrl.update();  // re-render control

    // check type selection exist in data
    if( typeof node.data["Type Selection"] === "string" ) {

      // get selected type from data object
      const selectedType: string = node.data["Type Selection"] as string;

      // remove output if exist
      if (node.outputs.has("Value")) {
        const output = node.outputs.get("Value") as Rete.Output;

        // remove connections from view
        editor && output.connections.map(c => editor.removeConnection(c));

        // remove output from node
        node.removeOutput(output);
      }

      // check if new type has an associated socket
      if ( sockets.has(selectedType) ) {

        // get socket object
        const socket = sockets.get(selectedType)?.socket as Rete.Socket;
        
        // create new output with socket mapped to selected type
        node.addOutput(new Rete.Output("Value", selectedType + " Value", socket));

      }
      
      node.update();  // update node
      nodeUpdator();  // re-render node

      // for each affected node update its connections
      setTimeout(
        () => editor?.view.updateConnections({node}),
        10
      );
    }
  }


}


/** perform an action on a dynamic list output */
export async function listOutputAction(
  editor: Rete.NodeEditor,
  node: Rete.Node, 
  idx: number, 
  action: ListAction,
  addControl: boolean
): Promise<void> {
  return new Promise((res, rej) => {
    console.log("output key " + idx + " processing, action: " + action);

    // get existing outputs into list format
    let lst: Array<Rete.Output> = Array.from(node.outputs.values());
    console.log(`found ${lst.length} existing outputs`);

    // nodes that have a connection to the output that will need to be updated
    let nds: Set<Rete.Node> = new Set<Rete.Node>([node]);

    if (action === "add") {

      const newIndex: number = idx + 1; // index in output list for new output follows output pressed
      const newKey: string = uuidv4(); // generate unique string for key

      const selectedType = node.meta.currentTypeSelection as string | undefined;
      const SocketType: Rete.Socket = (selectedType && sockets.has(selectedType)) ? sockets.get(selectedType)?.socket as Rete.Socket : sockets.get("Any")?.socket as Rete.Socket;
      const newOutput: Rete.Output = new Rete.Output(newKey, newKey, SocketType); // create new output with unique key
      lst.splice(newIndex, 0, newOutput);  // insert new output into list
      
      if( addControl ) {
        const newControl: Rete.Control = new Controls.ControlText(editor, newKey, ""); // create new control for output
        node.addControl(newControl); // add control to node
        getOutputControls(node).set(newKey, newControl);  // add new control to output control mappings
      }

    } else if (action === "remove") {
      
      if (idx >= 0 && idx < lst.length) {

        // get output using its index
        const output = lst[idx];

        // remove mapped output control (if exist)
        let ctrl = getOutputControls(node).get(output.key);
        if( ctrl !== undefined ) {
          node.removeControl(ctrl);
          getOutputControls(node).delete(output.key);
        }

        // register each node which has an input connected to the output being deleted
        output.connections.forEach((c: Rete.Connection): void => {
          c.input.node && nds.add(c.input.node);
        })

        // remove connections from view
        output.connections.map(c => editor.removeConnection(c));

        // remove output from node
        node.removeOutput(output);
              
        // remove output from processing list
        lst.splice(idx, 1);

      } else {
        console.error(`couldnt delete output form index, out of range "${idx}"`);
      }

    } else if (action === "moveUp") {

      if( idx > 0 && idx < lst.length ) {

        // pop element out and move "up" (up on screen, down in list index)
        const output = lst[idx];
        lst.splice(idx, 1);
        lst.splice(idx - 1, 0, output);

      } else {
        // couldnt find element
        console.warn(`cant move output index up "${idx}"`);
      }
    } else if (action === "moveDown") {

      if( idx >= 0 && (idx + 1) < lst.length ) {
        
        // pop element out and move "down" (down on screen, up in list index)
        // remove next element and insert behind 
        const nextOutput = lst[idx + 1];
        lst.splice(idx + 1, 1);
        lst.splice(idx, 0, nextOutput);

      } else {
        // couldnt find element
        console.warn(`cant move output index down "${idx}"`);
      }
    }
    
    // clear map of stored outputs
    node.outputs.clear();

    // re-add outputs to node from modified list (connections will remain intact)
    lst.map((o: Rete.Output, i: number) => {
      o.node = null; // clear node so can be re-added by addOutput() function without triggering error
      node.addOutput(o)
    });

    // update node
    node.update();

    // for each affected node update its connections
    setTimeout(() => 
      nds.forEach(n => editor?.view.updateConnections({node: n})),
      10
    );

    res();
  });
}


/**  Number component */ 
export class ComponentNum extends ComponentBase {
  data = {component: DisplayBase}
  constructor() {
    super("Number");
  }

  async builder(node: Rete.Node): Promise<void> {
    return new Promise(resolve => {
      this.editor && node
        .addInput(new Rete.Input("parent", "Parent", MySocket.numberSocket))
        .addControl(new Controls.ControlNumber(this.editor, "Number Input", node.data["Number Input"] ?? 0))
      resolve();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
  }
}


/** Text Component */
export class ComponentText extends ComponentBase {
  data = {component: DisplayBase}
  constructor() {
    super("Text");
  }

  async builder(node: Rete.Node): Promise<void> {
    return new Promise(resolve => {
      this.editor && node
        .addInput(new Rete.Input("parent", "Parent", MySocket.stringSocket))
        .addControl(new Controls.ControlText(this.editor, "Text Input", node.data["Text Input"] ?? ""))
      resolve();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
  }
}


/** Boolean Component */
export class ComponentBool extends ComponentBase {
  data = {component: DisplayBase}
  constructor() {
    super("Boolean");
  }

  async builder(node: Rete.Node): Promise<void> {
    return new Promise(resolve => {
      this.editor && node
        .addInput(new Rete.Input("parent", "Parent", MySocket.boolSocket))
        .addControl(new Controls.ControlBool(this.editor, "Boolean Input", node.data["Boolean Input"] ?? ""))
      resolve();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
  }
}


/** Null Component */
export class ComponentNull extends ComponentBase {
  data = {component: DisplayBase}
  constructor() {
    super("Null");
  }

  async builder(node: Rete.Node): Promise<void> {
    return new Promise(resolve => {
      this.editor && node
        .addInput(new Rete.Input("parent", "Parent", MySocket.nullSocket));
      resolve();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
  }
}


/** Dictionary component */
class DisplayList extends DisplayListBase {
  action = (index: number, action: ListAction) => listOutputAction(this.props.editor, this.props.node, index, action, false);
}
class DisplayDict extends DisplayListBase {
  action = (index: number, action: ListAction) => listOutputAction(this.props.editor, this.props.node, index, action, true);
}
export class ComponentDict extends ComponentBase {
  data = {component: DisplayDict}
  constructor() {	
      super('Dictionary');
  }

  typeSelection(node: Rete.Node, ctrl: ControlBase, emitter: Rete.NodeEditor, key: string, data: any) {
    node.meta.currentTypeSelection = data;
    const socket = ((data && typeof data === "string" && sockets.has(data)) ? sockets.get(data)?.socket : sockets.get("Any")?.socket) as Rete.Socket;

    const nOutputs = node.outputs.size;
    Array(nOutputs).fill(0).forEach(() => node.removeOutput(node.outputs.values().next().value));
    node.update();
    setTimeout(() => 
      emitter.view.updateConnections({node}),
      10
    );
    const keys: Array<string> = Array.from(node.outputs.keys());
    Array(nOutputs).fill(0).forEach(() => node.addOutput(new Rete.Output(uuidv4(), "", socket)));
    keys.forEach(k => {

      const newKey: string = uuidv4(); // generate unique string for key
      const newOutput: Rete.Output = new Rete.Output(newKey, newKey, socket); // create new output with unique key
      

      node.outputs.get(k)?.connections.map(c => emitter.removeConnection(c));
      
      // node.removeOutput(o);
      node.addOutput(newOutput);
    })


    // node.outputs.forEach(o => {
    //   listOutputAction(emitter, node, 0, "remove");
    //   listOutputAction(emitter, node, node.outputs.size, "add");
    // })
    Controls.controlValueChange(ctrl, emitter, key, data);
  }

  builder(node: Rete.Node): Promise<void> {
    const editor: Rete.NodeEditor | null = this.editor;
    const selectUpdator = (ctrl: ControlBase, emitter: Rete.NodeEditor, key: string, data: any) => this.typeSelection(node, ctrl, emitter, key, data)
    return new Promise<void>(res => {
      editor && node
        .addInput(new Rete.Input("parent", "Parent", MySocket.dictSocket))
        .addControl(new Controls.ControlButton(
          editor,
          "Add Item", 
          "Add Item +", 
          () => listOutputAction(editor, node, node.outputs.size, "add", true)
        ))
        .addControl(new Controls.ControlSelect(
          editor, "Select Type", "", typeLabels(), selectUpdator
        ))
      res();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {}
}


/** Dictionary Key component */
export class ComponentDictKey extends ComponentBase {
  data = {component: DisplayBase}
  constructor() {	
      super('Dict Key');
  }

  builder(node: Rete.Node): Promise<void> {
    return new Promise<void>(res => {
      this.editor && node
        .addInput(new Rete.Input("parent", "Parent", MySocket.dictKeySocket))
        .addControl(new Controls.ControlText(
          this.editor, "Dictionary Key", node.data["Dictionary Key"] ?? ""))
        .addControl(new Controls.ControlSelect(
          this.editor, "Type Selection", node.data["Type Selection"], typeLabels(), selectChanger(this, node)));
      res();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {}
}


/** List component */
export class ComponentList extends ComponentBase {
  data = {component: DisplayList}
  constructor() {	
      super('List');
  }

  builder(node: Rete.Node): Promise<void> {
    const editor: Rete.NodeEditor | null = this.editor;
    return new Promise<void>(res => {
      editor && node
        .addInput(new Rete.Input("parent", "Parent", MySocket.listSocket))
        .addControl(new Controls.ControlButton(
          editor, "Add Item", "Add Item +", () => listOutputAction(editor, node, node.outputs.size, "add", false)
        )).addControl(new Controls.ControlSelect(
          editor, "Select Type", "", typeLabels()
        ))
      res();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {}
}


/** List Item component */
export class ComponentListItem extends ComponentBase {
  data = {component: DisplayBase}
  constructor() {	
      super('List Item');
  }

  builder(node: Rete.Node): Promise<void> {
    return new Promise<void>(res => {
      this.editor && node
        .addInput(new Rete.Input("parent", "Parent", MySocket.listItemSocket))
        .addControl(new Controls.ControlSelect(
          this.editor, "Type Selection", node.data["Type Selection"], typeLabels(), selectChanger(this, node)));
      res();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {}
}


export default {
  ComponentNum,
  ComponentText,
  ComponentDict,
  ComponentDictKey,
  ComponentBool,
  ComponentNull,
  ComponentList,
  ComponentListItem
}