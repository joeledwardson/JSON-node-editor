import * as Rete from 'rete';
import { ReteComponent } from "../../rete/component";
import { sockets, getTypeString, multiSocket } from "../sockets/sockets";
import * as MyControls from "../controls/controls";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import { DisplayDynamicBase } from "./display";
import * as Data from "../data/component";
import {  ComponentBase, TypeList } from "./basic";
import { getInitial, VariableType } from '../data/component';
import { TypeVariable } from 'typescript';
import { stringify } from 'uuid';



/** add custom type to valid type list */
export const addType = (newType: string) => TypeList.push(newType);

type JSONObject = { [key: string]: JSONValue }; 
type JSONValue =
| Partial<{ [key: string]: JSONValue }>
| JSONValue[]
| string
| number
| boolean
| null;
const isObject = (v: JSONValue) => Boolean(v && typeof v === "object" && !Array.isArray(v));
const isArray = (v: JSONValue) => Boolean(v && typeof v === "object" && Array.isArray(v));

const getObject = (v: JSONValue) => isObject(v) ? v as JSONObject : null;
const getArray = (v: JSONValue) => isArray(v) ? v as Array<JSONObject> : null;

const isJSONObject = (v: JSONObject) => v["type"] && v["type"] === "object";
const isJSONString = (v: JSONObject) => v["type"] && v["type"] === "string";
const isJSONNumber = (v: JSONObject) => v["type"] && v["type"] === "number";
const isJSONInteger = (v: JSONObject) => v["type"] && v["type"] === "integer";
const isJSONBool = (v: JSONObject) => v["type"] && v["type"] === "boolean";


/** Dynamic component */
class DisplayDynamic extends DisplayDynamicBase {
  nullButtonClick(output: Rete.Output): void {
    // get "null" value
    let outputNulls = Data.getOutputNulls(this.props.node);
    
    // if not "null" then user is clicking to null, delete all connections
    if(!(outputNulls[output.key])) {
      output.connections.forEach(c => this.props.editor.removeConnection(c))
    }

    // invert "null" value
    outputNulls[output.key] = !outputNulls[output.key];
    
    // update node and connections
    this.props.node.update();
    this.props.editor.view.updateConnections({node: this.props.node});
  }
}
export class ComponentDynamic extends ComponentBase {
  data = { component: DisplayDynamic };
  socket: Rete.Socket;
  varSpec: JSONValue;
  constructor(name: string, varSpec: JSONValue) {
    super(name);
    let socket = sockets.get(name)?.socket;
    if (!socket) {
      throw new Error(`expected socket "${name}" to exist!`);
    }
    this.socket = socket;
    this.varSpec = varSpec;
  }

  _builder(node: Rete.Node, editor: Rete.NodeEditor) {
    node.addInput(new Rete.Input("parent", "Parent", this.socket));

    // create copy of variable specifications to modify
    let _varSpec = this.varSpec;
    

    let nodeData = Data.nGetData(node);
    let spec = getObject(this.varSpec);
    if(spec) {
      let required: string[] = spec["required"] as string[] ?? [];
      let properties = getObject(spec["properties"]);
      if(properties) {
        Object.entries(properties).forEach(([k, v]) => {
          let property = getObject(v);
          if(property) {

            if( !required.includes(k) ) {
              Data.getOutputNulls(node)[k] = property["default"] === null;
            }
            let var_type = property["type"] ? String(property["type"]) : "";
            let socket: Rete.Socket = multiSocket([var_type])
            node.addOutput(new Rete.Output(k, k, socket));
            const addControl = (var_default: any, control_type: any, control_kwargs?: {[key: string]: any}) => {
              let val = nodeData[k] ?? (property && property["default"]) ?? var_default;
              nodeData[k] = val;
              let x = {
                emitter: editor, 
                key: k, 
                value: val
              }
              let ctrl = new control_type({...x, ...control_kwargs});
              node.addControl(ctrl);
              Data.getOutputControls(node)[k] = k;
            }
            if(property["const"]) {
              nodeData[k] = property["const"];
            } else if( var_type === "string") {
              addControl("", MyControls.ControlText);
            } else if( var_type === "integer" || var_type === "number" ) {
              addControl(0, MyControls.ControlNumber);
            } else if( var_type === "boolean") {
              addControl(null, MyControls.ControlBool);
            }
          }
        });
      }
    }

    // _varSpec.forEach((spec, key) => {
    //   // check each type in variable spec is valid
    //   spec.types.forEach(t => {
    //     if (!TypeList.includes(t))
    //       throw new Error(`in var "${key}", type "${t}" not recognised`);
    //       if (!sockets.has(t))
    //         throw new Error(`in var "${key}", type "${t}" has no socket`);
    //   });
      
    //   // if 'None' is a valid type set null indicator based on default value
    //   if (spec.types.includes('None'))
    //   Data.getOutputNulls(node)[key] = spec.default === null;
        
    //   // create socket name from list of types combining with list/dict internal types
    //   let socketName = getTypeString(spec.types.map(s => {
    //     if(s == 'List') {
    //       spec.listTypes = spec.listTypes ?? ['Any'];
    //       return `List[${getTypeString(spec.listTypes)}]`;
    //     } else if (s == 'Dictionary') {
    //       spec.dictTypes = spec.dictTypes ?? ['Any'];
    //       return `Dict[${getTypeString(spec.dictTypes)}]`;
    //     } else {
    //       return s;
    //     }
    //   }));

    //   // created socket based on constructed name and accepted types
    //   let socket = multiSocket(spec.types, socketName);
    //   node.addOutput(new Rete.Output(key, key, socket));
      
    //   // type -> control generation mappings
    //   let typeControls: {[key: string]: () => Rete.Control} = {
    //     'Text': () => new MyControls.ControlText({
    //       emitter: editor, 
    //       key, 
    //       value: getInitial(node, key, spec.default ?? "")
    //     }),
    //     'Number': () => new MyControls.ControlNumber({
    //       emitter: editor, 
    //       key, 
    //       value: getInitial(node, key, spec.default ?? null)
    //     }),
    //     'Boolean': () => new MyControls.ControlBool({
    //       emitter: editor, 
    //       key, 
    //       value: getInitial(node, key, spec.default ?? null)
    //     })
    //   };

    //   // display control if type is text/number/bool, but can have 'None' valid type as well 
    //   let nonNullTypes: string[] = spec.types.filter(t => t != 'None');
    //   if( nonNullTypes.length == 1 && nonNullTypes[0] in typeControls) {
        
    //     // generate control based on type
    //     let ctrl = typeControls[nonNullTypes[0]]();

    //     // add to node and map to output
    //     node.addControl(ctrl);
    //     Data.getOutputControls(node)[key] = ctrl.key;
    //   }

    // });

    // // set type definitions in node data so that connectio components can read list/dict element types
    // Data.setTypeDefinitions(node, Object.fromEntries(_varSpec));
  
  }
  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
    // this.varSpec.forEach((spec, k) => outputs[k] = spec);
    // console.log(this.varSpec);
  }
}

const _default = {
  ComponentDynamic
}; 
export default _default;