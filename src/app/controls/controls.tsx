import { ReteReactControl as ReteControlBase } from "rete-react-render-plugin";
import { Node, NodeEditor } from "rete";
import { cGetData, nGetData } from "../data/attributes";
import * as React from "react";
import { Form, Button } from 'react-bootstrap';
import TextareaAutosize from 'react-textarea-autosize';
import { CSSProperties } from 'react';


/** 
 * function to update control value passed into react component itself 
 * */
type DataHandler = (ctrl: ReteControlBase, emitter: NodeEditor, key: string, data: any) => void;


/**
 * default function for value changes
 * set control instance props value so react control updates on re-render, and update node data
 */
export const ctrlValChange: DataHandler = (ctrl: ReteControlBase, emitter: NodeEditor, key: string, data: any): void => {
  ctrl.props.value = data;  // update props value used to update control value when re-rendering
  ctrl.data = data; // TODO - this is necessary?
  cGetData(ctrl)[key] = data;  //  put into node data objects for connections
  ctrl.update && ctrl.update();  // re-render
}

/**
 * control value changes processor - calls value change function and triggers emitter
 */
export const ctrlValProcess: DataHandler = (ctrl: ReteControlBase, emitter: NodeEditor, key: string, data: any): void => {
  ctrlValChange(ctrl, emitter, key, data);
  emitter.trigger('process');  // trigger process so that connected nodes update
}


export function getValueChanger(control: ReteControlBase, emitter: NodeEditor, key: string, dataHandler?: DataHandler) {
  if(dataHandler) {
    return (data: unknown) => dataHandler(control, emitter, key, data)
  } else {
    return (data: unknown) => ctrlValProcess(control, emitter, key, data)
  }
}


/** base interface for any HTML element with a "value" attribute */
interface HTMLTarget {
  value?: any
}

/** props passed to control input React components */
export interface InputProps {
    value: any;
    valueChanger?: (data: unknown) => void;
    style?: CSSProperties;
    className?: string;
    componentDidMount?: () => void;
    display_disabled?: boolean;
};


export function baseRenderKwargs(props: InputProps) {
  return {
    style: props.style,
    className: "control-input input-group " + (props.className ?? ""),
    value: props.value,
    onChange: <Type extends HTMLTarget>(e: React.FormEvent<Type>) => props.valueChanger && props.valueChanger(e.currentTarget.value),
    disabled: props.display_disabled ? true : undefined
  }
}

export abstract class ControlTemplate2<T extends InputProps> extends ReteControlBase {
  props: T
  constructor(key: string,  emitter: NodeEditor, node: Node, componentProps: T, dataHandler?: DataHandler) {
    super(key)
    componentProps.valueChanger = getValueChanger(this, emitter, key, dataHandler);
    this.props = componentProps;
    nGetData(node)[key] = this.props.value;
  }
}

/** input element only accepting numbers, when editing calls `props.valueChanger()` with the number in input */
export class InputNumber extends React.Component<InputProps> {
  render() {
    return (
      <input 
        type="number" 
        {...baseRenderKwargs(this.props)}
      />
    );
  }
}
export class ControlNumber extends ControlTemplate2<InputProps> {
  component = InputNumber
}


/** autosizing textarea element, when editing calls `props.valueChanger()` with text in textarea element  */
export class InputText extends React.Component<InputProps> {
  render() {
    let inputKwargs = baseRenderKwargs(this.props);
    // dont pass style as textarea doesn't accept CSSProperties?
    // return <textarea {...inputKwargs} />
    return (
      <TextareaAutosize
        rows={1}
        autoFocus
        {...inputKwargs}
        style={null}
      />
    );
    // return <div></div>
  }
}
export class ControlText extends ControlTemplate2<InputProps> {
  component = InputText
}


/** select input with (blank, true, false) options - on select change calls `props.valueChanger()` with either blank, 1 or 0 
 * (cannot use boolean values in html so true/false are 1/0) */
export class InputBool extends React.Component<InputProps> {
  render() {
    return (
      <select
        {...baseRenderKwargs(this.props)}
      >
        <option className="bold-input" value={""}></option>
        <option className="bold-input" value={1} >True</option>
        <option className="bold-input" value={0} >False</option>
      </select>
    )
  }
}
export class ControlBool extends ControlTemplate2<InputProps> {
  component = InputBool
}


/** select input where the options are passed in the constructor - on select change calls `props.valueChanger()` with key of option selected */
/** value & label pairs displayed in select options */
export type OptionLabel = {
  label: string, 
  value: string | number
}
/** select element props also include options to display */
export interface SelectProps extends InputProps {
options: Array<OptionLabel>
}
export class InputSelect extends React.Component<SelectProps> {
  render() {
    return (
      <Form.Select 
        aria-label="Select"
        {...baseRenderKwargs(this.props)}
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
export class ControlSelect extends ControlTemplate2<SelectProps> {
  component = InputSelect
}


/** button whose body is suppoed through `props.buttonInner` - on click calls `props.valueChanger` with number of clicks */
/** button props also include string/element to display in button */
export interface ButtonProps extends InputProps {
  buttonInner: string | JSX.Element
}
export class InputButton extends React.Component<ButtonProps, {clickCount: number}> {
  constructor(props: ButtonProps) {
    super(props);
    this.state = {
      clickCount: 0
    }
  }
  componentDidMount = () => this.props.componentDidMount && this.props.componentDidMount()  // dont need to set value on component loaded
  
  onClick() {
    this.setState((state) => ({clickCount: state.clickCount + 1}));
    let vc = this.props.valueChanger;
    vc && vc(this.state.clickCount);
  }
  
  render() {
    let inputKwargs = {
      ...baseRenderKwargs(this.props),
      onClick: () => this.onClick()
    }
    delete inputKwargs.value;
    delete inputKwargs.onChange;
    // value not needed for button, onChange replaced with onClick
    return (
      <Button {...inputKwargs}>{this.props.buttonInner}</Button>
    );
  }
}
// rete control class for holding a button object
export class ControlButton extends ControlTemplate2<ButtonProps> {
  component = InputButton
}



const _default = {
  ControlBase: ReteControlBase,
  ControlNumber,
  ControlText,
  ControlBool,
  ControlSelect,
  ControlButton,
};
export default _default;