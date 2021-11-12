import * as Sockets from "../sockets/sockets";
import * as Rete from 'rete';

/** get socket from selected name, else "any" socket */
export function getSelectedSocket(selectedSocket: any) {
  return Sockets.sockets.get(selectedSocket)?.socket ?? Sockets.anySocket;
}

/** validate a connection is connected to the parent input socket */
export function isInput(cn: Rete.Connection, n: Rete.Node, inputName: string) {
  return cn.input.node === n && cn.input.key === inputName && !!cn.output.node;
}

/** update view connections after waiting */
export function updateViewConnections(nodes: Rete.Node[], editor: Rete.NodeEditor) {
  setTimeout(() => 
    nodes.forEach(n => editor?.view.updateConnections({node: n})),
    10
  );
}