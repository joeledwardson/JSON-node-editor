import * as Rete from 'rete';
import { getDataAttribute, setDataAttribute } from "./access";

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

