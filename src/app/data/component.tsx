import * as Rete from 'rete';
import { getDataAttribute, setDataAttribute } from "./access";

/** Variable spec */
export interface VariableType {
  types: string[],
  default?: any,
  dictTypes?: string[]
  listTypes?: string[]
}


/** get mappings of node outputs to output controls (create if not exist) */
export function getOutputControls(node: Rete.Node): {[key: string]: string} {
  return getDataAttribute<string>(node, "outputMappings");
}

export function setOutputControls(node: Rete.Node, newMappings: {[key: string]: string}): void {
  setDataAttribute<string>(node, "outputMappings", newMappings);
}

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

export function getTypeDefinitions(node: Rete.Node): {[key: string]: VariableType} {
  return getDataAttribute<VariableType>(node, 'typeDefinitions')
}

export function setTypeDefinitions(node: Rete.Node, newDefinitions: {[key: string]: VariableType}): void {
  setDataAttribute(node, 'typeDefinitions', newDefinitions);
}