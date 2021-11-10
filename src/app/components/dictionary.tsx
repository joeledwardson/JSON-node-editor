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
import {ActionName, listActions, DisplayList} from './advanced';

/**
 * Dictionary actions for add/remove/move up/move down
 * Same as list actions except dictionary has controls as well as outputs
 */
 let dictActions: {[index in ActionName]: any} = {
  "add": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => {
    
    // run list action to add new output
    listActions["add"](node, editor, idx);
    
    // get output key from new index
    let maps = Data.getOutputControls(node);
    let newOutputKey = Object.keys(maps)[idx + 1];

    // get mapped control key
    let newControlKey = maps[newOutputKey];

    if(newControlKey) {
      // add control with same key as output and blank value
      node.addControl(new Controls.ControlText(newControlKey, editor, node, {
        value: ""
      }));
    } 

  },
  "remove": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => {
    
    // get map of output to controls
    let ctrlsMap = Data.getOutputControls(node);
    // get output ID list
    let outputIds = Object.keys(ctrlsMap);
    // get control ID 
    let ctrlId = ctrlsMap[outputIds[idx]];
    // get control instance
    let ctrl = node.controls.get(ctrlId);
    if( ctrl instanceof Rete.Control ) {
      node.removeControl(ctrl);  // remove control from node
    }

    // run list action to remove output
    listActions["remove"](node, editor, idx);

  },
  "moveUp": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => {
    listActions["moveUp"](node, editor, idx);
  },
  "moveDown": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => {
    listActions["moveDown"](node, editor, idx);
  }
}

/** 
 * Dictionary display component
 * implemented with dictionary action
 * */
 class DisplayDict extends DisplayList {
  action = (index: number, action: ActionName) => dictActions[action](this.props.node, this.props.editor, index);
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

