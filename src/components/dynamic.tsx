// import * as Rete from 'rete';
// import * as MyControls from "../controls/controls";
// import { ReteReactControl as ReteControlBase } from "rete-react-render-plugin";
// import * as Display from '../display';
// import * as Data from "../data/attributes";
// import {  TypeList } from "./core";
// import { ComponentBase } from "./base";
// import * as ReactRete from 'rete-react-render-plugin';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { ReteReactControl as ReteControl } from "rete-react-render-plugin";
// import { faTimes, faMouse } from "@fortawesome/free-solid-svg-icons";
// import { Button } from "react-bootstrap";
// import { sockets } from "../sockets/sockets";
// import { JSONObject, JSONValue, getObject, getJSONSocket } from '../jsonschema';
// import { getUnmappedControls } from '../elementary/display';
// import { getConnectedData } from '../helpers';


// /** add custom type to valid type list */
// export const addType = (newType: string) => TypeList.push(newType);


// /** 
//  * Same as Base Display, except for outputs & their mapped controls:
//  * Outputs can be "nullable", i.e. their key has a "nulled" boolean value (get/set by `getOutputNulls` with output key)  
//  * 
//  * If output is "nullable", it is displayed either with an x to "null" the output or a mouse-icon to "activate" the output
//  * 
//  * "nullable" outputs are displayed as:
//  * - if output key is "nulled" with "null" value set to true, mouse button is displayed to "activate" output
//  *     - displayed without a socket or its mapped control
//  * - if output is not "nulled", with "null" value set to false, x button is displayed to "null" output
//  *     - displayed as normal with its socket and mapped control
//  * 
//  * The action of clicking either "activate"/"null" an output is controlled by `nullButtonClick()`
//  */
// class DisplayDynamic extends ReactRete.Node {

//   /** process object member null button click -  */
//   nullButtonClick(output: Rete.Output): void {

//     // ignore click if output has a connection
//     if(output.hasConnection()) {
//       return;
//     }

//     let outputMap = Data.getOutputMap(this.props.node).find(o => o.outputKey == output.key);
//     if (!outputMap) {
//       return;
//     }

//     // if not "null" then user is clicking to null, delete all connections
//     if(!outputMap.isNulled) {
//       output.connections.forEach(c => this.props.editor.removeConnection(c))
//     }

//     // invert "null" value
//     outputMap.isNulled = !outputMap.isNulled;
    
//     // if output has mapped control, disable it
//     if(outputMap.dataControl) {
//       let control = this.props.node.controls.get(outputMap.dataControl);
//       if(control && control instanceof ReteControl) {
//         // set display disabled and update control
//         control.props.display_disabled = outputMap.isNulled;
//         control.update && control.update();
//       }
//     }

//     // update node and connections
//     this.props.node.update();
//     this.props.editor.view.updateConnections({node: this.props.node});
//   }

//   getOutput(outputMap: Data.OutputMap): JSX.Element {
//     let output = this.props.node.outputs.get(outputMap.outputKey);
//     let ctrl = this.props.node.controls.get(outputMap.dataControl);
//     let btnIcon = outputMap.isNulled ? faMouse : faTimes;
    
//     let nullButton = <Button 
//       variant="secondary" 
//       size="sm" 
//       className="display-button"
//       onClick={()=>this.nullButtonClick(output)}>
//       <FontAwesomeIcon icon={btnIcon} />
//     </Button>
//     let titleElement = <div className="output-title">{output.name}</div>
    
//     // if no control, use blank div with css class to ensure spacing 
//     let controlElement = <div className="control-input"></div>;
//     if(ctrl) {
//       controlElement = Display.getControl(ctrl, this.props.bindControl);
//     }

//     return <div className="output" key={output.key}>
//       {controlElement}
//       {outputMap.nullable ? nullButton : <div></div>}
//       {titleElement}
//       {Display.getSocket(output, "output", this.props.bindSocket, {visibility: outputMap.isNulled ? "hidden" : "visible"})}
//     </div>
//   }

//   render() {
//     const { node, bindSocket, bindControl } = this.props;
//     const { outputs, controls, inputs, selected } = this.state;
//     let statisControls = getUnmappedControls(node);

//     return (
//       <div className={`node ${selected}`}>
//         {Display.getTitle(node.name)}
//         {/* Outputs */}
//         <div className="dynamic-outputs">
//           {Data.getOutputMap(node).map(oMap => oMap.outputKey && this.getOutput(oMap))}
//         </div>
//         {/* Controls (check not mapped to output) */}
//         <div className="controls-container" >
//         {statisControls.map((control) => Display.getControl(control, bindControl))}
//         </div>        
//         {/* Inputs */}
//         {inputs.map((input) => Display.getInput(input, bindControl, bindSocket))}
//       </div>
//     );
//   }
// }


// /** helper function to get control mapped to dynamic output  */
// const getOutputControl = (node: Rete.Node, outputKey: string) => {
//   // get control key mapped to output
//   let oMap = Data.getOutputMap(node).find(o => o.outputKey == outputKey);
//   if(!oMap) {
//     return null;
//   }

//   // get control instance if exists, cast to control template type
//   type PropsAny = MyControls.InputProps<any>;
//   return node.controls.get(oMap.dataControl) as MyControls.ControlTemplate<any, PropsAny>
// }


// /** on connection created
//  * when connection is created from dynamic node output to another node input: 
//  *  control mapped to output must be disabled
//  * */
// const connectionCreatedFunc: Data.ConnectionFunc = (connection: Rete.Connection, editor: Rete.NodeEditor, isInput: boolean) => {
//   if(isInput) return;
//   let control = getOutputControl(connection.output.node, connection.output.key);
//   if(control) {
//     control.props.display_disabled = true;
//     if(control.update) control.update();
//   }
// }


// /** on connection removed 
//  * when connection is removed from dynamic node output to another node input: 
//  *  control mapped to output must be set stored null value */
// const connectionRemovedFunc: Data.ConnectionFunc = (connection: Rete.Connection, editor: Rete.NodeEditor, isInput: boolean) => {
//   if(isInput) return;
//   let control = getOutputControl(connection.output.node, connection.output.key);
//   if(control) {
//     let node = connection.output.node;
//     control.props.display_disabled = Data.getOutputMap(node).find(o => o.outputKey == connection.output.key).isNulled;
//     if(control.update) control.update();
//   }
// }


// export class ComponentDynamic extends ComponentBase {
//   data = { component: DisplayDynamic };
//   socket: Rete.Socket;
//   varSpec: JSONValue;
//   constructor(name: string, varSpec: JSONValue) {
//     super(name);

//     // get socket based on node name
//     let socket = sockets.get(name)?.socket;
//     if (!socket) {
//       // TODO - make customised error
//       throw new Error(`expected socket "${name}" to exist!`);
//     }
//     this.socket = socket;
//     this.varSpec = varSpec;

//     // set connection created/removed
//     Data.nodeConnectionFuns[name] = {
//       created: connectionCreatedFunc,
//       removed: connectionRemovedFunc
//     }

//   }

//   /** create control */
//   getControl(node: Rete.Node, oMap: Data.OutputMap, property: JSONObject, nulled: boolean, key: string, editor: Rete.NodeEditor) {

//     /** get control initial value
//      * try node data, then JSON default then user default */
//     const getValue = (oMap: Data.OutputMap, property: JSONObject, usr_default: any) => {
//       return oMap.dataValue ?? property["default"] ?? usr_default;
//     }

//     const getArgs = (usr_default: any) => ({
//       value: getValue(oMap, property, usr_default), 
//       display_disabled: nulled
//     });

//     const dataHandler: MyControls.DataHandler = (ctrl: ReteControlBase, emitter: Rete.NodeEditor, key: string, data: any) => {
//       ctrl.props.value = data;
//       oMap.dataValue = data;
//       emitter.trigger("process");
//       ctrl.update && ctrl.update();
//     }

//     // process type from property
//     let var_type = property["type"];
//     if( var_type === "string") { 
//       return new MyControls.ControlText(key, editor, node, getArgs(""), dataHandler);
//     } else if( var_type === "integer" || var_type === "number" ) {
//       return new MyControls.ControlNumber(key, editor, node, getArgs(0), dataHandler);
//     } else if( var_type === "boolean") {
//       return new MyControls.ControlBool(key, editor, node, getArgs(""), dataHandler);
//     } 
//     return null;
//   }

//   /**
//    * process a JSON schema "property" for a given definition, by setting node data and adding relevant control/output 
//    */
//   process_property(node: Rete.Node, editor: Rete.NodeEditor, key: string, property: JSONObject, index: number, required: boolean): void {
//     let outputMaps = Data.getOutputMap(node);
//     let oMap: Data.OutputMap = outputMaps[index] ?? {};
    
//     if(property["const"]) {
//       // if JSON property is a "const" then set value in node data but dont create output or control
//       outputMaps.push({
//         key: key,
//         dataValue: property["const"]
//       })
//       return;
//     } 

//     oMap.key = key;

//     // get control args with value and display disabled (common to all controls)
//     let null_output = false;
//     if(!required) {
//       oMap.nullable = true;
//       // property not required - set to null if default is null or no default provided
//       // pydantic will not set a JSON "default" value if default "None" is provided, hence checking for default "undefined" 
//       null_output = property["default"] === null || property["default"] === undefined;
//     }
    

//     let control = this.getControl(node, oMap, property, null_output, key, editor);
//     if(control) {
//       // add control to node
//       node.addControl(control);

//       // set node data (in case value was pulled from JSON schema or default)
//       oMap.dataControl = key;
//       oMap.dataValue = control.props.value;
//     }
      
//     // get title from property if exist, else just use property key
//     let title = property["title"] ? String(property["title"]) : key;

//     // create socket and add output using socket
//     let socket = getJSONSocket(property);
//     let output = new Rete.Output(key, title, socket)
//     node.addOutput(output);

//     oMap.outputKey = key;  // set mapped output
//     oMap.schema = property;  // set type definition to be read by any child elements 
//     outputMaps.push(oMap);
//   }


//   _builder(node: Rete.Node, editor: Rete.NodeEditor) {
//     node.addInput(new Rete.Input("parent", "Parent", this.socket));
//     let spec = getObject(this.varSpec);
//     if(!spec) return; 
    
//     // get list of required properties
//     let required: string[] = spec["required"] as string[] ?? [];
//     let properties = getObject(spec["properties"]);
//     if(!properties) return;

//     // loop properties
//     Object.entries(properties).forEach(([k, v], i) => {
//       let property = getObject(v);
//       if(property) {

//         // pass JSON property to be processed with output null to show/hide control
//         this.process_property(node, editor, k, property, i, required.includes(k));
//       }
//     });
//   }

//   getData(node: Rete.Node, editor: Rete.NodeEditor) {
//     return Object.fromEntries(
//       Data.getOutputMap(node).map(o => {
//         let output = node.outputs.get(o.outputKey);
//         let data = null;
//         if(output && output.hasConnection()) {
//           // use connection data if provided
//           data = getConnectedData(output, editor);
//         } else if(!o.isNulled) {
//           // if not nulled try to retrieve control value
//           data = o.dataValue ?? null;
//         }
//         return [
//           o.key,
//           data
//         ];
//       })
//     );
//   }
  
// }

// const _default = {
//   ComponentDynamic
// }; 
// export default _default;