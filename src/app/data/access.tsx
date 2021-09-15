import * as Rete from "rete";

export function getDataAttribute<T>(node: Rete.Node, name: string): {[key: string]: T} {
  if (node.data[name] === undefined) {
    node.data[name] = {};
  }
  return node.data[name] as {[key: string]: T};
}

export function setDataAttribute<T>(node: Rete.Node, name: string, data: {[key: string]: T}): void {
  node.data[name] = data;
}