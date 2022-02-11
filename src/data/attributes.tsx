import * as Rete from 'rete';
import { getDataAttribute, setDataAttribute } from "./access";
import { JSONObject } from '../jsonschema';

export interface OutputMap {
  controlKey?: string;
  outputKey?: string;
  isNulled?: boolean;
  schema?: JSONObject;
}

// export function getOutputMap(node: Rete.Node): {[key: string]: OutputMap}


/** get mappings of node outputs to output controls */
export function getOutputControls(node: Rete.Node): {[key: string]: string} {
  return getDataAttribute<{[key: string]: string}>(node, "outputMappings");
}
/** set mappings of node outputs to output controls */
export function setOutputControls(node: Rete.Node, newMappings: {[key: string]: string}): void {
  setDataAttribute<{[key: string]: string}>(node, "outputMappings", newMappings);
}


/** get mappings of node outputs to boolean "nulled" values */
export function getOutputNulls(node: Rete.Node): {[key: string]: boolean} {
  return getDataAttribute<{[key: string]: boolean}>(node, "outputNulls");
}


/** get controls data from node object */
export function getControlsData(node: Rete.Node): {[key: string]: any} {
  return getDataAttribute<{[key: string]: any}>(node, 'controlsData');
}
/** set controls data from node object */
export function setControlsData(node: Rete.Node, data: {[key: string]: any}) {
  setDataAttribute(node, 'controlsData', data);
}


/** get JSON schemas mapped to output names */
export function getOutputSchemas(node: Rete.Node): {[key: string]: JSONObject} {
  return getDataAttribute<{[key: string]: JSONObject}>(node, 'typeDefinitions')
}
/** set JSON schemas mapped to output names */
export function setOutputSchemas(node: Rete.Node, newDefinitions: {[key: string]: JSONObject}): void {
  setDataAttribute(node, 'typeDefinitions', newDefinitions);
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