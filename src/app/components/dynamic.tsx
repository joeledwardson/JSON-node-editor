import * as Rete from 'rete';
import * as Sockets from "../sockets/sockets";
import * as MyControls from "../controls/controls";
import * as Display from './display';
import * as Data from "../data/attributes";
import {  ComponentBase, TypeList } from "./basic";
import * as ReactRete from 'rete-react-render-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ReteReactControl as ReteControl } from "../../retereact";
import { faTimes, faMouse } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";
import { sockets } from "../sockets/sockets";
import { getOutputControls, getOutputNulls } from "../data/attributes";


/** add custom type to valid type list */
export const addType = (newType: string) => TypeList.push(newType);

type JSONObject = { [key: string]: JSONValue }; 
type JSONValue =
| Partial<{ [key: string]: JSONValue }>
| JSONValue[]
| string
| number
| boolean
| null;
const isObject = (v: JSONValue) => Boolean(v && typeof v === "object" && !Array.isArray(v));
const getObject = (v: JSONValue) => isObject(v) ? v as JSONObject : null;


/**
 * extract a reference name from JSON schema after the last "/"
 * e.g. get_ref_name("/schemas/hello") = "hello"
 */
function get_ref_name(ref_str: string): string | null {
  return /.*\/(?<name>.*)$/.exec(ref_str)?.groups?.name ?? null;
}

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
   * Get socket from JSON schema definition
   * 
   * @param property JSON Schema type definition
   * @returns Socket
   */
  get_socket(property: JSONObject): Rete.Socket {
    if( !isObject(property) ) {
      console.log(property);
      throw new Error(`^ expected property to be of type object`);
    }

    /**
     * helper function to create a socket that takes "any" as a child element 
     * e.g. anySocketContainer(Dict) produces a socket that accepts "any" with name "Dict[any]"
     **/
    const anySocketContainer = (baseName: string) => Sockets.multiSocket(
      [Sockets.anySocket.name],
      `${baseName}[${Sockets.anySocket.name}]`, 
      Sockets.anyColour
    );

    /**
     * Create socket with outer name and inner specification. 
     * name of inner specification key passed as well for error handling
     * 
     * e.g. getInnerSocket("items", {type: "boolean"}, "Array") would yield a socket Array[boolean]
     * 
     * @param innerVarName key used to retrieve `innerVar` in schema (for error handling)
     * @param innerVar JSON schema specification of socket inner type
     * @param baseName outer name for socket
     * @returns 
     */
    const getInnerSocket = (innerVarName: string, innerVar: JSONObject, baseName: string) => {
      let innerSocket =  this.get_socket(innerVar);
      if(innerSocket) {
        let nm = `${baseName}[${innerSocket?.name}]`;
        let socket = Sockets.multiSocket(
          innerSocket.compatible.map(s => s.name), 
          nm, 
          Sockets.listColour
        );
        return socket;
      } else {
        throw new Error(`couldnt retrieve inner socket from "${innerVarName}" parameter`);
      }
    }

    // read JSON schema definitions
    let varType = property["type"] ? String(property["type"]) : "";
    let anyOf = property["anyOf"];
    let varRef = property["$ref"];

    if(varRef) {

      // if a schema reference is passed, used the final part of the reference name for the socket
      if(typeof varRef === "string") {
        let refName = get_ref_name(varRef);
        if( refName ) {
          return Sockets.multiSocket([refName], refName);
        } else {
          throw new Error(`reference name invalid: "${varRef}"`);
        }
      } else {
        throw new Error(`expected "$ref to be a string`);
      }

    } else if(["string", "integer", "number", "boolean", "null"].includes(varType)) {

      // match basic JSON schema types (excluding array and object)
      return Sockets.multiSocket([Sockets.JSONTypeConvert(varType)]);

    } else if( varType === "array" ) {

      // type is array, parse inner type from "items" key (if given)
      let arrayName = Sockets.JSONTypeConvert("array");
      let varItems = property["items"];
      if(varItems) {

        // "items" key in JSON Schema passed to indicate inner type
        if(typeof varItems === "object" && Array.isArray(varItems)) {

          // do not currently support tuple types, where "items" is an array of definitions
          throw new Error('Currently do not support items in list form')

        } else if(typeof varItems === "object" && !Array.isArray(varItems)) {
          
          // inner definition has its own definitions - call function recursively
          return getInnerSocket("items", varItems as JSONObject, arrayName);

        } else {
          throw new Error('unknown format of array items');
        }
      } else {
        // if "items" not passed assume "any" as inner type
        return anySocketContainer(arrayName);
      }

    } else if( varType === "object" ) {

      // type "object" is taken as a dict in python
      let objectName = Sockets.JSONTypeConvert("object");

      if(property["properties"]) {
        // at present custom objects with required "properties" as well as additional keys are not supported
        // they should be defined in $refs
        throw new Error(`property has its own properties set - this should be defined as its own type in "definitions"`);
      }

      let ap = property["additionalProperties"];
      if(ap !== null && typeof ap === "object" && !Array.isArray(ap)) {

        // additionalProperties defines the type of values for dictionary keys
        return getInnerSocket("additionalProperties", ap as JSONObject, objectName)
      
      } else {

        // if additionalProperties not passed assume "any" for inner values
        return anySocketContainer(objectName);
      
      }
    } else if( anyOf ) {

      // "anyOf" means the type is a Union of different types
      if( typeof anyOf === "object" && Array.isArray(anyOf)) {

        // loop each type definition and create array of sockets
        let innerSockets = anyOf.map(t => this.get_socket(t as JSONObject)).filter((s): s is Rete.Socket => Boolean(s));
        
        // concatenate socket names together
        let socketName = Sockets.getTypeString(innerSockets.map(s => s.name));
        
        // get socket based on its name from existing list
        let socket = Sockets.sockets.get(socketName)?.socket;
        if(!socket) {
          // socket doesnt exist, create it and combine with each socket in the list
          let newSocket = Sockets.multiSocket([],  socketName);
          innerSockets.forEach(s => newSocket.combineWith(s));
          return newSocket;
        } else {
          // socket already exists
          return socket;
        }
      } else {
        throw new Error(`expected "anyOf" of property to be an array`);
      }
    } 
      

    return Sockets.anySocket;
    
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
        emitter: editor, 
        key: key, 
        value: val,
        display_disabled: Data.getOutputNulls(node)[key] === true
      }
      // create control with base kwargs and kwargs passed by user
      let ctrl = new control_type({...base_kwargs, ...control_kwargs});
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
      let socket = this.get_socket(property);
      let output = new Rete.Output(key, title, socket)
      node.addOutput(output);
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

  }
}

const _default = {
  ComponentDynamic
}; 
export default _default;