import * as Rete from 'rete';
import * as MyControls from "../controls/controls";
import * as Display from './display';
import * as Data from "../data/attributes";
import {  ComponentBase, TypeList } from "./basic";
import * as ReactRete from 'rete-react-render-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ReteReactControl as ReteControl } from "../retereact";
import { faTimes, faMouse } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";
import { sockets } from "../sockets/sockets";
import { getOutputControls, getOutputNulls, getTypeDefinitions } from "../data/attributes";
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
    let ctrl = this.props.node.controls.get(getOutputControls(this.props.node)[output.key]);
    let isNullable: boolean = output.key in getOutputNulls(this.props.node);
    let isNull: boolean = getOutputNulls(this.props.node)[output.key] === true;
    let btnIcon = isNull ? faMouse : faTimes;
    
    console.log(`control "${ctrl?.key}" is disabled: "${isNull}"`);
    
    let btnElement = <Button 
      variant="secondary" 
      size="sm" 
      className="display-button"
      onClick={()=>this.nullButtonClick(output)}
    >
      <FontAwesomeIcon icon={btnIcon} />
    </Button>
    let titleElement = <div className="output-title">{output.name}</div>

    return <div className="output" key={output.key}>
    {/* return <> */}
      {typeof ctrl !== "undefined" ? Display.getControl(ctrl, this.props.bindControl) : <div className="control-input"></div>}
      {isNullable ? btnElement : <div></div>}
      {titleElement}
      {Display.getSocket(output, "output", this.props.bindSocket, {visibility: isNull ? "hidden" : "visible"})}
    {/* </> */}
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


export class ComponentDynamic extends ComponentBase {
  data = { component: DisplayDynamic };
  socket: Rete.Socket;
  varSpec: JSONValue;
  constructor(name: string, varSpec: JSONValue) {
    super(name);
    let socket = sockets.get(name)?.socket;
    if (!socket) {
      throw new Error(`expected socket "${name}" to exist!`);
    }
    this.socket = socket;
    this.varSpec = varSpec;
  }

  /**
   * process a JSON schema "property" for a given definition, by setting node data and adding relevant control/output 
   */
  process_property(node: Rete.Node, editor: Rete.NodeEditor, key: string, property: JSONObject) {
    let nodeData = Data.nGetData(node);

    /**
     * helper function to set control value, create control and add control
     * @param var_default optional default value to create control with 
     * @param control_type class type of control
     * @param control_kwargs additional kwargs to pass to control
     */
    const addControl = (var_default: any, control_type: any, control_kwargs?: {[key: string]: any}) => {
      // if node is created with data already (`nodeData`) then use
      // otherwise take JSON schema "default" if exist, or default value passed by user
      let val = nodeData[key] ?? (property && property["default"]) ?? var_default;
      // assign value to node data
      nodeData[key] = val;
      
      // set base kwargs to pass to control
      let base_kwargs = {
        value: val,
        display_disabled: Data.getOutputNulls(node)[key] === true
      }
      // create control with base kwargs and kwargs passed by user
      let ctrl = new control_type(key, editor, node, {...base_kwargs, ...control_kwargs});
      // add control to node
      node.addControl(ctrl);
      // set output -> control key map
      // TODO - update control keys so they don't match output keys to avoid confusion?
      Data.getOutputControls(node)[key] = key;
    }
    
    if(property["const"]) {

      // if JSON property is a "const" then set value in node data but dont create output or control
      nodeData[key] = property["const"];
    } else {

      // get type from property
      let var_type = property["type"];

      // create control if relevant 
      if( var_type === "string") {
        addControl("", MyControls.ControlText);
      } else if( var_type === "integer" || var_type === "number" ) {
        addControl(null, MyControls.ControlNumber);
      } else if( var_type === "boolean") {
        addControl("", MyControls.ControlBool);
      } 
      
      // get title from property if exist, else just use property key
      let title = property["title"] ? String(property["title"]) : key;

      // create socket and add output using socket
      let socket = getJSONSocket(property);
      let output = new Rete.Output(key, title, socket)
      node.addOutput(output);

      // set type definition to be read by any child elements
      getTypeDefinitions(node)[key] = property;
      /** on connection created, set selected type to parent specification (if exists) and hide type selection control */
      

    }
  }


  _builder(node: Rete.Node, editor: Rete.NodeEditor) {
    node.addInput(new Rete.Input("parent", "Parent", this.socket));
    let spec = getObject(this.varSpec);
    if(spec) {
      let required: string[] = spec["required"] as string[] ?? [];
      let properties = getObject(spec["properties"]);
      if(properties) {
        Object.entries(properties).forEach(([k, v]) => {
          let property = getObject(v);
          if(property) {
            if( !required.includes(k) ) {
              Data.getOutputNulls(node)[k] = property["default"] === null || property["default"] === undefined;
            }
            this.process_property(node, editor, k, property);
          }
        });
      }
    }

    const processControl = (connection: Rete.Connection, func: (control: ReteControl) => void) => {
      let input = connection.input
      let output =  connection.output;
      // check that the connection created is "parent" input to another node's output
      if(!(output.node === node && input.node))
        return
      let controlKey = getOutputControls(node)[output.key];
      let control = node.controls.get(controlKey);
      if(control && control instanceof ReteControl) {
        func(control);
        control.update && control.update();
      }
    }
    /** on connection created */
    const connectionCreatedFunc: Data.ConnectionFunc = (connection: Rete.Connection) => {
      processControl(connection, (control: ReteControl) => {
        // output has connection, diable control
        control.props.display_disabled = true;
      })
    }
    /** on connection removed  */
    const connectionRemovedFunc: Data.ConnectionFunc = (connection: Rete.Connection) => {
      processControl(connection, (control: ReteControl) => {
          // connection removed, set disabled to stored null value
          control.props.display_disabled = getOutputNulls(node)[connection.output.key];
      });
    }
    Data.setConnectionFuncs(node, {
      "created": connectionCreatedFunc, 
      "removed": connectionRemovedFunc
    });
  }
}

const _default = {
  ComponentDynamic
}; 
export default _default;