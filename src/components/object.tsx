import * as Rete from "rete";
import * as MySocket from "../sockets/sockets";
import * as Controls from  "../controls/controls";
import { ReteReactControl as ReteControlBase } from "rete-react-render-plugin";
import * as Data from "../data/attributes";
import { BaseComponent } from "./base";
import { getJSONSocket, getObject, JSONObject, JSONValue } from "../jsonschema";
import { ReteReactControl as ReteControl } from "rete-react-render-plugin";
import * as List from './list';
import * as ENode from '../elementary/elementary';
import * as EDisplay from '../elementary/display';
import * as Display from '../display';
import * as ReactRete from 'rete-react-render-plugin';
import { getConnectedData, getSelectedSocket, isInput } from "../helpers";
import { SelectControl } from "../controls/controls";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp, faMouse, faPlus, faTimes, faTrash } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";



/**
 * Dictionary actions for add/remove/move up/move down
 * Same as list actions except dictionary has controls as well as outputs
 */
 function objAdd(node: Rete.Node, editor: Rete.NodeEditor, idx: number, typeSelectKey: string) {
  // run list action to add new output
  let newMap = List.elementAdd(node, editor, idx, typeSelectKey);

  newMap.nameFixed = false; // dynamic value so name can be edited
  newMap.nameValue = ""; // set name initially to blank string

  // create attribute name key
  newMap.nameControl = `${newMap.outputKey} name`;

  // add control with same key as output and blank value
  node.addControl(new Controls.TextControl(
    newMap.nameControl, 
    editor, 
    node, 
    {value: ""},
    getNameHandler(newMap)
  ));
  
}


function objRemove(node: Rete.Node, editor: Rete.NodeEditor, idx: number) {
  let oMap = Data.getOutputMap(node)[idx];
  if(oMap) {
    let ctrl = node.controls.get(oMap.nameControl);
    if( ctrl ) {
      node.removeControl(ctrl);  // remove control from node
    }
  }

  // run list action to remove output
  List.elementRemove(node, editor, idx);
}


const OBJECT_SELECT_KEY = "Select Type";
const objActions: EDisplay.Actions = {
  "add": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => objAdd(node, editor, idx, OBJECT_SELECT_KEY),
  "remove": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => objRemove(node, editor, idx),
  "moveUp": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => List.elementUp(node, editor, idx),
  "moveDown": (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => List.elementDown(node, editor, idx)
}


export function getPositionalButtons<T extends ReactRete.NodeProps>(
  index: number, 
  actions: EDisplay.Actions,
  props: T,
): JSX.Element {
  const exAction = (name: EDisplay.ActionName) => actions[name](props.node, props.editor, index); 
  return <div className="output-item-controls">
    <div className="output-item-arrows">
      <div>
        <button onClick={() => exAction("moveUp")}>
          <FontAwesomeIcon icon={faChevronUp} size="xs" />
        </button>
      </div>
      <div>
        <button onClick={() => exAction("moveDown")} >
          <FontAwesomeIcon icon={faChevronDown} size="xs" />
        </button>
      </div>
    </div>
    <Button variant="light" className="" size="sm" onClick={() => exAction("add")} >
      <FontAwesomeIcon icon={faPlus} />
    </Button>
    <Button variant="warning" className="" size="sm" onClick={() => exAction("remove")}>
      <FontAwesomeIcon icon={faTrash} />
    </Button>
  </div>
}


class ObjectDisplay extends ReactRete.Node {

  /** process object member null button click -  */
  nullButtonClick(output: Rete.Output): void {

    // ignore click if output has a connection
    if(output.hasConnection()) {
      return;
    }

    let outputMap = Data.getOutputMap(this.props.node).find(o => o.outputKey == output.key);
    if (!outputMap) {
      return;
    }

    // if not "null" then user is clicking to null, delete all connections
    if(!outputMap.isNulled) {
      output.connections.forEach(c => this.props.editor.removeConnection(c))
    }

    // invert "null" value
    outputMap.isNulled = !outputMap.isNulled;
    
    // if output has mapped control, disable it
    if(outputMap.dataControl) {
      let control = this.props.node.controls.get(outputMap.dataControl);
      if(control && control instanceof ReteControl) {
        // set display disabled and update control
        control.props.display_disabled = outputMap.isNulled;
        control.update && control.update();
      }
    }

    // update node and connections
    this.props.node.update();
    this.props.editor.view.updateConnections({node: this.props.node});
    this.props.editor.trigger('process');
  }

  getOutput<T extends ReactRete.NodeProps>(
    index: number, 
    actions: EDisplay.Actions,
    props: T,
  ): JSX.Element {
    let oMap = Data.getOutputMap(props.node)[index];
    if(oMap.hide) {
      return <></>;
    }
    let output = props.node.outputs.get(oMap.outputKey);

    // create blank elements for name and controls
    let nameElement: JSX.Element = <div></div>;
    let controlElements: JSX.Element = <div></div>;

    if(oMap.nameFixed) {

      // name element fixed - use static name, non editable
      nameElement = <span className="me-1 ms-1">{oMap.nameDisplay}</span>

      if(oMap.nullable) {
        // if item is nullable, display null/un-null button
        let btnIcon = oMap.isNulled ? faMouse : faTimes;
        controlElements = <Button 
          variant="secondary" 
          size="sm" 
          className="display-button"
          onClick={()=>this.nullButtonClick(output)}>
          <FontAwesomeIcon icon={btnIcon} />
        </Button>

      }
    } else {

      // name element editable - display control
      let nameControl = props.node.controls.get(oMap.nameControl);
      if(nameControl) {
        nameElement = Display.getControl(nameControl, props.bindControl);
      }

      // use position buttons to move up/down
      controlElements = getPositionalButtons(index, actions, props);

    }
    
    let dataControl = props.node.controls.get(oMap.dataControl);  // get data editing control
    let socket = Display.getSocket(output, "output", this.props.bindSocket, {
      visibility: oMap.isNulled ? "hidden" : "visible"
    }) // get socket - dont display if output nulled
    let selectControl = props.node.controls.get(oMap.selectControl); // get type select control

    return <div className="dynamic-outputs">
      <div>{nameElement}</div>
      {dataControl ? Display.getControl(dataControl, props.bindControl) : <div></div>}
      {controlElements}
      {selectControl ? Display.getControl(selectControl, props.bindControl) : <div></div>}
      {socket}
    </div>

  }

  render() {
    const { node, bindSocket, bindControl } = this.props;
    const { outputs, controls, inputs, selected } = this.state;
    let statisControls = EDisplay.getUnmappedControls(node);

    return <div className={`node ${selected}`}>
        {Display.getTitle(node.name)}
        {/* Outputs */}
        <div className="">
          {Data.getOutputMap(node).map((oMap, i) => this.getOutput(i, objActions, this.props))}
        </div>
        {/* Controls (check not mapped to output) */}
        <div className="controls-container" >
        {statisControls.map((control) => Display.getControl(control, bindControl))}
        </div>        
        {/* Inputs */}
        {inputs.map((input) => Display.getInput(input, bindControl, bindSocket))}
      </div>
    
  }
}


// name control handler
const getNameHandler: (oMap: Data.ObjectMap) => Controls.DataHandler = (oMap: Data.ObjectMap) => {
  return (ctrl: ReteControlBase, emitter: Rete.NodeEditor, key: string, data: any) => {
    ctrl.props.value = data;
    oMap.nameValue = data; // set stored value
    emitter.trigger("process");
    ctrl.update && ctrl.update();
  }
}


/** Dictionary component - labelled dynamic outputs that can be re-ordered/modified  */
export class ObjectComponent extends BaseComponent {
  data = {component: ObjectDisplay}
  constructor(name: string = "Object") {
    super(name);
  }


  /** create control */
  getControl(node: Rete.Node, oMap: Data.ObjectMap, property: JSONObject, key: string, editor: Rete.NodeEditor) {

    /** get control initial value
     * try node data, then JSON default then user default */
    const getValue = (oMap: Data.ObjectMap, property: JSONObject, usr_default: any) => {
      return oMap.dataValue ?? property["default"] ?? usr_default;
    }

    const getArgs = (usr_default: any) => ({
      value: getValue(oMap, property, usr_default), 
      display_disabled: oMap.isNulled
    });

    const dataHandler: Controls.DataHandler = (ctrl: ReteControlBase, emitter: Rete.NodeEditor, key: string, data: any) => {
      ctrl.props.value = data;
      oMap.dataValue = data;
      emitter.trigger("process");
      ctrl.update && ctrl.update();
    }

    // process type from property
    let var_type = property["type"];
    if( var_type === "string") { 
      return new Controls.TextControl(key, editor, node, getArgs(""), dataHandler);
    } else if( var_type === "integer" || var_type === "number" ) {
      return new Controls.NumberControl(key, editor, node, getArgs(0), dataHandler);
    } else if( var_type === "boolean") {
      return new Controls.BoolControl(key, editor, node, getArgs(""), dataHandler);
    } 
    return null;
  }

  /**
   * process a JSON schema "property" for a given definition, by setting node data and adding relevant control/output 
   */
  process_property(node: Rete.Node, editor: Rete.NodeEditor, key: string, property: JSONObject, index: number, required: boolean): void {
    let outputMaps = Data.getOutputMap(node);
    let oMap: Data.ObjectMap = outputMaps[index] ?? {};
    oMap.nameValue = key;
    oMap.nameFixed = true;

    if(property["const"]) {
      // if JSON property is a "const" then set value in node data but dont create output or control
      oMap.dataValue = property["const"];
      oMap.hide = true;
      outputMaps.push(oMap);
      return;
    } 

    // get title from property if exist, else just use property key
    let title = property["title"] ? String(property["title"]) : key;
    oMap.nameDisplay = title;    


    // get control args with value and display disabled (common to all controls)
    oMap.isNulled = false;
    if(!required) {
      oMap.nullable = true;
      // property not required - set to null if default is null or no default provided
      // pydantic will not set a JSON "default" value if default "None" is provided, hence checking for default "undefined" 
      oMap.isNulled = property["default"] === null || property["default"] === undefined;
    }
    
    let control = this.getControl(node, oMap, property, key, editor);
    if(control) {
      // add control to node
      node.addControl(control);

      // set node data (in case value was pulled from JSON schema or default)
      oMap.dataControl = key;
      oMap.dataValue = control.props.value;
    }
      
    // create socket and add output using socket
    let socket = getJSONSocket(property);
    let output = new Rete.Output(key, title, socket)
    node.addOutput(output);

    oMap.outputKey = key;  // set mapped output
    oMap.outputSchema = property;  // set type definition to be read by any child elements 
    outputMaps.push(oMap);
  }


  internalBuilder(node: Rete.Node, editor: Rete.NodeEditor) {
    // component name for parent socket - either object or named component
    let socket = MySocket.sockets.get(this.name).socket;
    node.addInput(new Rete.Input("parent", "Parent", socket));

    
    // get schema from node data
    let schema = getObject(Data.getGeneralAttributes(node).componentSchema);
    if(schema) {
    
      // get list of required properties
      let required: string[] = schema["required"] as string[] ?? [];
      let properties = getObject(schema["properties"]);

      if(properties) {
        // loop properties
        Object.entries(properties).forEach(([k, v], i) => {
          let property = getObject(v);
          if(property) {

            // pass JSON property to be processed with output null to show/hide control
            this.process_property(node, editor, k, property, i, required.includes(k));
          }
        });
      }
    }

    if(!(schema && schema["additionalProperties"] === false)) {
      node.addControl(ENode.buildAddButton(node, editor, objActions["add"]));
    }
  }

  getData(node: Rete.Node, editor: Rete.NodeEditor) {
    const getValue = (oMap: Data.ObjectMap, output: Rete.Output) => {
      if(output.hasConnection()) {
        return getConnectedData(output, editor);
      } else {
        if(oMap.isNulled) return null;
        else if(oMap.dataValue !== undefined) return oMap.dataValue;
        else return null;
      }
    }
    return Object.fromEntries(
      Data.getOutputMap(node).map(o => {
        let output = node.outputs.get(o.outputKey);
        return [o.nameValue, getValue(o, output)];
      })
    );
  }
}


export class DynamicComponent extends ObjectComponent {
  schema: JSONValue;
  constructor(name: string, schema: JSONValue) {
    super(name);
    this.schema = schema;
  }
  internalBuilder(node: Rete.Node, editor: Rete.NodeEditor) {
    Data.getGeneralAttributes(node).componentSchema = getObject(this.schema) ?? {};
    super.internalBuilder(node, editor);
  }
}



// /** validate input node is dict and connection input is "parent" */
// const validateConnection = (connection: Rete.Connection, isInput: boolean) => isInput && connection.input.key === "parent";

// /** process connections when node connects to dict "parent" input, reading its schemas */
// Data.nodeConnectionFuns["Dictionary"] = {
//   created: (connection: Rete.Connection, editor: Rete.NodeEditor, isInput: boolean) => {
//     if(!validateConnection(connection, isInput)) return;
//     let node = connection.input.node;

//     // get schema map from connected node and index to output
//     let output = connection.output;
//     let schema = Data.getOutputMap(output.node).find(o => o.outputKey==output.key)?.schema;
    
//     // retrieve socket name to schema map from connection schemas
//     let socketSchemas = ENode.getSpecMap(schema, 
//       (s: JSONObject) => s.type === "object",
//       (s: JSONObject) => {
//         if(typeof(s.additionalProperties) === "object" && !Array.isArray(s.additionalProperties)) {
//           return s.additionalProperties;
//         } else {
//           return {};
//         }
//       }
//     );

//     Data.setSocketSchemas(node, socketSchemas);  // set socket name => schemas map for type selection
//     let socketKeys = Object.keys(socketSchemas);  // get socket names from schema map keys   
//     let selectControl = node.controls.get(OBJECT_SELECT_KEY) as Controls.ControlSelect;   // get select control

//     if(selectControl) {
//       // set type select to each of the socket names
//       selectControl.props.options = Object.keys(socketSchemas).map(nm => ({"label": nm, "value": nm}));
      
//       // change control select value with first key in list or any socket
//       let socketName = socketKeys.length >= 1 ? socketKeys[0] : MySocket.anySocket.name;
//       ENode.selectControlChange(node, socketName, selectControl, editor);        
//     }
//   },
//   removed: (connection: Rete.Connection, editor: Rete.NodeEditor, isInput: boolean) => {
//     if(validateConnection(connection, isInput)) {
//       // on connection remove, reset control type selection to default list
//       let node = connection.input.node;
//       let selectControl = node.controls.get(OBJECT_SELECT_KEY) as ControlSelect;
//       if(selectControl) {
//         ENode.resetTypes(node, selectControl, editor);
//       }
//     }
//   }
// }
