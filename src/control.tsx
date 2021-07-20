import React, { FormEventHandler } from "react";
import { NodeEditor } from "rete";
import { Control } from "rete";

type ControlProps = {
    name: string;
    id: string;
    emitter: NodeEditor;
    putData(key: string, data: unknown): void;
};
type MyState = {
    name: string; // like this
};

class MyReactControl extends React.Component<ControlProps, MyState> {

  constructor(props: ControlProps) {
      super(props)
      this.state = {
        name: props.name
      }
  }
  componentDidMount() {
    this.setState({
      name: this.props.name
    });
    console.log(this.props);
    this.props.putData(this.props.id, this.props.name);
  }
  onChange(event: React.FormEvent<HTMLInputElement>) {
    this.props.putData(this.props.id, event.currentTarget.value);
    this.props.emitter.trigger("process");
    this.setState({
      name: event.currentTarget.value
    });
  }

  render() {
    return (
      <input value={this.state.name} onChange={(e) => this.onChange(e)} />
    );
  }
}

export class MyControl extends Control {
    // render: string;
    component: any;
    props: {
        emitter: NodeEditor;
        id: string;
        name: string;
        putData: () => any;
    }

    constructor(emitter: NodeEditor, key: string, name: string) {
        super(key);
        // this.render = "react";
        this.component = MyReactControl;
        this.props = {
            emitter,
            id: key,
            name,
            putData: () => this.putData.apply(this, arguments as any)
        };
    }
}