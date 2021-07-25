import React from "react";
import { NodeEditor, Control } from "rete";
import { Form } from 'react-bootstrap';
import { ReteControlBase } from './rete/rete-react';
import { Button } from "react-bootstrap";
import TextareaAutosize from 'react-textarea-autosize';
import { CSSProperties } from 'react';

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
    style?: CSSProperties;
    className?: string
};

// React component classes used in controls for entering data
export class CtrlDisplayBase<T extends CtrlInputProps> extends React.Component<T> {
  componentDidMount() {
    console.log(this.props);
    this.props.valueChanger(this.props.id, this.props.value);
  }
  onChange<Type extends HTMLTarget>(event: React.FormEvent<Type>) {
    this.props.valueChanger(this.props.id, event.currentTarget.value);
    this.props.emitter.trigger("process");
  }
  baseRenderKwargs() {
    return {
      style: this.props.style,
      className: "control-input input-group " + (this.props.className ?? ""),
      value: this.props.value,
      onChange: <Type extends HTMLTarget>(e: React.FormEvent<Type>) => this.onChange(e)
    }
  }
}

export class CtrlDisplayNumber extends CtrlDisplayBase<CtrlInputProps> {
  render() {
    return (
      <input 
        type="number" 
        {...this.baseRenderKwargs()}
      />
    );
  }
}

export class CtrlDisplayText extends CtrlDisplayBase<CtrlInputProps> {
  render() {
    const baseKwargs = {...this.baseRenderKwargs(), style: undefined} // dont pass style as textarea doesn't accept CSSProperties?
    return (
      <TextareaAutosize
        rows={1}
        autoFocus
        {...baseKwargs}
      />
    );
  }
}

export class CtrlDisplayBool extends CtrlDisplayBase<CtrlInputProps> {
  render() {
    return (
      <select
        {...this.baseRenderKwargs()}
        aria-label="Boolean Input" 
      >
        <option></option>
        <option className="bold-input" value={1} >True</option>
        <option className="bold-input" value={0} >False</option>
      </select>
    )
  }
}

// Rete Control class for handling some input which is used to update node data
export class ControlBase extends ReteControlBase {
    props: CtrlInputProps;

    // function to update control value passed into react component itself
    controlValueChange(key: string, data: any): void {
      this.props.value = data;  // update props value used to update control value when re-rendering
      this.putData(key, data);  //  put into node data objects for connections
      this.update && this.update();  // re-render
    }

    constructor(
      emitter: NodeEditor, 
      key: string, 
      value: any, 
      controlComponent: typeof CtrlDisplayBase, 
      style?: CSSProperties,
      className?: string,
    ) {
        super(controlComponent, key);
        this.props = {
            emitter,
            id: key,
            value,
            valueChanger: (key: string, data: unknown) => this.controlValueChange(key, data),
            style,
            className,
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

export type OptionLabel = {label: string, value: string | number}
interface CtrlSelectProps extends CtrlInputProps {
  options: Array<OptionLabel>
}
export class CtrlDisplaySelect extends CtrlDisplayBase<CtrlSelectProps> {
  render() {
    const typeList: Array<OptionLabel> = [{value: "", label: "Select a type..."}, ...this.props.options];
    return (
      <Form.Select 
        aria-label="Select" 
        onChange={(e) => this.onChange<HTMLSelectElement>(e)}
        value={this.props.value ?? ""}
        className={this.props.className}
      >
        {typeList.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </Form.Select>
    )
  }
}
export class ControlSelect extends ControlBase {
  props: CtrlSelectProps
  constructor(
    emitter: NodeEditor, 
    key: string, 
    value: any,
    options: Array<OptionLabel>,
    valueChanger?: (control: ReteControlBase,  key: string, data: any) => void,
    className?: string
  ) {
    super(emitter, key, value, CtrlDisplaySelect);
    let _valueChanger = (key: string, data: any) => this.controlValueChange(key, data);
    if( valueChanger)  {
      _valueChanger = (key: string, data: any) => valueChanger(this, key, data);
    }
    this.props = {
        emitter,
        id: key,
        value,
        valueChanger: _valueChanger,
        options: options,
        className
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

export default {
  ControlBase,
  ControlNumber,
  ControlText,
  ControlBool,
  ControlSelect,
  ControlButton,
}