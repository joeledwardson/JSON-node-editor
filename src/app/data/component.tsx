import * as Rete from 'rete';
import { getDataAttribute, setDataAttribute } from "./access";

/** Variable spec */
export interface VariableType {
  types: string[],
  default?: any,
  dictTypes?: string[],
  listTypes?: string[]
}

/** Connection added/removed function spec */
export type ConnectionFunc = (connection: Rete.Connection) => void;
export type ConnectionEventType = "created" | "removed";

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
export function nGetData(node: Rete.Node): {[key: string]: any} {
  return getDataAttribute<any>(node, 'controlsData');
}

/** get controls data from control object */
export function cGetData(ctrl: Rete.Control): {[key: string]: any} {
  return nGetData(ctrl.getNode());
}

/** get control initial value from data, or use provided initial value */
export function getInitial(node: Rete.Node, key: string, defaultVal: any): any {
  return nGetData(node)[key] ?? defaultVal;
}

/** get type definitions of members from node */
export function getTypeDefinitions(node: Rete.Node): {[key: string]: VariableType} {
  return getDataAttribute<VariableType>(node, 'typeDefinitions')
}

/** set type definitions of members from node */
export function setTypeDefinitions(node: Rete.Node, newDefinitions: {[key: string]: VariableType}): void {
  setDataAttribute(node, 'typeDefinitions', newDefinitions);
}

export function getConnectionFuncs(node: Rete.Node): {[key in ConnectionEventType]: ConnectionFunc} {
  return getDataAttribute<ConnectionFunc>(node, 'connectionFuncs') as {[key in ConnectionEventType]: ConnectionFunc};
}
export function setConnectionFuncs(node: Rete.Node, funcs: {[key in ConnectionEventType]: ConnectionFunc}): void {
  return setDataAttribute<ConnectionFunc>(node, 'connectionFuncs', funcs);
}

export function getGeneralFuncs(node: Rete.Node): {[key: string]: () => void} {
  return getDataAttribute<() => void>(node, "generalFuncs");
}
export function setGeneralFuncs(node: Rete.Node, funcs: {[key: string]: () => void}) {
  setDataAttribute(node, "generalFuncs", funcs);
}