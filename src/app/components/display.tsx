import * as Rete from "rete";
import * as ReactRete from 'rete-react-render-plugin';
import { bindSocket, bindControl } from "rete-react-render-plugin";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faPlus, faTimes, faTrash, faMouse } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";
import { StylableSocket } from "../sockets/display";
import { sockets } from "../sockets/sockets";
import { getOutputControls, getOutputNulls } from "../data/component";
import { CSSProperties } from "react";
import { ControlPropsBase, ControlTemplate } from "../controls/core";


export type ListAction = "add" | "remove" | "moveUp" | "moveDown";
export type ListActionFunction = (index: number, action: ListAction) => void;

export function getTitle(name: string): JSX.Element {
  return <div className="title">{name}</div>
}

export function getSocket(io: Rete.IO, typ: string, bindSocket: bindSocket, styles?: CSSProperties): JSX.Element {
  return <StylableSocket
    type={typ}
    socket={io.socket}
    io={io}
    innerRef={bindSocket}
    cssStyle={{background: sockets.get(io.socket.name)?.colour, ...styles}}
  />
}

export function getControl(ctrl: Rete.Control, bindControl: bindControl, display_disabled: boolean = false): JSX.Element {
  (ctrl as ControlTemplate<ControlPropsBase>).props.display_disabled = display_disabled;
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

  getTitle(): JSX.Element {
    return <div className="title">{this.props.node.name}</div>
  }

  getSocket(io: Rete.IO, typ: string, styles?: CSSProperties) {
    return <StylableSocket
      type={typ}
      socket={io.socket}
      io={io}
      innerRef={this.props.bindSocket}
      cssStyle={{background: sockets.get(io.socket.name)?.colour, ...styles}}
    />
  }

  getControl(ctrl: Rete.Control, display_disabled: boolean = false) {
    (ctrl as ControlTemplate<ControlPropsBase>).props.display_disabled = display_disabled;
    return <ReactRete.Control	
      className="control"
      key={ctrl.key}
      control={ctrl}
      innerRef={this.props.bindControl}
    />
  }

  getOutput(output: Rete.Output, index: number): JSX.Element {
    let ctrl = this.props.node.controls.get(getOutputControls(this.props.node)[output.key]);
    return <div className="output" key={output.key}>
      {!output.hasConnection() && ctrl && this.getControl(ctrl)}
      <div className="output-title">{output.name}</div>
      {this.getSocket(output, "output")}
    </div>
  }

  getInput(input: Rete.Input, index: number): JSX.Element {
    return <div className="input" key={input.key}>
      {this.getSocket(input, "input")}
      {!input.showControl() && (
        <div className="input-title">{input.name}</div>
      )}
      {input.showControl() && input.control && (
        <ReactRete.Control
          className="input-control"
          control={input.control}
          innerRef={this.props.bindControl}
        />
      )}
    </div>
  }

  render() {
    const { node, bindSocket, bindControl } = this.props;
    const { outputs, controls, inputs, selected } = this.state;
    let ctrlKeys = Object.values(getOutputControls(this.props.node));    
    
    return (
      <div className={`node ${selected}`}>
        {this.getTitle()}
        {/* Outputs */}
        {outputs.map((output, index) =>  this.getOutput(output, index))}
        {/* Controls (check not mapped to output) */}
        <div className="controls-container" >
        {controls.map((control, index) => !ctrlKeys.includes(control.key) && this.getControl(control))}
        </div>        
        {/* Inputs */}
        {inputs.map((input, index) => this.getInput(input, index))}
      </div>
    );
  }
}

/**
 * Same as Base Display but outputs & their mapped controls are displayed with:
 * - arrow up button 
 * - arrow down button 
 * - plus button
 * - minus button
 * the 4 above actions call `ListActionFunction()`
 */
export abstract class DisplayListBase extends DisplayBase {
  abstract action: ListActionFunction
  getOutput(output: Rete.Output, index: number): JSX.Element {
    let ctrlKey = getOutputControls(this.props.node)[output.key];
    let ctrl = ctrlKey && this.props.node.controls.get(ctrlKey);
    return <div className="output" key={output.key}>
      <div className="output-title hidden-node-item">
        <div className="output-item-controls">
          <div className="output-item-arrows">
            <div>
              <button onClick={() => this.action(index, "moveUp")} >
                <i className="fas fa-chevron-up fa-xs"></i>
              </button>
            </div>
            <div>
              <button onClick={() => this.action(index, "moveDown")} >
                <i className="fas fa-chevron-down fa-xs"></i>
              </button>
            </div>
          </div>
          <Button variant="light" className="" size="sm" onClick={() => this.action(index, "add")} >
            <FontAwesomeIcon icon={faPlus} />
          </Button>
          <Button variant="warning" className="" size="sm" onClick={() => this.action(index, "remove")}>
            <FontAwesomeIcon icon={faTrash} />
          </Button>
          {ctrl && this.getControl(ctrl)}
        </div>
      </div>
      {this.getSocket(output, "output")}
    </div>
  }

  render() {
    const { node, bindSocket, bindControl } = this.props;
    const { outputs, controls, inputs, selected } = this.state;
    let ctrlMaps = getOutputControls(this.props.node);
    let ctrlKeys = Object.values(ctrlMaps);    
    let _outputs = Object.keys(ctrlMaps).map(k => this.props.node.outputs.get(k));    
    
    return (
      <div className={`node ${selected}`}>
        {this.getTitle()}
        {/* Outputs - display in order of output->ctrl mapping object (if exist) */}
        { _outputs.map((output, index) => output && this.getOutput(output, index))}
        {/* Controls (check not mapped to output) */}
        <div className="controls-container" >
        {controls.map((control, index) => !ctrlKeys.includes(control.key) && this.getControl(control))}
        </div>        
        {/* Inputs */}
        {inputs.map((input, index) => this.getInput(input, index))}
      </div>
    );
  }
}


/** 
 * Same as Base Display, except for outputs & their mapped controls:
 * Outputs can be "nullable", i.e. their key has a "nulled" boolean value (get/set by `getOutputNulls` with output key)  
 * 
 * If output is "nullable", it is displayed either with an x to "null" the output or a mouse-icon to "activate" the output
 * 
 * "nullable" outputs are displayed as:
 * - if output key is "nulled" with "null" value set to true, mouse button is displayed to "activate" output
 *     - displayed without a socket or its mapped control
 * - if output is not "nulled", with "null" value set to false, x button is displayed to "null" output
 *     - displayed as normal with its socket and mapped control
 * 
 * The action of clicking either "activate"/"null" an output is controlled by `nullButtonClick()`
 */
export abstract class D extends DisplayBase {

  /** process object member null button click -  */
  abstract nullButtonClick(output: Rete.Output): void

  getOutput(output: Rete.Output, index: number): JSX.Element {
    let ctrl = this.props.node.controls.get(getOutputControls(this.props.node)[output.key]);
    let isNullable: boolean = output.key in getOutputNulls(this.props.node);
    let isNull: boolean = getOutputNulls(this.props.node)[output.key] === true;
    let disableCtrl: boolean = output.hasConnection() || isNull;
    let btnIcon = isNull ? faMouse : faTimes;
    
    console.log(`control "${ctrl?.key}" is disabled: "${disableCtrl}`);
    
    let btnElement = 
    <Button 
      variant="secondary" 
      size="sm" 
      className="display-button"
      onClick={()=>this.nullButtonClick(output)}
    >
      <FontAwesomeIcon icon={btnIcon} />
    </Button>
    let titleElement = <div className="output-title">{output.name}</div>

    return <div className="output" key={output.key}>
    {/* return <> */}
      {typeof ctrl !== "undefined" ? this.getControl(ctrl, disableCtrl) : <div className="control-input"></div>}
      {isNullable ? btnElement : <div></div>}
      {titleElement}
      {this.getSocket(output, "output", {visibility: isNull ? "hidden" : "visible"})}
    {/* </> */}
    </div>
  }

  render() {
    const { node, bindSocket, bindControl } = this.props;
    const { outputs, controls, inputs, selected } = this.state;
    let ctrlKeys = Object.values(getOutputControls(this.props.node));    
    return (
      <div className={`node ${selected}`}>
        {this.getTitle()}
        {/* Outputs */}
        <div className="dynamic-outputs">
          {outputs.map((output, index) =>  this.getOutput(output, index))}
        </div>
        {/* Controls (check not mapped to output) */}
        <div className="controls-container" >
        {controls.map((control, index) => !ctrlKeys.includes(control.key) && this.getControl(control))}
        </div>        
        {/* Inputs */}
        {inputs.map((input, index) => this.getInput(input, index))}
      </div>
    );
  }
}