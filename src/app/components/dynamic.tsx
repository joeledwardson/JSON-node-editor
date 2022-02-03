import * as Rete from 'rete';
import * as MyControls from "../controls/controls";
import * as Display from '../display';
import * as Data from "../data/attributes";
import {  ComponentBase, TypeList } from "./basic";
import * as ReactRete from 'rete-react-render-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ReteReactControl as ReteControl } from "rete-react-render-plugin";
import { faTimes, faMouse } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";
import { sockets } from "../sockets/sockets";
import { getOutputControls, getOutputNulls, getOutputSchemas } from "../data/attributes";
import { JSONObject, JSONValue, getObject, getJSONSocket } from '../jsonschema';


/** add custom type to valid type list */
export const addType = (newType: string) => TypeList.push(newType);


/** 
 * Same as Base Display, except for outputs & their mapped controls:
 * Outputs can be "nullable", i.e. their key has a "nulled" boolean value (get/set by `getOutputNulls` with output key)  
 * 
 * If output is "nullable", it is displayed either with an x to "null" the output or a mouse-icon to "activate" the output
 * 
 * "nullable" outputs are displayed as:
 * - if output key is "nulled" with "null" value set to true, mouse button is displayed to "activate" output
 *     - displayed without a socket or its mapped control
 * - if output is not "nulled", with "null" value set to false, x button is displayed to "null" output
 *     - displayed as normal with its socket and mapped control
 * 
 * The action of clicking either "activate"/"null" an output is controlled by `nullButtonClick()`
 */
class DisplayDynamic extends ReactRete.Node {

  /** process object member null button click -  */
  nullButtonClick(output: Rete.Output): void {

    // ignore click if output has a connection
    if(output.hasConnection()) {
      return;
    }

    // get "null" value
    let outputNulls = Data.getOutputNulls(this.props.node);
    
    // if not "null" then user is clicking to null, delete all connections
    if(!(outputNulls[output.key])) {
      output.connections.forEach(c => this.props.editor.removeConnection(c))
    }

    // invert "null" value
    outputNulls[output.key] = !outputNulls[output.key];
    
    // if output has mapped control, disable it
    let outputControls = Data.getOutputControls(this.props.node);
    let controlName = outputControls[output.key];
    if(controlName) {
      let control = this.props.node.controls.get(controlName);
      if(control && control instanceof ReteControl) {
        // set display disabled and update control
        control.props.display_disabled = outputNulls[output.key];
        control.update && control.update();
      }
    }

    // update node and connections
    this.props.node.update();
    this.props.editor.view.updateConnections({node: this.props.node});
  }

  getOutput(output: Rete.Output): JSX.Element {
    let ctrlKey = getOutputControls(this.props.node)[output.key];
    let ctrl = this.props.node.controls.get(ctrlKey);
    let isNullable: boolean = output.key in getOutputNulls(this.props.node);
    let isNull: boolean = getOutputNulls(this.props.node)[output.key] === true;
    let btnIcon = isNull ? faMouse : faTimes;
    
    console.log(`control "${ctrl?.key}" is disabled: "${isNull}"`);
    
    let nullButton = <Button 
      variant="secondary" 
      size="sm" 
      className="display-button"
      onClick={()=>this.nullButtonClick(output)}>
      <FontAwesomeIcon icon={btnIcon} />
    </Button>
    let titleElement = <div className="output-title">{output.name}</div>
    
    // if no control, use blank div with css class to ensure spacing 
    let controlElement = <div className="control-input"></div>;
    if(ctrl) {
      controlElement = Display.getControl(ctrl, this.props.bindControl);
    }

    return <div className="output" key={output.key}>
      {controlElement}
      {isNullable ? nullButton : <div></div>}
      {titleElement}
      {Display.getSocket(output, "output", this.props.bindSocket, {visibility: isNull ? "hidden" : "visible"})}
    </div>
  }

  render() {
    const { node, bindSocket, bindControl } = this.props;
    const { outputs, controls, inputs, selected } = this.state;
    let ctrlKeys = Object.values(getOutputControls(this.props.node));    
    return (
      <div className={`node ${selected}`}>
        {Display.getTitle(node.name)}
        {/* Outputs */}
        <div className="dynamic-outputs">
          {outputs.map((output) =>  this.getOutput(output))}
        </div>
        {/* Controls (check not mapped to output) */}
        <div className="controls-container" >
        {controls.map((control) => !ctrlKeys.includes(control.key) && Display.getControl(control, bindControl))}
        </div>        
        {/* Inputs */}
        {inputs.map((input) => Display.getInput(input, bindControl, bindSocket))}
      </div>
    );
  }
}


/** helper function to get control mapped to dynamic output  */
const getOutputControl = (node: Rete.Node, outputKey: string) => {
  // get control key mapped to output
  let controlKey = getOutputControls(node)[outputKey];

  // get control instance if exists, cast to control template type
  type PropsAny = MyControls.InputProps<any>;
  return node.controls.get(controlKey) as MyControls.ControlTemplate<any, PropsAny>
}


/** on connection created
 * when connection is created from dynamic node output to another node input: 
 *  control mapped to output must be disabled
 * */
const connectionCreatedFunc: Data.ConnectionFunc = (connection: Rete.Connection, editor: Rete.NodeEditor, isInput: boolean) => {
  if(isInput) return;
  let control = getOutputControl(connection.output.node, connection.output.key);
  if(control) {
    control.props.display_disabled = true;
    if(control.update) control.update();
  }
}


/** on connection removed 
 * when connection is removed from dynamic node output to another node input: 
 *  control mapped to output must be set stored null value */
const connectionRemovedFunc: Data.ConnectionFunc = (connection: Rete.Connection, editor: Rete.NodeEditor, isInput: boolean) => {
  if(isInput) return;
  let control = getOutputControl(connection.output.node, connection.output.key);
  if(control) {
    let node = connection.output.node;
    control.props.display_disabled = getOutputNulls(node)[connection.output.key];
    if(control.update) control.update();
  }
}


export class ComponentDynamic extends ComponentBase {
  data = { component: DisplayDynamic };
  socket: Rete.Socket;
  varSpec: JSONValue;
  constructor(name: string, varSpec: JSONValue) {
    super(name);

    // get socket based on node name
    let socket = sockets.get(name)?.socket;
    if (!socket) {
      // TODO - make customised error
      throw new Error(`expected socket "${name}" to exist!`);
    }
    this.socket = socket;
    this.varSpec = varSpec;

    // set connection created/removed
    Data.nodeConnectionFuns[name] = {
      created: connectionCreatedFunc,
      removed: connectionRemovedFunc
    }

  }

  /**
   * process a JSON schema "property" for a given definition, by setting node data and adding relevant control/output 
   */
  process_property(node: Rete.Node, editor: Rete.NodeEditor, key: string, property: JSONObject, null_value: boolean): void {
    let nodeData = Data.getControlsData(node);
    
    if(property["const"]) {
      // if JSON property is a "const" then set value in node data but dont create output or control
      nodeData[key] = property["const"];
      return;
    } 

    // get type from property
    let var_type = property["type"];

    // get control if valid based on variable type
    const getControl = () => {

      // get control value - try node data, then JSON default then user default
      const getValue = (usr_default: any) => nodeData[key] ?? (property && property["default"]) ?? usr_default;

      // get control args with value and display disabled (common to all controls)
      const getArgs = (usr_default: any) => ({value: getValue(usr_default), display_disabled: null_value}); 

      if( var_type === "string") { 
        return new MyControls.ControlText(key, editor, node, getArgs(""));
      } else if( var_type === "integer" || var_type === "number" ) {
        return new MyControls.ControlNumber(key, editor, node, getArgs(0));
      } else if( var_type === "boolean") {
        return new MyControls.ControlBool(key, editor, node, getArgs(""));
      } 
      return null;
    }
    let control = getControl();

    if(control) {
      // add control to node
      node.addControl(control);

      // set node data (in case value was pulled from JSON schema or default)
      nodeData[key] = control.props.value;

      // set output -> control key map
      // TODO - update control keys so they don't match output keys to avoid confusion?
      Data.getOutputControls(node)[key] = key;
    }
      
    // get title from property if exist, else just use property key
    let title = property["title"] ? String(property["title"]) : key;

    // create socket and add output using socket
    let socket = getJSONSocket(property);
    let output = new Rete.Output(key, title, socket)
    node.addOutput(output);

    // set type definition to be read by any child elements
    getOutputSchemas(node)[key] = property;
  }


  _builder(node: Rete.Node, editor: Rete.NodeEditor) {
    node.addInput(new Rete.Input("parent", "Parent", this.socket));
    let spec = getObject(this.varSpec);
    if(!spec) return; 
    
    // get list of required properties
    let required: string[] = spec["required"] as string[] ?? [];
    let properties = getObject(spec["properties"]);
    if(!properties) return;
      
    // loop properties
    Object.entries(properties).forEach(([k, v]) => {
      let property = getObject(v);
      if(property) {

        // by default dont null output
        let null_output = false;
        if( !required.includes(k) ) {
          // property not required - set to null if default is null or no default provided
          // pydantic will not set a JSON "default" value if default "None" is provided, hence checking for default "undefined" 
          null_output = property["default"] === null || property["default"] === undefined;
          Data.getOutputNulls(node)[k] = null_output;
        }

        // pass JSON property to be processed with output null to show/hide control
        this.process_property(node, editor, k, property, null_output);
      }
    });
  }
}

const _default = {
  ComponentDynamic
}; 
export default _default;