import React from "react";
import Rete, {Node, NodeEditor} from "rete";
export var numSocket = new Rete.Socket("Number value");


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
  