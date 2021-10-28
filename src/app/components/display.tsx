import * as Rete from "rete";
import * as ReactRete from 'rete-react-render-plugin';
import { bindSocket, bindControl } from "rete-react-render-plugin";
import { sockets } from "../sockets/sockets";
import { getOutputControls } from "../data/attributes";
import { CSSProperties } from "react";


export type ListAction = "add" | "remove" | "moveUp" | "moveDown";
export type ListActionFunction = (index: number, action: ListAction) => void;

export function getTitle(name: string): JSX.Element {
  return <div className="title">{name}</div>
}

export function getSocket(io: Rete.IO, typ: string, bindSocket: bindSocket, styles?: CSSProperties): JSX.Element {
  return <ReactRete.Socket
    type={typ}
    socket={io.socket}
    io={io}
    innerRef={bindSocket}
    cssStyle={{background: sockets.get(io.socket.name)?.colour, ...styles}}
  />
}

export function getControl(ctrl: Rete.Control, bindControl: bindControl): JSX.Element {
  return <ReactRete.Control	
    className="control"
    key={ctrl.key}
    control={ctrl}
    innerRef={bindControl}
  />
}

export function getOutput(output: Rete.Output, node: Rete.Node, bindControl: bindControl, bindSocket: bindSocket): JSX.Element {
  let ctrl = node.controls.get(getOutputControls(node)[output.key]);
  return <div className="output" key={output.key}>
    {!output.hasConnection() && ctrl && getControl(ctrl, bindControl)}
    <div className="output-title">{output.name}</div>
    {getSocket(output, "output", bindSocket)}
  </div>
}

export function getInput(input: Rete.Input, bindControl: bindControl, bindSocket: bindSocket): JSX.Element {
  return <div className="input" key={input.key}>
    {getSocket(input, "input", bindSocket)}
    {!input.showControl() && (
      <div className="input-title">{input.name}</div>
    )}
    {input.showControl() && input.control && (
      <ReactRete.Control
        className="input-control"
        control={input.control}
        innerRef={bindControl}
      />
    )}
  </div>
}


/**
 * Basic Component Display Class
 * Displays: 
 * - title 
 * - outputs (with their mapped controls using `getOutputControls()`, if exist and output not connected)
 * - controls (not mapped to outputs)
 * - inputs
 */
export class DisplayBase extends ReactRete.Node {
  render() {
    const { node, bindSocket, bindControl } = this.props;
    const { outputs, controls, inputs, selected } = this.state;
    let ctrlKeys = Object.values(getOutputControls(this.props.node));    
    
    return (
      <div className={`node ${selected}`}>
        {/* Title */}
        {getTitle(node.name)}
        {/* Outputs and their mapped controls */}
        {outputs.map((output) => getOutput(output, node, bindControl, bindSocket))}
        {/* Controls (check not mapped to output) */}
        <div className="controls-container" >
        {controls.map((control) => !ctrlKeys.includes(control.key) && getControl(control, bindControl))}
        </div>        
        {/* Inputs */}
        {inputs.map((input) => getInput(input, bindControl, bindSocket))}
      </div>
    );
  }
}
