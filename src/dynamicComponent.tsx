import React from "react";
import Rete, { Node, Output } from "rete";
import { myNumSocket } from "./mysocket";
import { BaseControl, MyControl, MyBoolInput } from "./mycontrols";
import { ReteReactComponent  } from "./mycomponents";
import { NodeEditor, Control } from "rete";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import { MyNode  } from "./mynode";



type PlusButtonProps = {
    emitter: NodeEditor | null;
    valueChanger(): void;
};

class PlusButtonComponent extends React.Component<PlusButtonProps> {
    onChange(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
      this.props.valueChanger();
      this.props.emitter?.trigger("process");
    }
    render() {
      return (
        <button onClick={(e) => this.onChange(e)}>+</button>
      );
    }
}

class PlusButtonControl extends BaseControl {
    props: PlusButtonProps
    constructor(props: PlusButtonProps) {
        super(PlusButtonComponent, "List");
        this.props = props;
    }
}


export class FirstComponent extends ReteReactComponent {
    constructor() {	
        super('AddOutput', MyNode);
    }

    builder(node: Node): Promise<void> {
     
        const editor: NodeEditor | null = this.editor;
        // node.meta.letter = '`';
        // const gLetter = () => node.meta.letter as string;

        // const buttonPressed = async () => {
        //     const btnIndex: string = String(node.outputs.size);
        //     node.addOutput(new Rete.Output(btnIndex, 'Number ' + btnIndex, myNumSocket));
        //     await node.update();
        //     setTimeout(() => 
        //         {this.editor?.view.updateConnections({node})},
        //         10
        //     );
        // }
        // node.addControl(new PlusButtonControl({emitter: this.editor, valueChanger: buttonPressed}));
        return new Promise<void>(res => {
            editor && node.addControl(new MyControl(editor, "boolTestControl", null, MyBoolInput));
            node.addOutput(new Output('0', 'Number 0', myNumSocket));
            res();
        });
    }

    worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
    
    }
}
