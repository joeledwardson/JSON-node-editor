import * as Rete from 'rete';
import { ComponentBase } from "../../rete/component";
import { sockets, addSocket } from "../sockets/sockets";
import * as MyControls from "../controls/controls";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import { DisplayDynamicBase } from "./display";
import { getOutputControls, getOutputNulls } from "../data/component";
import {  TypeList } from "./basic";
import { getInitial } from '../data/control';


/** Variable spec */
export interface VariableType {
  types: string[],
  default?: any,
  itemType?: string
}

/** function to add custom types */
export const addType = (newType: string) => TypeList.push(newType);


/** Dynamic component */
class DisplayDynamic extends DisplayDynamicBase {
  nullButtonClick(output: Rete.Output): void {
    let outputNulls = getOutputNulls(this.props.node);
    if(!(outputNulls[output.key])) {
      output.connections.forEach(c => this.props.editor.removeConnection(c))
    }
    outputNulls[output.key] = !outputNulls[output.key];
    this.props.node.update();
    this.props.editor.view.updateConnections({node: this.props.node});
  }
}
export class ComponentDynamic extends ComponentBase {
  data = { component: DisplayDynamic };
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
  multiSocket = (typs: string[]): Rete.Socket => {
    let socketName: string = typs.join(' | ');
    const socket = sockets.get(socketName)?.socket;
    if( socket ) {
      return socket;
    } else {
      const newSocket = addSocket(socketName).socket;
      typs.forEach(t => {
        let s = sockets.get(t)?.socket;
        s && newSocket.combineWith(s);
      });
      return newSocket;
    }
  }
  builder(node: Rete.Node): Promise<void> {
    const editor: Rete.NodeEditor | null = this.editor;
    return new Promise<void>(res => {
      if (editor) {
        node.addInput(new Rete.Input("parent", "Parent", this.socket));

        this.varSpec.forEach((spec, key) => {
          spec.types.forEach(t => {
            if (!TypeList.includes(t))
              throw new Error(`in var "${key}", type "${t}" not recognised`);
              if (!sockets.has(t))
                throw new Error(`in var "${key}", type "${t}" has no socket`);
          });
          
          // if 'None' is a valid type set null indicator based on default value
          if (spec.types.includes('None'))
            getOutputNulls(node)[key] = spec.default === null;
           
          // create socket from list of valid types and use to create output
          let socket = this.multiSocket(spec.types);
          node.addOutput(new Rete.Output(key, key, socket));
          
          // type -> control generation mappings
          let typeControls: {[key: string]: () => Rete.Control} = {
            'Text': () => new MyControls.ControlText({
              emitter: editor, 
              key, 
              value: getInitial(node, key, spec.default ?? "")
            }),
            'Number': () => new MyControls.ControlNumber({
              emitter: editor, 
              key, 
              value: getInitial(node, key, spec.default ?? null)
            }),
            'Boolean': () => new MyControls.ControlBool({
              emitter: editor, 
              key, 
              value: getInitial(node, key, spec.default ?? null)
            })
          };

          // display control if type is text/number/bool, but can have 'None' valid type as well 
          let nonNullTypes: string[] = spec.types.filter(t => t != 'None');
          if( nonNullTypes.length == 1 && nonNullTypes[0] in typeControls) {
            // generate control based on type
            let ctrl = typeControls[nonNullTypes[0]]();
            // add to node and map to output
            node.addControl(ctrl);
            getOutputControls(node)[key] = ctrl.key;
          }

          // let outputCtrls = getOutputControls(node);

          // if (spec.type === "Text") {
          //   let ctrl = new MyControls.ControlText({
          //     emitter: editor, 
          //     key, 
          //     value: getInitial(node, key, spec.default ?? "")
          //   });
          //   node.addControl(ctrl);
          //   outputCtrls[key] = ctrl.key;

          // } else if (spec.type === "Number") {
          //   let ctrl = new MyControls.ControlNumber({
          //     emitter: editor, 
          //     key, 
          //     value: getInitial(node, key, spec.default ?? null)
          //   });
          //   node.addControl(ctrl);
          //   outputCtrls[key] = ctrl.key;

          // } else if (spec.type === "Boolean") {
          //   let ctrl = new MyControls.ControlBool({
          //     emitter: editor, 
          //     key, 
          //     value: getInitial(node, key, spec.default ?? null)
          //   });
          //   node.addControl(ctrl);
          //   outputCtrls[key] = ctrl.key;

          // }

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