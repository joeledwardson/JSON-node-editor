import Rete, { Node } from "rete";
import { MyControl } from "./mycontrols";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import { numSocket } from "./rete";


export class NumComponent extends Rete.Component {
  constructor() {
    super("Number");
  }

  async builder(node: Node): Promise<void> {
    console.log("running Number builder...");
    var out1 = new Rete.Output("num", "Number", numSocket);
    if (!this.editor) {
      throw new Error('this.editor is null in NumComponent!');
    }
    var ctrl = new MyControl(this.editor, "num", 0);
    node.addControl(ctrl).addOutput(out1);
    return new Promise(resolve => resolve());
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
    outputs["num"] = node.data.num;
  }
}



export class AddComponent extends Rete.Component {

    constructor() {
      super("Add");
      // this.data.component = MyNode; // optional
    }
  
    async builder(node: Node): Promise<void> {
    
      console.log("running add builder...");
      var inp1 = new Rete.Input("num1", "Number", numSocket);
      var inp2 = new Rete.Input("num2", "Number2", numSocket);
      var out = new Rete.Output("num", "Number", numSocket);
  
      if (!this.editor) {
        throw new Error('this.editor is null in AddCOmponent!'); 
      }
  
      inp1.addControl(new MyControl(this.editor, "num1", 0));
      inp2.addControl(new MyControl(this.editor, "num2", 0));
  
      node
        .addInput(inp1)
        .addInput(inp2)
        .addControl(new MyControl(this.editor, "preview", 0))
        .addOutput(out);
      
      return new Promise(resolve => resolve());
    }
  
    worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
      console.log("Add component working...");
      let n1: number = (inputs["num1"].length ? inputs["num1"][0] : node.data.num1) as number;
      let n2: number = (inputs["num2"].length ? inputs["num2"][0] : node.data.num2) as number;
      let sum: number = (+n1) +  (+n2);
  
      if(this.editor) {
          let previewCtrl = this.editor.nodes.find((n) => n.id == node.id)?.controls.get("preview") as MyControl;
          previewCtrl && previewCtrl.controlValueChange("preview", sum);
          outputs["num"] = sum;
      }
  
    }
  }
  