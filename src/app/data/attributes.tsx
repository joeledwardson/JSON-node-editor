import * as Rete from 'rete';
import { getDataAttribute, setDataAttribute } from "./access";
import { JSONObject } from '../jsonschema';


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


/** get controls data from node object */
export function getControlsData(node: Rete.Node): {[key: string]: any} {
  return getDataAttribute<any>(node, 'controlsData');
}
/** set controls data from node object */
export function setControlsData(node: Rete.Node, data: {[key: string]: any}) {
  setDataAttribute(node, 'controlsData', data);
}


/** get JSON schemas mapped to output names */
export function getOutputSchemas(node: Rete.Node): {[key: string]: JSONObject} {
  return getDataAttribute<JSONObject>(node, 'typeDefinitions')
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
  return getDataAttribute<JSONObject>(node, 'typeSocketMap');
}


/** connection processing function type */
export type ConnectionFunc = (connection: Rete.Connection) => void;
/** connection processing name */
export type ConnectionEventType = "created" | "removed";
/** get connection processing functions */
export function getConnectionFuncs(node: Rete.Node): {[key in ConnectionEventType]: ConnectionFunc} {
  return getDataAttribute<ConnectionFunc>(node, 'connectionFuncs') as {[key in ConnectionEventType]: ConnectionFunc};
}
/** set connection processing functions */
export function setConnectionFuncs(node: Rete.Node, funcs: {[key in ConnectionEventType]: ConnectionFunc}): void {
  return setDataAttribute<ConnectionFunc>(node, 'connectionFuncs', funcs);
}


/** get general functions */
export function getGeneralFuncs(node: Rete.Node): {[key: string]: () => void} {
  return getDataAttribute<() => void>(node, "generalFuncs");
}
/** set general functions */
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


/** get general attributes */
export function getGeneralAttributes(node: Rete.Node): {[key: string]: any} {
  return getDataAttribute<any>(node, "generalAttributes");
}