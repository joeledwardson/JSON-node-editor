import * as Rete from "rete";

function _getDataAttribute<T>(node: Rete.Node, name: string): {[key: string]: T} {
  if (node.data[name] === undefined) {
    node.data[name] = {};
  }
  return node.data[name] as {[key: string]: T};
}

function _setDataAttribute(node: Rete.Node, name: string, data: {[key: string]: string}): void {
  node.data[name] = data;
}

/** get mappings of node outputs to output controls (create if not exist) */
export function getOutputControls(node: Rete.Node): {[key: string]: string} {
  return _getDataAttribute<string>(node, "outputMappings");
}

export function setOutputControls(node: Rete.Node, newMappings: {[key: string]: string}): void {
  _setDataAttribute(node, "outputMappings", newMappings);
}

export function getOutputNulls(node: Rete.Node): {[key: string]: boolean} {
  return _getDataAttribute<boolean>(node, "outputNulls");
}

