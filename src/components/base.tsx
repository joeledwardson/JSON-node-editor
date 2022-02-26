import * as Rete from "rete";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import { ReteReactComponent } from "rete-react-render-plugin";
import { JSONValue } from "../jsonschema";


export abstract class BaseComponent extends ReteReactComponent {
  /** get JSONified data from component */
  abstract getData(node: Rete.Node, editor: Rete.NodeEditor): JSONValue;
  /** builder function where editor is not undefined */
  abstract internalBuilder(node: Rete.Node, editor: Rete.NodeEditor): void;
  /** worker unused */
  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void { }
  builder(node: Rete.Node): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.editor) {
        this.internalBuilder(node, this.editor);
        resolve();
      } else {
        reject(`this.editor is not available`);
      }
    });
  }
}


/** get data from node connected to an output */
export function getConnectedData(output: Rete.Output, editor: Rete.NodeEditor): JSONValue {
  if(output.connections.length > 0) {
    let otherNode = output.connections[0].input.node;
    if(otherNode) {
      let otherComponent = editor.components.get(otherNode.name) as BaseComponent;
      if(otherComponent.getData) {
        return otherComponent.getData(otherNode, editor);
      }
    }
  }
  return null
}