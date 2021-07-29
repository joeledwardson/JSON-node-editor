import * as Rete from "rete";
import * as ReactRete from 'rete-react-render-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faPlus, faTimes, faTrash, faMouse } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";
import { StylableSocket } from "../sockets/display";
import { sockets } from "../sockets/sockets";
import { getOutputControls, getOutputNulls } from "../data/component";
import { CSSProperties } from "react";


export type ListAction = "add" | "remove" | "moveUp" | "moveDown";
export type ListActionFunction = (index: number, action: ListAction) => void;



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

  getControl(ctrl: Rete.Control) {
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

  // getControl(control: Rete.Control, index: number): JSX.Element {
  //   return <ReactRete.Control	
  //     className="control"
  //     key={control.key}
  //     control={control}
  //     innerRef={this.props.bindControl}
  //   />
  // }

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


export abstract class DisplayDynamicBase extends DisplayBase {

  abstract nullButtonClick(output: Rete.Output): void

  getOutput(output: Rete.Output, index: number): JSX.Element {
    let ctrl = this.props.node.controls.get(getOutputControls(this.props.node)[output.key]);
    let isNullable: boolean = output.key in getOutputNulls(this.props.node);
    let isNull: boolean = getOutputNulls(this.props.node)[output.key] === true;
    let displayCtrl: boolean = !output.hasConnection() && Boolean(ctrl) && !isNull;
    let btnIcon = isNull ? faMouse : faTimes;
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
      {displayCtrl ? ctrl && this.getControl(ctrl) : <div className="control-input"></div>}
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