import * as Rete from "rete";
import * as ReactRete from 'rete-react-render-plugin';
import * as MyControls from '../controls/controls';
import { v4 as uuidv4 } from 'uuid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";
import { StylableSocket } from "../sockets/display";
import MySocket, { sockets } from "../sockets/sockets";
import { getOutputControls } from "./outputcontrols";


export type ListAction = "add" | "remove" | "moveUp" | "moveDown";
export type ListActionFunction = (index: number, action: ListAction) => void;



export class DisplayBase extends ReactRete.Node {

  getTitle(): JSX.Element {
    return <div className="title">{this.props.node.name}</div>
  }

  getOutput(output: Rete.Output, index: number): JSX.Element {
    return <div className="output" key={output.key}>
      {!output.hasConnection() && getOutputControls(this.props.node).has(output.key) && <ReactRete.Control	
        className="control"
        key={output.key}
        control={getOutputControls(this.props.node).get(output.key) as Rete.Control}
        innerRef={this.props.bindControl}
        />
      }
      <div className="output-title">{output.name}</div>
      <StylableSocket
        type="output"
        socket={output.socket}
        io={output}
        innerRef={this.props.bindSocket}
        cssStyle={{background: sockets.get(output.socket.name)?.colour}}
      />
    </div>
  }

  getControl(control: Rete.Control, index: number): JSX.Element {
    return <ReactRete.Control	
      className="control"
      key={control.key}
      control={control}
      innerRef={this.props.bindControl}
    />
  }

  getInput(input: Rete.Input, index: number): JSX.Element {
    return <div className="input" key={input.key}>
      <StylableSocket
        type="input"
        socket={input.socket}
        io={input}
        innerRef={this.props.bindSocket}
        cssStyle={{background: sockets.get(input.socket.name)?.colour}}
      />
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
    
    return (
      <div className={`node ${selected}`}>
        {this.getTitle()}
        {/* Outputs */}
        {outputs.map((output, index) =>  this.getOutput(output, index))}
        {/* Controls (check not mapped to output) */}
        <div className="controls-container" >
        {controls.map((control, index) => !getOutputControls(this.props.node).has(control.key) && this.getControl(control, index))}
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
          {/* <span style={{width: "2rem"}} className="ms-2">#{output.key.slice(0, 3)}</span> */}
          {getOutputControls(this.props.node).has(output.key) &&
          <ReactRete.Control	
            className="control"
            key={output.key}
            control={getOutputControls(this.props.node).get(output.key) as Rete.Control}
            innerRef={this.props.bindControl}
          />
          }
          {/* <TextareaAutosize rows={1} className="control-input"></TextareaAutosize> */}
        </div>
      </div>
      <StylableSocket
        type="output"
        socket={output.socket}
        io={output}
        innerRef={this.props.bindSocket}
        cssStyle={{background: sockets.get(output.socket.name)?.colour}}
      />
    </div>
  }
}

export function getDisplayListClass(listOutputAction: ListActionFunction): typeof ReactRete.Node {
  return class _DisplayClass extends DisplayListBase {
    action = listOutputAction
  }
}

// export class DisplayDict extends DisplayBase {
//   listOutputAction = async (idx: number, action:ListAction) => listOutputAction(
//     this.props.editor, this.props.node, MySocket.dictKeySocket, idx, action
//   );

//   getOutput(output: Rete.Output, index: number): JSX.Element {
//     return <div className="output" key={output.key}>
//       <div className="output-title hidden-node-item">
//         <div className="output-item-controls">
//           <div className="output-item-arrows">
//             <div>
//               <button onClick={() => this.listOutputAction(index, "moveUp")} >
//                 <i className="fas fa-chevron-up fa-xs"></i>
//               </button>
//             </div>
//             <div>
//               <button onClick={() => this.listOutputAction(index, "moveDown")} >
//                 <i className="fas fa-chevron-down fa-xs"></i>
//               </button>
//             </div>
//           </div>
//           <Button variant="light" className="" size="sm" onClick={() => this.listOutputAction(index, "add")} >
//             <FontAwesomeIcon icon={faPlus} />
//           </Button>
//           <Button variant="warning" className="" size="sm" onClick={() => this.listOutputAction(index, "remove")}>
//             <FontAwesomeIcon icon={faTrash} />
//           </Button>
//           {/* <span style={{width: "2rem"}} className="ms-2">#{output.key.slice(0, 3)}</span> */}
//           <ReactRete.Control	
//             className="control"
//             key={output.key}
//             control={getOutputControls(this.props.node).get(output.key) as Rete.Control}
//             innerRef={this.props.bindControl}
//           />
//           {/* <TextareaAutosize rows={1} className="control-input"></TextareaAutosize> */}
//         </div>
//       </div>
//       <StylableSocket
//         type="output"
//         socket={output.socket}
//         io={output}
//         innerRef={this.props.bindSocket}
//         cssStyle={{background: sockets.get(output.socket.name)?.colour}}
//       />
//     </div>
//   }
// }


// export class DisplayList extends DisplayDict {
//   listOutputAction = async (idx: number, action:ListAction) => listOutputAction(
//     this.props.editor, this.props.node, MySocket.listItemSocket, idx, action
//   );
// }