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

export class MyNode extends NodeComponent {

  async addOutput(key: string, outputIndex: number, add: boolean = true): Promise<void> {
    return new Promise(res => {
      console.log("output key " + outputIndex + " pressed, adding: " + add);
      const node: ReteNode = this.props.node;

      // get existing outputs into list format
      let outputVals: Array<Output> = Array.from(node.outputs.values());
      console.log(`found ${outputVals.length} existing outputs`);

      // nodes that have a connection to the output that will need to be updated
      let affectedNodes: Set<ReteNode> = new Set<ReteNode>([node]);

      if (add) {
        // index in output list for new output follows output pressed, generate unique string for key
        const newIndex: number = outputIndex + 1;
        const newKey: string = uuidv4();

        // create new output (don't set title yet as will be added further down), and insert at correct position in list
        const newOutput: Output = new Output(newKey, "", myNumSocket);
        outputVals.splice(newIndex, 0, newOutput);
      
      } else {

        // get output using its key
        const output = node.outputs.get(key);

        if( output === undefined ) {
          console.warn(`couldnt find output "${key}"`);
        } else {

          // register each node which has an input connected to the output being deleted
          output.connections.forEach((c: Connection): void => {
            c.input.node && affectedNodes.add(c.input.node);
          })

          // remove connections from view
          output.connections.map(c => this.props.editor.removeConnection(c));

          // remove output from node
          node.removeOutput(output);
        }
      
        // remove output from processing list
        outputVals.splice(outputIndex, 1);

      }
      
      // clear map of stored outputs
      node.outputs.clear();

      // re-add outputs to node
      outputVals.map((o: Output, i: number) => {
        o.node = null; // clear node so can be re-added by addOutput() function without triggering error
        o.name = "Number " + String(i+1); // update title with index from re-ordering
        node.addOutput(o)
      });

      // update node
      node.update();

      // for each affected node update its connections
      setTimeout(() => 
        affectedNodes.forEach(n => this.props.editor?.view.updateConnections({node: n})),
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

                {/* <div style={{display: 'flex', flexDirection: 'column'}}>
                  <button>d</button>
                  <button></button> */}
                <Button size="sm" style={{padding: 0}}>
                  <FontAwesomeIcon size="1x" icon={faArrowUp} />
                </Button>
                <Button size="sm">
                  <FontAwesomeIcon icon={faArrowDown} />
                </Button>
                {/* </div> */}
                <Button className="me-1" variant="light" size="sm" onClick={() => this.addOutput(output.key, index, true)} >
                  <FontAwesomeIcon icon={faPlus} />
                </Button>
                <Button variant="warning" size="sm" onClick={() => this.addOutput(output.key, index, false)}>
                  <FontAwesomeIcon icon={faTrash} />
                </Button>
                <span className="ms-2">Item-{index}</span>
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
