import React from "react";
import { Form, Button } from 'react-bootstrap';
import TextareaAutosize from 'react-textarea-autosize';
import { CSSProperties } from 'react';

/** base interface for any HTML element with a "value" attribute */
interface HTMLTarget {
  value?: any
}

/** props passed to control input React components */
export interface InputProps {
    value: any;
    valueChanger: (data: unknown) => void;
    style?: CSSProperties;
    className?: string;
    componentDidMount?: () => void;
};

/** value & label pairs displayed in select options */
export type OptionLabel = {
    label: string, 
    value: string | number
}

/** select element props also include options to display */
export interface SelectProps extends InputProps {
  options: Array<OptionLabel>
}

/** button props also include string/element to display in button */
export interface ButtonProps extends InputProps {
  buttonInner: string | JSX.Element
}


/** base class for display controls - sends value update on mount and provides function base base kwagrs to pass to JSX element in render */
export class InputBase<T extends InputProps, S={}> extends React.Component<T, S> {
  componentDidMount = () => this.props.componentDidMount ? this.props.componentDidMount() : this.props.valueChanger(this.props.value);  // on mount, update node with props value (needed?)
  
  baseRenderKwargs() {
    return {
      style: this.props.style,
      className: "control-input input-group " + (this.props.className ?? ""),
      value: this.props.value,
      onChange: <Type extends HTMLTarget>(e: React.FormEvent<Type>) => this.props.valueChanger(e.currentTarget.value)
    }
  }
}

/** input element only accepting numbers, when editing calls `props.valueChanger()` with the number in input */
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

/** autosizing textarea element, when editing calls `props.valueChanger()` with text in textarea element  */
export class InputText extends InputBase<InputProps> {
  render() {
    const inputKwargs = {
      ...this.baseRenderKwargs(), 
      style: undefined
    } // dont pass style as textarea doesn't accept CSSProperties?
    return (
      <TextareaAutosize
        rows={1}
        autoFocus
        {...inputKwargs}
      />
    );
  }
}

/** select input with (blank, true, false) options - on select change calls `props.valueChanger()` with either blank, 1 or 0 
 * (cannot use boolean values in html so true/false are 1/0) */
export class InputBool extends InputBase<InputProps> {
  render() {
    return (
      <select
        {...this.baseRenderKwargs()}
      >
        <option></option>
        <option className="bold-input" value={1} >True</option>
        <option className="bold-input" value={0} >False</option>
      </select>
    )
  }
}

/** select input where the options are passed in the constructor - on select change calls `props.valueChanger()` with key of option selected */
export class InputSelect extends InputBase<SelectProps> {
  render() {
    return (
      <Form.Select 
        aria-label="Select"
        {...this.baseRenderKwargs()} 
      >
        {this.props.options.map(opt =>
            <option 
                key={opt.value} 
                value={opt.value}
            >{opt.label}</option>
        )}
      </Form.Select>
    )
  }
}


/** button whose body is suppoed through `props.buttonInner` - on click calls `props.valueChanger` with number of clicks */
export class InputButton extends InputBase<ButtonProps, {clickCount: number}> {
  constructor(props: ButtonProps) {
    super(props);
    this.state = {
      clickCount: 0
    }
  }

  componentDidMount = () => this.props.componentDidMount && this.props.componentDidMount()  // dont need to set value on component loaded
  
  onClick() {
    this.setState((state) => ({clickCount: state.clickCount + 1}));
    this.props.valueChanger(this.state.clickCount);
  }
  
  render() {
    const inputKwargs = {
      ...this.baseRenderKwargs(), 
      value: undefined, 
      onChange: undefined,
      onClick: () => this.onClick()
    }  // value not needed for button, onChange replaced with onClick
    return (
      <Button {...inputKwargs}>{this.props.buttonInner}</Button>
    );
  }
}