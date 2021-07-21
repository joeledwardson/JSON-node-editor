import React from "react";
import { NodeEditor, Control } from "rete";


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


export class ReteReactControl extends Control {
  update?: () => Promise<void>; // update() is declared at load time by rete react render plugin implementation
  render?: "react";
  component: typeof React.Component; // "component" property must be specified for control, used to render Control (defined below) div inner
  constructor(component: typeof React.Component, key: string) {
    super(key);
    this.component = component;
  }
}


export class MyControl extends ReteReactControl {
    props: ControlProps;

    // function to update control value passed into react component itself
    controlValueChange(key: string, data: unknown): void {
      this.props.value = data;  // update props value used to update control value when re-rendering
      this.putData(key, data);  //  put into node data objects for connections
      this.update && this.update();  // re-render
    }

    constructor(emitter: NodeEditor, key: string, value: number) {
        super(MyReactControl, key);
        this.props = {
            emitter,
            id: key,
            value,
            valueChanger: (key: string, data: unknown) => this.controlValueChange(key, data)
        };
    }
}