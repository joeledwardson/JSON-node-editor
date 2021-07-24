import { Control, Input, NodeEditor, Output, Socket as ReteSocket } from "rete";
import { Node as NodeComponent, Control as ControlComponent } from "rete-react-render-plugin";
import { Node as ReteNode } from "rete";
import { v4 as uuidv4 } from 'uuid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faArrowUp, faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";
import { Connection } from "rete";
import { CSSProperties } from "react";
import { StylableSocket } from "./rete-react";
import MySocket, { sockets } from "./mysocket";

const outputStyle: CSSProperties = {
  // visibility: "hidden"
}

const arrowBtnStyle : CSSProperties = {
  padding: "0.1rem 0.3rem",
  opacity: "0.5"
}

const svgStyle : CSSProperties = {
  display: "block" // stop extra space being added inside button from SVG element
}

const minPad : CSSProperties = {
  padding: "0.5rem 0.2rem",
}

type ListAction = "add" | "remove" | "moveUp" | "moveDown";

export async function listOutputAction(
  editor: NodeEditor,
  node: ReteNode, 
  SocketType: ReteSocket,
  idx: number, 
  action: ListAction
): Promise<void> {
  return new Promise((res, rej) => {
    console.log("output key " + idx + " processing, action: " + action);

    // get existing outputs into list format
    let lst: Array<Output> = Array.from(node.outputs.values());
    console.log(`found ${lst.length} existing outputs`);

    // nodes that have a connection to the output that will need to be updated
    let nds: Set<ReteNode> = new Set<ReteNode>([node]);

    if (action === "add") {

      const newIndex: number = idx + 1; // index in output list for new output follows output pressed
      const newKey: string = uuidv4(); // generate unique string for key

      const newOutput: Output = new Output(newKey, newKey, SocketType); // create new output with unique key
      lst.splice(newIndex, 0, newOutput);  // insert new output into list
    
    } else if (action === "remove") {
      
      if (idx >= 0 && idx < lst.length) {

        // get output using its index
        const output = lst[idx];

        // register each node which has an input connected to the output being deleted
        output.connections.forEach((c: Connection): void => {
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
    lst.map((o: Output, i: number) => {
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



export class DisplayBase extends NodeComponent {

  getTitle(): JSX.Element {
    return <div className="title">{this.props.node.name}</div>
  }

  getOutput(output: Output, index: number): JSX.Element {
    return <div className="output" key={output.key}>
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

  getControl(control: Control, index: number): JSX.Element {
    return <ControlComponent	
      className="control"
      key={control.key}
      control={control}
      innerRef={this.props.bindControl}
    />
  }

  getInput(input: Input, index: number): JSX.Element {
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
        <ControlComponent
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
        {outputs.map((output, index) => this.getOutput(output, index))}
        {/* Controls */}
        {controls.map((control, index) => this.getControl(control, index))}
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

  getOutput(output: Output, index: number): JSX.Element {
    return <div className="output" key={output.key}>
      <div className="output-title hidden-node-item" style={outputStyle}>
        <div style={{display: 'flex', alignItems: 'center'}}>
          <div className="me-1" style={{display: 'flex', flexDirection: 'column'}}>
            <div>
              <button onClick={() => this.listOutputAction(index, "moveUp")} style={arrowBtnStyle}>
                <i style={svgStyle} className="fas fa-chevron-up fa-xs"></i>
              </button>
            </div>
            <div>
              <button onClick={() => this.listOutputAction(index, "moveDown")} style={arrowBtnStyle}>
                <i style={svgStyle} className="fas fa-chevron-down fa-xs"></i>
              </button>
            </div>
          </div>
          <Button style={minPad} variant="light" className="me-1" size="sm" onClick={() => this.listOutputAction(index, "add")} >
            <FontAwesomeIcon icon={faPlus} />
          </Button>
          <Button style={minPad} variant="warning" size="sm" onClick={() => this.listOutputAction(index, "remove")}>
            <FontAwesomeIcon icon={faTrash} />
          </Button>
          <span style={{width: "2rem"}} className="ms-2">#{output.key.slice(0, 3)}</span>
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