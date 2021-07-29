import * as Rete from "rete";
import { ComponentBase } from "../../rete/component";
import { ControlBase } from "../../rete/control";
import MySocket, { sockets } from "../sockets/sockets";
import * as Controls from  "../controls/controls";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import * as Display from "./display";
import { v4 as uuidv4 } from 'uuid';
import * as Data from "../data/component";
import { typeLabels } from './basic';
import * as Dynamic from './dynamic';


/** 
 * perform an action on a dynamic list output 
 * if `hasOutputControls` is True then controls will be added next to outputs, where (output key)->(control key) mappings are used
 * if `hasOutputControls` is False no controls are added next to outputs, but (output key)->"" mappings are still used to denote order of outptus
 * */
async function listOutputAction(
  editor: Rete.NodeEditor,
  node: Rete.Node, 
  idx: number, 
  action: Display.ListAction,
  hasOutputControls: boolean,
): Promise<void> {
  return new Promise((res, rej) => { 
    // get controls data and output->controls map
    let ctrlData = Data.nGetData(node);
    let ctrlsMap = Data.getOutputControls(node);

    // get number of existing outputs
    const nOutputs = node.outputs.size;
    
    // create list of nodes that have a connection to the output to be updated
    let nds: Set<Rete.Node> = new Set<Rete.Node>([node]);
    
    // get selected type from type selection control
    const selectedType = ctrlData["Select Type"];
    let socket = sockets.get(selectedType)?.socket;
    
    
    if (!(socket instanceof Rete.Socket)) {
      return rej(`couldnt find type socket type "${selectedType}"`);
    }    

    // info logging
    console.log("output key " + idx + " processing, action: " + action);
    console.log(`found ${nOutputs} existing outputs`);
    
    // get entries array for output->ctrl mappings to modify
    let newMappings = Object.entries(Data.getOutputControls(node));

    if (action === "add") {
      // index in output list for new output follows output pressed
      const newIndex: number = idx + 1;

      // generate output with new unique key and add to node
      const newKey: string = uuidv4(); 
      node.addOutput(new Rete.Output(newKey, newKey, socket));

      // if no output control exists use blank for output-ctrl mapping
      let ctrlKey = "";
      if( hasOutputControls ) {
        // set ctrl key to unique ID, create new control for output and add to node
        ctrlKey = uuidv4();
        node.addControl(new Controls.ControlText({
          key: ctrlKey, 
          emitter: editor, 
          value: ""
        })); 
      } 

      // add mapping 
      newMappings.splice(newIndex, 0, [newKey, ctrlKey]);


    } else if (action === "remove") {
      
      if (idx >= 0 && idx < nOutputs) {
        // get output from output key using its index
        const output = node.outputs.get(Object.keys(ctrlsMap)[idx]);

        if( output ) {
          // remove mapped output control if it exists
          let ctrl = node.controls.get(ctrlsMap[output.key]);
          if( ctrl instanceof Rete.Control ) {
            node.removeControl(ctrl);  // remove control from node
          }
          // remove output->control mapping (if exists)
          newMappings.splice(idx, 1);
          // delete ctrlsMap[output.key];       

          // register each node with an input connected to the output being deleted
          output.connections.forEach((c: Rete.Connection): void => {
            c.input.node && nds.add(c.input.node);
          })

          // remove connections from view
          output.connections.map(c => editor.removeConnection(c));

          // remove output from node
          node.removeOutput(output);
        } else {
          console.error(`unexpected error: output at index "${idx}" not found`)
        }

      } else {
        console.error(`couldnt delete output form index, out of range "${idx}"`);
      }

    } else if (action === "moveUp") {

      if( idx > 0 && idx < nOutputs ) {
        // pop element out and move "up" (up on screen, down in list index)
        const m = newMappings[idx];
        newMappings.splice(idx, 1);
        newMappings.splice(idx - 1, 0, m);
      } else {
        // couldnt find element
        console.warn(`cant move output index up "${idx}"`);
      }

    } else if (action === "moveDown") {

      if( idx >= 0 && (idx + 1) < nOutputs ) {
        // pop element out and move "down" (down on screen, up in list index)
        // remove next element and insert behind 
        const m = newMappings[idx + 1];
        newMappings.splice(idx + 1, 1);
        newMappings.splice(idx, 0, m);
      } else {
        // couldnt find element
        console.warn(`cant move output index down "${idx}"`);
      }
    }
    // update output mappings
    Data.setOutputControls(node, Object.fromEntries(newMappings));

    // update node
    node.update();

    // for each affected node update its connections
    setTimeout(() => 
      nds.forEach(n => editor?.view.updateConnections({node: n})),
      10
    );

    // resolve promise
    res();

  });
}


/** change output sockets to a new type from `data` var and remove incompatible connections */
function typeSelection(
  node: Rete.Node, 
  ctrl: ControlBase, 
  emitter: Rete.NodeEditor, 
  key: string, 
  data: any
) {
  const selectedType: string = (data && typeof data === "string") ? data : "";
  Controls.ctrlValChange(ctrl, emitter, key, selectedType);
  
  let socket = (sockets.get(selectedType)?.socket ?? sockets.get("Any")?.socket) as Rete.Socket;
  if ( !( socket instanceof Rete.Socket ) ) {
    throw new Error("couldnt find 'Any' or selected socket");
  }

  node.outputs.forEach(o => {
    let invalidConnections = o.connections.filter(c => !socket.compatibleWith(c.input.socket));
    invalidConnections.forEach(c => emitter.removeConnection(c));
    o.socket = socket;
  })

  // update node and trigger re-render of connections
  node.update();
  setTimeout(() => 
    emitter.view.updateConnections({node}),
    10
  );
}


/** Dictionary display component - listOutputAction `hasOutputControls` set to true as dictionary outputs have text controls for keys */
class DisplayDict extends Display.DisplayListBase {
  action = (index: number, action: Display.ListAction) => listOutputAction(this.props.editor, this.props.node, index, action, true);
}


/** Display list component - listOutputAction `hasOutputControls` set to false as list outputs do not have have text input keys */
class DisplayList extends Display.DisplayListBase {
  action = (index: number, action: Display.ListAction) => listOutputAction(this.props.editor, this.props.node, index, action, false);
}


/** 
 * Advanced component - supports type selection, dynamic output list that can be extended and re-ordered (using `listOutputAction`) 
 * with `hasOutputControls` as true will render a text control next to each dynamic output
*/
export abstract class AdvancedComponentBase extends ComponentBase {
  abstract hasOutputControls: boolean;

  builder(node: Rete.Node): Promise<void> {
    const editor: Rete.NodeEditor | null = this.editor;
    return new Promise<void>(res => {
      editor && node
        .addInput(new Rete.Input("parent", "Parent", MySocket.dictSocket))
        .addControl(new Controls.ControlButton({
          emitter: editor,
          key: "Add Item", 
          value: null, // ignored
          buttonInner: "Add Item +", 
          valueChanger: () => listOutputAction(editor, node, node.outputs.size, "add", this.hasOutputControls)  // add output to end of output list
        }))
        .addControl(new Controls.ControlSelect({
          emitter: editor, 
          key: "Select Type", 
          value: Data.getInitial(node, "Select Type", "Any"), 
          options: typeLabels(), 
          valueChanger: (ctrl: ControlBase, emitter: Rete.NodeEditor, key: string, data: any) => typeSelection(node, ctrl, emitter, key, data)
        }));
      
      let outputCtrls = Data.getOutputControls(node);
      let ctrlData = Data.nGetData(node);
      let socket = (sockets.get(ctrlData["Select Type"])?.socket ?? sockets.get("Any")?.socket) as Rete.Socket;
      
      // loop output->control mappings
      Object.entries(outputCtrls).forEach(([outputKey, ctrlKey]) => {

        // add output using the output key
        node.addOutput(new Rete.Output(outputKey, outputKey, socket));

        // add control using mapped control key
        this.hasOutputControls && editor && node.addControl(new Controls.ControlText({
          key: ctrlKey,
          emitter: editor,
          value: ctrlData[ctrlKey]
        }));
      });

      /** show/hide type selection control */
      const setCtrlVisible = (visibility: Boolean) => {
        let ctrl = node.controls.get("Select Type");
        if( ctrl instanceof Controls.ControlSelect) {
          ctrl.props.style = {visibility: visibility ? "visible" : "hidden"};
          ctrl.update && ctrl.update();
        }
      } 

      /** on connection created, set selected type to parent specification (if exists) and hide type selection control */
      node.meta.connectionCreatedFunc = (input: Rete.Input, output: Rete.Output) => {
        if(input.key == "parent" && output.node) {
          let typeDefs = Data.getTypeDefinitions(output.node);
          let k = output.name;
          if( k in typeDefs ) {
            setCtrlVisible(false);
          }
        }
      }

      /** on connection removed, set selected type to control and show  */
      node.meta.connectionRemovedFunc = (input: Rete.Input) => {
        if(input.key == "parent") {
          setCtrlVisible(true);
        }
      }

      res();
    });
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
    // console.log('working...');
    // console.log(node);
    // console.log(inputs);
    // console.log(outputs);
    // console.log(args);
    // if(
    //   inputs.parent && 
    //   inputs.parent instanceof Array && 
    //   inputs.parent.length >= 1 && 
    //   inputs.parent[0].dictTypes instanceof Array) {
      
    //   let socket = Dynamic.multiSocket(inputs.parent[0].dictTypes)
    //   let selectCtrl =  "Select Type"

    //   inputs.parent[0].types
    //   console.log('found parent types')
    //   console.log(inputs.parent[0])
    // } else {
    //   console.log('no parent types found');
    // }
  }
}


/** Dictionary component - labelled dynamic outputs that can be re-ordered/modified  */
export class ComponentDict extends AdvancedComponentBase {
  hasOutputControls = true
  data = {component: DisplayDict}
  constructor() {	
      super('Dictionary');
  }
}


/** Same as dictionary component but without output controls */
export class ComponentList extends AdvancedComponentBase {
  hasOutputControls = false
  data = {component: DisplayList}
  constructor() {	
      super('List');
  }
}



export default {
  ComponentDict,
  ComponentList,
}