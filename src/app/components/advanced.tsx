import * as Rete from "rete";
import { ReteReactControl as ReteControl, bindControl, bindSocket, NodeProps } from "rete-react-render-plugin";
import * as MySocket from "../sockets/sockets";
import * as Controls from  "../controls/controls";
import * as Display from "./display";
import { v4 as uuidv4 } from 'uuid';
import * as Data from "../data/attributes";
import { TypeList, ComponentBase } from './basic';
import { OptionLabel, ctrlValChange } from "../controls/controls";
import { getOutputControls } from "../data/attributes";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";
import * as ReactRete from 'rete-react-render-plugin';
import {getTitle, getInput, getControl, getSocket, getOutput, getOutput} from './display';
import { getJSONSocket, getObject, isObject, JSONObject, JSONValue } from "../jsonschema";
import { JSONTypeConvert } from '../jsonschema';
import XLSXColumn from 'xlsx-column';


export type ActionName = "add" | "remove" | "moveUp" | "moveDown";
export const TYPE_SELECT_KEY = "Select Type";
export type ActionProcess = (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => void;
export type ActionCall = (index: number, name: ActionName) => void;

/**
 * List Actions for add/remove/move up/move down
 * (Lists are not displayed with controls with outputs (unlike dicts which are))
 * - {output: control} key mappings from `getOutputControls()` function is used to track order of outputs but the `control` values are effectively ignored 
 * - getGeneralAttributes().outputTracker is used to track the total number of outputs added over time to create new names
 * - TYPE_SELECT_KEY is used to get selected type from control for new outputs
*/
export var listActions: {[index in ActionName]: ActionProcess} = {
  "add": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => {
    
    // get selected type from type selection control
    const selectedType = Data.nGetData(node)[TYPE_SELECT_KEY];
    let socket = MySocket.sockets.get(selectedType)?.socket ?? MySocket.anySocket;

    // increment output count tracker - incremented when new outputs added but not decrements when removed to avoid name conflict
    let generalAttrs = Data.getGeneralAttributes(node);
    generalAttrs.outputTracker += 1;

    // generate name with excel style key (e.g. 27 => 'AA')
    const newKey = 'Item ' + new XLSXColumn(generalAttrs.outputTracker).toString();

    // index in output list for new output follows output pressed
    const newIndex: number = idx + 1;
    // create and add new output
    let newOutput = new Rete.Output(newKey, newKey, socket) 
    node.addOutput(newOutput);

    // add mapping of new output key to same key for control (although control not actually created)
    let newMappings = Object.entries(Data.getOutputControls(node));
    newMappings.splice(newIndex, 0, [newKey, newKey]);

    // update output mappings and node
    Data.setOutputControls(node, Object.fromEntries(newMappings));
    node.update();

  },
  "remove": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => {
    
    // get number of existing outputs
    const nOutputs = node.outputs.size;

    // check index in range
    if (!(idx >= 0 && idx < nOutputs)) {
      console.error(`couldnt delete output from index, out of range "${idx}"`);
      return
    }

    // get map of output to controls
    let ctrlsMap = Data.getOutputControls(node);

    // get output from output key using its index
    let outputIds = Object.keys(ctrlsMap);
    const output = node.outputs.get(outputIds[idx]);

    // check output exists
    if(!output) {
      console.error(`unexpected error: output at index "${idx}" not found`);
      return
    }
    
    // remove output->control mapping (if exists)
    let newMappings = Object.entries(Data.getOutputControls(node));
    newMappings.splice(idx, 1);

    // create list of nodes that have a connection to the output to be updated
    // register each node with an input connected to the output being deleted
    let nds: Set<Rete.Node> = new Set<Rete.Node>([node]);
    output.connections.forEach((c: Rete.Connection): void => {
      if(c.input.node) {
        nds.add(c.input.node);
      }
    })

    // remove connections from view
    output.connections.map(c => editor.removeConnection(c));

    // remove output from node
    node.removeOutput(output);
  
    // for each affected node update its connections
    setTimeout(() => 
      nds.forEach(n => editor?.view.updateConnections({node: n})),
      10
    );

    // update output mappings and node
    Data.setOutputControls(node, Object.fromEntries(newMappings));
    node.update();

  }, 
  "moveUp": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => {

    // get number of existing outputs
    const nOutputs = node.outputs.size;
    // get [output, control] pairs
    let newMappings = Object.entries(Data.getOutputControls(node));

    if( idx > 0 && idx < nOutputs ) {
      
      // get selected element
      const m = newMappings[idx];
      // pop element out
      newMappings.splice(idx, 1);
      // move "up" (up on screen, down in list index)
      newMappings.splice(idx - 1, 0, m);

      // update output mappings and node
      Data.setOutputControls(node, Object.fromEntries(newMappings));
      node.update();

    } else {
      
      // couldnt find element
      console.warn(`cant move output index up "${idx}"`);
    }

  },
  "moveDown": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => {

    // get number of existing outputs
    const nOutputs = node.outputs.size;
    // get [output, control] pairs
    let newMappings = Object.entries(Data.getOutputControls(node));

    if( idx >= 0 && (idx + 1) < nOutputs ) {

      // get next element
      const m = newMappings[idx + 1];
      // remove next element
      newMappings.splice(idx + 1, 1);
      // insert behind - move "down" (down on screen, up in list index)
      newMappings.splice(idx, 0, m);

      // update output mappings and node
      Data.setOutputControls(node, Object.fromEntries(newMappings));
      node.update();

    } else {

      // couldnt find element
      console.warn(`cant move output index down "${idx}"`);
    }
  }
}

/**
 * Same as Base Display but outputs & their mapped controls are displayed with:
 * - arrow up button 
 * - arrow down button 
 * - plus button
 * - minus button
 * the 4 above actions call `ActionFunction()` with the corresponding `ActionName`
 */
export function listGetOutput<T extends NodeProps>(
  index: number, 
  actions: {[index in ActionName]: ActionProcess},
  props: T,
): JSX.Element {
  let outputMap = getOutputControls(props.node);
  let outputKey = Object.keys(outputMap)[index];
  let output = props.node.outputs.get(outputKey);
  let ctrlKey = outputMap[outputKey];
  let control = props.node.controls.get(ctrlKey);
  const exAction = (name: ActionName) => actions[name](props.node, props.editor, index); 
  return <div className="output" key={output.key}>
    <div className="output-title hidden-node-item">
      <div className="output-item-controls">
        <div className="output-item-arrows">
          <div>
            <button onClick={() => exAction("moveUp")}>
              <i className="fas fa-chevron-up fa-xs"></i>
            </button>
          </div>
          <div>
            <button onClick={() => exAction("moveDown")} >
              <i className="fas fa-chevron-down fa-xs"></i>
            </button>
          </div>
        </div>
        <Button variant="light" className="" size="sm" onClick={() => exAction("add")} >
          <FontAwesomeIcon icon={faPlus} />
        </Button>
        <Button variant="warning" className="" size="sm" onClick={() => exAction("remove")}>
          <FontAwesomeIcon icon={faTrash} />
        </Button>
        {control && getControl(control, props.bindControl)}
      </div>
    </div>
    {output && getSocket(output, "output", props.bindSocket)}
  </div>
}

export function getUnmappedControls(node: Rete.Node): Rete.Control[] {
  // get outputs not mapped to an output
  let outputControlKeys = Object.values(getOutputControls(node));
  return Array.from(node.controls.values())
  .filter(c => !outputControlKeys.includes(c.key))
}

export class DisplayList extends ReactRete.Node {
  render() {
    return Display.renderComponent(this.props, this.state, {
      getOutputs: (props: NodeProps) => Object.entries(getOutputControls(props.node)).map((_, index) => listGetOutput(index, listActions, props)),
      getControls: (props: NodeProps) => getUnmappedControls(props.node).map(c => getControl(c, props.bindControl))
    })
  }
}


/** 
 * convert types to option label/value pairs with a blank at the start 
 * */
export function typeLabels(): Array<OptionLabel> {
  return [{
    label: "",
    value: ""
  }].concat(TypeList.map(v => ({
    label: v,
    value: v
  })));
}




/** 
 * Change output sockets to a new type from `data` var and remove incompatible connections 
 * */
function socketUpdate(node: Rete.Node, emitter: Rete.NodeEditor, newSocket: Rete.Socket, ioList: Map<string, Rete.IO>) {
  ioList.forEach(io => {
    // get connections where new socket no longer compatible
    let invalidConnections = io.connections.filter(c => !newSocket.compatibleWith(c.input.socket));
    // remove connections
    invalidConnections.forEach(c => emitter.removeConnection(c));
    // replace socket
    io.socket = newSocket;
  })

  // update node and trigger re-render of connections
  node.update();
  setTimeout(() => 
    emitter.view.updateConnections({node}),
    10
  );
}


/** 
 * Process a control selecting a variable type by updating the control value and updating input/output sockets 
*/
export function typeSelect(
  node: Rete.Node, 
  ctrl: ReteControl, 
  emitter: Rete.NodeEditor, 
  newType: any,
  ioMap: Map<string, Rete.IO>
): void {
  let socket = MySocket.sockets.get(newType)?.socket ?? MySocket.anySocket;
  Controls.ctrlValProcess(ctrl, emitter, ctrl.key, socket.name);
  socketUpdate(node, emitter, socket, ioMap);
  emitter.trigger('process');  // trigger process so that connected nodes update
}


/**  
 * check node data for control value containing selected type to use in retrieving a socket
 * - if control data doesn't contain selected type of value is invalid, return the "any" type
 */
// TODO - is this needed?
export function getSelectedSocket(typ: string): Rete.Socket {
  return TypeList.includes(typ) ? (MySocket.sockets.get(typ)?.socket ?? MySocket.anySocket) : MySocket.anySocket;  
}


// loop outputs and set type definitions for each output to be reference by their own connections
function updateOutputTypes(node: Rete.Node, newType: string) {
  let typeMap = Data.getTypeMap(node);
  let innerTypeDefs = Data.getTypeDefinitions(node);
  node.outputs.forEach(o => {
    innerTypeDefs[o.key] = typeMap[newType];
  })
}

/** 
 * Build type selection control
 * on change, gets selected socket from type selection control (if data passed on creation else "any" socket) 
 * */
function buildSelectControl(node: Rete.Node, editor: Rete.NodeEditor): Controls.ControlSelect {
  let ctrlData = Data.nGetData(node);
  let socket = getSelectedSocket(ctrlData[TYPE_SELECT_KEY]);

  // select control to set types on outputs
  let selectValChange = (ctrl: ReteControl, emitter: Rete.NodeEditor, key: string, data: any) => {
    updateOutputTypes(node, data);
    typeSelect(node, ctrl, emitter, data, node.outputs);
  }
  return new Controls.ControlSelect(TYPE_SELECT_KEY, editor, node, {
    value: socket.name, 
    options: typeLabels(), 
  }, selectValChange);
}

/**
 * Build add element button
 */
function buildAddButton(node: Rete.Node, editor: Rete.NodeEditor, addAction: ActionProcess): Controls.ControlButton {
  // button to add output to end of output list
  let addButtonAction = () => addAction(node, editor, node.outputs.size); 
  return new Controls.ControlButton("Add Item", editor, node, {
    value: null, // ignored
    buttonInner: "Add Item +", 
  }, addButtonAction);
}

/**
 * Build node with parent, add button and type selection control 
 */
function buildNode(node: Rete.Node, editor: Rete.NodeEditor, addAction: ActionProcess, socket: Rete.Socket): void {
  node
  .addInput(new Rete.Input("parent", "Parent", socket))
  .addControl(buildAddButton(node, editor, addAction))
  .addControl(buildSelectControl(node, editor));
}

/**
 * Validate JSON value matches type 
 * check a JSON value is an object, and contains a type that matches the current component specified type 
 * */
const validType = (property: JSONValue, name: string) => {
  if(property && typeof(property) === "object" && !Array.isArray(property)) {
    if(typeof(property.type) === "string" && JSONTypeConvert(property.type) === name) {
      return true;
    }
  }
  return false;
}


/** check a JSONValue is an object
 * if it is an object, generate a socket and use the created socket name as a key to the JSON spec
 * and add to the valid socket name map
 *  */
const assignSpec = (spec: JSONValue, typeMap: {[key: string]: JSONObject}) => {
  let _spec = getObject(spec);
  if(_spec) {
    let socketName = getJSONSocket(_spec).name;
    typeMap[socketName] = _spec;
  }
} 

/**
 * Connection created processor 
 * on connection created, set selected type to parent specification (if exists) and hide type selection control 
 * */
const connectionCreatedFunc = (connection: Rete.Connection, node: Rete.Node, socket: Rete.Socket, innerTypeKey: string) => {
  let input = connection.input
  let output =  connection.output;

  // check that the connection created is "parent" input to another node's output
  if(!(input.node === node && input.key === "parent" && output.node))
    return
  
  // get type definitions from other node and check that the output connected has type definitions
  // e.g. if parent has output "outputA" then in JSON schema should expect to see "properties": {
  // "properties": {
  //   "a": {
  //     {
  //       "properties": {
  //          ...
  let typeDefs = Data.getTypeDefinitions(output.node);
  let parentTypes = typeDefs[output.key];
  if(!parentTypes || !isObject(parentTypes))
    return 

  // map of socket/output name to Schema definitions
  // using the example above "a" properties would be stored and read by child nodes connected
  let typeMap: {[key: string]: JSONObject} = {};

  // check for parent type is a union "anyOf" - loop through each in union
  let anyOf = parentTypes.anyOf;
  if(anyOf && Array.isArray(anyOf)) {
    anyOf.forEach(t => {
      
      // check type matches component
      let o = getObject(t);
      if(o && validType(o, socket.name)) {

        // get type spec using "items" or "additionalProperties" and retrieve socket info
        assignSpec(o[innerTypeKey], typeMap);
      
      }
    });
  }
  else {

    // parent is a single definition 
    assignSpec(parentTypes[innerTypeKey], typeMap);

  }

  // assign socket name => JSON schema map to node for future reference when selecting type
  Data.setTypeMap(node, typeMap);

  // set type select to each of the socket names
  selectCtrl.props.options = Object.keys(typeMap).map(nm => ({"label": nm, "value": nm}));
  
  // use first in list for selected socket
  let newName =  Object.keys(typeMap)[0];
  this.typeSelect(node, selectCtrl, editor, newName);

}




/** 
 * List component - supports type selection, dynamic output list that can be extended and re-ordered (using `listOutputAction`) 
 * with `hasOutputControls` as true will render a text control next to each dynamic output
*/
export abstract class ListComponentBase extends ComponentBase {
  abstract innerTypeKey: string;
  abstract hasOutputControls: boolean;
  abstract socket: Rete.Socket;

  // loop outputs and set type definitions for each output to be reference by their own connections
  updateOutputTypes(node: Rete.Node, newType: string) {
    let typeMap = Data.getTypeMap(node);
    let innerTypeDefs = Data.getTypeDefinitions(node);
    node.outputs.forEach(o => {
      innerTypeDefs[o.key] = typeMap[newType];
    })
  }

  typeSelect(node: Rete.Node, ctrl: ReteControl, emitter: Rete.NodeEditor, newType: any) {
    this.updateOutputTypes(node, newType);
    typeSelect(node, ctrl, emitter, newType, node.outputs);
  }


  _builder(node: Rete.Node, editor: Rete.NodeEditor) {
    
    // build node with list action to add and list socket
    let socket = MySocket.listSocket;
    buildNode(node, editor, listActions["add"], socket)
      
    // add output for each specified in data passed to builder
    let outputCtrls = Data.getOutputControls(node);
    Object.entries(outputCtrls).forEach(([outputKey, ctrlKey]) => node.addOutput(new Rete.Output(outputKey, outputKey, socket)));

    // initialise output tracker length for "add" action to read when creating new outputs
    Data.getGeneralAttributes(node).outputTracker = Object.keys(outputCtrls).length;


    //   // add output using the output key
    //   node.addOutput(new Rete.Output(outputKey, outputKey, socket));

    //   // add control using mapped control key
    //   this.hasOutputControls && node.addControl(new Controls.ControlText(ctrlKey, editor, node, {
    //     value: ctrlData[ctrlKey]
    //   }));
    // });

    
    /** check a JSON value is an object, and contains a type that matches the current component specified type */
    const validType = (property: JSONValue) => {
      if(property && typeof(property) === "object" && !Array.isArray(property)) {
        if(typeof(property.type) === "string" && JSONTypeConvert(property.type) === this.socket.name) {
          return true;
        }
      }
      return false;
    }

    /**
     * Connection created processor 
     * on connection created, set selected type to parent specification (if exists) and hide type selection control 
     * */
    const connectionCreatedFunc: Data.ConnectionFunc = (connection: Rete.Connection) => {
      let input = connection.input
      let output =  connection.output;

      // check that the connection created is "parent" input to another node's output
      if(!(input.node === node && input.key === "parent" && output.node))
        return
      
      // get type definitions from other node and check that the output connected has type definitions
      let typeDefs = Data.getTypeDefinitions(output.node);
      let parentTypes = typeDefs[output.key];
      if(!parentTypes || !isObject(parentTypes))
        return 

      // map of socket name: Schema definitions
      let typeMap: {[key: string]: JSONObject} = {};



      let anyOf = parentTypes.anyOf;
      if(anyOf && Array.isArray(anyOf)) {
        
        // parent type is a union "anyOf" - loop through each in union
        anyOf.forEach(t => {
          
          // check type matches component
          let o = getObject(t);
          if(o && validType(o)) {
            // get type spec using "items" or "additionalProperties" and retrieve socket info
            assignSpec(o[this.innerTypeKey]);
          }
        });
      }
      else {

        // parent is a single definition 
        assignSpec(parentTypes[this.innerTypeKey]);

      }

      // assign socket name => JSON schema map to node for future reference when selecting type
      Data.setTypeMap(node, typeMap);

      // set type select to each of the socket names
      selectCtrl.props.options = Object.keys(typeMap).map(nm => ({"label": nm, "value": nm}));
      
      // use first in list for selected socket
      let newName =  Object.keys(typeMap)[0];
      this.typeSelect(node, selectCtrl, editor, newName);

    }


    /** on connection removed  */
    const connectionRemovedFunc: Data.ConnectionFunc = (connection: Rete.Connection) => {
      if(connection.input.node === node && connection.input.key === "parent") {
        // clear output type definitions
        Data.setTypeDefinitions(node, {});

        // reset select type options to defaults
        selectCtrl.props.options = typeLabels();

        // change sockets/connections and reset type to "any"
        this.typeSelect(node, selectCtrl, editor, MySocket.anySocket.name);
      }
    }

    Data.setConnectionFuncs(node, {
      "created": connectionCreatedFunc, 
      "removed": connectionRemovedFunc
    });
  }
}



/** Same as dictionary component but without output controls */
export class ComponentList extends ListComponentBase {
  innerTypeKey = "items"
  hasOutputControls = false
  socket = MySocket.listSocket;
  data = {component: DisplayList}
  constructor() {	
      super('List');
  }
}



const _default = {
  ComponentDict,
  ComponentList,
}
export default _default;