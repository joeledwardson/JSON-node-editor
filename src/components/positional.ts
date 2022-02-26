import * as Rete from "rete";
import * as Data from "../data/attributes";
import * as MapInt from './mapInterface';
import XLSXColumn from "xlsx-column";


/** update view connections after waiting */
export function updateViewConnections(
  nodes: Rete.Node[],
  editor: Rete.NodeEditor
) {
  setTimeout(() => {
    nodes.forEach((n) => editor?.view.updateConnections({ node: n }));
    editor.trigger("process");
  }, 10);
}


/** complete a positional action */
function _complete(node: Rete.Node, editor: Rete.NodeEditor) {
  node.update(); // update output mappings and node
  updateViewConnections([node], editor); // for each affected node update its connections
}


/** increment mapped output tracker in node attributes and return */
export function getNextOutputIndex(node: Rete.Node): number {
  let attrs = Data.getGeneralAttributes(node);
  if (attrs.outputTracker === undefined) {
    attrs.outputTracker = 0;
  }
  attrs.outputTracker += 1;
  return attrs.outputTracker;
}


/** convert mapped output index to excel string (e.g. 1 => 'A', 2 => 'B') */
export function getNextCoreName(node: Rete.Node): string {
  let nextIndex = getNextOutputIndex(node);
  return "Item " + new XLSXColumn(nextIndex).toString();
}


/* add a new mapped output to a node */
 export function elementAdd(
  node: Rete.Node,
  editor: Rete.NodeEditor,
  idx: number
): Data.DataMap {
  // get selected type from type selection control
  const coreName = getNextCoreName(node);
  let attrs = Data.getGeneralAttributes(node);
  let newMap: Data.ElementaryMap = {};

  if (attrs.componentSchema?.type === "object") {
    // if type is object, add dynamic output with name control
    MapInt.setDynamicObjectMap(newMap, coreName, attrs?.attributeSchema || null);
  } else {
    // type is array, add new output without name control
    MapInt.setElementaryMap(newMap, attrs?.attributeSchema || null, coreName);
  }

  // index in output list for new output follows output pressed
  let outputMaps = Data.getOutputMap(node);
  const newIndex: number = idx + 1;
  outputMaps.splice(newIndex, 0, newMap);

  // create elements
  MapInt.createMapItems(node, newMap, editor);

  _complete(node, editor);

  // return new output map
  return newMap;
}


/** remove a mapped output from a node */
export function elementRemove(
  node: Rete.Node,
  editor: Rete.NodeEditor,
  idx: number
) {
  let outputMaps = Data.getOutputMap(node);

  // check index in range
  if (!(idx >= 0 && idx < outputMaps.length)) {
    console.error(`couldnt delete output from index, out of range "${idx}"`);
    return;
  }

  // check output exists
  if (!outputMaps[idx]) {
    console.error(`unexpected error: output at index "${idx}" not found`);
    return;
  }

  // remove map elements
  MapInt.removeMapItems(node, outputMaps[idx], editor);

  // remove output map
  outputMaps.splice(idx, 1);

  _complete(node, editor);
}


/** move a mapped element up */
export function elementUp(
  node: Rete.Node,
  editor: Rete.NodeEditor,
  idx: number
) {
  let outputMaps = Data.getOutputMap(node);
  if (!(idx > 0 && idx < outputMaps.length && outputMaps[idx - 1].canMove)) {
    // check if previous index is elementary (non-fixed)
    editor.trigger("error", { message: `cant move output index up "${idx}"` });
    return;
  }

  // get selected element
  const m = outputMaps[idx];
  // pop element out
  outputMaps.splice(idx, 1);
  // move "up" (up on screen, down in list index)
  outputMaps.splice(idx - 1, 0, m);

  _complete(node, editor);
}


/** move a mapped element down */
export function elementDown(
  node: Rete.Node,
  editor: Rete.NodeEditor,
  idx: number
) {
  let outputMaps = Data.getOutputMap(node);
  if (!(idx >= 0 && idx + 1 < outputMaps.length)) {
    editor.trigger("error", {
      message: `cant move output index down "${idx}"`,
    });
    return;
  }

  // get next element
  const m = outputMaps[idx + 1];
  // remove next element
  outputMaps.splice(idx + 1, 1);
  // insert behind - move "down" (down on screen, up in list index)
  outputMaps.splice(idx, 0, m);

  _complete(node, editor);
}