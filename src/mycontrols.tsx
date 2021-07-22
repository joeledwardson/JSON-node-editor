import React from "react";
import { NodeEditor, Control } from "rete";
import { Form } from 'react-bootstrap';
import { ReteReactComponent } from "./mycomponents";

interface T {
  value: any
}

type ControlProps = {
    value: any;
    id: string;
    emitter: NodeEditor;
    valueChanger(key: string, data: unknown): void;
};


class MyBaseInput extends React.Component<ControlProps> {
  getInputType(): string {
    return "";
  }

  componentDidMount() {
    console.log(this.props);
    this.props.valueChanger(this.props.id, this.props.value);
  }
  


  onChange<Type extends T>(event: React.FormEvent<Type>) {
    this.props.valueChanger(this.props.id, event.currentTarget.value);
    this.props.emitter.trigger("process");
  }

  render() {
    return (
      <input type={this.getInputType()} className="input-group" value={this.props.value} onChange={(e) => this.onChange(e)} />
    );
  }
}


export class MyNumberInput extends MyBaseInput {
  getInputType = () => "number";
}

export class MyTextInput extends MyNumberInput {
  getInputType = () => "text";
}


export class MyBoolInput extends MyNumberInput {
  render() {
    return (
      <div>
        <Form.Select aria-label="Boolean Input" onChange={(e) => this.onChange<HTMLSelectElement>(e)}>
          <option>Select a value</option>
          <option value={1} selected={this.props.value === true}>True</option>
          <option value={0} selected={this.props.value === false}>False</option>
        </Form.Select>
      </div>
    )
  }
}



export class BaseControl extends Control {
  update?: () => Promise<void>; // update() is declared at load time by rete react render plugin implementation
  render?: "react";
  component: typeof React.Component; // "component" property must be specified for control, used to render Control (defined below) div inner
  constructor(component: typeof React.Component, key: string) {
    super(key);
    this.component = component;
  }
}


export class MyControl extends BaseControl {
    props: ControlProps;

    // function to update control value passed into react component itself
    controlValueChange(key: string, data: unknown): void {
      this.props.value = data;  // update props value used to update control value when re-rendering
      this.putData(key, data);  //  put into node data objects for connections
      this.update && this.update();  // re-render
    }

    constructor(emitter: NodeEditor, key: string, value: any, controlComponent: typeof MyBaseInput) {
        super(controlComponent, key);
        this.props = {
            emitter,
            id: key,
            value,
            valueChanger: (key: string, data: unknown) => this.controlValueChange(key, data)
        };
    }
}