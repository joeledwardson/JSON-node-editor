import * as Rete from "rete";
import { ComponentBase } from "../../rete/component";
import MySocket, { sockets } from "../sockets/sockets";
import { OptionLabel } from "../controls/display";
import * as Controls from  "../controls/controls";
import { getInitial } from "../data/control";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import * as Display from "./display";

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
export function typeLabels(): Array<OptionLabel> {
  return [{
    label: "",
    value: ""
  }].concat(TypeList.map(v => ({
    label: v,
    value: v
  })));
}



function getSocket(s: any): Rete.Socket {
  let socket = s && sockets.get(s)?.socket;
  return socket ?? MySocket.anySocket;
}



/**  Number component */ 
export class ComponentNum extends ComponentBase {
  data = {component: Display.DisplayBase}
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
  data = {component: Display.DisplayBase}
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
  data = {component: Display.DisplayBase}
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
          value: getInitial(node, "Boolean Input", 0) // blank is option for nothing selection
        }))
      resolve();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
  }
}


/** Null Component */
export class ComponentNull extends ComponentBase {
  data = {component: Display.DisplayBase}
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

