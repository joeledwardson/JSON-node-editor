import * as Rete from "rete";
import * as Display from "../display";
import * as ReactRete from 'rete-react-render-plugin';
import * as Data from '../data/attributes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faChevronUp, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";

export type ActionName = "add" | "remove" | "moveUp" | "moveDown";
export type ActionProcess = (node: Rete.Node, editor: Rete.NodeEditor, idx: number) => void;
export type Actions = {[index in ActionName]: ActionProcess};

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
  actions: Actions,
  props: T,
): JSX.Element {
  let oMap = Data.getOutputMap(props.node)[index];
  let output = props.node.outputs.get(oMap.outputKey);
  let control = props.node.controls.get(oMap.nameKey);
  const exAction = (name: ActionName) => actions[name](props.node, props.editor, index); 
  return <div className="output" key={output.key}>
    <div className="output-title hidden-node-item">
      <div className="output-item-controls">
        <div className="output-item-arrows">
          <div>
            <button onClick={() => exAction("moveUp")}>
              <FontAwesomeIcon icon={faChevronUp} size="xs" />
            </button>
          </div>
          <div>
            <button onClick={() => exAction("moveDown")} >
              <FontAwesomeIcon icon={faChevronDown} size="xs" />
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
  let outputMaps = Data.getOutputMap(node);
  return Array.from(node.controls.values()) 
  .filter(ctrl => !outputMaps.find(o => o.dataKey == ctrl.key || o.nameKey == ctrl.key));
}


/** render elementary outputs with their mapped controls */
export function renderElementaryOutputs(props: ReactRete.NodeProps, actions: Actions): JSX.Element[] {
  let outputMaps = Data.getOutputMap(props.node);
  return outputMaps.map((o, i) => o.outputKey && getElementaryOutput(i, actions, props));
}


/** render controls not mapped to outputs */
export function renderUnmappedControls(props: ReactRete.NodeProps): JSX.Element[] {
  return getUnmappedControls(props.node).map(c => Display.getControl(c, props.bindControl))
}
