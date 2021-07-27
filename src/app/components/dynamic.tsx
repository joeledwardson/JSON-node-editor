import * as Rete from 'rete';
import { ComponentBase } from "../../rete/component";
import { sockets } from "../sockets/sockets";
import * as MyControls from "../controls/controls";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import { DisplayBase } from "./display";
import { getOutputControls } from "./data";
import {  TypeList } from "./components";
import { getInitial } from '../controls/data';


/** Variable spec */
export interface VariableType {
  type: string,
  default?: any,
  itemType?: string
}

/** function to add custom types */
export const addType = (newType: string) => TypeList.push(newType);


/** Dynamic component */
export class ComponentDynamic extends ComponentBase {
  data = { component: DisplayBase };
  socket: Rete.Socket;
  varSpec: Map<string, VariableType>;
  constructor(name: string, varSpec: Map<string, VariableType>) {
    super(name);
    if (!sockets.has(name)) {
      throw new Error(`expected socket "${name}" to exist!`);
    }
    this.socket = sockets.get(name)?.socket as Rete.Socket;
    this.varSpec = varSpec;
  }
  builder(node: Rete.Node): Promise<void> {
    const editor: Rete.NodeEditor | null = this.editor;
    return new Promise<void>(res => {
      if (editor) {
        node.addInput(new Rete.Input("parent", "Parent", this.socket));
        this.varSpec.forEach((spec, key) => {
          if (!TypeList.includes(spec.type))
            throw new Error(`type "${spec.type}" not recognised`);
          if (!sockets.has(spec.type))
            throw new Error(`type "${spec.type}" has no socket`);

          node.addOutput(new Rete.Output(key, key, sockets.get(spec.type)?.socket as Rete.Socket));
          let outputCtrls = getOutputControls(node);

          if (spec.type === "Text") {
            let ctrl = new MyControls.ControlText({
              emitter: editor, 
              key, 
              value: getInitial(node, key, spec.default ?? "")
            });
            node.addControl(ctrl);
            outputCtrls[key] = ctrl.key;

          } else if (spec.type === "Number") {
            let ctrl = new MyControls.ControlNumber({
              emitter: editor, 
              key, 
              value: getInitial(node, key, spec.default ?? null)
            });
            node.addControl(ctrl);
            outputCtrls[key] = ctrl.key;

          } else if (spec.type === "Boolean") {
            let ctrl = new MyControls.ControlBool({
              emitter: editor, 
              key, 
              value: getInitial(node, key, spec.default ?? null)
            });
            node.addControl(ctrl);
            outputCtrls[key] = ctrl.key;

          }

        });
      }

      res();
    });
  }
  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
  }
}

const _default = {
  ComponentDynamic
}; 
export default _default;