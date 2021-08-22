import * as Rete from 'rete';
import { ReteComponent } from "../../rete/component";
import {sockets} from "../sockets/sockets";
import * as Sockets from "../sockets/sockets";
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

function get_ref_name(ref_str: string): string | null {
  return /.*\/(?<name>.*)$/.exec(ref_str)?.groups?.name ?? null;
}

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

  has_output(property: JSONObject) {
    if(property["const"]) {
      return false;
    } else {
      return true;
    }
  }

  get_socket(property: JSONObject): Rete.Socket {
    if( !isObject(property) ) {
      console.log(property);
      throw new Error(`^ expected property to be of type object`);
    }

    let varType = property["type"] ? String(property["type"]) : "";
    let anyOf = property["anyOf"];
    let varRef = property["$ref"];
    let varItems = property["items"];
    let ap = property["additionalProperties"];
    const anySocketContainer = (baseName: string) => Sockets.multiSocket(
      [Sockets.anySocket.name],
      `${baseName}[${Sockets.anySocket.name}]`, 
      Sockets.anyColour
    );
    const getInnerSocket = (innerVarName: string, innerVar: JSONObject, baseName: string) => {
      let innerSocket =  this.get_socket(innerVar);
      if(innerSocket) {
        let nm = `${baseName}[${innerSocket?.name}]`;
        let socket = Sockets.multiSocket(
          innerSocket.compatible.map(s => s.name), 
          nm, 
          Sockets.listColour
        );
        return socket;
      } else {
        throw new Error(`couldnt retrieve inner socket from "${innerVarName}" parameter`);
      }
    }

    if(varRef) {
      if(typeof varRef === "string") {
        let refName = get_ref_name(varRef);
        if( refName ) {
          return Sockets.multiSocket([refName], refName);
        } else {
          throw new Error('Socket format invalid')
        }
      } else {
        throw new Error(`expected "$ref to be a string`);
      }
    } else if(["string", "integer", "number", "boolean", "null"].includes(varType)) {
      return Sockets.multiSocket([Sockets.JSONTypeConvert(varType)]);
    } else if( varType === "array" ) {
      let arrayName = Sockets.JSONTypeConvert("array");
      if(varItems) {
        if(typeof varItems === "object" && Array.isArray(varItems)) {
          throw new Error('Currently do not support items in list form')
        } else if(typeof varItems === "object" && !Array.isArray(varItems)) {
          return getInnerSocket("items", varItems as JSONObject, arrayName);
        } else {
          throw new Error('unknown format of array items');
        }
      } else {
        return anySocketContainer(arrayName);
      }
    } else if( varType === "object" ) {
      let objectName = Sockets.JSONTypeConvert("object");
      if(property["properties"]) {
        throw new Error(`property has its own properties set - this should be defined as its own type in "definitions"`);
      }
      if(ap !== null && typeof ap === "object" && !Array.isArray(ap)) {
        getInnerSocket("additionalProperties", ap as JSONObject, objectName)
      } else {
        return anySocketContainer(objectName);
      }
    } else if( anyOf ) {
      if( typeof anyOf === "object" && Array.isArray(anyOf)) {
        let innerSockets = anyOf.map(t => this.get_socket(t as JSONObject)).filter((s): s is Rete.Socket => Boolean(s));
        let socketName = Sockets.getTypeString(innerSockets.map(s => s.name));
        let socket = Sockets.sockets.get(socketName)?.socket;
        if(!socket) {
          let newSocket = Sockets.multiSocket([],  socketName);
          innerSockets.forEach(s => newSocket.combineWith(s));
          return newSocket;
        } else {
          return socket;
        }
      } else {
        throw new Error(`expected "anyOf" of property to be an array`);
      }
    } 
      
    return Sockets.anySocket;
    
  }

  process_property(node: Rete.Node, editor: Rete.NodeEditor, key: string, property: JSONObject) {
    let nodeData = Data.nGetData(node);
    const addControl = (var_default: any, control_type: any, control_kwargs?: {[key: string]: any}) => {
      let val = nodeData[key] ?? (property && property["default"]) ?? var_default;
      nodeData[key] = val;
      let x = {
        emitter: editor, 
        key: key, 
        value: val
      }
      let ctrl = new control_type({...x, ...control_kwargs});
      node.addControl(ctrl);
      Data.getOutputControls(node)[key] = key;
    }

    let var_type = property["type"] ? String(property["type"]) : "";

    if(property["const"]) {
      nodeData[key] = property["const"];
    } else {
      if( var_type === "string") {
        addControl("", MyControls.ControlText);
      } else if( var_type === "integer" || var_type === "number" ) {
        addControl(null, MyControls.ControlNumber);
      } else if( var_type === "boolean") {
        addControl(null, MyControls.ControlBool);
      } 
      
      let title = property["title"] ? String(property["title"]) : key;
      let socket = this.get_socket(property);
      let output = new Rete.Output(key, title, socket)
      node.addOutput(output);
    }
  }

  _builder(node: Rete.Node, editor: Rete.NodeEditor) {
    node.addInput(new Rete.Input("parent", "Parent", this.socket));
    let spec = getObject(this.varSpec);
    if(spec) {
      let required: string[] = spec["required"] as string[] ?? [];
      let properties = getObject(spec["properties"]);
      if(properties) {
        Object.entries(properties).forEach(([k, v]) => {
          let property = getObject(v);
          if(property) {
            if( !required.includes(k) ) {
              Data.getOutputNulls(node)[k] = property["default"] === null || property["default"] === undefined;
            }
            this.process_property(node, editor, k, property);
            // let var_type = property["type"] ? String(property["type"]) : "";
            // let socket: Rete.Socket = multiSocket([var_type])
            // node.addOutput(new Rete.Output(k, k, socket));
            // const addControl = (var_default: any, control_type: any, control_kwargs?: {[key: string]: any}) => {
            //   let val = nodeData[k] ?? (property && property["default"]) ?? var_default;
            //   nodeData[k] = val;
            //   let x = {
            //     emitter: editor, 
            //     key: k, 
            //     value: val
            //   }
            //   let ctrl = new control_type({...x, ...control_kwargs});
            //   node.addControl(ctrl);
            //   Data.getOutputControls(node)[k] = k;
            // }
            // if(property["const"]) {
            //   nodeData[k] = property["const"];
            // } else if( var_type === "string") {
            //   addControl("", MyControls.ControlText);
            // } else if( var_type === "integer" || var_type === "number" ) {
            //   addControl(0, MyControls.ControlNumber);
            // } else if( var_type === "boolean") {
            //   addControl(null, MyControls.ControlBool);
            // } else if( var_type === "array" ) {
            //   if(property["items"]) {

            //   }
            // }
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