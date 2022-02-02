import * as Rete from "rete";
import * as MySocket from "../sockets/sockets";
import * as Data from "../data/attributes";
import * as ENode from '../elementary/elementary';
import * as EDisplay from '../elementary/display';
import * as Display from '../display';
import * as ReactRete from 'rete-react-render-plugin';
import {  ComponentBase } from './basic';
import { JSONObject, JSONValue } from "../jsonschema";
import { getSelectedSocket, isInput, updateViewConnections } from "../helpers";
import XLSXColumn from 'xlsx-column';




/**
 * List Actions for add/remove/move up/move down
 * (Lists are not displayed with controls with outputs (unlike dicts which are))
 * - {output: control} key mappings from `getOutputControls()` function is used to track order of outputs but the `control` values are effectively ignored 
 * - getGeneralAttributes().outputTracker is used to track the total number of outputs added over time to create new names
*/
export function elementAdd(node: Rete.Node, editor: Rete.NodeEditor, idx: number, typeSelectKey: string): string {
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
  let newMappings = Object.entries(Data.getOutputControls(node));
  newMappings.splice(newIndex, 0, [newKey, newKey]);

  // update output mappings and node
  Data.setOutputControls(node, Object.fromEntries(newMappings));
  node.update();

  // update node view  
  updateViewConnections([node], editor);

  // return new output key
  return newOutput.key;
}


export function elementRemove(node: Rete.Node, editor: Rete.NodeEditor, idx: number) {
      
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

  // update output mappings and node
  Data.setOutputControls(node, Object.fromEntries(newMappings));
  node.update();

  // for each affected node update its connections
  updateViewConnections(Array.from(nds), editor);
}


export function elementUp(node: Rete.Node, editor: Rete.NodeEditor, idx: number) {

  // get number of existing outputs
  const nOutputs = node.outputs.size;
  // get [output, control] pairs
  let newMappings = Object.entries(Data.getOutputControls(node));

  if(!( idx > 0 && idx < nOutputs )) {
    editor.trigger("error", {message: `cant move output index up "${idx}"`});
    return;
  }
    
  // get selected element
  const m = newMappings[idx];
  // pop element out
  newMappings.splice(idx, 1);
  // move "up" (up on screen, down in list index)
  newMappings.splice(idx - 1, 0, m);

  // update output mappings and node
  Data.setOutputControls(node, Object.fromEntries(newMappings));
  node.update();

  // update node view  
  updateViewConnections([node], editor);
}

export function elementDown(node: Rete.Node, editor: Rete.NodeEditor, idx: number) {
  // get number of existing outputs
  const nOutputs = node.outputs.size;
  // get [output, control] pairs
  let newMappings = Object.entries(Data.getOutputControls(node));

  if(!( idx >= 0 && (idx + 1) < nOutputs )) {
    editor.trigger("error", {message: `cant move output index down "${idx}"`});
    return;
  } 

  // get next element
  const m = newMappings[idx + 1];
  // remove next element
  newMappings.splice(idx + 1, 1);
  // insert behind - move "down" (down on screen, up in list index)
  newMappings.splice(idx, 0, m);

  // update output mappings and node
  Data.setOutputControls(node, Object.fromEntries(newMappings));
  node.update();

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
    let outputCtrls = Data.getOutputControls(node);
    Object.entries(outputCtrls).forEach(([outputKey, ctrlKey]) => node.addOutput(new Rete.Output(outputKey, outputKey, socket)));

    Data.setConnectionFuncs(node, {
      "created": (connection: Rete.Connection) => {
        if(!isInput(connection, node, "parent")) return;
        let socketSchemas = ENode.readParentSchemas(connection, 
          (spec: JSONValue) => !!spec && typeof(spec) === "object" && !Array.isArray(spec) && !!spec.items,
          (spec: JSONObject) => spec.items
        )
        Data.setSocketSchemas(connection.input.node, socketSchemas);
        let socketKeys = Object.keys(socketSchemas); 
        if(socketKeys.length) {
          // set type select to each of the socket names
          selectControl.props.options = Object.keys(socketSchemas).map(nm => ({"label": nm, "value": nm}));
        }
        ENode.selectControlChange(node, getSelectedSocket(socketKeys[0]).name, selectControl, editor);        
      }, 
      "removed": (connection: Rete.Connection) => {
        if(isInput(connection, node, "parent"))
          ENode.resetTypes(node, selectControl, editor)
      }
    });
  }
}
