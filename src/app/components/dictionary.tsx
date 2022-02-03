import * as Rete from "rete";
import * as MySocket from "../sockets/sockets";
import * as Controls from  "../controls/controls";
import * as Data from "../data/attributes";
import { ComponentBase } from './basic';
import { JSONObject, JSONValue } from "../jsonschema";
import * as List from './list';
import * as ENode from '../elementary/elementary';
import * as EDisplay from '../elementary/display';
import * as Display from '../display';
import * as ReactRete from 'rete-react-render-plugin';
import { getSelectedSocket, isInput } from "../helpers";
import { ControlSelect } from "../controls/controls";


/**
 * Dictionary actions for add/remove/move up/move down
 * Same as list actions except dictionary has controls as well as outputs
 */
function dictAdd(node: Rete.Node, editor: Rete.NodeEditor, idx: number, typeSelectKey: string) {
  // run list action to add new output
  let newOutputKey = List.elementAdd(node, editor, idx, typeSelectKey);

  // get mapped control key
  let newControlKey = Data.getOutputControls(node)[newOutputKey];

  if(newControlKey) {
    // add control with same key as output and blank value
    node.addControl(new Controls.ControlText(newControlKey, editor, node, {
      value: ""
    }));
  } 
}


function dictRemove(node: Rete.Node, editor: Rete.NodeEditor, idx: number) {
  // get map of output to controls
  let ctrlsMap = Data.getOutputControls(node);
  // get output ID list
  let outputIds = Object.keys(ctrlsMap);
  // get control ID 
  let ctrlId = ctrlsMap[outputIds[idx]];
  // get control instance
  let ctrl = node.controls.get(ctrlId);
  if( ctrl  ) {
    node.removeControl(ctrl);  // remove control from node
  }

  // run list action to remove output
  List.elementRemove(node, editor, idx);
}


const DICT_SELECT_KEY = "Select Type";
const dictActions: EDisplay.Actions = {
  "add": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => dictAdd(node, editor, idx, DICT_SELECT_KEY),
  "remove": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => dictRemove(node, editor, idx),
  "moveUp": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => List.elementUp(node, editor, idx),
  "moveDown": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => List.elementDown(node, editor, idx)
}
class DisplayDict extends ReactRete.Node {
  render() {
    return Display.renderComponent(
      this.props, 
      this.state,
      (props: ReactRete.NodeProps) => EDisplay.renderElementaryOutputs(props, dictActions),
      (props: ReactRete.NodeProps) => EDisplay.renderUnmappedControls(props),
    )
  }
}



/** Dictionary component - labelled dynamic outputs that can be re-ordered/modified  */
export class ComponentDict extends ComponentBase {
  data = {component: DisplayDict}
  constructor() {
    super('Dictionary');
  }
  _builder(node: Rete.Node, editor: Rete.NodeEditor) {
    // build node with list action to add and dictionary socket
    let socket = MySocket.dictSocket;
    let selectControl = ENode.buildSelectControl(node, editor, DICT_SELECT_KEY);
    node
      .addInput(new Rete.Input("parent", "Parent", socket))
      .addControl(ENode.buildAddButton(node, editor, dictActions["add"]))
      .addControl(selectControl);
      
    // add output for each specified in data passed to builder
    let outputCtrls = Data.getOutputControls(node);
    let ctrlData = Data.getControlsData(node);
    Object.entries(outputCtrls).forEach(([outputKey, ctrlKey]) => {
      node.addOutput(new Rete.Output(outputKey, outputKey, socket))
        // add control using mapped control key
        node.addControl(new Controls.ControlText(ctrlKey, editor, node, {
          value: ctrlData[ctrlKey]
        }));
    });
  }
}

/** validate input node is dict and connection input is "parent" */
const validateConnection = (connection: Rete.Connection, isInput: boolean) => isInput && connection.input.key === "parent";

Data.nodeConnectionFuns["Dictionary"] = {
  created: (connection: Rete.Connection, editor: Rete.NodeEditor, isInput: boolean) => {
    if(!validateConnection(connection, isInput)) return;
    let node = connection.input.node;

    // read schemas from output, for dict inner variables name is defined in JSON "additionalProperties" attribute 
    let socketSchemas = ENode.readParentSchemas(connection, 
      (spec: JSONValue) => !!spec && typeof(spec) === "object" && !Array.isArray(spec) && !!spec.additionalProperties,
      (spec: JSONObject) => spec.additionalProperties
    );

    Data.setSocketSchemas(node, socketSchemas);  // set socket name => schemas map for type selection
    let socketKeys = Object.keys(socketSchemas);  // get socket names from schema map keys   
    let selectControl = node.controls.get(DICT_SELECT_KEY) as Controls.ControlSelect;   // get select control

    if(selectControl) {
      // set type select to each of the socket names
      selectControl.props.options = Object.keys(socketSchemas).map(nm => ({"label": nm, "value": nm}));
      
      // change control select value with first key in list or any socket
      let socketName = socketKeys.length >= 1 ? socketKeys[0] : MySocket.anySocket.name;
      ENode.selectControlChange(node, socketName, selectControl, editor);        
    }
  },
  removed: (connection: Rete.Connection, editor: Rete.NodeEditor, isInput: boolean) => {
    if(validateConnection(connection, isInput)) {
      // on connection remove, reset control type selection to default list
      let node = connection.input.node;
      let selectControl = node.controls.get(DICT_SELECT_KEY) as ControlSelect;
      if(selectControl) {
        ENode.resetTypes(node, selectControl, editor);
      }
    }
  }
}
