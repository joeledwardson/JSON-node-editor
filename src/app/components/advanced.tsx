import * as Rete from "rete";
import { ReteComponent } from "../../rete/component";
import { ReteControl } from "../../rete/control";
import * as MySocket from "../sockets/sockets";
import * as Controls from  "../controls/controls";
import { WorkerInputs, WorkerOutputs, NodeData } from "rete/types/core/data";
import * as Display from "./display";
import { v4 as uuidv4 } from 'uuid';
import * as Data from "../data/component";
import { TypeList, ComponentBase } from './basic';
import { OptionLabel } from "../controls/display";
import { VariableType } from "../data/component";
import { ctrlValChange } from "../controls/controls";



/** 
 * convert types to option label/value pairs with a blank at the start 
 * */
export function typeLabels(): Array<OptionLabel> {
  return [{
    label: "",
    value: ""
  }].concat(TypeList.map(v => ({
    label: v,
    value: v
  })));
}

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
    let socket = MySocket.sockets.get(selectedType)?.socket;
    
    
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


/** 
 * Dictionary display component - listOutputAction `hasOutputControls` set to true as dictionary outputs have text controls for keys 
 * */
class DisplayDict extends Display.DisplayListBase {
  action = (index: number, action: Display.ListAction) => listOutputAction(this.props.editor, this.props.node, index, action, true);
}


/** 
 * Display list component - listOutputAction `hasOutputControls` set to false as list outputs do not have have text input keys 
 * */
class DisplayList extends Display.DisplayListBase {
  action = (index: number, action: Display.ListAction) => listOutputAction(this.props.editor, this.props.node, index, action, false);
}


/** 
 * Change output sockets to a new type from `data` var and remove incompatible connections 
 * */
function socketUpdate(node: Rete.Node, emitter: Rete.NodeEditor, newSocket: Rete.Socket, ioList: Map<string, Rete.IO>) {
  ioList.forEach(io => {
    let invalidConnections = io.connections.filter(c => !newSocket.compatibleWith(c.input.socket));
    invalidConnections.forEach(c => emitter.removeConnection(c));
    io.socket = newSocket;
  })

  // update node and trigger re-render of connections
  node.update();
  setTimeout(() => 
    emitter.view.updateConnections({node}),
    10
  );
}


/** 
 * Process a control selecting a variable type by updating the control value and updating input/output sockets 
*/
function typeSelect(
  node: Rete.Node, 
  ctrl: ReteControl, 
  emitter: Rete.NodeEditor, 
  newType: any,
  ioMap: Map<string, Rete.IO>
): void {
  let socket = MySocket.sockets.get(newType)?.socket ?? MySocket.anySocket;
  Controls.ctrlValChange(ctrl, emitter, ctrl.key, socket.name);
  socketUpdate(node, emitter, socket, ioMap);
}

/**  
 * check node data for control value containing selected type to use in retrieving a socket
 * - if control data doesn't contain selected type of value is invalid, return the "any" type
 */
function getSelectedSocket(typ: string): Rete.Socket {
  return TypeList.includes(typ) ? (MySocket.sockets.get(typ)?.socket ?? MySocket.anySocket) : MySocket.anySocket;  
}



/** 
 * List component - supports type selection, dynamic output list that can be extended and re-ordered (using `listOutputAction`) 
 * with `hasOutputControls` as true will render a text control next to each dynamic output
*/
export abstract class ListComponentBase extends ComponentBase {
  abstract hasOutputControls: boolean;
  abstract socket: Rete.Socket;
  abstract getParentTypes(spec: VariableType): string[];
  readonly ctrlSelectKey = "Select Type";

  typeSelect(node: Rete.Node, ctrl: ReteControl, emitter: Rete.NodeEditor, newType: any) {
    typeSelect(node, ctrl, emitter, newType, node.outputs);
  }

  _builder(node: Rete.Node, editor: Rete.NodeEditor) {
    let ctrlData = Data.nGetData(node);
    let socket = getSelectedSocket(ctrlData[this.ctrlSelectKey]);
    let selectCtrl = new Controls.ControlSelect({
      emitter: editor, 
      key: this.ctrlSelectKey, 
      value: socket.name, 
      options: typeLabels(), 
      valueChanger: (ctrl: ReteControl, emitter: Rete.NodeEditor, key: string, data: any) => this.typeSelect(node, ctrl, emitter, data)
    });
    node
      .addInput(new Rete.Input("parent", "Parent", this.socket))
      .addControl(new Controls.ControlButton({
        emitter: editor,
        key: "Add Item", 
        value: null, // ignored
        buttonInner: "Add Item +", 
        valueChanger: () => listOutputAction(editor, node, node.outputs.size, "add", this.hasOutputControls)  // add output to end of output list
      }))
      .addControl(selectCtrl);
    
      
    // loop output->control mappings from node data
    let outputCtrls = Data.getOutputControls(node);
    Object.entries(outputCtrls).forEach(([outputKey, ctrlKey]) => {

      // add output using the output key
      node.addOutput(new Rete.Output(outputKey, outputKey, socket));

      // add control using mapped control key
      this.hasOutputControls && node.addControl(new Controls.ControlText({
        key: ctrlKey,
        emitter: editor,
        value: ctrlData[ctrlKey]
      }));
    });

    /** show/hide type selection control */
    const setCtrlVisible = (visibility: Boolean) => {
      selectCtrl.props.style = {display: visibility ? "block" : "none"};
      selectCtrl.update && selectCtrl.update();
    } 

    /** on connection created, set selected type to parent specification (if exists) and hide type selection control */
    let connectionCreatedFunc: Data.ConnectionFunc = (connection: Rete.Connection) => {
      let input = connection.input
      let output =  connection.output;
      if(input.node == node && input.key == "parent" && output.node) {
        let typeDefs = Data.getTypeDefinitions(output.node);
        let k = output.name;
        if( k in typeDefs ) {
          let typs = this.getParentTypes(typeDefs[k]);
          if( typs ) {
            let newSocket = MySocket.multiSocket(typs);
            this.typeSelect(node, selectCtrl, editor, newSocket.name);
            setCtrlVisible(false);
          }
        }
      }
    }

    /** on connection removed, set selected type to control and show  */
    let connectionRemovedFunc: Data.ConnectionFunc = (connection: Rete.Connection) => {
      if(connection.input.node == node && connection.input.key == "parent") {
        setCtrlVisible(true);
        this.typeSelect(node, selectCtrl, editor, "Any");
      }
    }

    Data.setConnectionFuncs(node, {"created": connectionCreatedFunc, "removed": connectionRemovedFunc});
  }
}


/** Dictionary component - labelled dynamic outputs that can be re-ordered/modified  */
export class ComponentDict extends ListComponentBase {
  hasOutputControls = true
  socket = MySocket.dictSocket;
  getParentTypes = (spec: VariableType) => spec.dictTypes ?? ['Any']
  data = {component: DisplayDict}
  constructor() {	
      super('Dictionary');
  }
}


/** Same as dictionary component but without output controls */
export class ComponentList extends ListComponentBase {
  hasOutputControls = false
  socket = MySocket.listSocket;
  getParentTypes = (spec: VariableType) => spec.listTypes ?? ['Any']
  data = {component: DisplayList}
  constructor() {	
      super('List');
  }
}


export class ComponentFunctionVar extends ReteComponent {
  constructor() {
    super('Function Variable');
  }
  readonly ctrlSelectKey = "Select Type";
  data = {component: Display.DisplayBase};
  builder(node: Rete.Node): Promise<void> {
    return new Promise<void>(res => {
      if( this.editor ) {
        let ctrlData = Data.nGetData(node);
        let socket = getSelectedSocket(ctrlData[this.ctrlSelectKey]);
        let selectCtrl = new Controls.ControlSelect({
          emitter: this.editor, 
          key: this.ctrlSelectKey, 
          value: socket.name, 
          options: typeLabels(), 
          valueChanger: (ctrl: ReteControl, emitter: Rete.NodeEditor, key: string, data: any) => typeSelect(node, ctrl, emitter, data, node.inputs)
        });

        let parent = new Rete.Input("parent", "Parent", socket);
        function processParent(i: Rete.Input, oldValue: string, value: string) {
          i.connections.forEach(c => {
            let n = c.output.node;
            if(n && n.name === 'Function Block') {
              let oldInput = n.inputs.get(oldValue);
              if(oldInput) {
                n.removeInput(oldInput);
              }
              if(!n.inputs.has(value)) {
                n.addInput(new Rete.Input(value, value, parent.socket));
                n.update && n.update();
              }
            } else {
              let p =  c.output.node?.inputs.get("parent");
              if( p ) {
                processParent(p, oldValue, value);
              }
            }
          })
        }
        function pls(ctrl: ReteControl, emitter: Rete.NodeEditor, key: string, data: any) {
          let oldVal = ctrl.props.value as string;  
          processParent(parent, oldVal as string, data as string);
          ctrlValChange(ctrl, emitter, key, data);
        }
        let nameCtrl = new Controls.ControlText({
          emitter: this.editor, 
          key: "name",
          value: ctrlData["name"] ?? "",
          valueChanger: pls
        });
        node
          .addControl(selectCtrl)
          .addInput(parent)
          .addControl(nameCtrl);
      }
      res();
    });
  }
  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
  }

}

export class ComponentFunctionBlock extends ComponentBase {
  constructor() {
    super('Function Block');
  }
  readonly ctrlSelectKey = "Select Type";
  data = {component: Display.DisplayBase};
  _builder(node: Rete.Node, editor: Rete.NodeEditor) {
    let ctrlData = Data.nGetData(node);
    let socket = getSelectedSocket(ctrlData[this.ctrlSelectKey]);
    let selectCtrl = new Controls.ControlSelect({
      emitter: editor, 
      key: this.ctrlSelectKey, 
      value: socket.name, 
      options: typeLabels(), 
      valueChanger: (ctrl: ReteControl, emitter: Rete.NodeEditor, key: string, data: any) => typeSelect(node, ctrl, emitter, data, node.outputs)
    });
    let nameCtrl = new Controls.ControlText({
      emitter: editor, 
      key: "name",
      value: ctrlData["name"] ?? ""
    })
    node
      .addControl(selectCtrl)
      .addOutput(new Rete.Output("output", "Output", socket))
      .addControl(nameCtrl);
      function nodeProcess(_node: Rete.Node) {
        if (_node.name === "Function Variable") {
          let _ctrl = _node.controls.get("Select Type");
          if(_ctrl) {
            let _type = String(_ctrl.data);
            if(!node.inputs.has(_type)) {
              let _socket = getSelectedSocket(_ctrl.data as string);
              node.addInput(new Rete.Input(_type, _type, _socket));
            }
          }
        }
        _node.outputs.forEach(o => o.connections.forEach(c => c.input.node && nodeProcess(c.input.node)));
      }
      function process() {
        node.inputs.forEach(i => node.removeInput(i));
        nodeProcess(node);
      }
    }
}


export default {
  ComponentDict,
  ComponentList,
}