import * as Rete from 'rete';
import { getDataAttribute, setDataAttribute } from "./access";
import { JSONObject } from '../jsonschema';

export interface OutputMap {
  key?: string; // schema key

  nameKey?: string; // control key for additional property name
  nameValue?: string; // control value for additional property name

  dataKey?: string;  // control key for data 
  dataValue?: any;  // control value for data
  
  selectKey?: any;  // control key for type select
  selectValue?: string;  // control value for type select
  
  outputKey?: string; // key for output
  nullable?: boolean; // true if output can be nulled
  isNulled?: boolean;  // true if output nulled
  schema?: JSONObject;  // schema read by connection
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
}
export function getGeneralAttributes(node: Rete.Node): GeneralAttributes {
  return getDataAttribute<any>(node, "generalAttributes") as GeneralAttributes;
}