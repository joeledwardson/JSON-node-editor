import React, { useState, useEffect, useCallback, useRef, ComponentProps } from "react";
import Rete, {Node, Emitter,  NodeEditor, Output} from "rete";
import { MyControl } from "./control";
import { Component } from "rete/types/engine";
import { EventsTypes } from "rete/types/core/events";
import { Plugin } from "rete/types/core/plugin";
import {WorkerInputs, WorkerOutputs, NodeData} from "rete/types/core/data";


const ReactRenderPlugin: any = require("rete-react-render-plugin");
const AreaPlugin: any = require("rete-area-plugin");
const ConnectionPlugin: any = require("rete-connection-plugin");


var numSocket = new Rete.Socket("Number value");

class NumControl extends Rete.Control {
  emitter: NodeEditor;
  component: (value: any, onChange: any) => JSX.Element;
  update: any;

  props: {
    readonly: boolean,
    value: any,
    onChange: (v: any) => void
  }


  
  static component = (o: {value: any, onChange: any}) => {
    return <input
      type="number"
      value={o.value}
      ref={(ref) => {
        ref && ref.addEventListener("pointerdown", (e) => e.stopPropagation());
      }}
      onChange={
        (e: React.FormEvent<HTMLInputElement>) => o.onChange(Number(e.currentTarget.value))
      }
    />
  }

  constructor(emitter: NodeEditor, key: string, node: Node, readonly: boolean = false) {
    super(key);
    this.emitter = emitter;
    this.key = key;
    this.component = NumControl.component;

    const initial = node.data[key] || 0;

    node.data[key] = initial;
    this.props = {
      readonly,
      value: initial,
      onChange: (v) => {
        this.setValue(v);
        this.emitter.trigger("process");
      }
    };
  }

  setValue(val: any) {
    this.props.value = val;
    this.putData(this.key, val);
    this.update();
  }
}

class NumComponent extends Rete.Component {
  constructor() {
    super("Number");
  }

  builder(node: Node): Node {
    console.log("running Number builder...");
    var out1 = new Rete.Output("num", "Number", numSocket);
    if (this.editor) {
      var ctrl = new MyControl(this.editor, "num", "hello");
      return node.addControl(ctrl).addOutput(out1);
    }
    return node;    
  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
    outputs["num"] = node.data.num;
  }
}



class AddComponent extends Rete.Component {

  constructor() {
    super("Add");
    // this.data.component = MyNode; // optional
  }

  builder(node: Node): Node {
  
    console.log("running add builder...");
    var inp1 = new Rete.Input("num1", "Number", numSocket);
    var inp2 = new Rete.Input("num2", "Number2", numSocket);
    var out = new Rete.Output("num", "Number", numSocket);

    if (this.editor) {
      inp1.addControl(new NumControl(this.editor, "num1", node));
      inp2.addControl(new NumControl(this.editor, "num2", node));

      return node
        .addInput(inp1)
        .addInput(inp2)
        .addControl(new NumControl(this.editor, "preview", node, true))
        .addOutput(out);
    } else {
      console.warn("editor is null");
      return node;
    }

  }

  worker(node: NodeData, inputs: WorkerInputs, outputs: WorkerOutputs, ...args: unknown[]): void {
    let n1: number = (inputs["num1"].length ? inputs["num1"][0] : node.data.num1) as number;
    let n2: number = (inputs["num2"].length ? inputs["num2"][0] : node.data.num2) as number;
    let sum: number = n1 + n2;

    if(this.editor) {
      (this.editor.nodes
      .find((n) => n.id == node.id)?.controls.
      get("preview") as NumControl)?.setValue(sum);
      outputs["num"] = sum;
    }

  }
}

export async function createEditor(container: HTMLElement) {
  var components = [new NumComponent(), new AddComponent()];

  console.log("creating editor...");
  var editor = new Rete.NodeEditor("demo@0.1.0", container);
  editor.use(ConnectionPlugin.default);
  editor.use(ReactRenderPlugin.default);

  var engine = new Rete.Engine("demo@0.1.0");

  components.map((c) => {
    editor.register(c);
    engine.register(c);
  });

  var n1 = await components[0].createNode({ num: 2 });
  var n2 = await components[0].createNode({ num: 3 });
  var add = await components[1].createNode();

  n1.position = [80, 200];
  n2.position = [80, 400];
  add.position = [500, 240];

  editor.addNode(n1);
  editor.addNode(n2);
  editor.addNode(add);

  function editorConnect(o: string, i: string): void  {
    const o1 = n1.outputs.get(o);
    const i1 = add.inputs.get(i);
    if (o1 && i1) {
      editor.connect(o1, i1);
    } else {
      console.warn(`couldnt get input "${i}"/output "${o}"`);
    }
  }

  editorConnect("num", "num1");
  editorConnect("num", "num2");

  editor.on(
    ["process", "nodecreated", "noderemoved", "connectioncreated", "connectionremoved"],
    async () => {
      console.log("process");
      await engine.abort();
      await engine.process(editor.toJSON());
    }
  );

  editor.view.resize();
  editor.trigger("process");
  AreaPlugin.default.zoomAt(editor, editor.nodes);
  console.log("finished creating editor...");

  return editor;
}
