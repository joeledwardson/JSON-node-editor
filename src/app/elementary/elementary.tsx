import * as Rete from "rete";
import * as MySocket from "../sockets/sockets";
import * as Controls from  "../controls/controls";
import * as Data from "../data/attributes";
import { TypeList } from '../components/basic';
import * as ReactRete from 'rete-react-render-plugin';
import { getJSONSocket, isObject, JSONObject, JSONValue } from "../jsonschema";
import { getSelectedSocket } from '../helpers';
import { ActionProcess, ActionName } from "./display";


/** 
 * convert types to option label/value pairs with a blank at the start 
 * */
export function typeLabels(): Array<Controls.OptionLabel> {
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
export function socketUpdate(node: Rete.Node, emitter: Rete.NodeEditor, newSocket: Rete.Socket, ioList: Map<string, Rete.IO>) {
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
 * Set output schemas
 *  loop outputs and set JSON specification for each output  
 */
export const setAllOutputSchemas = (node: Rete.Node, spec: JSONObject) => {
  Data.setOutputSchemas(
    node, 
    Object.fromEntries(
      Object.values(node.outputs).map(o => [o.key, spec])
    )
  );
}


/** Handle new selected value in type selection control
 * - output json schema definitions
 * - type name on selected control
 * - output sockets
 **/
export function selectControlChange(
  node: Rete.Node, 
  newName: string,
  selectControl: ReactRete.ReteReactControl,
  editor: Rete.NodeEditor,
) {
  // set JSON schema for each output (read when node connects to output)
  let socketSchemas = Data.getSocketSchemas(node);
  if(newName in socketSchemas) {
    setAllOutputSchemas(node, socketSchemas[newName])
  } else {
    Data.setOutputSchemas(node, {});
  }

  // update type select control with new selected socket name
  Controls.ctrlValProcess(selectControl, editor, selectControl.key, newName);

  // replace output sockets
  let socket = MySocket.sockets.get(newName).socket;
  if(!socket) {
    editor.trigger('error', {
      message: `cannot change to socket "${newName}", not found`
    });
    socket = MySocket.anySocket;
  }
  socketUpdate(node, editor, socket, node.outputs);
}


/** 
 * Build type selection control
 * on change, gets selected socket from type selection control (if data passed on creation else "any" socket) 
 * */
export function buildSelectControl(node: Rete.Node, editor: Rete.NodeEditor, selectTypeKey: string): Controls.ControlSelect {
  // get controls data
  let ctrlData = Data.getControlsData(node);
  
  // get socket from selected type value or "any" socket
  let socket = getSelectedSocket(ctrlData[selectTypeKey]);

  // create select control using type labels as selections and selected type socket name as initial value
  return new Controls.ControlSelect(selectTypeKey, editor, node, {
    value: socket.name, 
    options: typeLabels(), 
  }, (ctrl: ReactRete.ReteReactControl, emitter: Rete.NodeEditor, key: string, data: any) => {
    selectControlChange(node, data, ctrl, emitter);
  });
}


/**
 * Build add element button
 */
export function buildAddButton(node: Rete.Node, editor: Rete.NodeEditor, addAction: ActionProcess): Controls.ControlButton {
  // button to add output to end of output list
  let addButtonAction = () => addAction(node, editor, node.outputs.size); 
  return new Controls.ControlButton("Add Item", editor, node, {
    value: 0, // value is press count
    buttonInner: "Add Item +", 
  }, addButtonAction);
}


/** 
 * map of socket/output name to Schema definitions
 *  if the parent definition is a union (e.g. in python List[string] | List[int | int]) then there are 2 options to select from
 *  the output map would be {"Text": {"type": "array", "items": ...}}
 * 
 * using the example above "a" properties would be stored and read by child nodes connected
 */
export function getInnerSpecs(
  spec: JSONObject,
  validator: ((spec: JSONValue) => boolean),
  getInnerSpec: ((spec: JSONObject) => JSONValue)
): {[key: string]: JSONObject} {

  let typeMap: {[key: string]: JSONObject} = {};
  const assignMap = (spec: JSONObject) => {
    let innerSpec = getInnerSpec(spec);
    if(innerSpec && typeof(innerSpec) === "object" && !Array.isArray(innerSpec)) {
      let newSocket = getJSONSocket(innerSpec);
      typeMap[newSocket.name] = innerSpec;
    }
  }   

  // if parent type is valid (e.g. List[string]) 
  if(validator(spec))
    assignMap(spec); 

  // check for parent type is a union "anyOf" (e.g. List[string] | List[int]) - loop through each in union
  else if(spec.anyOf && Array.isArray(spec.anyOf)) {
    spec.anyOf.forEach(iSpec => {
      if(iSpec && typeof(iSpec) === "object" && !Array.isArray(iSpec) && validator(iSpec))
        assignMap(iSpec)
    });
  }
  return typeMap;
}




/**
 * Connection created processor 
 * on connection created, set selected type to parent specification (if exists) and hide type selection control 
 * */
export function readParentSchemas(
  connection: Rete.Connection,
  validator: ((spec: JSONValue) => boolean),
  getInnerSpec: ((spec: JSONObject) => JSONValue)
) {

  // get type definitions from other node and check that the output connected has type definitions
  // e.g. if parent has output "outputA" then in JSON schema should expect to see "properties": {
  // "properties": {
  //   "a": {
  //     {
  //       "properties": {
  //          ...
  let typeDefs = Data.getOutputSchemas(connection.output.node);

  // index to type definition of parent node - in the above example `output.key` would be "a"
  let spec = typeDefs[connection.output.key];

  // check is object
  if (!spec || !isObject(spec))
    return {};

  // get type map - if no valid configurations found, exit
  return getInnerSpecs(spec, validator, getInnerSpec);
}


/** Reset types
 *    Clear JSON output type definitions
 *    Set type selection options to default types
  */
export function resetTypes(node: Rete.Node, selectControl: ReactRete.ReteReactControl, editor: Rete.NodeEditor) {
  // clear output type definitions
  Data.setOutputSchemas(node, {});

  // reset select type options to defaults
  selectControl.props.options = typeLabels();

  // change sockets/connections and reset type to "any"
  let newName = MySocket.anySocket.name;
  selectControlChange(node, newName, selectControl, editor);
}

