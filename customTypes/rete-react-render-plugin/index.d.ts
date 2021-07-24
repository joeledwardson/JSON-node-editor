declare module 'rete-react-render-plugin' {
    import { Plugin as RetePlugin } from 'rete/types/core/plugin';
    import { Component as ReactComponent } from 'react';
    import { Control as ReteControl, Component as ReteComponent, Output, Input, 
        Socket as ReteSocket, IO, Node as ReteNode, NodeEditor } from 'rete';


    type bindControl = (el: HTMLElement, control: ReteControl) => void;
    type bindSocket = (el: HTMLElement, type: string, io: IO) => void;

    interface NodeState {
        outputs: Array<Output>
        controls: Array<ReteControl>
        inputs: Array<Input>,
        selected: string
    }

    interface NodeProps {
        node: ReteNode,
        editor: NodeEditor,
        bindSocket: bindSocket,
        bindControl: bindControl
    }

    export interface SocketProps {
        type: string,
        socket: ReteSocket,
        io: IO,
        innerRef: bindSocket
    }

    interface ControlProps {
        className: string,
        key?: string, // not used where control is a child of an input
        control: ReteControl,
        innerRef: bindControl
    }

    export declare class Node extends ReactComponent<NodeProps, NodeState> {
        render(): JSX.Element;
    }  

    export declare class Socket<T extends SocketProps> extends ReactComponent<T> {
        createRef(el: HTMLElement): void;
        render(): JSX.Element;
    }

    export declare class Control extends ReactComponent<ControlProps> {
        render(): JSX.Element;
    }

    declare const _default: RetePlugin;
    export default _default;
}
