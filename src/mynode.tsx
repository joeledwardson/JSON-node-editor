import { Output } from "rete";
import { Node as NodeComponent, Socket, Control } from "rete-react-render-plugin";
import { Node as ReteNode } from "rete";
import { myNumSocket } from "./mysocket";
import { v4 as uuidv4 } from 'uuid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// import { fasPl } from '@fortawesome/free-solid-svg-icons'
import { faPlus, faTrash, faArrowUp, faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";
import { Connection } from "rete";
import { CSSProperties } from "react";
import { faChevronUp, faChevronDown } from "@fortawesome/free-solid-svg-icons";


const lowPad : CSSProperties = {
  padding: "0.1rem 0.3rem",
}

const svgStyle : CSSProperties = {
  display: "block" // stop extra space being added inside button from SVG element
}

const minPad : CSSProperties = {
  padding: ".5rem",
}

export class MyNode extends NodeComponent {

  async addOutput(idx: number, action: "add" | "remove" | "moveUp" | "moveDown"): Promise<void> {
    return new Promise((res, rej) => {
      console.log("output key " + idx + " pressed, action: " + action);
      const node: ReteNode = this.props.node;

      // get existing outputs into list format
      let lst: Array<Output> = Array.from(node.outputs.values());
      console.log(`found ${lst.length} existing outputs`);

      // nodes that have a connection to the output that will need to be updated
      let nds: Set<ReteNode> = new Set<ReteNode>([node]);

      if (action === "add") {
        // index in output list for new output follows output pressed, generate unique string for key
        const newIndex: number = idx + 1;
        const newKey: string = uuidv4();

        // create new output (don't set title yet as will be added further down), and insert at correct position in list
        const newOutput: Output = new Output(newKey, newKey, myNumSocket);
        lst.splice(newIndex, 0, newOutput);
      
      } else if (action === "remove") {
        
        if (idx >= 0 && idx < lst.length) {
          // get output using its index
          const output = lst[idx];

          // register each node which has an input connected to the output being deleted
          output.connections.forEach((c: Connection): void => {
            c.input.node && nds.add(c.input.node);
          })

          // remove connections from view
          output.connections.map(c => this.props.editor.removeConnection(c));

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

      // re-add outputs to node
      lst.map((o: Output, i: number) => {
        o.node = null; // clear node so can be re-added by addOutput() function without triggering error
        node.addOutput(o)
      });

      // update node
      node.update();

      // for each affected node update its connections
      setTimeout(() => 
        nds.forEach(n => this.props.editor?.view.updateConnections({node: n})),
        10
      );
      res();
    });
  }

  render() {
    const { node, editor, bindSocket, bindControl } = this.props;
    const { outputs, controls, inputs, selected } = this.state;
    
    return (
      <div className={`node ${selected}`} style={{ background: "grey" }}>
        <div className="title">
          {"<<"} {node.name} {">>"}
        </div>
        {/* Outputs */}
        {outputs.map((output, index) => (
          <div className="output" key={output.key}>
            {/* <div><input type="number">{String(index)}</input></div> */}
            <div className="output-title">
              <div style={{display: 'flex', alignItems: 'center'}}>
                <div className="me-1" style={{display: 'flex', flexDirection: 'column'}}>
                  <div>
                    <button onClick={() => this.addOutput(index, "moveUp")} style={lowPad}>
                      <i style={svgStyle} className="fas fa-chevron-up fa-xs"></i>
                    </button>
                  </div>
                  <div>
                    <button onClick={() => this.addOutput(index, "moveDown")} style={lowPad}>
                      <i style={svgStyle} className="fas fa-chevron-down fa-xs"></i>
                    </button>
                  </div>
                  
                  {/* <FontAwesomeIcon size="sm" icon={faChevronUp} />  
<FontAwesomeIcon size="sm" icon={faChevronDown} /> */}
                </div>

                {/* <Button size="sm" style={noPad} className="me-1" variant="light">
                  <FontAwesomeIcon size="sm" icon={faArrowUp} />
                </Button>
                <Button size="sm" style={noPad} className="me-1" variant="light">
                  <FontAwesomeIcon icon={faArrowDown} />
                </Button> */}
                {/* </div> */}
                <Button style={minPad} variant="light" className="me-1" size="sm" onClick={() => this.addOutput(index, "add")} >
                  <FontAwesomeIcon icon={faPlus} />
                </Button>
                <Button style={minPad} variant="warning" size="sm" onClick={() => this.addOutput(index, "remove")}>
                  <FontAwesomeIcon icon={faTrash} />
                </Button>
                <span className="ms-2">#{output.key.slice(0, 3)}</span>
              </div>
            </div>
            <Socket
              type="output"
              socket={output.socket}
              io={output}
              innerRef={bindSocket}
            />
          </div>
        ))}
        {/* Controls */}
        {controls.map(control => (
          <Control
            className="control"
            key={control.key}
            control={control}
            innerRef={bindControl}
          />
        ))}
        {/* Inputs */}
        {inputs.map(input => (
          <div className="input" key={input.key}>
            <Socket
              type="input"
              socket={input.socket}
              io={input}
              innerRef={bindSocket}
            />
            {!input.showControl() && (
              <div className="input-title">{input.name}</div>
            )}
            {input.showControl() && input.control && (
              <Control
                className="input-control"
                control={input.control}
                innerRef={bindControl}
              />
            )}
          </div>
        ))}
      </div>
    );
  }
}
