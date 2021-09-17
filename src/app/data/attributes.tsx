import * as Rete from 'rete';
import { getDataAttribute, setDataAttribute } from "./access";
import { JSONObject } from '../jsonschema';

/** Variable spec */
export interface VariableType {
  types: string[],
  default?: any,
  dictTypes?: string[],
  listTypes?: string[]
}


/** get mappings of node outputs to output controls */
export function getOutputControls(node: Rete.Node): {[key: string]: string} {
  return getDataAttribute<string>(node, "outputMappings");
}

/** set mappings of node outputs to output controls */
export function setOutputControls(node: Rete.Node, newMappings: {[key: string]: string}): void {
  setDataAttribute<string>(node, "outputMappings", newMappings);
}

/** get mappings of node outputs to boolean "nulled" values */
export function getOutputNulls(node: Rete.Node): {[key: string]: boolean} {
  return getDataAttribute<boolean>(node, "outputNulls");
}


/** get/set controls data from node object */
export function nGetData(node: Rete.Node): {[key: string]: any} {
  return getDataAttribute<any>(node, 'controlsData');
}
export function nSetData(node: Rete.Node, data: {[key: string]: any}) {
  setDataAttribute(node, 'controlsData', data);
}


/** get controls data from control object */
export function cGetData(ctrl: Rete.Control): {[key: string]: any} {
  return nGetData(ctrl.getNode());
}


/** get control initial value from data, or use provided initial value */
export function getInitial(node: Rete.Node, key: string, defaultVal: any): any {
  return nGetData(node)[key] ?? defaultVal;
}

/** Type definitions for each output of node */
export function getTypeDefinitions(node: Rete.Node): {[key: string]: JSONObject} {
  return getDataAttribute<JSONObject>(node, 'typeDefinitions')
}
export function setTypeDefinitions(node: Rete.Node, newDefinitions: {[key: string]: JSONObject}): void {
  setDataAttribute(node, 'typeDefinitions', newDefinitions);
}


/** map of socket name to type definitions for socket type selections */
export function setTypeMap(node: Rete.Node, newDefinitions: {[key: string]: JSONObject}): void {
  setDataAttribute(node, 'typeSocketMap', newDefinitions);
}
export function getTypeMap(node: Rete.Node): {[key: string]: JSONObject} {
  return getDataAttribute<JSONObject>(node, 'typeSocketMap');
}


/** Connection added/removed functions */
export type ConnectionFunc = (connection: Rete.Connection) => void;
export type ConnectionEventType = "created" | "removed";
export function getConnectionFuncs(node: Rete.Node): {[key in ConnectionEventType]: ConnectionFunc} {
  return getDataAttribute<ConnectionFunc>(node, 'connectionFuncs') as {[key in ConnectionEventType]: ConnectionFunc};
}
export function setConnectionFuncs(node: Rete.Node, funcs: {[key in ConnectionEventType]: ConnectionFunc}): void {
  return setDataAttribute<ConnectionFunc>(node, 'connectionFuncs', funcs);
}


/** General functions */
export function getGeneralFuncs(node: Rete.Node): {[key: string]: () => void} {
  return getDataAttribute<() => void>(node, "generalFuncs");
}
export function setGeneralFuncs(node: Rete.Node, funcs: {[key: string]: () => void}) {
  setDataAttribute(node, "generalFuncs", funcs);
}


/** Node identifiers */
export function getNodeIdentifiers(node: Rete.Node): {[key: string]: any} {
  return getDataAttribute<any>(node, "nodeIdentifiers");
}
export function setNodeIdentifiers(node: Rete.Node, attributes: {[key: string]: any}) {
  setDataAttribute(node, "nodeIdentifiers", attributes);
}