import * as Rete from "rete";
import { ComponentBase } from "../../rete/component";
import { ControlBase } from "../../rete/control";
import MySocket, { sockets } from "../sockets/sockets";
import { OptionLabel } from "../controls/display";
import * as Controls from  "../controls/controls";
import { cGetData, nGetData, getInitial } from "../controls/data";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import { DisplayBase, DisplayListBase, ListAction } from "./display";
import { v4 as uuidv4 } from 'uuid';
import { getOutputControls, setOutputControls } from "./data";

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
function selectChanger(comp: ComponentBase, node: Rete.Node, ctrl: ControlBase, emitter: Rete.NodeEditor, key: string, data: any): void {
  const editor: Rete.NodeEditor | null = comp.editor;
  const nodeUpdator = () => comp.update && comp.update();

  const selectedType: string = typeof data === "string" ? String(data) : ""; // get type selection, use blank if null/undefined
  ctrl.props.value = selectedType; // update Control props value for display on re-rendering
  cGetData(ctrl)[key] = selectedType;  // update stored node value
  ctrl.update && ctrl.update();  // re-render control

  // remove output if exist
  let output = node.outputs.get("Value");
  if (output) {
    // remove connections from view
    editor && output.connections.map(c => editor.removeConnection(c));

    // remove output from node
    node.removeOutput(output);
  }

  // check if new type has an associated socket
  let socket = sockets.get(selectedType)?.socket;
  // create new output with socket mapped to selected type
  if (socket) node.addOutput(new Rete.Output("Value", selectedType + " Value", socket));  
  
  node.update();  // update node
  nodeUpdator();  // re-render node

  // for each affected node update its connections
  setTimeout(
    () => editor?.view.updateConnections({node}),
    10
  );
  
}

function getSocket(s: any): Rete.Socket {
  let socket = s && sockets.get(s)?.socket;
  return socket ?? MySocket.anySocket;
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
    // get controls data and output->controls map
    let ctrlData = nGetData(node);
    let ctrlsMap = getOutputControls(node);

    // get existing outputs into list format
    let lst: Array<Rete.Output> = Array.from(node.outputs.values());
    
    // create list of nodes that have a connection to the output to be updated
    let nds: Set<Rete.Node> = new Set<Rete.Node>([node]);
    
    // get selected type from type selection control
    const selectedType = ctrlData["Select Type"];
    let socket = sockets.get(selectedType)?.socket;
    
    // info logging
    console.log("output key " + idx + " processing, action: " + action);
    console.log(`found ${lst.length} existing outputs`);

    if (!(socket instanceof Rete.Socket)) {
      return rej(`couldnt find type socket type "${selectedType}"`);
    }    

    if (action === "add") {
      // index in output list for new output follows output pressed
      const newIndex: number = idx + 1;
      // generate unique string for key 
      const newKey: string = uuidv4(); 
      
      // insert new output into list
      socket && lst.splice(newIndex, 0, new Rete.Output(newKey, newKey, socket));  
      
      if( addControl ) {
        // create new control for output with blank value
        const ctrlKey = uuidv4();
        const newControl: Rete.Control = new Controls.ControlText({
          key: ctrlKey, 
          emitter: editor, 
          value: ""
        }); 
        // add control to node
        node.addControl(newControl); 
        // add new control to output control mappings
        ctrlsMap[newKey] = newControl.key;  
      }

    } else if (action === "remove") {
      
      if (idx >= 0 && idx < lst.length) {
        // get output using its index
        const output = lst[idx];

        // remove mapped output control (if exist)
        let ctrl = node.controls.get(ctrlsMap[output.key]);
        if( ctrl instanceof Rete.Control ) {
          node.removeControl(ctrl);
          delete ctrlsMap[ctrl.key];
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

    // re-add outputs to node from modified list (connections will remain intact) and create new re-ordered output->ctrl mappings object
    let newMap: {[key: string]: string} = {}
    lst.map(o => {
      // clear node so can be re-added by addOutput() function without triggering error
      o.node = null; 
      // re-add output
      node.addOutput(o);
      // if control exists re-add to new output mappings
      if( ctrlsMap[o.key] ) {
        newMap[o.key] = ctrlsMap[o.key];
      }
    });

    // update output-ctrl mappings
    setOutputControls(node, newMap);

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
        .addControl(new Controls.ControlNumber({
          emitter: this.editor, 
          key: "Number Input", 
          value: getInitial(node, "Number Input", 0)
        }))
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
        .addControl(new Controls.ControlText({
          emitter: this.editor, 
          key: "Text Input", 
          value: getInitial(node, "Text Input", "")
        }))
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
        .addControl(new Controls.ControlBool({
          emitter: this.editor, 
          key: "Boolean Input", 
          value: getInitial(node, "Boolean Input", "")
        }))
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
    const selectedType: string = (data && typeof data === "string") ? data : "";
    Controls.ctrlValChange(ctrl, emitter, key, selectedType);
    
    let socket = (sockets.get(selectedType)?.socket ?? sockets.get("Any")?.socket) as Rete.Socket;
    if ( !( socket instanceof Rete.Socket ) ) {
      throw new Error("couldnt find 'Any' or selected socket");
    }

    // get control data and output->control mappings
    let ctrlData = nGetData(node);
    let outputCtrls = getOutputControls(node);
    
    // get output keys and iterate over to produce new outputs
    // (dont iterate over node.outputs itself or adding new items will cause infinite loop)
    let oKeys: Array<string> = Array.from(node.outputs.keys());
    oKeys.map(k => {
      
      // get output object, track inputs connected to output 
      let output = node.outputs.get(k);
      const conns: Array<Rete.Input> = new Array<Rete.Input>();
      
      if(output) {
        // remove output connections, and register connected inputs
        output.connections.forEach(c => {
          conns.push(c.input);
          emitter.removeConnection(c);
        });  
        // remove output from node
        node.removeOutput(output);
      }

      // remove output control  
      let ctrl = node.controls.get(outputCtrls[k]);
      ctrl && node.removeControl(ctrl);  
      
      // get new dictionary key from current control or use blank
      let newDictKey: string = (ctrl && ctrlData[ctrl?.key]) ?? ""; 
      
      // delete data from current control and remove output->control mapping
      delete ctrlData[k];  
      delete outputCtrls[k];   

      // create new output/control key
      let newKey = uuidv4();  

      // create new output with unique key
      const newOutput = new Rete.Output(newKey, newKey, socket); 

      // create new control and if compatible output connections will be added after first render
      // rete has to register sockets in display which happens at rendering - thus use component mount after render to add connections
      const ctrlKey = uuidv4();
      const newControl = new Controls.ControlText({
        key: ctrlKey, 
        emitter, 
        value: newDictKey,
        componentDidMount: () => conns.forEach(input => {
          if( newOutput.socket?.compatibleWith(input.socket) ) {
            emitter.connect(newOutput, input);
          }
        })
      })
      
      // set new dictionary key in control data, and set output mapping to control
      ctrlData[ctrlKey] = newDictKey;
      outputCtrls[newKey] = newControl.key;
      
      // add output and control to node
      node.addOutput(newOutput)
      node.addControl(newControl);
    })

    // update node and trigger re-render of connections
    node.update();
    setTimeout(() => 
      emitter.view.updateConnections({node}),
      10
    );
  }
  

  builder(node: Rete.Node): Promise<void> {
    const editor: Rete.NodeEditor | null = this.editor;
    return new Promise<void>(res => {
      editor && node
        .addInput(new Rete.Input("parent", "Parent", MySocket.dictSocket))
        .addControl(new Controls.ControlButton({
          emitter: editor,
          key: "Add Item", 
          value: null, // ignored
          buttonInner: "Add Item +", 
          valueChanger: () => listOutputAction(editor, node, node.outputs.size, "add", true)
        }))
        .addControl(new Controls.ControlSelect({
          emitter: editor, 
          key: "Select Type", 
          value: getInitial(node, "Select Type", "Any"), 
          options: typeLabels(), 
          valueChanger: (ctrl: ControlBase, emitter: Rete.NodeEditor, key: string, data: any) => this.typeSelection(node, ctrl, emitter, key, data)
        }));
      let outputCtrls = getOutputControls(node);
      let ctrlData = nGetData(node);
      Object.entries(outputCtrls).forEach(([k, v]) => {
        let socket = (sockets.get(ctrlData["Select Type"])?.socket ?? sockets.get("Any")?.socket) as Rete.Socket;
        // add output using the output key
        node.addOutput(new Rete.Output(k, k, socket));
        // add control using mapped control key
        editor && node.addControl(new Controls.ControlText({
          key: v,
          emitter: editor,
          value: ctrlData[v]
        }));
      })
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
        .addControl(new Controls.ControlText({
          emitter: this.editor, 
          key: "Dictionary Key", 
          value: getInitial(node, "Dictionary Key", ""), 
        }))
        .addControl(new Controls.ControlSelect({
          emitter: this.editor, 
          key: "Type Selection", 
          value: getInitial(node, "Type Selection", ""), 
          options: typeLabels(), 
          valueChanger: (ctrl: ControlBase, emitter: Rete.NodeEditor, key: string, data: any) => selectChanger(this, node, ctrl, emitter, key, data)
        }));
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
        .addControl(new Controls.ControlButton({
          emitter: editor, 
          key: "Add Item", 
          value: undefined,
          buttonInner: "Add Item +", 
          valueChanger: () => listOutputAction(editor, node, node.outputs.size, "add", false)
        })).addControl(new Controls.ControlSelect({
          emitter: editor, 
          key: "Select Type", 
          value: "", 
          options: typeLabels()
        }))
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
        .addControl(new Controls.ControlSelect({
          emitter: this.editor, 
          key: "Type Selection", 
          value: getInitial(node, "Type Selection", ""),
          options: typeLabels(),
          valueChanger: (ctrl: ControlBase, emitter: Rete.NodeEditor, key: string, data: any) => selectChanger(this, node, ctrl, emitter, key, data)
        }));
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