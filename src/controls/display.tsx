import React, { MouseEvent } from "react";
import { NodeEditor, Control } from "rete";
import { Form } from 'react-bootstrap';
import { ReteControlBase } from "../rete/control";
import { Button } from "react-bootstrap";
import TextareaAutosize from 'react-textarea-autosize';
import { CSSProperties } from 'react';

/** base interface for any HTML element with a "value" attribute */
interface HTMLTarget {
  value?: any
}

/** props passed to control input React components */
export interface InputProps {
    value: any;
    id: string;
    emitter: NodeEditor;
    valueChanger: (key: string, data: unknown) => void;
    style?: CSSProperties;
    className?: string
};

/** value & label pairs displayed in select options */
export type OptionLabel = {
    label: string, 
    value: string | number
}

/** props passed to input selection also include options to display */
export interface SelectProps extends InputProps {
  options: Array<OptionLabel>
}

export interface ButtonProps extends InputProps {
  buttonInner: string | JSX.Element
}

// React component classes used in controls for entering data
export class InputBase<T extends InputProps, S={}> extends React.Component<T, S> {
  componentDidMount = () => this.props.valueChanger(this.props.id, this.props.value)
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


export class InputNumber extends InputBase<InputProps> {
  render() {
    return (
      <input 
        type="number" 
        {...this.baseRenderKwargs()}
      />
    );
  }
}


export class InputText extends InputBase<InputProps> {
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


export class InputBool extends InputBase<InputProps> {
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


export class InputSelect extends InputBase<SelectProps> {
  render() {
    const typeList: Array<OptionLabel> = [
        {value: "", label: "Select a type..."},
         ...this.props.options
    ];
    return (
      <Form.Select 
        aria-label="Select" 
        onChange={(e) => this.onChange<HTMLSelectElement>(e)}
        value={this.props.value ?? ""}
        className={this.props.className}
      >
        {typeList.map(opt =>
            <option 
                key={opt.value} 
                value={opt.value}
            >{opt.label}</option>
        )}
      </Form.Select>
    )
  }
}


// react button component
type HTMLEvent = React.ChangeEvent<HTMLSelectElement>;
export class InputButton extends InputBase<ButtonProps, {clickCount: number}> {

  constructor(props: ButtonProps) {
    super(props);
    this.state = {
      clickCount: 0
    }
  }

  onChange() {
    this.setState((state) => ({clickCount: state.clickCount + 1}));
    this.props.valueChanger(this.props.id, event.currentTarget.value);
    this.props.emitter.trigger("process");
  }

  render() {
    return (
      <Button onClick={(e) => this.props.onButtonClick()}>{this.props.buttonInner}</Button>
    );
  }
}