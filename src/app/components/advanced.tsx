import * as Rete from "rete";
import { ReteReactControl as ReteControl } from "../retereact";
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
import {getTitle, getInput, getControl, getSocket} from './display';
import { getJSONSocket, getObject, isObject, JSONObject, JSONValue } from "../jsonschema";
import { JSONTypeConvert } from '../jsonschema';


type ListAction = "add" | "remove" | "moveUp" | "moveDown";
type ListActionFunction = (index: number, action: ListAction) => void;

const TYPE_SELECT_KEY = "Select Type";

/**
 * Same as Base Display but outputs & their mapped controls are displayed with:
 * - arrow up button 
 * - arrow down button 
 * - plus button
 * - minus button
 * the 4 above actions call `ListActionFunction()`
 */
 export abstract class DisplayListBase extends ReactRete.Node {
  abstract action: ListActionFunction
  getOutput(output: Rete.Output, index: number): JSX.Element {
    let ctrlKey = getOutputControls(this.props.node)[output.key];
    let ctrl = ctrlKey && this.props.node.controls.get(ctrlKey);
    return <div className="output" key={output.key}>
      <div className="output-title hidden-node-item">
        <div className="output-item-controls">
          <div className="output-item-arrows">
            <div>
              <button onClick={() => this.action(index, "moveUp")} >
                <i className="fas fa-chevron-up fa-xs"></i>
              </button>
            </div>
            <div>
              <button onClick={() => this.action(index, "moveDown")} >
                <i className="fas fa-chevron-down fa-xs"></i>
              </button>
            </div>
          </div>
          <Button variant="light" className="" size="sm" onClick={() => this.action(index, "add")} >
            <FontAwesomeIcon icon={faPlus} />
          </Button>
          <Button variant="warning" className="" size="sm" onClick={() => this.action(index, "remove")}>
            <FontAwesomeIcon icon={faTrash} />
          </Button>
          {ctrl && getControl(ctrl, this.props.bindControl)}
        </div>
      </div>
      {getSocket(output, "output", this.props.bindSocket)}
    </div>
  }

  render() {
    const { node, bindSocket, bindControl } = this.props;
    const { controls, inputs, selected } = this.state;
    let ctrlMaps = getOutputControls(this.props.node);
    let ctrlKeys = Object.values(ctrlMaps);    
    let _outputs = Object.keys(ctrlMaps).map(k => this.props.node.outputs.get(k));    
    
    return (
      <div className={`node ${selected}`}>
        {getTitle(node.name)}
        {/* Outputs - display in order of output->ctrl mapping object (if exist) */}
        { _outputs.map((output, index) => output && this.getOutput(output, index))}
        {/* Controls (check not mapped to output) */}
        <div className="controls-container" >
        {controls.map((control) => !ctrlKeys.includes(control.key) && getControl(control, bindControl))}
        </div>        
        {/* Inputs */}
        {inputs.map((input) => getInput(input, bindControl, bindSocket))}
      </div>
    );
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
 * perform an action on a dynamic list output 
 * if `hasOutputControls` is True then controls will be added next to outputs, where (output key)->(control key) mappings are used
 * if `hasOutputControls` is False no controls are added next to outputs, but (output key)->"" mappings are still used to denote order of outptus
 * */
async function listOutputAction(
  editor: Rete.NodeEditor,
  node: Rete.Node, 
  idx: number, 
  action: Display.ListAction,
  hasOutputControls: boolean,
): Promise<void> {
  return new Promise((res, rej) => { 
    // get controls data and output->controls map
    let ctrlData = Data.nGetData(node);
    let ctrlsMap = Data.getOutputControls(node);

    // get number of existing outputs
    const nOutputs = node.outputs.size;
    
    // create list of nodes that have a connection to the output to be updated
    let nds: Set<Rete.Node> = new Set<Rete.Node>([node]);
    
    // get selected type from type selection control
    const selectedType = ctrlData[TYPE_SELECT_KEY];
    let socket = MySocket.sockets.get(selectedType)?.socket ?? MySocket.anySocket;
    
    
    if (!(socket instanceof Rete.Socket)) {
      return rej(`couldnt find type socket type "${selectedType}"`);
    }    

    // info logging
    console.log("output key " + idx + " processing, action: " + action);
    console.log(`found ${nOutputs} existing outputs`);
    
    // get entries array for output->ctrl mappings to modify
    let newMappings = Object.entries(Data.getOutputControls(node));

    if (action === "add") {
      // index in output list for new output follows output pressed
      const newIndex: number = idx + 1;

      // generate output with new unique key and add to node
      const newKey: string = uuidv4(); 
      node.addOutput(new Rete.Output(newKey, newKey, socket));

      // if no output control exists use blank for output-ctrl mapping
      let ctrlKey = "";
      if( hasOutputControls ) {
        // set ctrl key to unique ID, create new control for output and add to node
        ctrlKey = uuidv4();
        node.addControl(new Controls.ControlText(ctrlKey, editor, node, {value: ""}));
      } 

      // add mapping 
      newMappings.splice(newIndex, 0, [newKey, ctrlKey]);


    } else if (action === "remove") {
      
      if (idx >= 0 && idx < nOutputs) {
        // get output from output key using its index
        const output = node.outputs.get(Object.keys(ctrlsMap)[idx]);

        if( output ) {
          // remove mapped output control if it exists
          let ctrl = node.controls.get(ctrlsMap[output.key]);
          if( ctrl instanceof Rete.Control ) {
            node.removeControl(ctrl);  // remove control from node
          }
          // remove output->control mapping (if exists)
          newMappings.splice(idx, 1);
          // delete ctrlsMap[output.key];       

          // register each node with an input connected to the output being deleted
          output.connections.forEach((c: Rete.Connection): void => {
            c.input.node && nds.add(c.input.node);
          })

          // remove connections from view
          output.connections.map(c => editor.removeConnection(c));

          // remove output from node
          node.removeOutput(output);
        } else {
          console.error(`unexpected error: output at index "${idx}" not found`)
        }

      } else {
        console.error(`couldnt delete output form index, out of range "${idx}"`);
      }

    } else if (action === "moveUp") {

      if( idx > 0 && idx < nOutputs ) {
        // pop element out and move "up" (up on screen, down in list index)
        const m = newMappings[idx];
        newMappings.splice(idx, 1);
        newMappings.splice(idx - 1, 0, m);
      } else {
        // couldnt find element
        console.warn(`cant move output index up "${idx}"`);
      }

    } else if (action === "moveDown") {

      if( idx >= 0 && (idx + 1) < nOutputs ) {
        // pop element out and move "down" (down on screen, up in list index)
        // remove next element and insert behind 
        const m = newMappings[idx + 1];
        newMappings.splice(idx + 1, 1);
        newMappings.splice(idx, 0, m);
      } else {
        // couldnt find element
        console.warn(`cant move output index down "${idx}"`);
      }
    }
    // update output mappings
    Data.setOutputControls(node, Object.fromEntries(newMappings));

    // update node
    node.update();

    // for each affected node update its connections
    setTimeout(() => 
      nds.forEach(n => editor?.view.updateConnections({node: n})),
      10
    );

    // resolve promise
    res();

  });
}


/** 
 * Dictionary display component - listOutputAction `hasOutputControls` set to true as dictionary outputs have text controls for keys 
 * */
class DisplayDict extends DisplayListBase {
  action = (index: number, action: Display.ListAction) => listOutputAction(this.props.editor, this.props.node, index, action, true);
}


/** 
 * Display list component - listOutputAction `hasOutputControls` set to false as list outputs do not have have text input keys 
 * */
class DisplayList extends DisplayListBase{
  action = (index: number, action: Display.ListAction) => listOutputAction(this.props.editor, this.props.node, index, action, false);
}


/** 
 * Change output sockets to a new type from `data` var and remove incompatible connections 
 * */
function socketUpdate(node: Rete.Node, emitter: Rete.NodeEditor, newSocket: Rete.Socket, ioList: Map<string, Rete.IO>) {
  ioList.forEach(io => {
    let invalidConnections = io.connections.filter(c => !newSocket.compatibleWith(c.input.socket));
    invalidConnections.forEach(c => emitter.removeConnection(c));
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
function typeSelect(
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
function getSelectedSocket(typ: string): Rete.Socket {
  return TypeList.includes(typ) ? (MySocket.sockets.get(typ)?.socket ?? MySocket.anySocket) : MySocket.anySocket;  
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
    let ctrlData = Data.nGetData(node);
    let socket = getSelectedSocket(ctrlData[TYPE_SELECT_KEY]);
    let selectCtrl = new Controls.ControlSelect(
      TYPE_SELECT_KEY, 
      editor, 
      node,
      {
        value: socket.name, 
        options: typeLabels(), 
      }, 
      (ctrl: ReteControl, emitter: Rete.NodeEditor, key: string, data: any) => this.typeSelect(node, ctrl, emitter, data)
    );
    node
      .addInput(new Rete.Input("parent", "Parent", this.socket))
      .addControl(new Controls.ControlButton(
        "Add Item", 
        editor, 
        node, 
        {
          value: null, // ignored
          buttonInner: "Add Item +", 
        }, 
        () => listOutputAction(editor, node, node.outputs.size, "add", this.hasOutputControls)  // add output to end of output list
      ))
      .addControl(selectCtrl);
    
      
    // loop output->control mappings from node data
    let outputCtrls = Data.getOutputControls(node);
    Object.entries(outputCtrls).forEach(([outputKey, ctrlKey]) => {

      // add output using the output key
      node.addOutput(new Rete.Output(outputKey, outputKey, socket));

      // add control using mapped control key
      this.hasOutputControls && node.addControl(new Controls.ControlText(ctrlKey, editor, node, {
        value: ctrlData[ctrlKey]
      }));
    });

    
    /** check a JSON value is an object, and contains a type that matches the current component specified type */
    const validType = (property: JSONValue) => {
      if(property && typeof(property) === "object" && !Array.isArray(property)) {
        if(typeof(property.type) === "string" && JSONTypeConvert(property.type) === this.socket.name) {
          return true;
        }
      }
      return false;
    }

    /** on connection created, set selected type to parent specification (if exists) and hide type selection control */
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

      /** check a JSONValue is an object
       * if it is an object, generate a socket and use the created socket name as a key to the JSON spec
       * and add to the valid socket name map
       *  */
      const assignSpec = (spec: JSONValue) => {
        let _spec = getObject(spec);
        if(_spec) {
          let socketName = getJSONSocket(_spec).name;
          typeMap[socketName] = _spec;
        }
      } 

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


/** Dictionary component - labelled dynamic outputs that can be re-ordered/modified  */
export class ComponentDict extends ListComponentBase {
  innerTypeKey = "additionalProperties"
  hasOutputControls = true
  socket = MySocket.dictSocket;
  data = {component: DisplayDict}
  constructor() {	
      super('Dictionary');
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


// function block/variable constants
const FUNCTION_BLOCK = 'Function Block'
const FUNCTION_VARIABLE = 'Function Variable';
const FUNCTION_VARIABLE_NAMEVAR = "name";
export const FUNCTION_BLOCK_PROCESSOR = "functionBlockProcessor";
const FUNCTION_BLOCK_NAMEVAR = "Function Name";

/** Function block variable  */
export class ComponentFunctionVar extends ComponentBase {
  constructor() {
    super(FUNCTION_VARIABLE);
  }
  data = {component: Display.DisplayBase};
  _builder(node: Rete.Node, editor: Rete.NodeEditor) {
    // get controls data
    let ctrlData = Data.nGetData(node);
    
    /** Recursively search for function block parent and call its processor to update inputs */
    function callBlockProcessor(n: Rete.Node) {
      if(n.name === FUNCTION_BLOCK) {
        // found function block node, run function block processor
        let funcs = Data.getGeneralFuncs(n);
        let p = funcs[FUNCTION_BLOCK_PROCESSOR];
        p && p();
      } else {
        // not function block node, call function again on its parents
        n.inputs.forEach(i => {
          i.connections.forEach(c => {
            c.output.node && callBlockProcessor(c.output.node)
          })
        });
      }
    }

    const varTypeSelect = (ctrl: ReteControl, emitter: Rete.NodeEditor, key: string, data: any) => {
      // update output types
      typeSelect(node, ctrl, emitter, data, node.inputs);
      // update function block parent (if exist)
      callBlockProcessor(ctrl.getNode());
    }
    
    // get selected type and generate control for selecting type that controls the output socket/type
    let socket = getSelectedSocket(ctrlData[TYPE_SELECT_KEY]);
    let selectCtrl = new Controls.ControlSelect(
      TYPE_SELECT_KEY, 
      editor, 
      node,
      {
        value: socket.name, 
        options: typeLabels(),
      }, 
      varTypeSelect
    );

    // create data handler function that updates control value as standard and invokes function block parent processor
    function dataHandler(ctrl: ReteControl, emitter: Rete.NodeEditor, key: string, data: any) {
      Controls.ctrlValProcess(ctrl, emitter, key, data);
      callBlockProcessor(node);
    }

    // create control for variable name that updates parent function block on change
    let nameCtrl = new Controls.ControlText(FUNCTION_VARIABLE_NAMEVAR, editor, node, {
      value: ctrlData[FUNCTION_VARIABLE_NAMEVAR] ?? "",
    }, dataHandler);

    // add controls and parent input to node
    let parent = new Rete.Input("parent", "Parent", socket);
    node
      .addControl(selectCtrl)
      .addInput(parent)
      .addControl(nameCtrl);

  }
}


/** Function block */
export class ComponentFunctionBlock extends ComponentBase {
  constructor() {
    super(FUNCTION_BLOCK);
  }
  data = {component: Display.DisplayBase};
  _builder(node: Rete.Node, editor: Rete.NodeEditor) {
    // mark node as a function block
    Data.setNodeIdentifiers(node, {"isFunctionBlock": true, "functionBlockId": uuidv4()});

    // get socket from selected type in node data - otherwise will default to any Socket
    let ctrlData = Data.nGetData(node);
    let socket = getSelectedSocket(ctrlData[TYPE_SELECT_KEY]);

    // create type selection control with all types - value changer sets type and updates sockets
    let selectCtrl = new Controls.ControlSelect(
      TYPE_SELECT_KEY, 
      editor, 
      node,
      {
        value: socket.name, 
        options: typeLabels(), 
      }, 
      (ctrl: ReteControl, emitter: Rete.NodeEditor, key: string, data: any) => typeSelect(node, ctrl, emitter, data, node.outputs)
    );

    // create function block name control
    let nameCtrl = new Controls.ControlText(FUNCTION_BLOCK_NAMEVAR, editor, node, {
      value: ctrlData[FUNCTION_BLOCK_NAMEVAR] ?? ""
    });

    // add controls and output to node
    node
      .addControl(selectCtrl)
      .addOutput(new Rete.Output("output", "Output", socket))
      .addControl(nameCtrl);

    // helper function to retrieve type selection value (or "any") from function variable component
    const getVarType = (n: Rete.Node) : string => {
      let typeName = Data.nGetData(n)[TYPE_SELECT_KEY];
      return typeName ? String(typeName) :  MySocket.anySocket.name;
    }
    // helper function to retrieve name (or blank string) from function variable component
    const getVarName = (n: Rete.Node): string => {
      let name = Data.nGetData(n)[FUNCTION_VARIABLE_NAMEVAR];
      return name ? String(name) : "";
    }

    /** Node processing function to recursively search down node outputs and add function variables as inputs */
    function nodeProcessor(n: Rete.Node) {
      if(n.name === FUNCTION_VARIABLE) {
        // node is function variable - get selected type and variable name
        let varType: string = getVarType(n);
        let varName: string = getVarName(n);
        if(!node.inputs.has(varName)) {
          // add input with function variable name & socket if input with same name doesnt already exist
          let s = getSelectedSocket(varType);
          node.addInput(new Rete.Input(varName, varName, s));
        }
      } else {
        // node is not function variable - recursively loop its outputs
        n.outputs.forEach(o => {
          o.connections.forEach(c => {
            c.input.node && nodeProcessor(c.input.node)
          })
        });
      }
    }

    /** Processor function to clear inputs and re-add from connected function variables */
    function process() {
      // remove inputs
      node.inputs.forEach(i => node.removeInput(i));
      // process node and add inputs
      nodeProcessor(node);
      // update view
      node.update();
      setTimeout(
        () => editor?.view.updateConnections({node}),
        10
      );
    }

    // set function block processor function to be read at event time and called
    Data.setGeneralFuncs(node, {
      [FUNCTION_BLOCK_PROCESSOR]: () => process()
    })
  }
}


export class ComponentFunctionCall extends ComponentBase {
  constructor() {
    super('Function Call');
  }
  data = {component: Display.DisplayBase}
  _builder(node: Rete.Node, editor: Rete.NodeEditor) {

    // handle selection change in function block
    const dataHandler = (ctrl: ReteControl, emitter: Rete.NodeEditor, key: string, data: any) => {

      
      // update selected function block ID
      Data.getNodeIdentifiers(node)["selectedFunctionId"] = data;

      // update control value and trigger process
      Controls.ctrlValProcess(ctrl, emitter, key, data);
      
    }

    // create control for selecting function block (leave options as blank, will be updated by process function later)
    let selectCtrl = new Controls.ControlSelect(
      "Select Function", 
      editor, 
      node,
      {
        value: "", 
        options: [],
      }, 
      dataHandler
    );
    node.addControl(selectCtrl);

    // processor function to update
    const updateSelect = () => {

      let options: OptionLabel[] = [];
      let functionNode: Rete.Node | null = null;  // node instance of selected function block (stays null if not found)

      editor.nodes.forEach(n => {
        
        // check node is function block, get its ID and name
        if(n.name !== FUNCTION_BLOCK) return;
        let nameData = Data.nGetData(n)[FUNCTION_BLOCK_NAMEVAR];
        let name = String(nameData);
        let blockId = Data.getNodeIdentifiers(n)["functionBlockId"]; 
        
        // check block matches current selection
        if(blockId === Data.getNodeIdentifiers(node)["selectedFunctionId"]) {
          functionNode = n as Rete.Node;  // set node instance to refer to later
        }

        // add function block name and ID to list of options for control select
        options.push({'label': name, 'value': blockId});
      });
      
      if(functionNode === null) {
        
        // if name is null then selected function block no longer valid (deleted) - clear
        Data.getNodeIdentifiers(node)["selectedFunctionId"] = "";

        // remove all controls from node except for function block selector
        node.controls.forEach(c => {
          if(c.key !== "Select Function") {
            node.removeControl(c);
          }
        });

        // clear control data
        Data.nSetData(node, {});

        // remove outputs and inputs
        node.inputs.forEach(i => node.removeInput(i));
        node.outputs.forEach(o => node.removeOutput(o));

      } 

      // typescript keeps forcing type to null??
      let _functionNode = functionNode as Rete.Node | null;  
      if(_functionNode) {

        // get function block output socket
        let socket = _functionNode.outputs.get("output")?.socket;
        if(socket) {

          // get parent input - if socket does not match remove
          let parent = node.inputs.get("parent");
          if(parent) {
            if(parent.socket.name !== socket.name) {
              node.removeInput(parent);
            }
          }

          // get parent input again - if not exist re-create with correct socket
          parent = node.inputs.get("parent"); 
          if(!parent) {
            node.addInput(new Rete.Input("parent", "Parent", socket));
          }
        }

        // loop function block inputs
        _functionNode.inputs.forEach(i => {

          // get matching output
          let output = node.outputs.get(i.key);

          if(output) {
            if(output.socket.name !== i.socket.name) {

              // remove output if socket doesn't match
              node.removeOutput(output);
              // clear data
              _functionNode && delete Data.nGetData(_functionNode)[i.key];

            }
          }

          // get output again
          output = node.outputs.get(i.key);
          if( !output ) {
            node.addOutput(new Rete.Output(i.key, i.name, i.socket));
          }
        })
      }


      let baseOptions: OptionLabel[] = [{"label": "", "value": ""}] 
      selectCtrl.props.options = baseOptions.concat(options);
      selectCtrl.props.value = Data.getNodeIdentifiers(node)["selectedFunctionId"];
      selectCtrl.update && selectCtrl.update();
      node.update();
      
    }
    Data.getGeneralFuncs(node)["process"] = updateSelect;    
  }
}

const _default = {
  ComponentDict,
  ComponentList,
}
export default _default;