import * as Rete from 'rete';
import { ControlBase } from "../../rete/control";

/** get controls data from node object */
export function nGetData(node: Rete.Node): {[key: string]: any} {
  if (node.data.controlsData === undefined) {
    node.data.controlsData = {};
  }
  return node.data.controlsData as {[key: string]: any};
}

/** get controls data from control object */
export function cGetData(ctrl: Rete.Control): {[key: string]: any} {
  return nGetData(ctrl.getNode());
}

/** get control initial value from data, or use provided initial value */
export function getInitial(node: Rete.Node, key: string, defaultVal: any): any {
  return nGetData(node)[key] ?? defaultVal;
}