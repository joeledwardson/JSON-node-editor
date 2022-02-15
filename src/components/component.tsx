import * as Rete from "rete";
import { ReteReactComponent as ReteComponent } from "rete-react-render-plugin";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import * as Sockets from "../sockets/sockets";
import * as Controls from "../controls/controls";
import { ReteReactControl as ReteControlBase } from "rete-react-render-plugin";
import * as Data from "../data/attributes";
import { BaseComponent } from "./base";
import { getJSONSocket, getObject, JSONObject, JSONValue } from "../jsonschema";
import { ReteReactControl as ReteControl } from "rete-react-render-plugin";
import * as List from "./list";
import * as ENode from "../elementary/elementary";
import * as EDisplay from "../elementary/display";
import * as Display from "../display";
import * as ReactRete from "rete-react-render-plugin";
import { getConnectedData, getSelectedSocket, isInput } from "../helpers";
import { SelectControl } from "../controls/controls";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faMouse,
  faPlus,
  faTimes,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";
import XLSXColumn from 'xlsx-column';

/**
 * @param oMap output map instance
 * @param setData function to set data in output map instance
 * @returns function to create control handler
 */
function getControlHandler(oMap: Data.OutputMap, setData: (oMap: Data.OutputMap, value: any) => void): Controls.DataHandler {
  return (ctrl: ReteControlBase, emitter: Rete.NodeEditor, key: string, data: any) => {
    ctrl.props.value = data;
    setData(oMap, data);
    emitter.trigger("process");
    ctrl.update && ctrl.update();
  }
} 

/**
 * @param oMap output map instance
 * @returns function to create control handler to set "dataValue" property
 */
const getValueHandler = (oMap: Data.OutputMap) => getControlHandler(
  oMap, 
  (oMap: Data.OutputMap, value: any) => oMap.dataValue = value
);



class MyComponent extends BaseComponent {
  schema: JSONObject;
  socket: Rete.Socket;
  constructor(name: string, schema: JSONObject, socket: Rete.Socket) {
    super(name);
    this.schema = schema;
    this.socket = socket;
  }
  builder(node: Rete.Node): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.editor) {
        this.internalBuilder(node);
        resolve();
      } else {
        reject(`this.editor is not available`);
      }
    });
  }
  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void { }
  
  /** create control */
  getControl(
    var_type: string, 
    node: Rete.Node, 
    dataHandler: Controls.DataHandler, 
    key: string,
    default_value: any,
    disabled: boolean
    ) {

    if( var_type === "string") { 
      return new Controls.TextControl(
        key, 
        this.editor, 
        node, 
        {value: default_value ?? "", display_disabled: disabled}, 
        dataHandler
      );
    } else if( var_type === "integer" || var_type === "number" ) {
      return new Controls.NumberControl(        
        key, 
        this.editor, 
        node, 
        {value: default_value ?? 0, display_disabled: disabled}, 
        dataHandler
      );
    } else if( var_type === "boolean") {
      return new Controls.BoolControl(
        key, 
        this.editor, 
        node, 
        {value: default_value ?? "False", display_disabled: disabled}, 
        dataHandler
      );
    } 
    return null;
  }

  process_data_control(node: Rete.Node, oMap: Data.OutputMap, typ: string, key: string, default_value: any) {
    let control = this.getControl(typ, node, getValueHandler(oMap), key, default_value, oMap.isNulled);
    if(control) {
      // add control to node
      node.addControl(control);

      // set node data (in case value was pulled from JSON schema or default)
      oMap.dataControl = key;
      oMap.dataValue = control.props.value;
    }
  }



  /**
   * process a JSON schema "property" for a given definition, by setting node data and adding relevant control/output 
   */
  process_property(
    node: Rete.Node,
    oMap: Data.OutputMap,
    key: string, 
    property: JSONObject, 
    required: boolean
  ): void {

    oMap.nameValue = key;
    oMap.nameFixed = true;

    if(property["const"]) {
      // if JSON property is a "const" then set value in node data but dont create output or control
      oMap.dataValue = property["const"];
      oMap.hide = true;
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
  
  setObjectMap(node: Rete.Node, key: string, property_value: JSONValue) {
    let property = getObject(property_value);
    if(property) {
      let oMap: Data.OutputMap = {};
      let outputMaps = Data.getOutputMap(node);
      outputMaps.push(oMap);

      
      let coreName = new XLSXColumn(outputMaps.length).toString();
      oMap.outputKey = `${coreName} output`;

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
      oMap.nameFixed = true;
      oMap.nameDisplay = title;   
    }
  }

  internalBuilder(node: Rete.Node): void {
    node.addInput(new Rete.Input("parent", "Parent", this.socket));
    let outputMaps = Data.getOutputMap(node);
    let typ = this.schema.type as string;
    
    const getVal = (property: JSONObject) => {
      
    }

    // check type is basic
    if(["null", "boolean", "number", "integer", "string"].includes(typ)) {
      
      let firstMap: Data.OutputMap = {}
      if(outputMaps.length >= 1) {
        // if node data exists already then retrieve it
        firstMap = outputMaps[0]
       } else {
        // if no maps exist then add empty map to list
        outputMaps.push(firstMap);
       }

      // generate handler using map instance
      let handler = getValueHandler(firstMap);

      // add control to node
      let control = this.getControl(typ, node, handler, "input", firstMap.dataValue ?? this.schema.default, false);
      if(control) {
        node.addControl(control);
      }
      firstMap.dataControl = "input";
      firstMap.dataValue = control.props.value;
    } else if(typ === "object") {

       // get list of required properties
       let required: string[] = this.schema["required"] as string[] ?? [];
       let properties = getObject(this.schema["properties"]);
 
       if(properties) {
         // loop properties
         Object.entries(properties).forEach(([k, v], i) => {
          let property = getObject(v);
          if(property) {
            let oMap = outputMaps[i];
            if(!oMap) {
              oMap = {};
              outputMaps.push(oMap);
              let coreName = new XLSXColumn(outputMaps.length).toString();
              oMap.outputKey = `${coreName} output`;

              // get control args with value and display disabled (common to all controls)
              oMap.isNulled = false;
              if(!required.includes(k)) {
                oMap.nullable = true;
                // property not required - set to null if default is null or no default provided
                // pydantic will not set a JSON "default" value if default "None" is provided, hence checking for default "undefined" 
                oMap.isNulled = property["default"] === null || property["default"] === undefined;
              }


              oMap.nameValue = new XLSXColumn(outputMaps.length).toString();
                // create attribute name key
              oMap.nameControl = `${newMap.outputKey} name`;
            }
            

             // pass JSON property to be processed with output null to show/hide control
             this.process_property(node, editor, k, property, i, required.includes(k));
           }
         });
       }
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
    const getValue = (oMap: Data.OutputMap) => {
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
