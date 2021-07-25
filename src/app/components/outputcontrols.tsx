import * as Rete from "rete";

// get mappings of node outputs to output controls (create if not exist)
export function getOutputControls(node: Rete.Node): Map<string, Rete.Control> {
  if (node.meta.outputMappings === undefined) {
    let outputMappings = new Map<string, Rete.Control>();
    node.meta.outputMappings = outputMappings;
  }
  return node.meta.outputMappings as Map<string, Rete.Control>;
}
