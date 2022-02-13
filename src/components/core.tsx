import * as Rete from "rete";
import * as MySocket  from "../sockets/sockets";
import * as Controls from  "../controls/controls";
import { getControlsData, getOutputMap } from "../data/attributes";
import * as Display from "../display";
import { BaseComponent } from "./base";


/** get control initial value from data, or use provided initial value */
function getInitial(node: Rete.Node, key: string, defaultVal: any): any {
  return getControlsData(node)[key] ?? defaultVal;
}

/**  Number component */ 
export class NumberComponent extends BaseComponent {
  data = {component: Display.DisplayBase}
  KEY = "Number Input"
  constructor() {
    super("Number");
  }

  async internalBuilder(node: Rete.Node, editor: Rete.NodeEditor) {
    node
      .addInput(new Rete.Input("parent", "Parent", MySocket.numberSocket))
      .addControl(new Controls.NumberControl(this.KEY, editor, node, {
        value: getInitial(node, this.KEY, 0)
      }))
  }

  getData(node: Rete.Node) {
    return getControlsData(node)[this.KEY]
  }
}


/** Text Component */
export class TextComponent extends BaseComponent {
  data = {component: Display.DisplayBase}
  KEY = "Text Input"
  constructor() {
    super("Text");
  }

  async internalBuilder(node: Rete.Node, editor: Rete.NodeEditor) {
    node
      .addInput(new Rete.Input("parent", "Parent", MySocket.stringSocket))
      .addControl(new Controls.TextControl(this.KEY, editor, node, {
        value: getInitial(node, this.KEY, "")
      }))
  }

  getData(node: Rete.Node) {
    return getControlsData(node)[this.KEY]
  }
}


/** Boolean Component */
export class BoolComponent extends BaseComponent {
  data = {component: Display.DisplayBase}
  KEY = "Boolean Input"
  constructor() {
    super("Boolean");
  }

  async internalBuilder(node: Rete.Node, editor: Rete.NodeEditor) {
    node
      .addInput(new Rete.Input("parent", "Parent", MySocket.boolSocket))
      .addControl(new Controls.BoolControl(this.KEY, editor, node, {
        value: getInitial(node, this.KEY, 'False') // blank is option for nothing selection
      }));
  }

  getData(node: Rete.Node) {
    return getControlsData(node)[this.KEY] == "True" ? true : false;
  }

}


/** Null Component */
export class NullComponent extends BaseComponent {
  data = {component: Display.DisplayBase}
  constructor() {
    super("Null");
  }

  async internalBuilder(node: Rete.Node, editor: Rete.NodeEditor): Promise<void> {
    node.addInput(new Rete.Input("parent", "Parent", MySocket.nullSocket));
  }

  getData(node: Rete.Node): any {
    return null
  }
}

