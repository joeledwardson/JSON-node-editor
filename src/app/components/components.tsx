import Rete, { Control, Input, Node, Output, Socket, NodeEditor } from "rete";
import { ComponentBase } from "../../rete/component";
import { ControlBase } from "../../rete/control";
import MySocket, { sockets } from "../sockets/sockets";
import { OptionLabel } from "../controls/display";
import * as MyControls from  "../controls/controls";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import { DisplayBase, DisplayDict, DisplayList, listOutputAction, getOutputControls } from "./display";

/** list of available types */
let TypeList: Array<string> = [
  "Text",
  "Number",
  "Boolean",
  "Dictionary",
  "List",
  "None"
]
/** function to add custom types */
export const addType = (newType: string) => TypeList.push(newType);

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

/** control function to dynamically create an output "Value" with corresponding socket type to "Type Selection" control */
function selectChanger(comp: ComponentBase, node: Node)  {
  const editor: NodeEditor | null = comp.editor;
  const nodeUpdator = () => comp.update && comp.update();

  return (ctrl: ControlBase, emitter: NodeEditor, key: string, data: any) => {
    ctrl.props.value = data; // update Control props value for display on re-rendering
    node.data[key] = data;  // update stored node value
    ctrl.update && ctrl.update();  // re-render control

    // check type selection exist in data
    if( typeof node.data["Type Selection"] === "string" ) {

      // get selected type from data object
      const selectedType: string = node.data["Type Selection"] as string;

      // remove output if exist
      if (node.outputs.has("Value")) {
        const output = node.outputs.get("Value") as Output;

        // remove connections from view
        editor && output.connections.map(c => editor.removeConnection(c));

        // remove output from node
        node.removeOutput(output);
      }

      // check if new type has an associated socket
      if ( sockets.has(selectedType) ) {

        // get socket object
        const socket = sockets.get(selectedType)?.socket as Socket;
        
        // create new output with socket mapped to selected type
        node.addOutput(new Output("Value", selectedType + " Value", socket));

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

/** Variable spec */
export interface VariableType {
  type: string,
  default?: any,
}


/**  Number component */ 
export class ComponentNum extends ComponentBase {
  data = {component: DisplayBase}
  constructor() {
    super("Number");
  }

  async builder(node: Node): Promise<void> {
    return new Promise(resolve => {
      this.editor && node
        .addInput(new Input("parent", "Parent", MySocket.numberSocket))
        .addControl(new MyControls.ControlNumber(this.editor, "Number Input", node.data["Number Input"] ?? 0))
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

  async builder(node: Node): Promise<void> {
    return new Promise(resolve => {
      this.editor && node
        .addInput(new Input("parent", "Parent", MySocket.stringSocket))
        .addControl(new MyControls.ControlText(this.editor, "Text Input", node.data["Text Input"] ?? ""))
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

  async builder(node: Node): Promise<void> {
    return new Promise(resolve => {
      this.editor && node
        .addInput(new Input("parent", "Parent", MySocket.boolSocket))
        .addControl(new MyControls.ControlBool(this.editor, "Boolean Input", node.data["Boolean Input"] ?? ""))
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

  async builder(node: Node): Promise<void> {
    return new Promise(resolve => {
      this.editor && node
        .addInput(new Input("parent", "Parent", MySocket.nullSocket));
      resolve();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
  }
}


/** Dictionary component */
export class ComponentDict extends ComponentBase {
  data = {component: DisplayDict}
  constructor() {	
      super('Dictionary');
  }

  builder(node: Node): Promise<void> {
    const editor: NodeEditor | null = this.editor;
    return new Promise<void>(res => {
      editor && node
        .addInput(new Input("parent", "Parent", MySocket.dictSocket))
        .addControl(new MyControls.ControlButton(
          editor,
          "Add Item", 
          "Add Item +", 
          () => listOutputAction(editor, node, MySocket.dictKeySocket, node.outputs.size, "add")
        ));
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

  builder(node: Node): Promise<void> {
    return new Promise<void>(res => {
      this.editor && node
        .addInput(new Input("parent", "Parent", MySocket.dictKeySocket))
        .addControl(new MyControls.ControlText(
          this.editor, "Dictionary Key", node.data["Dictionary Key"] ?? ""))
        .addControl(new MyControls.ControlSelect(
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

  builder(node: Node): Promise<void> {
    const editor: NodeEditor | null = this.editor;
    return new Promise<void>(res => {
      editor && node
        .addInput(new Input("parent", "Parent", MySocket.listSocket))
        .addControl(new MyControls.ControlButton(
          editor, "Add Item", "Add Item +", () => listOutputAction(editor, node, MySocket.listItemSocket, node.outputs.size, "add")
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

  builder(node: Node): Promise<void> {
    return new Promise<void>(res => {
      this.editor && node
        .addInput(new Input("parent", "Parent", MySocket.listItemSocket))
        .addControl(new MyControls.ControlSelect(
          this.editor, "Type Selection", node.data["Type Selection"], typeLabels(), selectChanger(this, node)));
      res();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {}
}


/** Dynamic component */
export class ComponentDynamic extends ComponentBase {
  data = {component: DisplayBase}
  socket: Socket
  varSpec: Map<string, VariableType>
  constructor(name: string, varSpec: Map<string, VariableType>) {
    super(name);
    if( !sockets.has(name) ) {
      throw new Error(`expected socket "${name}" to exist!`);
    }
    this.socket = sockets.get(name)?.socket as Socket;
    this.varSpec = varSpec;
  }
  builder(node: Node): Promise<void> {
    const editor: NodeEditor | null = this.editor;
    return new Promise<void>(res => {
      if( editor ) {
        node.addInput(new Input("parent", "Parent", this.socket));
        this.varSpec.forEach((spec, key) => {
          if (!TypeList.includes(spec.type)) throw new Error(`type "${spec.type}" not recognised`);
          if (!sockets.has(spec.type)) throw new Error (`type "${spec.type}" has no socket`);
          node.addOutput(new Output(key, key, sockets.get(spec.type)?.socket as Socket));

          if( spec.type == "Text" ) {
            let ctrl = new MyControls.ControlText(editor, key, node.data[key] ?? spec.default ?? "");
            getOutputControls(node.addControl(ctrl)).set(key, ctrl);

          } else if ( spec.type == "Number" ) {
            let ctrl = new MyControls.ControlNumber(editor, key, node.data[key] ?? spec.default ?? null);
            getOutputControls(node.addControl(ctrl)).set(key, ctrl);

          } else if ( spec.type == "Boolean" ) {
            let ctrl = new MyControls.ControlBool(editor, key, node.data[key] ?? spec.default ?? null);
            getOutputControls(node.addControl(ctrl)).set(key, ctrl);

          }
  
        })
      }

      res();
    });
  }
  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
  }
}


export default {
  ComponentNum,
  ComponentText,
  ComponentDict,
  ComponentDictKey,
  ComponentBool,
  ComponentNull,
  ComponentList,
  ComponentListItem,
  ComponentDynamic
}