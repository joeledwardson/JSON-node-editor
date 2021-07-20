import React, { useState, useEffect, useCallback, useRef, ComponentProps } from "react";
import Rete, {Node, Emitter,  NodeEditor, Output} from "rete";
import { Component } from "rete/types/engine";
import { EventsTypes } from "rete/types/core/events";
import { Plugin } from "rete/types/core/plugin";
import {WorkerInputs, WorkerOutputs, NodeData} from "rete/types/core/data";
import { NumComponent, AddComponent } from "./mycomponents";


const ReactRenderPlugin: any = require("rete-react-render-plugin");
const AreaPlugin: any = require("rete-area-plugin");
const ConnectionPlugin: any = require("rete-connection-plugin");
const ContextAreaPlugin: any = require("rete-context-menu-plugin").default;



export var numSocket = new Rete.Socket("Number value");

// declare abstract class MyComponent extends Rete.Component {
//   my_builder(node: Node): Node;
//   builder(node: Node): Promise<void> {
//     this.my_builder(node);
//     return new Promise<void>((res) => ;
//   }
// }


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

export async function createEditor(container: HTMLElement) {
  var components = [new NumComponent(), new AddComponent()];

  console.log("creating editor...");
  var editor = new Rete.NodeEditor("demo@0.1.0", container);
  editor.use(ConnectionPlugin.default);
  editor.use(ReactRenderPlugin.default);
  editor.use(ContextAreaPlugin, {
    scaleExtent: true,
    translateExtent: true
  });

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
