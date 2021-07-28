import * as Rete from "rete";

/** get mappings of node outputs to output controls (create if not exist) */
export function getOutputControls(node: Rete.Node): {[key: string]: string} {
  if (node.data.outputMappings === undefined) {
    node.data.outputMappings = {};
  }
  return node.data.outputMappings as {[key: string]: string};
}

export function setOutputControls(node: Rete.Node, newMappings: {[key: string]: string}): void {
  node.data.outputMappings = newMappings;
}