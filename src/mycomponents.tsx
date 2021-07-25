import Rete, { Control, Input, Node, Output, Socket, NodeEditor } from "rete";
import { ComponentBase, ReteControlBase } from "./rete-react";
import MySocket, { sockets, addSocket } from "./mysocket";
import MyControls, { OptionLabel, ControlNumber } from "./mycontrols";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import { DisplayBase, DisplayDict, DisplayList, listOutputAction } from "./myreactcomponents";

// map types to sockets
let TypeList: Array<string> = [
  "Text",
  "Number",
  "Boolean",
  "Dictionary",
  "List",
  "None"
]
export const addType = (newType: string) => TypeList.push(newType);


// Number component 
export class ComponentNum extends ComponentBase {
  constructor() {
    super("Number", DisplayBase);
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


// Text Component
export class ComponentText extends ComponentBase {
  constructor() {
    super("Text", DisplayBase);
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


// Boolean Component
export class ComponentBool extends ComponentBase {
  constructor() {
    super("Boolean", DisplayBase);
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


// Null Component
export class ComponentNull extends ComponentBase {
  constructor() {
    super("Null", DisplayBase);
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


// Dictionary component
export class ComponentDict extends ComponentBase {
  constructor() {	
      super('Dictionary', DisplayDict);
  }

  builder(node: Node): Promise<void> {
    const editor: NodeEditor | null = this.editor;
    return new Promise<void>(res => {
      editor && node
        .addInput(new Input("parent", "Parent", MySocket.dictSocket))
        .addControl(new MyControls.ControlButton(
          "Add Item", "Add Item +", () => listOutputAction(editor, node, MySocket.dictKeySocket, node.outputs.size, "add")
        ))
      res();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {}
}


abstract class ComponentTypeSelect extends ComponentBase {
  selectBuilder(node: Node, parentSocket: Socket, includeKeyInput: boolean): Promise<void> {
    const editor: NodeEditor | null = this.editor;
    const nodeUpdator = () => this.update && this.update();
    const typeLabels: Array<OptionLabel> = TypeList.map(v => ({
      label: v,
      value: v
    }));

    const selectChange = (control: ReteControlBase,  key: string, data: string) => {
      
      control.props.value = data; // update Control props value for display on re-rendering
      node.data[key] = data;  // update stored node value
      control.update && control.update();  // re-render control

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

    return new Promise<void>(res => {
      editor && node.addInput(new Input("parent", "Parent", parentSocket));
      editor && includeKeyInput && node.addControl(new MyControls.ControlText(editor, "Dictionary Key", ""));
      editor && node.addControl(new MyControls.ControlSelect(editor, "Type Selection", null, typeLabels, selectChange));
      res();
    });
  }
}


// Dictionary Key component
export class ComponentDictKey extends ComponentTypeSelect {
  constructor() {	
      super('Dict Key', DisplayBase);
  }

  builder(node: Node): Promise<void> {
    return this.selectBuilder(node, MySocket.dictKeySocket, true);
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {}
}


// List component
export class ComponentList extends ComponentBase {
  constructor() {	
      super('List', DisplayList);
  }

  builder(node: Node): Promise<void> {
    const editor: NodeEditor | null = this.editor;
    return new Promise<void>(res => {
      editor && node
        .addInput(new Input("parent", "Parent", MySocket.listSocket))
        .addControl(new MyControls.ControlButton(
          "Add Item", "Add Item +", () => listOutputAction(editor, node, MySocket.listItemSocket, node.outputs.size, "add")
        ))
      res();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {}
}


// List item component
export class ComponentListItem extends ComponentTypeSelect {
  constructor() {	
      super('List Item', DisplayBase);
  }

  builder(node: Node): Promise<void> {
    return this.selectBuilder(node, MySocket.listItemSocket, false);
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {}
}


// Dynamic component
export interface VariableType {
  type: string
}
export class ComponentDynamic extends ComponentBase {
  socket: Socket
  varSpec: Map<string, VariableType>
  constructor(name: string, varSpec: Map<string, VariableType>) {
    super(name, DisplayBase);
    if( !sockets.has(name) ) {
      throw new Error(`expected socket "${name}" to exist!`);
    }
    this.socket = sockets.get(name)?.socket as Socket;
    this.varSpec = varSpec;
  }
  builder(node: Node): Promise<void> {
    const editor: NodeEditor | null = this.editor;
    return new Promise<void>(res => {
      editor && node.addInput(new Input("parent", "Parent", this.socket));
      this.varSpec.forEach((spec, key) => {
        if (!TypeList.includes(spec.type)) throw new Error(`type "${spec.type}" not recognised`);
        if (!sockets.has(spec.type)) throw new Error (`type "${spec.type}" has no socket`);
        node.addOutput(new Output(key, key, sockets.get(spec.type)?.socket as Socket));
      })
      res();
    });
  }
  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {}
}


export default {
  ComponentNum,
  // ComponentAdd,
  ComponentText,
  ComponentDict,
  ComponentDictKey,
  ComponentBool,
  ComponentNull,
  ComponentList,
  ComponentListItem,
  ComponentDynamic
}