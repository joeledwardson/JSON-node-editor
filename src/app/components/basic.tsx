import * as Rete from "rete";
import { ReteReactComponent as ReteComponent } from "../../retereact";
import * as MySocket  from "../sockets/sockets";
import * as Controls from  "../controls/controls";
import { getInitial } from "../data/attributes";
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

/** base component - empty worker and _builder() that checks emitter is non-null */
export abstract class ComponentBase extends ReteComponent {
  abstract _builder(node: Rete.Node, editor: Rete.NodeEditor): void
  builder(node: Rete.Node): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if( this.editor ) {
        this._builder(node, this.editor);
        resolve();
      } else {
        reject(`this.editor is not available`);
      }
    });
  }
  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {}
}


/**  Number component */ 
export class ComponentNum extends ComponentBase {
  data = {component: Display.DisplayBase}
  constructor() {
    super("Number");
  }

  async _builder(node: Rete.Node, editor: Rete.NodeEditor) {
    node
      .addInput(new Rete.Input("parent", "Parent", MySocket.numberSocket))
      .addControl(new Controls.ControlNumber({
        emitter: editor, 
        key: "Number Input", 
        value: getInitial(node, "Number Input", 0)
      }))
     
  }
}


/** Text Component */
export class ComponentText extends ComponentBase {
  data = {component: Display.DisplayBase}
  constructor() {
    super("Text");
  }

  async _builder(node: Rete.Node, editor: Rete.NodeEditor) {
    node
      .addInput(new Rete.Input("parent", "Parent", MySocket.stringSocket))
      .addControl(new Controls.ControlText({
        emitter: editor, 
        key: "Text Input", 
        value: getInitial(node, "Text Input", "")
      }))
     
  }
}


/** Boolean Component */
export class ComponentBool extends ComponentBase {
  data = {component: Display.DisplayBase}
  constructor() {
    super("Boolean");
  }

  async _builder(node: Rete.Node, editor: Rete.NodeEditor) {
    node
      .addInput(new Rete.Input("parent", "Parent", MySocket.boolSocket))
      .addControl(new Controls.ControlBool({
        emitter: editor, 
        key: "Boolean Input", 
        value: getInitial(node, "Boolean Input", 0) // blank is option for nothing selection
      }));
  }
}


/** Null Component */
export class ComponentNull extends ComponentBase {
  data = {component: Display.DisplayBase}
  constructor() {
    super("Null");
  }

  async _builder(node: Rete.Node, editor: Rete.NodeEditor): Promise<void> {
    node.addInput(new Rete.Input("parent", "Parent", MySocket.nullSocket));
  }
}

