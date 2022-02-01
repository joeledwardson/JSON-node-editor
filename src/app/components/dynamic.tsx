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
    let nodeData = Data.getControlsData(node);

    // get control value - try node data, then JSON default then user default
    const getValue = (var_default: any) => nodeData[key] ?? (property && property["default"]) ?? var_default;
    
    if(property["const"]) {
      // if JSON property is a "const" then set value in node data but dont create output or control
      nodeData[key] = property["const"];
      return;
    } 

    // get type from property
    let var_type = property["type"];

    // get control if valid based on variable type
    const getControl = () => {
      if( var_type === "string") { 
        return new MyControls.ControlText(key, editor, node, {value: getValue("")});
      } else if( var_type === "integer" || var_type === "number" ) {
        return new MyControls.ControlNumber(key, editor, node, {value: getValue(0)});
      } else if( var_type === "boolean") {
        return new MyControls.ControlBool(key, editor, node, {value: getValue("")});
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
    /** on connection created, set selected type to parent specification (if exists) and hide type selection control */
     
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