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
  outputKey?: string; // key for output
  outputSchema?: JSONObject;  // schema read from output connection
  selectControl?: any;  // control key for type select
  selectValue?: string;  // control value for type select
}

export interface ObjectMap extends ElementaryMap {
  nameFixed?: boolean; // name can be edited
  nameValue?: string; // value of property name (used as key for getting JSON data)
  
  // ** fixed parameters
  nullable?: boolean; // true if output can be nulled
  isNulled?: boolean;  // true if output nulled

  // ** dynamic (non-fixed) parameters
  nameControl?: string; // control key for property name
  nameDisplay?: string; // formatted version of property name (e.g. "a_test" would be displayed as "A Test")
}
export interface DataMap extends ObjectMap {};



export function getOutputMap(node: Rete.Node): Array<DataMap> {
  return getDataAttribute<Array<DataMap>>(node, "nodeMap", ()=>[]);
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
export function getNextOutputIndex(node: Rete.Node): number {
  let attrs = getGeneralAttributes(node);
  if(attrs.outputTracker === undefined) {
    attrs.outputTracker = 0;
  }
  attrs.outputTracker += 1;
  return attrs.outputTracker;
}