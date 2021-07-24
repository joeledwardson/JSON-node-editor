import React from "react";
import { NodeEditor, Control } from "rete";
import { Form } from 'react-bootstrap';
import { ReteControlBase } from './rete-react';
import { Button } from "react-bootstrap";
import TextareaAutosize from 'react-textarea-autosize';

// base interface for any HTML element with a "value" attribute
interface HTMLTarget {
  value: any
}

// props passed to control input React components
interface CtrlInputProps {
    value: any;
    id: string;
    emitter: NodeEditor;
    valueChanger: (key: string, data: unknown) => void;
};

// React component classes used in controls for entering data
export class CtrlDisplayBase<T extends CtrlInputProps> extends React.Component<T> {
  getInputType(): string {
    return "";
  }

  componentDidMount() {
    console.log(this.props);
    this.props.valueChanger(this.props.id, this.props.value);
  }

  onChange<Type extends HTMLTarget>(event: React.FormEvent<Type>) {
    this.props.valueChanger(this.props.id, event.currentTarget.value);
    this.props.emitter.trigger("process");
  }

  render() {
    return (
      <input 
        type={this.getInputType()} 
        className="input-group" 
        value={this.props.value} 
        onChange={(e) => this.onChange(e)}
      />
    );
  }
}

export class CtrlDisplayNumber extends CtrlDisplayBase<CtrlInputProps> {
  getInputType = () => "number";
}

export class CtrlDisplayText extends CtrlDisplayBase<CtrlInputProps> {
  render() {
    return (
      <TextareaAutosize
        rows={1}
        autoFocus
        className="input-group" 
        value={this.props.value} 
        onChange={(e) => this.onChange(e)}
      />
    );
  }
}

export class CtrlDisplayBool extends CtrlDisplayBase<CtrlInputProps> {
  render() {
    return (
      <div>
        <Form.Select 
          aria-label="Boolean Input" 
          onChange={(e) => this.onChange<HTMLSelectElement>(e)}
          value={this.props.value}
        >
          <option>Select a value</option>
          <option value={1} >True</option>
          <option value={0} >False</option>
        </Form.Select>
      </div>
    )
  }
}

// Rete Control class for handling some input which is used to update node data
export class ControlBase extends ReteControlBase {
    props: CtrlInputProps;

    // function to update control value passed into react component itself
    controlValueChange(key: string, data: unknown): void {
      this.props.value = data;  // update props value used to update control value when re-rendering
      this.putData(key, data);  //  put into node data objects for connections
      this.update && this.update();  // re-render
    }

    constructor(
      emitter: NodeEditor, 
      key: string, 
      value: any, 
      controlComponent: typeof CtrlDisplayBase, 
    ) {
        super(controlComponent, key);
        this.props = {
            emitter,
            id: key,
            value,
            valueChanger: (key: string, data: unknown) => this.controlValueChange(key, data)
        };
    }
}

export class ControlNumber extends ControlBase {
  constructor(emitter: NodeEditor, key: string, value: any) {
    super(emitter, key, value, CtrlDisplayNumber);
  }
}

export class ControlText extends ControlBase {
  constructor(emitter: NodeEditor, key: string, value: any) {
    super(emitter, key, value, CtrlDisplayText);
  }
}

export class ControlBool extends ControlBase {
  constructor(emitter: NodeEditor, key: string, value: any) {
    super(emitter, key, value, CtrlDisplayBool);
  }
}

interface CtrlSelectProps extends CtrlInputProps {
  options: Array<{label: string, value: string | number}>
}
export class CtrlDisplaySelect extends CtrlDisplayBase<CtrlSelectProps> {
  render() {
    return (
      <div>
        <Form.Select 
          aria-label="Select" 
          onChange={(e) => this.onChange<HTMLSelectElement>(e)}
          value={this.props.value}
        >
          {this.props.options.map(opt => {
            <option value={opt.value}>{opt.label}</option>
          })}
        </Form.Select>
      </div>
    )
  }
}
export class ControlSelect extends ControlBase {
  props: CtrlSelectProps
  constructor(
    emitter: NodeEditor, 
    key: string, 
    value: any,
    options: Array<{label: string, value: string | number}>
  ) {
    super(emitter, key, value, CtrlDisplaySelect);
    this.props = {
        emitter,
        id: key,
        value,
        valueChanger: (key: string, data: unknown) => this.controlValueChange(key, data),
        options: options
    };
  }
}


// ********************************************** button **********************************
// props passed to control react button
interface CtrlButtonprops {
  buttonInner: string | JSX.Element
  onButtonClick: () => void;
}

// react button component
export class CtrlDisplayButton extends React.Component<CtrlButtonprops> {
  render() {
    return (
      <Button onClick={(e) => this.props.onButtonClick()}>{this.props.buttonInner}</Button>
    );
  }
}

// rete control class for holding a button object
export class ControlButton extends ReteControlBase {
  props: CtrlButtonprops;
  constructor( 
      key: string, 
      buttonInner: string | JSX.Element, 
      onButtonClick: () => void,
      componentType: typeof React.Component = CtrlDisplayButton
  ) {
      super(componentType, key);
      this.props = {
          buttonInner: buttonInner,
          onButtonClick: onButtonClick
      }
  }
}