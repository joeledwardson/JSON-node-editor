import { ReteReactControl as ReteControlBase } from "rete-react-render-plugin";
import { Node, NodeEditor } from "rete";
import { getControlsData } from "../data/attributes";
import * as React from "react";
import { Form, Button } from 'react-bootstrap';
import TextareaAutosize from 'react-textarea-autosize';
import { CSSProperties } from 'react';
import Select from 'react-select';
import {OnChangeValue} from 'react-select'


/** 
 * function to update control value passed into react component itself 
 * */
type DataHandler = (ctrl: ReteControlBase, emitter: NodeEditor, key: string, data: any) => void;


/**
 * default function for value changes
 * set control instance props value so react control updates on re-render, and update node data
 * N.B. this function should be used over ctrlValProcess() to avoid entering infinite loop if control triggers emitter 'process'
 */
export const ctrlValChange: DataHandler = (ctrl: ReteControlBase, emitter: NodeEditor, key: string, data: any): void => {
  ctrl.props.value = data;  // update props value used to update control value when re-rendering
  getControlsData(ctrl.getNode())[key] = data;  //  put into node data objects for connections
  ctrl.update && ctrl.update();  // re-render
}

/**
 * control value changes processor - calls value change function and triggers emitter
 */
export const ctrlValProcess: DataHandler = (ctrl: ReteControlBase, emitter: NodeEditor, key: string, data: any): void => {
  ctrlValChange(ctrl, emitter, key, data);
  // emitter.trigger('process');  // trigger process so that connected nodes update
}


/** base interface for any HTML element with a "value" attribute */
interface HTMLTarget {
  value?: any
}

/** props passed to control input React components */
export interface InputProps {
    value: any; // initial value for control
    valueChanger?: (data: unknown) => void; // custom handling of user entering new value in control
    style?: CSSProperties; 
    className?: string; // CSS class names
    componentDidMount?: () => void;
    display_disabled?: boolean; // set to true to disable display
};

/** base render arguments to pass to react render control components */
export function baseRenderKwargs(props: InputProps) {
  return {
    style: props.style,
    className: "control-input input-group " + (props.className ?? ""), // append control CSS class to custom classes passed
    value: props.value,
    onChange: <Type extends HTMLTarget>(e: React.FormEvent<Type>) => props.valueChanger && props.valueChanger(e.currentTarget.value),
    disabled: props.display_disabled ? true : undefined // set html disabled if display is disabled
  }
}

/** 
 * Control template
 * Input props can be extended in implementations
  */
export abstract class ControlTemplate<T extends InputProps> extends ReteControlBase {
  props: T
  constructor(key: string,  emitter: NodeEditor, node: Node, componentProps: T, dataHandler?: DataHandler) {
    super(key)

    // if data handler passed wrap in (data) => () function, else use default control data process function
    if(dataHandler) {
      componentProps.valueChanger = (data: unknown) => dataHandler(this, emitter, key, data);
    } else {
      componentProps.valueChanger = (data) => ctrlValProcess(this, emitter, key, data)
    }

    // set props instance to be passed to react component on render
    this.props = componentProps;

    // set node data value based on initial value passed
    getControlsData(node)[key] = this.props.value;
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
export class ControlNumber extends ControlTemplate<InputProps> {
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
  }
}
export class ControlText extends ControlTemplate<InputProps> {
  component = InputText
}


/** select input with (blank, true, false) options - on select change calls `props.valueChanger()` with either blank, 1 or 0 
 * (cannot use boolean values in html so true/false are 1/0) */
type boolKey = '' | 'True' | 'False'
const boolLookup: {[key in boolKey]: {value: string, label: string}} = {
  '': {
    value: '', 
    label: ' '
  },
  'False': {
    value: 'False', 
    label: 'False'
  },
  'True': {
    value: 'True', 
    label: 'True'
  }
}
export class InputBool extends React.Component<InputProps> {
  render() {
    return (
      <Select
        className={"control-input input-group " + (this.props.className ?? "")}
        value={boolLookup[this.props.value as boolKey]}
        onChange={(newValue: OnChangeValue<HTMLTarget, false>) => this.props.valueChanger && this.props.valueChanger(newValue.value)}
        // onChange={(newValue: OnChangeValue) => console.log(value)}
        // onChange={(value: any) => this.props.valueChanger && this.props.valueChanger()
        //   if(this.props.valueChanger) {
        //     this.props.valueChanger(value)
        //   }
        // })},
        options={Object.values(boolLookup)}
        isDisabled={this.props.display_disabled ? true : undefined}
      />
    )
  }
}
export class ControlBool extends ControlTemplate<InputProps> {
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
export class ControlSelect extends ControlTemplate<SelectProps> {
  component = InputSelect
}


/** 
 * Button control
 * button body is supported through passing text or react element in `props.buttonInner`
 * onClick calls `props.valueChanger` with number of clicks 
 * control "value" contains number of clicks
 * */
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

  onClick() {
    this.setState((state) => ({
      clickCount: state.clickCount + 1
    }));
    this.props.valueChanger && this.props.valueChanger(this.state.clickCount);
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
export class ControlButton extends ControlTemplate<ButtonProps> {
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