import * as Rete from "rete";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import * as Sockets from "../sockets/sockets";
import * as Controls from "../controls/controls";
import { ReteReactControl as ReteControlBase, ReteReactComponent as ReteComponent } from "rete-react-render-plugin"; } from "rete-react-render-plugin";
import * as Data from "../data/attributes";
import { getJSONSocket, getObject, JSONObject, JSONValue } from "../jsonschema";
import { ReteReactControl as ReteControl } from "rete-react-render-plugin";
import * as Display from "../display";
import * as ReactRete from "rete-react-render-plugin";
import { getConnectedData, getSelectedSocket, isInput, updateViewConnections } from "../helpers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faMouse,
  faPlus,
  faTimes,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import XLSXColumn from 'xlsx-column';
import { Button } from "react-bootstrap";


function getNextCoreName(node: Rete.Node) {
  let nextIndex = Data.getNextOutputIndex(node);
  return 'Item ' + new XLSXColumn(nextIndex).toString();
}

function setCoreMap(oMap: Data.CoreMap, coreName: string, property: JSONObject) {
  oMap.reactKey = coreName;
  oMap.schema = property;
  let typ = property.type;
  let controlName = `${coreName} input`;

  if(typ === "integer" || typ === "number") {
    oMap.dataValue = oMap.dataValue ?? property.default ?? 0;
    oMap.dataControl = controlName;
  } else if(typ === "string") {
    oMap.dataValue = oMap.dataValue ?? property.default ?? "";
    oMap.dataControl = controlName;
  } else if(typ === "boolean") {
    oMap.dataValue = oMap.dataValue ?? property.default ?? "False";
    oMap.dataControl = controlName;
  } else if(typ === "null") {
    oMap.dataValue = null;
  } else if(property.const !== undefined) {
    oMap.dataValue = property.const;
    oMap.hide = true;
  }

}

function setElementaryMap(oMap: Data.ElementaryMap, property: JSONObject, coreName: string, canMove: boolean) {
  oMap.canMove = canMove;
  let typ = property.type;
  if(typeof typ === "string" && !(typ === "null")) {
    oMap.outputKey = `${coreName} output`;
  }
}


function setFixedObjectMap(oMap: Data.DataMap, key: string, property: JSONObject) {
  oMap.nameFixed = true;
  oMap.nameValue = key;
  // get control args with value and display disabled (common to all controls)
  let required: string[] = this.schema["required"] as string[] ?? [];
  oMap.isNulled = false;
  oMap.nullable = false;

  if(!required.includes(key)) {
    oMap.nullable = true;
    // property not required - set to null if default is null or no default provided
    // pydantic will not set a JSON "default" value if default "None" is provided, hence checking for default "undefined" 
    oMap.isNulled = property["default"] === null || property["default"] === undefined;
  }

  let title = property["title"] ? String(property["title"]) : key;
  oMap.nameDisplay = title;   
}


function setDynamicObjectMap(oMap: Data.DataMap, coreName: string) {
  oMap.nameFixed = false;
  oMap.nameValue = "";
  oMap.nameControl = `${coreName} name`;
}



 /** create control */
function getControl(
  var_type: string, 
  node: Rete.Node,
  editor: Rete.NodeEditor,
  dataHandler: Controls.DataHandler, 
  key: string,
  value: any,
  disabled: boolean
  ) {

  if( var_type === "string") { 
    return new Controls.TextControl(
      key, 
      editor, 
      node, 
      {value: value, display_disabled: disabled}, 
      dataHandler
    );
  } else if( var_type === "integer" || var_type === "number" ) {
    return new Controls.NumberControl(        
      key, 
      editor, 
      node, 
      {value: value, display_disabled: disabled}, 
      dataHandler
    );
  } else if( var_type === "boolean") {
    return new Controls.BoolControl(
      key, 
      editor, 
      node, 
      {value: value, display_disabled: disabled}, 
      dataHandler
    );
  } 
  return null;
}


function createMapItems(node: Rete.Node, oMap: Data.DataMap, editor: Rete.NodeEditor) {
  if(oMap.hide) {
    return;
  }

  // if name control specified but doesnt exist then create
  let nameKey = oMap.nameControl;
  if(nameKey && !node.controls.get(nameKey)) {
    // add control with same key as output and blank value
    node.addControl(new Controls.TextControl(
      nameKey, 
      editor, 
      node, 
      {value: oMap.nameValue},
      getNameHandler(oMap)
    ));
  }
  
  // if value control is specified but doesnt exist then create
  let valueKey = oMap.dataControl;
  if(valueKey && !node.controls.get(valueKey)) {
    let typ = oMap.schema.type;
    if(typeof typ === "string") {
      let control = getControl(
        typ,
        node,
        editor,
        getValueHandler(oMap),
        valueKey,
        oMap.dataValue,
        oMap.isNulled ?? false
      );
      if(control) {
        node.addControl(control);
      }
    }
  }

  let outputKey = oMap.outputKey;
  if(outputKey && !node.outputs.get(outputKey)) {
    node.addOutput(new Rete.Output(oMap.outputKey, oMap.outputKey, Sockets.anySocket));
  }
}


function removeMapItems(node: Rete.Node, oMap: Data.DataMap, editor: Rete.NodeEditor) {
  let control = node.controls.get(oMap.nameControl);
  if(oMap.nameControl && control) {
    node.removeControl(control);
  }
  control = node.controls.get(oMap.dataControl);
  if(oMap.dataControl && control) {
    node.removeControl(control);
  }
  let output = node.outputs.get(oMap.outputKey);;
  if(oMap.outputKey && output) {
    // remove connections from view
    output.connections.map(c => editor.removeConnection(c));
    node.removeOutput(output);
  }
}


function _complete(node: Rete.Node, editor: Rete.NodeEditor) {
  node.update(); // update output mappings and node
  editor.trigger('process');  // trigger editor change event
  updateViewConnections([node], editor); // for each affected node update its connections
}


/**
 * List Actions for add/remove/move up/move down
 * (Lists are not displayed with controls with outputs (unlike dicts which are))
 * - {output: control} key mappings from `getOutputControls()` function is used to track order of outputs but the `control` values are effectively ignored 
 * - getGeneralAttributes().outputTracker is used to track the total number of outputs added over time to create new names
*/
export function elementAdd(node: Rete.Node, editor: Rete.NodeEditor, idx: number): Data.DataMap {
  // get selected type from type selection control
  const coreName = getNextCoreName(node);
  let attrs = Data.getGeneralAttributes(node);
  let newMap: Data.ElementaryMap = {};
  setCoreMap(newMap, coreName, attrs.attributeSchema);
  setElementaryMap(newMap, attrs.attributeSchema, coreName, true);
  if(attrs.componentSchema.type === "object") {
    setDynamicObjectMap(newMap, coreName);
  }

  // index in output list for new output follows output pressed
  let outputMaps = Data.getOutputMap(node);
  const newIndex: number = idx + 1;
  outputMaps.splice(newIndex, 0, newMap);

  // create elements
  createMapItems(node, newMap, editor);

  _complete(node, editor);

  // return new output map
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
  
  // remove map elements
  removeMapItems(node, outputMaps[idx], editor);

  // remove output map
  outputMaps.splice(idx, 1);
  
  _complete(node, editor);
}


export function elementUp(node: Rete.Node, editor: Rete.NodeEditor, idx: number) {
  let outputMaps = Data.getOutputMap(node);
  if(!(idx > 0 && idx < outputMaps.length && !outputMaps[idx-1].canMove)) {
    editor.trigger("error", {message: `cant move output index up "${idx}"`});
    return;
  }
    
  // get selected element
  const m = outputMaps[idx];
  // pop element out
  outputMaps.splice(idx, 1);
  // move "up" (up on screen, down in list index)
  outputMaps.splice(idx - 1, 0, m);

  _complete(node, editor);
}


export function elementDown(node: Rete.Node, editor: Rete.NodeEditor, idx: number) {
  let outputMaps = Data.getOutputMap(node);
  if(!(idx >= 0 && (idx + 1) < outputMaps.length)) {
    editor.trigger("error", {message: `cant move output index down "${idx}"`});
    return;
  } 

  // get next element
  const m = outputMaps[idx + 1];
  // remove next element
  outputMaps.splice(idx + 1, 1);
  // insert behind - move "down" (down on screen, up in list index)
  outputMaps.splice(idx, 0, m);

  _complete(node, editor);
}




class DynamicDisplay extends ReactRete.Node {

  /** process object member null button click -  */
  nullButtonClick(oMap: Data.ObjectMap): void {

    // ignore click if output has a connection
    let output = this.props.node.outputs.get(oMap.outputKey);
    
    if(output && output.hasConnection()) {
      return;
    }

    // if not "null" then user is clicking to null, delete all connections
    if(!oMap.isNulled) {
      if(output) {
        output.connections.forEach(c => this.props.editor.removeConnection(c));
      }
    }

    // invert "null" value
    oMap.isNulled = !oMap.isNulled;
    
    // if output has mapped control, disable it
    if(oMap.dataControl) {
      let control = this.props.node.controls.get(oMap.dataControl);
      if(control && control instanceof ReteControl) {
        // set display disabled and update control
        control.props.display_disabled = oMap.isNulled;
        control.update && control.update();
      }
    }

    // update node and connections
    this.props.node.update();
    this.props.editor.view.updateConnections({node: this.props.node});
    this.props.editor.trigger('process');
  }

  getPositionalButtons(index: number): JSX.Element {
    return <div className="output-item-controls">
      <div className="output-item-arrows">
        <div>
          <button onClick={() => elementUp(this.props.node, this.props.editor, index)}>
            <FontAwesomeIcon icon={faChevronUp} size="xs" />
          </button>
        </div>
        <div>
          <button onClick={() => elementDown(this.props.node, this.props.editor, index)} >
            <FontAwesomeIcon icon={faChevronDown} size="xs" />
          </button>
        </div>
      </div>
      <Button variant="light" className="" size="sm" onClick={() => elementAdd(this.props.node, this.props.editor, index)} >
        <FontAwesomeIcon icon={faPlus} />
      </Button>
      <Button variant="warning" className="" size="sm" onClick={() => elementRemove(this.props.node, this.props.editor, index)}>
        <FontAwesomeIcon icon={faTrash} />
      </Button>
    </div>
  }

  getMappedOutput(oMap: Data.DataMap, index: number): JSX.Element {
    if(oMap.hide) {
      return <></>;
    }
    
    // get name element
    let nameElement: JSX.Element = <div></div>;
    if(oMap.nameValue !== undefined) {
      if(oMap.nameFixed) {
        // name element fixed - use static name, non editable
        nameElement = <span className="me-1 ms-1">{oMap.nameDisplay}</span>
      } else {
        // name element editable - display control
        let nameControl = this.props.node.controls.get(oMap.nameControl);
        if(nameControl) {
          nameElement = Display.getControl(nameControl, this.props.bindControl);
        }
      }
    }

    // create positional / nullable element
    let dynamicElement: JSX.Element = <div></div>;
    if(oMap.canMove) {
      // get up/down buttons
      dynamicElement = this.getPositionalButtons(index);
    } else if(oMap.nullable) {
      // if item is nullable, display null/un-null button
      let btnIcon = oMap.isNulled ? faMouse : faTimes;
      dynamicElement = <Button 
        variant="secondary" 
        size="sm" 
        className="display-button"
        onClick={()=>this.nullButtonClick(oMap)}>
        <FontAwesomeIcon icon={btnIcon} />
      </Button>
    }
    
    // get data editing control
    let dataElement = <div></div>
    if(oMap.dataControl) {
      let dataControl = this.props.node.controls.get(oMap.dataControl);  
      if(dataControl) {
        dataElement = Display.getControl(dataControl, this.props.bindControl);
      }
    }

    // get output socket
    let socketElement = <div></div>;
    if(oMap.outputKey) {
      let output = this.props.node.outputs.get(oMap.outputKey);
      if(output) {
        socketElement = Display.getSocket(output, "output", this.props.bindSocket, {
          visibility: oMap.isNulled ? "hidden" : "visible" // dont display if output nulled
        });
      } 
    }

    // get type select control
    let selectElement = <div></div>
    if(oMap.selectControl) {
      let selectControl = this.props.node.controls.get(oMap.selectControl); 
      if(selectControl) {
        selectElement = Display.getControl(selectControl, this.props.bindControl);
      }
    }

    return <div className="dynamic-output" key={oMap.reactKey}>
      {nameElement}
      {dataElement}
      {dynamicElement}
      {selectElement}
      {socketElement}
    </div>

  }

  /** render elementary outputs with their mapped controls */
  renderMappedOutputs(): JSX.Element[] {
    let outputMaps = Data.getOutputMap(this.props.node);
    return outputMaps.map((o, i) => this.getMappedOutput(o, i))
  }

  renderUnmappedControls(): JSX.Element[] {
    let outputMaps = Data.getOutputMap(this.props.node);
    return Array.from(
      this.props.node.controls.values()
    ).filter(
      ctrl => !outputMaps.find(
        o => [o.dataControl, o.nameControl, o.selectControl].includes(ctrl.key)
      )
    ).map(
      c => Display.getControl(c, this.props.bindControl)
    )
  }

  render() {
    return Display.renderComponent(
      this.props, 
      this.state,
      () => this.renderMappedOutputs(),
      () => this.renderUnmappedControls()
    )
  }
}



/**
 * @param oMap output map instance
 * @param setData function to set data in output map instance
 * @returns function to create control handler
 */
function _getControlHandler(oMap: Data.DataMap, setData: (oMap: Data.DataMap, value: any) => void): Controls.DataHandler {
  return (ctrl: ReteControlBase, emitter: Rete.NodeEditor, key: string, data: any) => {
    ctrl.props.value = data;
    setData(oMap, data);
    emitter.trigger("process");
    ctrl.update && ctrl.update();
  }
} 

/**
 * get handler for value control
 * @param oMap output map instance
 * @returns function to create control handler to set "dataValue" property
 */
const getValueHandler = (oMap: Data.DataMap) => _getControlHandler(
  oMap, 
  (oMap: Data.DataMap, value: any) => oMap.dataValue = value
);

/**
 * get handler for name control
 * @param oMap output map instance
 * @returns function to create control handler to set "nameValue" property
 */
const getNameHandler = (oMap: Data.DataMap) => _getControlHandler(
  oMap, 
  (oMap: Data.DataMap, value: any) => oMap.nameValue = value
);


/** list of available types */
export let componentsList: Array<string> = [];


export class MyComponent extends ReteComponent {
  data = {component: DynamicDisplay}
  schema: JSONObject;
  socket: Rete.Socket;
  constructor(name: string, schema: JSONObject, socket: Rete.Socket) {
    super(name);
    componentsList.push(name);
    this.schema = schema;
    this.socket = socket;
  }
  builder(node: Rete.Node): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.editor) {
        this.internalBuilder(node, this.editor);
        resolve();
      } else {
        reject(`this.editor is not available`);
      }
    });
  }
  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void { }
  internalBuilder(node: Rete.Node, editor: Rete.NodeEditor): void {
    node.addInput(new Rete.Input("parent", "Parent", this.socket));
    let outputMaps = Data.getOutputMap(node);
    let typ = this.schema.type as string;

    // check type is basic
    if(["null", "boolean", "number", "integer", "string"].includes(typ)) {
      let firstMap: Data.DataMap = {}
      if(outputMaps.length >= 1) {

        // if node data exists already then retrieve it
        firstMap = outputMaps[0];

       } else {

        // if no maps exist then add empty map to list
        outputMaps.push(firstMap);
        setCoreMap(firstMap, "input", this.schema);

       }
       createMapItems(node, firstMap, this.editor);
    } else if(typ === "array") {
            
    }
  }

  getData(node: Rete.Node, editor: Rete.NodeEditor) {
    /**
     * retrieve data from an output map
     * 
     * if it has a valid output with connection, data will be retrieved from connected node
     * if fixed value is nulled, return null
     * otherwise return stored data value
     */
    const getValue = (oMap: Data.DataMap) => {
      let output = node.outputs.get(oMap.outputKey);
      if (output && output.hasConnection()) {
        return getConnectedData(output, editor);
      } else {
        if(oMap.isNulled) {
          return null
        } else if (oMap.dataValue !== undefined) {
          return oMap.dataValue
        } else {
          return null
        };
      }
    };
    let outputMaps = Data.getOutputMap(node);

    if (this.schema.type === "object") {
      // for objects, return data in key value pairs
      return Object.fromEntries(
        outputMaps.map(oMap => [oMap.nameValue, getValue(oMap)])
      )
    }
    else if(this.schema.type === "array") {
      // for arrays, return data as a list
      return outputMaps.map(oMap =>  getValue(oMap));

    } else if(outputMaps.length >= 1) {
      // for anything else, should be 1 entry with a data value
      return getValue(outputMaps[0]);
    } else {
      return null;
    }
  }
}
