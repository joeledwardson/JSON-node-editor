import React, { FormEventHandler } from "react";
import { NodeEditor } from "rete";
import { Control } from "rete";

type ControlProps = {
    value: any;
    id: string;
    emitter: NodeEditor;
    valueChanger(key: string, data: unknown): void;
};

class MyReactControl extends React.Component<ControlProps> {
  componentDidMount() {
    console.log(this.props);
    this.props.valueChanger(this.props.id, this.props.value);
  }
  onChange(event: React.FormEvent<HTMLInputElement>) {
    this.props.valueChanger(this.props.id, event.currentTarget.value);
    this.props.emitter.trigger("process");
  }

  render() {
    return (
      <input type="number" value={+this.props.value} onChange={(e) => this.onChange(e)} />
    );
  }
}

export class MyControl extends Control {
    
    component: typeof MyReactControl;

    // update() is declared at load time by rete react render plugin implementation
    update: any;
    props: ControlProps;

    // function to update control value passed into react component itself
    controlValueChange(key: string, data: unknown): void {
      this.props.value = data;  // update props value used to update control value when re-rendering
      this.putData(key, data);  //  put into node data objects for connections
      this.update();  // re-render
    }

    constructor(emitter: NodeEditor, key: string, value: number) {
        super(key);
        this.component = MyReactControl;
        this.props = {
            emitter,
            id: key,
            value,
            valueChanger: (key: string, data: unknown) => this.controlValueChange(key, data)
        };
    }
}