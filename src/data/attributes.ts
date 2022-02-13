import * as Rete from 'rete';
import { getDataAttribute, setDataAttribute } from "./access";
import { JSONObject, JSONValue } from '../jsonschema';

export interface OutputMap {
  hide?: boolean; // dont display anything

  nameControl?: string; // control key for property name
  nameValue?: string; // value of property name (used as key for getting JSON data)
  nameDisplay?: string; // formatted version of property name (e.g. "a_test" would be displayed as "A Test")
  nameFixed?: boolean; // name can be edited

  dataControl?: string;  // control key for data 
  dataValue?: any;  // control value for data
  
  selectControl?: any;  // control key for type select
  selectValue?: string;  // control value for type select
  
  outputKey?: string; // key for output
  outputSchema?: JSONObject;  // schema read from output connection


  nullable?: boolean; // true if output can be nulled
  isNulled?: boolean;  // true if output nulled
}

export function getOutputMap(node: Rete.Node): Array<OutputMap> {
  return getDataAttribute<Array<OutputMap>>(node, "nodeMap", ()=>[]);
}

/** get controls data from node object */
export function getControlsData(node: Rete.Node): {[key: string]: any} {
  return getDataAttribute<{[key: string]: any}>(node, 'controlsData');
}
/** set controls data from node object */
export function setControlsData(node: Rete.Node, data: {[key: string]: any}) {
  setDataAttribute(node, 'controlsData', data);
}


/** get JSON schemas mapped to selectable socket names */
export function setSocketSchemas(node: Rete.Node, newDefinitions: {[key: string]: JSONObject}): void {
  setDataAttribute(node, 'typeSocketMap', newDefinitions);
}
/** set JSON schemas mapped to selectable socket names */
export function getSocketSchemas(node: Rete.Node): {[key: string]: JSONObject} {
  return getDataAttribute<{[key: string]: JSONObject}>(node, 'typeSocketMap');
}


/** 
 * connection processing function type
 * */
export type ConnectionFunc = (connection: Rete.Connection, editor: Rete.NodeEditor, isInput: boolean) => void;
export interface ConnectionFuncs {
  created ?: ConnectionFunc,
  removed ?: ConnectionFunc
}
/** map of node name to connection processor functions */
export var nodeConnectionFuns: {[key: string]: ConnectionFuncs} = {};


/** get general attributes */
export interface GeneralAttributes {
  outputTracker?: number
  componentSchema?: JSONValue
}
export function getGeneralAttributes(node: Rete.Node): GeneralAttributes {
  return getDataAttribute<any>(node, "generalAttributes") as GeneralAttributes;
}