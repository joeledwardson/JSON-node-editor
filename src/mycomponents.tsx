import Rete, { Input, Node } from "rete";
import { socketDictKey, sockets } from "./mysocket";
import { ControlNumber, ControlText, ControlButton, ControlSelect } from "./mycontrols";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import { ComponentBase } from "./rete-react";
import { socketNumber } from "./mysocket";
import { NodeEditor } from "rete";
import { DisplayBase, DisplayList, listOutputAction } from "./myreactcomponents";
 
// Rete component for a single number - has a number input with control and a number output
export class ComponentNum extends ComponentBase {
  constructor() {
    super("Number", DisplayBase);
  }

  async builder(node: Node): Promise<void> {
    console.log("running Number builder...");
    var out1 = new Rete.Output("outputNum", "Number",  socketNumber);
    if (!this.editor) {
      throw new Error('this.editor is null in NumComponent!');
    }
    var ctrl = new ControlNumber(this.editor, "inputNum", 0);
    node.addControl(ctrl).addOutput(out1);
    return new Promise(resolve => resolve());
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
    outputs["outputNum"] = node.data["inputNum"];
  }
}

// Rete component for adding 2 numbers - has 2 number inputs with controls and a number output
export class ComponentAdd extends ComponentBase {
    constructor() {
      super("Add", DisplayBase);
    }
  
    async builder(node: Node): Promise<void> {
    
      console.log("running add builder...");
      var inp1 = new Rete.Input("num1", "Number", socketNumber);
      var inp2 = new Rete.Input("num2", "Number2", socketNumber);
      var out = new Rete.Output("num", "Number", socketNumber);
  
      if (!this.editor) {
        throw new Error('this.editor is null in AddCOmponent!'); 
      }
  
      inp1.addControl(new ControlNumber(this.editor, "num1", 0));
      inp2.addControl(new ControlNumber(this.editor, "num2", 0));
  
      node
        .addInput(inp1)
        .addInput(inp2)
        .addControl(new ControlNumber(this.editor, "preview", 0))
        .addOutput(out);
      
      return new Promise(resolve => resolve());
    }
  
    worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
      console.log("Add component working...");
      let n1: number = (inputs["num1"].length ? inputs["num1"][0] : node.data.num1) as number;
      let n2: number = (inputs["num2"].length ? inputs["num2"][0] : node.data.num2) as number;
      let sum: number = (+n1) +  (+n2);
  
      if(this.editor) {
          let previewCtrl = this.editor.nodes.find((n) => n.id == node.id)?.controls.get("preview") as ControlNumber;
          previewCtrl && previewCtrl.controlValueChange("preview", sum);
          outputs["num"] = sum;
      }
  
    }
}
  
// Rete component holding a list
export class ComponentDict extends ComponentBase {
  constructor() {	
      super('Dict', DisplayList);
  }

  builder(node: Node): Promise<void> {
    const editor: NodeEditor | null = this.editor;
    return new Promise<void>(res => {
      if( editor ) {
        // add control to add output
        const adderControl: ControlButton = new ControlButton(
            "OutputAdder", "+", () => listOutputAction(editor, node, node.outputs.size, "add")
        );
        node.addControl(adderControl);

        // add 1 output
        // listOutputAction(editor, node, 0, "add");
      } else {
        console.error('cant build node, editor not defined');
      }
      res();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
      ; // pass
  }
}

const valueTypes = [
  "String",
  "Number",
  "Dictionary",
  "List",
  "None"
]

// Rete component for dict key
export class ComponentDictKey extends ComponentBase {
  constructor() {	
      super('Dict Key', DisplayBase);
  }

  builder(node: Node): Promise<void> {
    const editor: NodeEditor | null = this.editor;
    return new Promise<void>(res => {
      if( editor ) {
        node.addInput(new Input("parent", "Parent", socketDictKey));
        node.addControl(new ControlText(editor, "dictKey", ""));
        node.addControl(new ControlSelect(editor, "typeSelect", null, 
          valueTypes.map(v => {return {
            label: v,
            value: v
        }})));
      } else {
        console.error('cant build node, editor not defined');
      }
      res();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
    console.log("pls");
  }
}