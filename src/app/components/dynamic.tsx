import * as Rete from 'rete';
import { ComponentBase } from "../../rete/component";
import { sockets, getTypeString, multiSocket } from "../sockets/sockets";
import * as MyControls from "../controls/controls";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import { DisplayDynamicBase } from "./display";
import * as Data from "../data/component";
import {  TypeList } from "./basic";
import { getInitial, VariableType } from '../data/component';
import { TypeVariable } from 'typescript';



/** add custom type to valid type list */
export const addType = (newType: string) => TypeList.push(newType);


/** Dynamic component */
class DisplayDynamic extends DisplayDynamicBase {
  nullButtonClick(output: Rete.Output): void {
    let outputNulls = Data.getOutputNulls(this.props.node);
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

  builder(node: Rete.Node): Promise<void> {
    const editor: Rete.NodeEditor | null = this.editor;
    return new Promise<void>(res => {
      if (editor) {
        node.addInput(new Rete.Input("parent", "Parent", this.socket));

        let _varSpec = new Map<string, VariableType>(this.varSpec); // create copy to modify
        _varSpec.forEach((spec, key) => {
          spec.types.forEach(t => {
            if (!TypeList.includes(t))
              throw new Error(`in var "${key}", type "${t}" not recognised`);
              if (!sockets.has(t))
                throw new Error(`in var "${key}", type "${t}" has no socket`);
          });
          
          // if 'None' is a valid type set null indicator based on default value
          if (spec.types.includes('None'))
          Data.getOutputNulls(node)[key] = spec.default === null;
           
          // create socket from list of valid types and use to create output
          let socketName = getTypeString(spec.types.map(s => {
            if(s == 'List') {
              spec.listTypes = spec.listTypes ?? ['Any'];
              return `List[${getTypeString(spec.listTypes)}]`;
            } else if (s == 'Dictionary') {
              spec.dictTypes = spec.dictTypes ?? ['Any'];
              return `List[${getTypeString(spec.dictTypes)}]`;
            } else {
              return s;
            }
          }));

          let socket = multiSocket(spec.types, socketName);
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
            Data.getOutputControls(node)[key] = ctrl.key;
          }


        });

        Data.setTypeDefinitions(node, Object.fromEntries(_varSpec));
      }

      res();
    });
  }
  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
    this.varSpec.forEach((spec, k) => outputs[k] = spec);
    console.log(this.varSpec);
  }
}

const _default = {
  ComponentDynamic
}; 
export default _default;