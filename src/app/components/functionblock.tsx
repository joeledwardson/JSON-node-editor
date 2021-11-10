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
import {getTitle, getInput, getControl, getSocket} from './display';
import { getJSONSocket, getObject, isObject, JSONObject, JSONValue } from "../jsonschema";
import { JSONTypeConvert } from '../jsonschema';
import XLSXColumn from 'xlsx-column';
import {TYPE_SELECT_KEY, ActionName, listActions, DisplayList, typeSelect, getSelectedSocket, typeLabels} from './advanced';

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
