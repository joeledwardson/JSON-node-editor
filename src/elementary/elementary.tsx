import * as Rete from "rete";
import * as MySocket from "../sockets/sockets";
import * as Controls from  "../controls/controls";
import * as Data from "../data/attributes";
import * as ReactRete from 'rete-react-render-plugin';
import { getJSONSocket, getObject, isObject, JSONObject, JSONValue } from "../jsonschema";
import { getSelectedSocket } from '../helpers';
import { ActionProcess, ActionName } from "./display";
import { componentsList } from "../components/base";


/** 
 * convert types to option label/value pairs with a blank at the start 
 * */
export function typeLabels(): Array<Controls.OptionLabel> {
  return [{
    label: "",
    value: ""
  }].concat(componentsList.map(v => ({
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
  Data.getOutputMap(node).forEach(o => o.outputSchema=spec);
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
    setAllOutputSchemas(node, {});
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
export function buildSelectControl(node: Rete.Node, editor: Rete.NodeEditor, selectTypeKey: string): Controls.SelectControl {
  // get controls data
  let ctrlData = Data.getControlsData(node);
  
  // get socket from selected type value or "any" socket
  let socket = getSelectedSocket(ctrlData[selectTypeKey]);

  // create select control using type labels as selections and selected type socket name as initial value
  return new Controls.SelectControl(selectTypeKey, editor, node, {
    value: socket.name, 
    options: typeLabels(), 
  }, (ctrl: ReactRete.ReteReactControl, emitter: Rete.NodeEditor, key: string, data: any) => {
    selectControlChange(node, data, ctrl, emitter);
  });
}


/**
 * Build add element button
 */
export function buildAddButton(node: Rete.Node, editor: Rete.NodeEditor, addAction: ActionProcess): Controls.ButtonControl {
  // button to add output to end of output list
  let addButtonAction = () => addAction(node, editor, node.outputs.size); 
  return new Controls.ButtonControl("Add Item", editor, node, {
    value: 0, // value is press count
    buttonInner: "Add Item +", 
  }, addButtonAction);
}


/** 
 * map of socket/output name to Schema definitions
 * 
 * Example:
 * if the current node is a list and parent definition is a union (e.g. in python List[string] | List[int | str]): 
 *    there are 2 options to select from, List[str] and List[int | str]
 * 
 * list node would then want to select either "str" or "int | str" at its output nodes
 * Thus, the "Text" selection would map to schema:
 * {
      "type": "object",
      "additionalProperties": {
        "type": "string"
      }
    }
 * the "Text | Number" selection would map to schema:
    {
      "type": "object",
      "additionalProperties": {
        "anyOf": [
          {
            "type": "integer"
          },
          {
            "type": "string"
          }
        ]
      }
    }
 */
export function getSpecMap(
  spec: JSONValue,
  validator: ((spec: JSONObject) => boolean),
  getInnerSpec: ((spec: JSONObject) => JSONObject)
): {[key: string]: JSONObject} {

  let typeMap: {[key: string]: JSONObject} = {};
  
  // helper function to assign inner specification to map with socket name
  const assignInner = (outerSpec: JSONObject) => {
    let innerSpec = getInnerSpec(outerSpec);
    typeMap[getJSONSocket(innerSpec).name] = innerSpec;
  }

  // check spec is an object
  if(typeof(spec) === "object" && !Array.isArray(spec)) {

    // set single selection if spec is valid
    if(validator(spec)) {
      assignInner(spec);
    }

    // check for parent type is a union "anyOf" (e.g. List[string] | List[int]) - loop through each in union and assign
    else if(spec.anyOf && Array.isArray(spec.anyOf)) {
      
      // loop through union
      spec.anyOf.forEach(s => {

        // check inner spec meets validation and is obejct
        if(typeof(s) === "object" && !Array.isArray(s) && validator(s)) {
          assignInner(s);
        }
      });
    }
  }

  return typeMap;
}



/** Reset types
 *    Clear JSON output type definitions
 *    Set type selection options to default types
  */
export function resetTypes(node: Rete.Node, selectControl: ReactRete.ReteReactControl, editor: Rete.NodeEditor) {
  // clear output type definitions
  Data.getOutputMap(node).forEach(o => o.outputSchema=null);

  // reset select type options to defaults
  selectControl.props.options = typeLabels();

  // change sockets/connections and reset type to "any"
  let newName = MySocket.anySocket.name;
  selectControlChange(node, newName, selectControl, editor);
}

