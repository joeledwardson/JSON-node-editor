import * as Rete from "rete";
import { ReteReactComponent as ReteComponent } from "rete-react-render-plugin";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";

/** base component - empty worker and _builder() that checks emitter is non-null */

export abstract class ComponentBase extends ReteComponent {
  abstract _builder(node: Rete.Node, editor: Rete.NodeEditor): void;
  builder(node: Rete.Node): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.editor) {
        this._builder(node, this.editor);
        resolve();
      } else {
        reject(`this.editor is not available`);
      }
    });
  }
  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void { }
  abstract getData(node: Rete.Node, editor: Rete.NodeEditor): any;
}
