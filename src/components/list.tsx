import * as Rete from "rete";
import * as MySocket from "../sockets/sockets";
import * as Data from "../data/attributes";
import * as ENode from '../elementary/elementary';
import * as EDisplay from '../elementary/display';
import * as Display from '../display';
import * as ReactRete from 'rete-react-render-plugin';
import { ComponentBase } from "./ComponentBase";
import { JSONObject, JSONValue } from "../jsonschema";
import { getConnectedData, getSelectedSocket, isInput, updateViewConnections } from "../helpers";
import XLSXColumn from 'xlsx-column';
import { ControlSelect } from "../controls/controls";
import { anySocket } from "../sockets/sockets";




/**
 * List Actions for add/remove/move up/move down
 * (Lists are not displayed with controls with outputs (unlike dicts which are))
 * - {output: control} key mappings from `getOutputControls()` function is used to track order of outputs but the `control` values are effectively ignored 
 * - getGeneralAttributes().outputTracker is used to track the total number of outputs added over time to create new names
*/
export function elementAdd(node: Rete.Node, editor: Rete.NodeEditor, idx: number, typeSelectKey: string): Data.OutputMap {
  // get selected type from type selection control
  const selectedType = Data.getControlsData(node)[typeSelectKey];
  let socket = getSelectedSocket(selectedType);

  // increment output count tracker - incremented when new outputs added but not decrements when removed to avoid name conflict
  let generalAttrs = Data.getGeneralAttributes(node);
  if(typeof(generalAttrs.outputTracker) !== "number")
    generalAttrs.outputTracker = 0;
  generalAttrs.outputTracker += 1;

  // generate name with excel style key (e.g. 27 => 'AA')
  const newKey = 'Item ' + new XLSXColumn(generalAttrs.outputTracker).toString();

  // index in output list for new output follows output pressed
  const newIndex: number = idx + 1;
  // create and add new output
  let newOutput = new Rete.Output(newKey, newKey, socket) 
  node.addOutput(newOutput);

  // add mapping of new output key to same key for control (although control not actually created)
  let outputMaps = Data.getOutputMap(node);
  let newMap = {
    outputKey: newKey
  }
  outputMaps.splice(newIndex, 0, newMap);

  // update output mappings and node
  node.update();

  editor.trigger('process');  // trigger editor change event

  // update node view  
  updateViewConnections([node], editor);

  // return new output key
  return newMap;
}


export function elementRemove(node: Rete.Node, editor: Rete.NodeEditor, idx: number) {
  let outputMaps = Data.getOutputMap(node);

  // check index in range
  if (!(idx >= 0 && idx < outputMaps.length)) {
    console.error(`couldnt delete output from index, out of range "${idx}"`);
    return
  } 

  // check output exists
  if(!outputMaps[idx]) {
    console.error(`unexpected error: output at index "${idx}" not found`);
    return
  }
  
  // get output
  let output = node.outputs.get(outputMaps[idx].outputKey);

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

  // remove output->control mapping (if exists)
  outputMaps.splice(idx, 1);

  // update output mappings and node
  node.update();

  editor.trigger('process');  // trigger editor change event

  // for each affected node update its connections
  updateViewConnections(Array.from(nds), editor);
}


export function elementUp(node: Rete.Node, editor: Rete.NodeEditor, idx: number) {
  let outputMaps = Data.getOutputMap(node);
  if(!( idx > 0 && idx < outputMaps.length )) {
    editor.trigger("error", {message: `cant move output index up "${idx}"`});
    return;
  }
    
  // get selected element
  const m = outputMaps[idx];
  // pop element out
  outputMaps.splice(idx, 1);
  // move "up" (up on screen, down in list index)
  outputMaps.splice(idx - 1, 0, m);

  // update output mappings and node
  node.update();

  editor.trigger('process');  // trigger editor change event

  // update node view  
  updateViewConnections([node], editor);
}

export function elementDown(node: Rete.Node, editor: Rete.NodeEditor, idx: number) {
  let outputMaps = Data.getOutputMap(node);
  if(!( idx >= 0 && (idx + 1) < outputMaps.length )) {
    editor.trigger("error", {message: `cant move output index down "${idx}"`});
    return;
  } 

  // get next element
  const m = outputMaps[idx + 1];
  // remove next element
  outputMaps.splice(idx + 1, 1);
  // insert behind - move "down" (down on screen, up in list index)
  outputMaps.splice(idx, 0, m);

  // update output mappings and node
  node.update();

  editor.trigger('process');  // trigger editor change event

  // update node view  
  updateViewConnections([node], editor);

}


const LIST_SELECT_KEY = "Select Type";
const listActions: EDisplay.Actions = {
  "add": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => elementAdd(node, editor, idx, LIST_SELECT_KEY),
  "remove": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => elementRemove(node, editor, idx),
  "moveUp": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => elementUp(node, editor, idx),
  "moveDown": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => elementDown(node, editor, idx)
}
class DisplayList extends ReactRete.Node {
  render() {
    return Display.renderComponent(
      this.props, 
      this.state,
      (props: ReactRete.NodeProps) => EDisplay.renderElementaryOutputs(props, listActions),
      (props: ReactRete.NodeProps) => EDisplay.renderUnmappedControls(props),
    )
  }
}


export class ComponentList extends ComponentBase {
  data = {component: DisplayList}
  constructor() {
    super('List');
  }
  
  _builder(node: Rete.Node, editor: Rete.NodeEditor) {
    // build node with list action to add and list socket
    let socket = MySocket.listSocket;
    let selectControl = ENode.buildSelectControl(node, editor, LIST_SELECT_KEY);
    node
      .addInput(new Rete.Input("parent", "Parent", socket))
      .addControl(ENode.buildAddButton(node, editor, listActions["add"]))
      .addControl(selectControl);
      
    // add output for each specified in data passed to builder
    let outputMap = Data.getOutputMap(node);
    outputMap.forEach(o => {
      if(o.outputKey) {
        node.addOutput(new Rete.Output(o.outputKey, o.outputKey, socket))
      }
    });
  }

  getData(node: Rete.Node, editor: Rete.NodeEditor) {
    return Data.getOutputMap(node).map(o => {
      let output = node.outputs.get(o.outputKey);
      return output.hasConnection() ? getConnectedData(output, editor) : null;
    });
  }
}


/** validate input node is list and connection input is "parent" */
const validateConnection = (connection: Rete.Connection, isInput: boolean) => isInput && connection.input.key === "parent";

Data.nodeConnectionFuns["List"] = {
  created: (connection: Rete.Connection, editor: Rete.NodeEditor, isInput: boolean) => {
    if(!validateConnection(connection, isInput)) return;
    let node = connection.input.node;

    // get schema map from connected node and index to output
    let output = connection.output;
    let schema = Data.getOutputMap(output.node).find(o => o.outputKey==output.key)?.schema;
    
    // retrieve socket name to schema map from connection schemas
    let socketSchemas = ENode.getSpecMap(schema, 
      (s: JSONObject) => s.type === "array",
      (s: JSONObject) => {
        if(typeof(s.items) === "object" && !Array.isArray(s.items)) {
          return s.items;
        } else {
          return {};
        }
      }
    );
    Data.setSocketSchemas(node, socketSchemas);  // set socket name => schemas map for type selection
    let socketKeys = Object.keys(socketSchemas);  // get socket names from schema map keys   
    let selectControl = node.controls.get(LIST_SELECT_KEY) as ControlSelect;   // get select control
    
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
      let selectControl = node.controls.get(LIST_SELECT_KEY) as ControlSelect;
      if(selectControl) {
        ENode.resetTypes(node, selectControl, editor);
      }
    }
  }
}

