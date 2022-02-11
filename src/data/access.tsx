import * as Rete from "rete";

const createObject = () => {return {}}

export function getDataAttribute<T>(node: Rete.Node, name: string, init:(() => any)=createObject): T {
  if (node.data[name] === undefined) {
    node.data[name] = init();
  }
  return node.data[name] as T;
}

export function setDataAttribute<T>(node: Rete.Node, name: string, data: T): void {
  node.data[name] = data;
}