import * as Rete from "rete";
import { ReteReactComponent as ReteComponent } from "rete-react-render-plugin";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";

/** list of available types */
export let componentsList: Array<string> = [];


/** base component - empty worker and _builder() that checks emitter is non-null */
export abstract class BaseComponent extends ReteComponent {
  constructor(name: string) {
    super(name);
    componentsList.push(name);
  }
  abstract internalBuilder(node: Rete.Node, editor: Rete.NodeEditor): void;
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
  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void { }
  abstract getData(node: Rete.Node, editor: Rete.NodeEditor): any;
}
