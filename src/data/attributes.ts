import * as Rete from 'rete';
import { getDataAttribute, setDataAttribute } from "./access";
import { JSONObject, JSONValue } from '../jsonschema';

export interface CoreMap {
  reactKey?: string; // key to use in react indexing
  hide?: boolean; // dont display anything
  dataControl?: string;  // control key for data 
  dataValue?: any;  // control value for data
  schema?: JSONObject; // JSON schema for entry
}

export interface ElementaryMap extends CoreMap {
  canMove?: boolean;  // dynamic output that can move up and down
  nameFixed?: boolean; // use fixed name
  nameDisplay?: string; // fixed name
  outputKey?: string; // key for output
  outputSchema?: JSONObject;  // schema read from output connection
  selectControl?: any;  // control key for type select
  selectValue?: string;  // control value for type select
}

export interface ObjectMap extends ElementaryMap {
  nameValue?: string; // value of property name (used as key for getting JSON data)
  nullable?: boolean; // true if output can be nulled
  isNulled?: boolean;  

  // ** dynamic (non-fixed) parameters
  nameControl?: string; // control key for property name
}

export interface DataMap extends ObjectMap {};



export function getOutputMap(node: Rete.Node): Array<DataMap> {
  return getDataAttribute<Array<DataMap>>(node, "nodeMap", ()=>[]);
}
export function setOutputMap(node: Rete.Node, outputMaps: Array<DataMap>): void {
  return setDataAttribute(node, "nodeMap", outputMaps);
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
  componentSchema?: JSONObject
  attributeSchema?: JSONObject
}
export function getGeneralAttributes(node: Rete.Node): GeneralAttributes {
  return getDataAttribute<any>(node, "generalAttributes") as GeneralAttributes;
}
