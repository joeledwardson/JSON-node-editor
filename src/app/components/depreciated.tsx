import * as Rete from "rete";
import { ComponentBase } from "../../rete/component";
import { ControlBase } from "../../rete/control";
import MySocket, { sockets } from "../sockets/sockets";
import * as Controls from  "../controls/controls";
import { cGetData, getInitial } from "../data/component";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import * as Display from "./display";
import { typeLabels } from "./advanced";


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

/** Dictionary Key component */
export class ComponentDictKey extends ComponentBase {
  data = {component: Display.DisplayBase}
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



/** List Item component */
export class ComponentListItem extends ComponentBase {
  data = {component: Display.DisplayBase}
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
