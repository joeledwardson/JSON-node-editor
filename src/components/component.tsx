import * as Rete from "rete";
import * as Sockets from "../sockets/sockets";
import * as Controls from "../controls/controls";
import { ReteReactControl} from "rete-react-render-plugin";
import * as Data from "../data/attributes";
import { anySchema, CustomSchema} from "../jsonschema";
import * as Display from "./display";
import * as ReactRete from "rete-react-render-plugin";
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
import { BaseComponent, getConnectedData } from "./base";
import { SomeJSONSchema } from "ajv/dist/types/json-schema";
import { SomeJTDSchemaType } from "ajv/dist/core";

/** update view connections after waiting */
export function updateViewConnections(nodes: Rete.Node[], editor: Rete.NodeEditor) {
  setTimeout(() => {
    nodes.forEach(n => editor?.view.updateConnections({node: n}));
    editor.trigger('process');
  }, 10);
}

/** increment mapped output tracker in node attributes and return */
function getNextOutputIndex(node: Rete.Node): number {
  let attrs = Data.getGeneralAttributes(node);
  if(attrs.outputTracker === undefined) {
    attrs.outputTracker = 0;
  }
  attrs.outputTracker += 1;
  return attrs.outputTracker;
}

/** convert mapped output index to excel string (e.g. 1 => 'A', 2 => 'B') */
function getNextCoreName(node: Rete.Node): string {
  let nextIndex = getNextOutputIndex(node);
  return 'Item ' + new XLSXColumn(nextIndex).toString();
}

const getDataKey = (coreName: string) => `${coreName} input`;
const getOutputKey = (coreName: string) => `${coreName} output`;
const getTypeKey = (coreName: string) => `${coreName} type`;
const getNamekey = (coreName: string) => `${coreName} name`;

/** set core attributes of mapped output
 * - reactKey set to core name
 * - schema set to property
 * - if schema type valid for a control:
 *    - data control key set
 *    - data value copied from existing node data if valid, otherwise from property default or 0/blank string/false
 */
function setCoreMap(oMap: Data.DataMap, coreName: string, property: SomeJSONSchema | null) {
  
  let hide = false;
  let dataValue: any = oMap.dataValue;
  let hasControl = false;

  if(property !== null) {
    let typ = property.type;
    if(typ === "integer" || typ === "number") {
      if(isNaN(dataValue)) {
        dataValue = property.default ?? 0;
      }
      hasControl = true;
    } else if(typ === "string") {
      if(!(typeof dataValue === "string")) {
        dataValue = property.default ?? "";
      }
      hasControl = true;
    } else if(typ === "boolean") {
      if(!(typeof dataValue === "boolean")) {
        dataValue = property.default ?? "False";
      }
      hasControl = true;
    } else if(typ === "null") {
      dataValue = null;
    } else if(property.const !== undefined) {
      dataValue = property.const;
      hide = true;
    } else {
      dataValue = null;
    }
  } else {
    dataValue = null;
  }

  oMap.reactKey = coreName;
  oMap.hide = hide;
  oMap.hasDataControl = hasControl;
  oMap.dataKey = getDataKey(coreName);
  oMap.dataValue = dataValue;
  oMap.schema = property;

  // disable additional functions
  oMap.canMove = false;
  oMap.hasFixedName = false;
  oMap.hasOutput = false;
  oMap.hasSelectControl = false;
  oMap.hasNameControl = false;
  oMap.isNullable = false;
}

type JSONBaseTypes = "null" | "boolean" | "object" | "array" | "number" | "integer" | "string";
const JSONTypeMap: {[key: string]: string} = {
  "null": "None",
  "boolean": "Boolean",
  "object": "Object",
  "array": "List",
  "number": "Number",
  "integer": "Number",
  "string": "Text"
}

/** set elementary attributes of mapped output */
function setElementaryMap(
  oMap: Data.ElementaryMap, 
  property: SomeJSONSchema | null, 
  coreName: string,
  nameDisplay: string | null = null, 
  canMove: boolean = true, 
  hasFixedName: boolean = false,
) {

  let schemaMap: {[key in string]: SomeJSONSchema} = {}
  const addToMap = (schema: SomeJSONSchema): void => { 
    let namedId = Data.getNamedIdentifier(schema);
    if(namedId && typeof namedId === "string") {
      // check for named schema
      schemaMap[namedId] = schema;
      return;
    } 

    if(typeof schema.type === "string" && schema.type in JSONTypeMap) {
      // check if type is valid
      let name = JSONTypeMap[schema.type];
      schemaMap[name] = schema;
      return;
    } 
    
    if(typeof schema.type === "object" && Array.isArray(schema.type)) {
      // loop list of types
      schema.type.forEach(t => {
        if(typeof t === "string" && t in JSONTypeMap) {
          // create new schema with type as a constant rather than an array
          const newSchema: SomeJSONSchema = JSON.parse(JSON.stringify(schema));
          let name = JSONTypeMap[t]; 
          newSchema.type = t;
          schemaMap[name] = newSchema;
        }
      });
      return;
    } 

    if(typeof schema.anyOf === "object" && Array.isArray(schema.anyOf)) {
      // process anyOf array
      schema.anyOf.forEach(s => addToMap(s));
    }
    if(typeof schema.oneOf === "object" && Array.isArray(schema.oneOf)) {
      // process oneOf array
      schema.oneOf.forEach(s => addToMap(s));
    }
  }
  if(property) {
    addToMap(property);
  }

  let schema: SomeJSONSchema | null = oMap.schema ?? null;
  let selectValue: string | null = oMap.selectValue ?? null;

  if(selectValue && selectValue in schemaMap) {
    // leave select value unchanged
    schema = schemaMap[selectValue];
  } else {
    // clear selected in case list empty
    selectValue = null;
    schema = null;

    // take first in list
    for(const key in schemaMap) {
      selectValue = key;
      schema = schemaMap[key];
      break;
    }
  }

  setCoreMap(oMap, coreName, schema);
  oMap.canMove = canMove;
  oMap.hasFixedName = hasFixedName;
  oMap.nameDisplay = nameDisplay;
  oMap.hasOutput = true;
  oMap.outputKey = getOutputKey(coreName);
  oMap.schemaMap = schemaMap;
  oMap.hasSelectControl = true;
  oMap.selectValue = selectValue;
  oMap.selectKey = getTypeKey(coreName);
}


function setFixedObjectMap(
  oMap: Data.DataMap, 
  key: string, 
  required: string[], 
  property: SomeJSONSchema,
  coreName: string
  ) {
  let nullable = false;
  let isNulled = false;

  if(!required.includes(key) || (property && property.nullable === true)) {
    // property not in required or "nullable" as per schema
    nullable = true;
    
    if(oMap.isNulled === undefined) {
      // only set value if it doesnt already exist in map data
      
      if(property["default"] === null) {
        // nulled if schema default is null 
        isNulled = true;
      }
      else if(property["default"] === undefined) {
        // pydantic will not set a JSON "default" value if default "None" is provided, hence checking for default "undefined" 
        isNulled = true;

      } else {
        isNulled = false;
      }
    } else {
      // use existing value
      isNulled = oMap.isNulled;
    }
  }
  let title = (property["title"]) ? String(property["title"]) : key;
  
  setElementaryMap(oMap, property, coreName, title, false, true);
  oMap.hasNameControl = false;
  oMap.nameKey = getNamekey(coreName);
  oMap.nameValue = key;
  oMap.isNullable = nullable;
  oMap.isNulled = isNulled;
}


function setDynamicObjectMap(oMap: Data.DataMap, coreName: string, property: SomeJSONSchema | null) {
  setElementaryMap(oMap, property, coreName, null, true, false);
  oMap.hasNameControl = true;
  oMap.nameKey = `${coreName} name`;
  oMap.nameValue = oMap.nameValue ?? "";
  oMap.isNullable = false;
  oMap.isNulled = false;
}


function createMapItems(node: Rete.Node, oMap: Data.DataMap, editor: Rete.NodeEditor) {
  if(oMap.hide) {
    return;
  }

  // remove control if not required
  const removeControl = (required: boolean | undefined, key: string | undefined | null) => {
    if(!required && key) {
      let control = node.controls.get(key);
      if(control) {
        node.removeControl(control);
      }
    }
  }

  // remove name control if not needed
  removeControl(oMap.hasNameControl, oMap.nameKey);
  if(oMap.hasNameControl && oMap.nameKey) {
    // name control required
    if(!node.controls.get(oMap.nameKey)) {
      // add control with same key as output and blank value
      node.addControl(new Controls.TextControl(
        oMap.nameKey, 
        editor, 
        node, 
        {value: oMap.nameValue || ""},
        getNameHandler(oMap)
      ));
    }
  }
  
  // remove data control if exists
  removeControl(oMap.hasDataControl, oMap.dataKey);
  if(oMap.hasDataControl && oMap.dataKey) {
    let newControl = true;  // assume we need a new value control  
    let control = node.controls.get(oMap.dataKey);  // get existing control instance
    let typ: string | null = null;
    if(oMap.schema && oMap.schema?.type && typeof oMap.schema?.type === "string") {
      typ = oMap.schema?.type;
    }
    if(control) {
      if(
        (typ === "string" && control instanceof Controls.TextControl) ||
        ((typ === "number" || typ === "integer") && control instanceof Controls.NumberControl) ||
        (typ === "boolean" && control instanceof Controls.BoolControl)
      ) {
        newControl = false;
        // all good
      }
      else {
        // if control does not match specified type then remove it
        node.removeControl(control);
        if(node.update) node.update();
        oMap.dataValue = null;
      }
    }

    if(newControl) {
      // create new value control if required
      if(typ === "string") {
        node.addControl(new Controls.TextControl(
          oMap.dataKey,
          editor,
          node,
          {value: oMap.dataValue, display_disabled: oMap.isNulled},
          getValueHandler(oMap)
        ));
      } else if(typ === "number" || typ === "integer") {
        node.addControl(new Controls.NumberControl(
          oMap.dataKey,
          editor,
          node,
          {value: oMap.dataValue, display_disabled: oMap.isNulled},
          getValueHandler(oMap)
        ));
      } else if(typ === "boolean") {
        node.addControl(new Controls.BoolControl(
          oMap.dataKey,
          editor,
          node,
          {value: oMap.dataValue, display_disabled: oMap.isNulled},
          getValueHandler(oMap)
        ));
      }
    }
  }

  // remove select control if not required
  removeControl(oMap.hasSelectControl, oMap.selectKey);
  if(oMap.schemaMap &&  oMap.selectKey && !node.controls.get(oMap.selectKey)) {
    let options: Controls.OptionLabel[] = Object.keys(oMap.schemaMap).map(k => {
      return {label: k, value: k}
    });
    let control = new Controls.SelectControl(
      oMap.selectKey,
      editor,
      node,
      {
        value: oMap.selectValue,
        options: options
      },
      (ctrl : ReteReactControl, editor: Rete.NodeEditor, key: string, data: any) => {
        ctrl.props.value = data;
        oMap.selectValue = data;
        if(oMap.schemaMap && data in oMap.schemaMap) {
          oMap.schema = oMap.schemaMap[data];
        } else {
          oMap.schema = null;
        }
        createMapItems(node, oMap, editor);
        editor.trigger("process");
        if(ctrl.update) {
          ctrl.update();
        }
        if(node.update) {
          node.update();
        }
      }
    );
    node.addControl(control);
  }

  // remove output if unrequired
  if(!oMap.hasOutput && oMap.outputKey) {
    let output = node.outputs.get(oMap.outputKey);
    if(output) {
      output.connections.forEach(c => editor.removeConnection(c));
      node.removeOutput(output);
    }
  }

  let oKey = oMap.outputKey;
  let selVal = oMap.selectValue;
  if(oMap.hasOutput && oKey && selVal) {
    let output = node.outputs.get(oKey);
    let socket = Sockets.sockets.get(selVal)?.socket;
    let createOutput = true;
    if(output && output.socket != socket) {
      node.removeOutput(output);
    } else if(output && socket && output.socket === socket) {
      createOutput = false;
    }
    if(createOutput && socket) {
      node.addOutput(new Rete.Output(oKey, oKey, socket));
    }
  }
}


function removeMapItems(node: Rete.Node, oMap: Data.DataMap, editor: Rete.NodeEditor) {
  let control: Rete.Control | undefined = undefined;
  if(oMap.nameKey) { 
    control = node.controls.get(oMap.nameKey);
    if(control) {
      node.removeControl(control);
    }
  }

  if(oMap.dataKey) {
    control = node.controls.get(oMap.dataKey);
    if(oMap.dataKey && control) {
      node.removeControl(control);
    }
  }

  if(oMap.outputKey) {
    let output = node.outputs.get(oMap.outputKey);;
    if(output) {
      // remove connections from view
      output.connections.map(c => editor.removeConnection(c));
      node.removeOutput(output);
    }
  }

  if(oMap.selectKey) {
    control = node.controls.get(oMap.selectKey);
    if(control) {
      node.removeControl(control);
    }
  }
}


function _complete(node: Rete.Node, editor: Rete.NodeEditor) {
  node.update(); // update output mappings and node
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
  
  if(attrs.componentSchema?.type === "object") {
    setDynamicObjectMap(newMap, coreName, attrs?.attributeSchema || null);
  } else {
    setElementaryMap(newMap, attrs?.attributeSchema || null, coreName);
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
  if(!(idx > 0 && idx < outputMaps.length && outputMaps[idx-1].canMove)) {
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
    let output: Rete.Output | null = null
    if(oMap.outputKey) {
      output = this.props.node.outputs.get(oMap.outputKey) ?? null;
    }
    
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
    
    let control: Rete.Control | null = null;

    // get name element
    let nameElement: JSX.Element = <div></div>;
    if(oMap.hasFixedName) {
      // name element fixed - use static name, non editable
      nameElement = <span className="me-1 ms-1">{oMap.nameDisplay}</span>
    } else if (oMap.hasNameControl && oMap.nameKey) {
      // name element editable - display control
      control = this.props.node.controls.get(oMap.nameKey) ?? null;
      if(control) {
        nameElement = Display.getControl(control, this.props.bindControl);
      }
    }

    // create positional / nullable element
    let dynamicElement: JSX.Element = <div></div>;
    if(oMap.canMove) {
      // get up/down buttons
      dynamicElement = this.getPositionalButtons(index);
    } else if(oMap.isNullable) {
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

    // get output socket
    let socketElement = <div></div>;
    let output: Rete.Output | null = null;
    if(oMap.hasOutput && oMap.outputKey) {
      output = this.props.node.outputs.get(oMap.outputKey) ?? null;
      if(output) {
        console.log(`nulled: ${oMap.isNulled}`);
        socketElement = Display.getSocket(output, "output", this.props.bindSocket, {
          visibility: oMap.isNulled ? "hidden" : "visible" // dont display if output nulled
        });
      } 
    }

    
    // get data editing control
    let dataElement = <div></div>
    if(oMap.hasDataControl && oMap.dataKey) {
      control = this.props.node.controls.get(oMap.dataKey) ?? null;
      if(control && control instanceof ReteReactControl && typeof control.props === "object" && !Array.isArray(control.props)) {
        
        // set display disabled prop if output connected or nulled
        let _control = control as Controls.ControlTemplate<any, Controls.InputProps<any>>
        let disabled = false;
        if(output && output.hasConnection() || oMap.isNulled) {
          disabled = true;
        }
        _control.props.display_disabled = disabled;

        // encapsulate in div with key as type so that if control typ changes, react will re-render
        dataElement = <div key={oMap?.schema?.type}>
          {Display.getControl(control, this.props.bindControl)}
        </div>

        // re-render control - react will NOT re-render above on display_disabled change as it is not defined in Rete.Control props
        if(_control.update) {
          _control.update();
        }
      }
    }

    // get type select control
    let selectElement = <div></div>
    if(oMap.hasSelectControl && oMap.selectKey) {
      let selectControl = this.props.node.controls.get(oMap.selectKey); 
      if(selectControl) {
        selectElement = Display.getControl(selectControl, this.props.bindControl)
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
        o => [o.dataKey, o.nameKey, o.selectKey].includes(ctrl.key)
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
  return (ctrl: ReteReactControl, emitter: Rete.NodeEditor, key: string, data: any) => {
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


export class MyComponent extends BaseComponent {
  data = {component: DynamicDisplay}
  schema: CustomSchema;
  socket: Rete.Socket | null;
  constructor(name: string, schema: CustomSchema, socket: Rete.Socket | null) {
    super(name);
    componentsList.push(name);
    this.schema = schema;
    this.socket = socket;
  }
  addParent(node: Rete.Node): void {
    if(this.socket) {
      node.addInput(new Rete.Input("parent", "Parent", this.socket));  // add parent node
    }
  }
  internalBuilder(node: Rete.Node, editor: Rete.NodeEditor): void {
    this.addParent(node);
    let attrs = Data.getGeneralAttributes(node);
    
    // use component schema (on node connected this can be updated)
    let schema: CustomSchema = this.schema;  
    let connected = node.getConnections().find(c => c.input.node === node) !== undefined;
    
    attrs.componentSchema = schema;  // set schema in node data
    attrs.outputTracker = 0;  // reset output tracker so created elements start from 0
    let typ = schema.type as string;

    let outputMaps = Data.getOutputMap(node);
    let newMaps: Data.DataMap[] = [];  // new output map
    let addButton: boolean = false;  // flag to denote button to add dynamic component

    // check type is basic
    if(["null", "boolean", "number", "integer", "string"].includes(typ)) {
      let firstMap: Data.DataMap = {}
      if(outputMaps.length >= 1) {
        // if node data exists already then retrieve it
        firstMap = outputMaps[0];
       } else {
        // if no maps exist then add empty map to list
        setCoreMap(firstMap, "input", schema);
       }
      newMaps.push(firstMap);

    } else if(typ === "array") {
      addButton = true;
      let attrSchema: SomeJSONSchema =  anySchema;
      if(schema.attributesNotDefined !== true) {
        attrSchema = schema["items"];
      }

      outputMaps.forEach(o => {
        let coreName = getNextCoreName(node);
        setElementaryMap(o, attrSchema, coreName);
        newMaps.push(o);
      });
      attrs.attributeSchema = attrSchema;

    } if(typ === "object") {
    
      let attrSchema = anySchema;
      if(schema.attributesNotDefined !== true && schema.additionalProperties !== undefined) {
        attrSchema = schema.additionalProperties;
      }

      // loop properties
      if(schema.properties) {
        Object.entries(schema.properties).forEach(([key, property], index) => {
          let coreName = getNextCoreName(node);
          let oMap: Data.ObjectMap = {}

          // check if matching entry exists
          let mapIndex = outputMaps.findIndex(m => m.nameValue == key);
          if(mapIndex >= 0) {
            oMap = outputMaps[mapIndex];  // copy to map object
            outputMaps.splice(mapIndex, 1);  // splice from exisitng list
          }
          
          // get list of required properties or empty array
          let required: string[] = [];
          if(schema["required"] && Array.isArray(schema["required"])) {
            required = schema["required"];
          }
          setFixedObjectMap(oMap, key, required, (property as SomeJSONSchema) ?? null, coreName);
          newMaps.push(oMap);
        });
      }

      if(schema["additionalProperties"] !== false) {
        // if additional properties are allowed, loop remaining data and add as dynamic outputs
        addButton = true;
        outputMaps.forEach(o => {
          let coreName = getNextCoreName(node);  // get new core name
          setDynamicObjectMap(o, coreName, attrSchema);
          newMaps.push(o);
        });
      }
      attrs.attributeSchema = attrSchema;
    }

    if(addButton) {
      node.addControl(new Controls.ButtonControl(
        "add-button",
        editor,
        node,
        {
          value: 0, // value is press count
          buttonInner: "Add Item +"
        },
        () => elementAdd(node, editor, Data.getOutputMap(node).length)
      ));
    }

    newMaps.forEach(oMap => createMapItems(node, oMap, editor));
    Data.setOutputMap(node, newMaps);
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
      let output = oMap.outputKey ? node.outputs.get(oMap.outputKey) : null;
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
