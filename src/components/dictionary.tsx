import * as Rete from "rete";
import * as MySocket from "../sockets/sockets";
import * as Controls from  "../controls/controls";
import { ReteReactControl as ReteControlBase } from "rete-react-render-plugin";
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

// name control handler
const getNameHandler: (oMap: Data.OutputMap) => Controls.DataHandler = (oMap: Data.OutputMap) => {
  return (ctrl: ReteControlBase, emitter: Rete.NodeEditor, key: string, data: any) => {
    ctrl.props.value = data;
    oMap.nameValue = data;
    emitter.trigger("process");
    ctrl.update && ctrl.update();
  }
}


/**
 * Dictionary actions for add/remove/move up/move down
 * Same as list actions except dictionary has controls as well as outputs
 */
function dictAdd(node: Rete.Node, editor: Rete.NodeEditor, idx: number, typeSelectKey: string) {
  // run list action to add new output
  let newMap = List.elementAdd(node, editor, idx, typeSelectKey);

  // create attribute name key
  newMap.nameKey = `${newMap.outputKey} name`;

  // add control with same key as output and blank value
  node.addControl(new Controls.ControlText(
    newMap.nameKey, 
    editor, 
    node, 
    {value: ""},
    getNameHandler(newMap)
  ));
  
}


function dictRemove(node: Rete.Node, editor: Rete.NodeEditor, idx: number) {
  let oMap = Data.getOutputMap(node)[idx];
  if(oMap) {
    let ctrl = node.controls.get(oMap.nameKey);
    if( ctrl ) {
      node.removeControl(ctrl);  // remove control from node
    }
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
    let outputMap = Data.getOutputMap(node);
    outputMap.forEach(o => {
      if(o.outputKey) {
        node.addOutput(new Rete.Output(o.outputKey, o.outputKey, socket));
      }
      if(o.nameKey) {
        node.addControl(new Controls.ControlText(
          o.nameKey, 
          editor, 
          node, {value: o.nameValue},
          getNameHandler(o)
        ));
      }
    });
  }
}

/** validate input node is dict and connection input is "parent" */
const validateConnection = (connection: Rete.Connection, isInput: boolean) => isInput && connection.input.key === "parent";

/** process connections when node connects to dict "parent" input, reading its schemas */
Data.nodeConnectionFuns["Dictionary"] = {
  created: (connection: Rete.Connection, editor: Rete.NodeEditor, isInput: boolean) => {
    if(!validateConnection(connection, isInput)) return;
    let node = connection.input.node;

    // get schema map from connected node and index to output
    let output = connection.output;
    let schema = Data.getOutputMap(output.node).find(o => o.outputKey==output.key)?.schema;
    
    // retrieve socket name to schema map from connection schemas
    let socketSchemas = ENode.getSpecMap(schema, 
      (s: JSONObject) => s.type === "object",
      (s: JSONObject) => {
        if(typeof(s.additionalProperties) === "object" && !Array.isArray(s.additionalProperties)) {
          return s.additionalProperties;
        } else {
          return {};
        }
      }
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
