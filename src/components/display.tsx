import * as Rete from "rete";
import * as ReactRete from 'rete-react-render-plugin';
import { bindSocket, bindControl } from "rete-react-render-plugin";
import { sockets } from "../sockets/sockets";
import { CSSProperties } from "react";


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
  // let ctrl = node.controls.get(getOutputControls(node)[output.key]);
  return <div className="output" key={output.key}>
    {/* {!output.hasConnection() && ctrl && getControl(ctrl, bindControl)} */}
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

export function getOutputs<T extends ReactRete.NodeProps>(props: T): JSX.Element[] {
  return Array.from(props.node.outputs.values()).
  map(o => getOutput(o, props.node, props.bindControl, props.bindSocket))
}

export function getControls<T extends ReactRete.NodeProps>(props: T): JSX.Element[] {
  return Array.from(props.node.controls.values())
  .map(c => getControl(c, props.bindControl))
}

export function getInputs<T extends ReactRete.NodeProps>(props: T): JSX.Element[] {
  return Array.from(props.node.inputs.values())
  .map(i => getInput(i, props.bindControl, props.bindSocket))
}

export function renderComponent<T extends ReactRete.NodeProps, S extends ReactRete.NodeState>(
  props: T,
  state: S,
  renderOutputs = (props: T) => getOutputs(props),
  renderControls = (props: T) => getControls(props),
  renderTitle = (props: T) => getTitle(props.node.name),
  renderInputs = (props: T) => getInputs(props),
): JSX.Element {
  return (
    <div className={`node ${state.selected}`}>
      {/* Title */}
      {renderTitle(props)}
      {/* Outputs and their mapped controls */}
      {renderOutputs(props)}
      {/* Controls (check not mapped to output) */}
      <div className="controls-container" >
      {renderControls(props)}
      </div>        
      {/* Inputs */}
      {renderInputs(props)}
    </div>
  );
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
    return renderComponent(this.props, this.state);
  }
}
