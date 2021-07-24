import React, { CSSProperties } from "react";
import Rete, { Control, Input, Output } from "rete";
import { SocketProps, Socket as SocketComponent } from "rete-react-render-plugin";
import { Connection } from "rete";


export class ReteControlBase extends Control {
    props: any;
    update?: () => Promise<void>; // update() is declared at load time by rete react render plugin implementation
    render?: "react";  // render should be set to "react" or left as undefined for react render plugin
    component: typeof React.Component; // "component" React property used to render Control with "props" variable
    constructor(component: typeof React.Component, key: string) {
      super(key);
      this.component = component;
    }
}
  

export abstract class ComponentBase extends Rete.Component {
    update?: () => Promise<void>; // update() is declared at load time by rete react render plugin implementation
    render?: "react";
    data: {component?: typeof React.Component}; // "data" property passed to renderer, which if it has "component" is used for component rendering
    constructor(name: string, component?: typeof React.Component) {
        super(name);
        this.data = {
            component: component
        }
    }
}

export interface StyleSocketProps extends SocketProps {
    cssStyle?: CSSProperties
}
export class StylableSocket extends SocketComponent<StyleSocketProps> {
    render () {
        const { socket, type } = this.props;
        return (
            <div
                style={this.props.cssStyle}
                className={`socket ${type}`}
                title={socket.name}
                ref={el => el && this.createRef(el)} // force update for new IO with a same key 
            />
        )
    }
}

export class OutputExtended extends Output {
    handleErrorIncompatible(input: Input) {
        throw new Error('Sockets not compatible');
    }
    handleErrorMultipleConnections(input: Input) {
        throw new Error('Input already has one connection');
    }
    handleErrorOutputConnection(input: Input) {
        throw new Error('Output already has one connection');
    }
    connectTo(input: Input): Connection {
        if (!this.socket.compatibleWith(input.socket))
            this.handleErrorIncompatible(input);
        if (!input.multipleConnections && input.hasConnection())
            this.handleErrorMultipleConnections(input);
        if (!this.multipleConnections && this.hasConnection())
            this.handleErrorOutputConnection(input);

        const connection = new Connection(this, input);

        this.connections.push(connection);
        return connection;
    }
}