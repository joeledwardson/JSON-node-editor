import * as Rete from "rete";
import * as ReactRete from 'rete-react-render-plugin';
import * as MyControls from '../controls/controls';
import { v4 as uuidv4 } from 'uuid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faArrowUp, faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";
import { StylableSocket } from "./socket";
import MySocket, { sockets } from "../mysocket";
import TextareaAutosize from 'react-textarea-autosize';


type ListAction = "add" | "remove" | "moveUp" | "moveDown";


// get mappings of node outputs to output controls (create if not exist)
export function getOutputControls(node: Rete.Node): Map<string, Rete.Control> {
  if (node.meta.outputMappings === undefined) {
    let outputMappings = new Map<string, Rete.Control>();
    node.meta.outputMappings = outputMappings;
  }
  return node.meta.outputMappings as Map<string, Rete.Control>;
}  

export async function listOutputAction(
  editor: Rete.NodeEditor,
  node: Rete.Node, 
  SocketType: Rete.Socket,
  idx: number, 
  action: ListAction
): Promise<void> {
  return new Promise((res, rej) => {
    console.log("output key " + idx + " processing, action: " + action);

    // get existing outputs into list format
    let lst: Array<Rete.Output> = Array.from(node.outputs.values());
    console.log(`found ${lst.length} existing outputs`);

    // nodes that have a connection to the output that will need to be updated
    let nds: Set<Rete.Node> = new Set<Rete.Node>([node]);

    if (action === "add") {

      const newIndex: number = idx + 1; // index in output list for new output follows output pressed
      const newKey: string = uuidv4(); // generate unique string for key

      const newOutput: Rete.Output = new Rete.Output(newKey, newKey, SocketType); // create new output with unique key
      const newControl: Rete.Control = new MyControls.ControlText(editor, newKey, ""); // create new control for output
      node.addControl(newControl); // add control to node

      lst.splice(newIndex, 0, newOutput);  // insert new output into list
      getOutputControls(node).set(newKey, newControl);  // add new control to output control mappings
    
    } else if (action === "remove") {
      
      if (idx >= 0 && idx < lst.length) {

        // get output using its index
        const output = lst[idx];

        // remove mapped output control (if exist)
        let ctrl = getOutputControls(node).get(output.key);
        if( ctrl !== undefined ) {
          node.removeControl(ctrl);
          getOutputControls(node).delete(output.key);
        }

        // register each node which has an input connected to the output being deleted
        output.connections.forEach((c: Rete.Connection): void => {
          c.input.node && nds.add(c.input.node);
        })

        // remove connections from view
        output.connections.map(c => editor.removeConnection(c));

        // remove output from node
        node.removeOutput(output);
              
        // remove output from processing list
        lst.splice(idx, 1);

      } else {
        console.error(`couldnt delete output form index, out of range "${idx}"`);
      }

    } else if (action === "moveUp") {

      if( idx > 0 && idx < lst.length ) {

        // pop element out and move "up" (up on screen, down in list index)
        const output = lst[idx];
        lst.splice(idx, 1);
        lst.splice(idx - 1, 0, output);

      } else {
        // couldnt find element
        console.warn(`cant move output index up "${idx}"`);
      }
    } else if (action === "moveDown") {

      if( idx >= 0 && (idx + 1) < lst.length ) {
        
        // pop element out and move "down" (down on screen, up in list index)
        // remove next element and insert behind 
        const nextOutput = lst[idx + 1];
        lst.splice(idx + 1, 1);
        lst.splice(idx, 0, nextOutput);

      } else {
        // couldnt find element
        console.warn(`cant move output index down "${idx}"`);
      }
    }
    
    // clear map of stored outputs
    node.outputs.clear();

    // re-add outputs to node from modified list (connections will remain intact)
    lst.map((o: Rete.Output, i: number) => {
      o.node = null; // clear node so can be re-added by addOutput() function without triggering error
      node.addOutput(o)
    });

    // update node
    node.update();

    // for each affected node update its connections
    setTimeout(() => 
      nds.forEach(n => editor?.view.updateConnections({node: n})),
      10
    );

    res();
  });
}



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
        {controls.map((control, index) => !getOutputControls(this.props.node).has(control.key) && this.getControl(control, index))}
        {/* Inputs */}
        {inputs.map((input, index) => this.getInput(input, index))}
      </div>
    );
  }
}


export class DisplayDict extends DisplayBase {
  listOutputAction = async (idx: number, action:ListAction) => listOutputAction(
    this.props.editor, this.props.node, MySocket.dictKeySocket, idx, action
  );

  getOutput(output: Rete.Output, index: number): JSX.Element {
    return <div className="output" key={output.key}>
      <div className="output-title hidden-node-item">
        <div className="output-item-controls">
          <div className="output-item-arrows">
            <div>
              <button onClick={() => this.listOutputAction(index, "moveUp")} >
                <i className="fas fa-chevron-up fa-xs"></i>
              </button>
            </div>
            <div>
              <button onClick={() => this.listOutputAction(index, "moveDown")} >
                <i className="fas fa-chevron-down fa-xs"></i>
              </button>
            </div>
          </div>
          <Button variant="light" className="" size="sm" onClick={() => this.listOutputAction(index, "add")} >
            <FontAwesomeIcon icon={faPlus} />
          </Button>
          <Button variant="warning" className="" size="sm" onClick={() => this.listOutputAction(index, "remove")}>
            <FontAwesomeIcon icon={faTrash} />
          </Button>
          {/* <span style={{width: "2rem"}} className="ms-2">#{output.key.slice(0, 3)}</span> */}
          <ReactRete.Control	
            className="control"
            key={output.key}
            control={getOutputControls(this.props.node).get(output.key) as Rete.Control}
            innerRef={this.props.bindControl}
          />
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


export class DisplayList extends DisplayDict {
  listOutputAction = async (idx: number, action:ListAction) => listOutputAction(
    this.props.editor, this.props.node, MySocket.listItemSocket, idx, action
  );
}