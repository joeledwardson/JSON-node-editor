import * as Rete from "rete";
import * as Display from "../display";
import * as ReactRete from 'rete-react-render-plugin';
import * as Data from '../../data/attributes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";

export type ActionName = "add" | "remove" | "moveUp" | "moveDown";
export type ActionProcess = (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => void;

/**
 * Same as Base Display but outputs & their mapped controls are displayed with:
 * - arrow up button 
 * - arrow down button 
 * - plus button
 * - minus button
 * the 4 above actions call `ActionFunction()` with the corresponding `ActionName`
 */
export function getElementaryOutput<T extends ReactRete.NodeProps>(
  index: number, 
  actions: {[index in ActionName]: ActionProcess},
  props: T,
): JSX.Element {
  let outputMap = Data.getOutputControls(props.node);
  let outputKey = Object.keys(outputMap)[index];
  let output = props.node.outputs.get(outputKey);
  let ctrlKey = outputMap[outputKey];
  let control = props.node.controls.get(ctrlKey);
  const exAction = (name: ActionName) => actions[name](props.node, props.editor, index); 
  return <div className="output" key={output.key}>
    <div className="output-title hidden-node-item">
      <div className="output-item-controls">
        <div className="output-item-arrows">
          <div>
            <button onClick={() => exAction("moveUp")}>
              <i className="fas fa-chevron-up fa-xs"></i>
            </button>
          </div>
          <div>
            <button onClick={() => exAction("moveDown")} >
              <i className="fas fa-chevron-down fa-xs"></i>
            </button>
          </div>
        </div>
        <Button variant="light" className="" size="sm" onClick={() => exAction("add")} >
          <FontAwesomeIcon icon={faPlus} />
        </Button>
        <Button variant="warning" className="" size="sm" onClick={() => exAction("remove")}>
          <FontAwesomeIcon icon={faTrash} />
        </Button>
        {control && Display.getControl(control, props.bindControl)}
      </div>
    </div>
    {output && Display.getSocket(output, "output", props.bindSocket)}
  </div>
}


/** get controls not mapped to an output */
export function getUnmappedControls(node: Rete.Node): Rete.Control[] {  
  let outputControlKeys = Object.values(Data.getOutputControls(node));
  return Array.from(node.controls.values())
  .filter(c => !outputControlKeys.includes(c.key))
}


/** generate elementary display class passing actions for elementary buttons  */
export function getDisplayClass(actions: {[index in ActionName]: ActionProcess}) : typeof ReactRete.Node {
  return class DisplayClass extends ReactRete.Node {
    render() {
      return Display.renderComponent(this.props, this.state, {
        getOutputs: (props: ReactRete.NodeProps) => Object.entries(Data.getOutputControls(props.node))
        .map((_, index) => getElementaryOutput(index, actions, props)),
  
        getControls: (props: ReactRete.NodeProps) => getUnmappedControls(props.node)
        .map(c => Display.getControl(c, props.bindControl))
      })
    }
  }
}