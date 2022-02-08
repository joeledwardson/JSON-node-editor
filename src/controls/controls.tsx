import { ReteReactControl as ReteControlBase } from "rete-react-render-plugin";
import { Node, NodeEditor } from "rete";
import { getControlsData } from "../data/attributes";
import * as React from "react";
import { Form, Button } from 'react-bootstrap';
import TextareaAutosize from 'react-textarea-autosize';
import Select from 'react-select';


/** 
 * function to update control value passed into react component itself 
 * */
export type DataHandler = (ctrl: ReteControlBase, emitter: NodeEditor, key: string, data: any) => void;



/**
 * default function for value changes
 * set control instance props value so react control updates on re-render, and update node data
 * N.B. this function should be used over ctrlValProcess() to avoid entering infinite loop if control triggers emitter 'process'
 */
export const ctrlValProcess: DataHandler = (ctrl: ReteControlBase, emitter: NodeEditor, key: string, data: any): void => {
  ctrl.props.value = data;  // update props value used to update control value when re-rendering
  getControlsData(ctrl.getNode())[key] = data;  //  put into node data objects for connections
  emitter.trigger("process");  // trigger process on control change
  ctrl.update && ctrl.update();  // re-render
}


/** props passed to control input React components */
export interface InputProps<ValueType> {
    value: ValueType; // initial value for control
    valueChanger?: (data: ValueType) => void; // custom handling of user entering new value in control
    className?: string; // CSS class names
    display_disabled?: boolean; // set to true to disable display
};

/** get css classes for control groups combined with any additional class names */
function getControlClasses(customClasses: string | undefined): string {
  return 'control-input input-group ' + customClasses ?? '';
}


/** 
 * Control template
 * Input props can be extended in implementations
  */
export abstract class ControlTemplate<T, P extends InputProps<T>> extends ReteControlBase {
  props: P
  constructor(key: string,  emitter: NodeEditor, node: Node, componentProps: P, dataHandler: DataHandler=ctrlValProcess) {
    super(key)

    // set props instance to be passed to react component on render
    this.props = componentProps;

    // set value changer wrapped function
    this.props.valueChanger = (data: any) => dataHandler(this, emitter, key, data);

    // set node data value based on initial value passed
    getControlsData(node)[key] = this.props.value;
  }
}

/** input element only accepting numbers, when editing calls `props.valueChanger()` with the number in input */
type NumberProps = InputProps<number>
export class InputNumber extends React.Component<NumberProps> {
  render() {
    return (
      <input 
        type="number"
        value={this.props.value}
        onChange={(e: React.FormEvent<HTMLInputElement>) => this.props.valueChanger(Number(e.currentTarget.value))}
        className={getControlClasses(this.props.className)}
        disabled={this.props.display_disabled ? true : undefined}
      />
    );
  }
}
export class ControlNumber extends ControlTemplate<number, NumberProps> {
  component = InputNumber
}


/** autosizing textarea element, when editing calls `props.valueChanger()` with text in textarea element  */
type TextProps = InputProps<string>
export class InputText extends React.Component<TextProps> {
  render() {
    return (
      <TextareaAutosize
        className={getControlClasses(this.props.className)}
        value={this.props.value}
        disabled={this.props.display_disabled}
        rows={1}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => this.props.valueChanger(e.currentTarget.value)}
        autoFocus
        style={null}
      />
    );
  }
}
export class ControlText extends ControlTemplate<string, TextProps> {
  component = InputText
}



/** select input where the options are passed in the constructor - on select change calls `props.valueChanger()` with key of option selected */
/** value & label pairs displayed in select options */
export type OptionLabel = {
  label: string, 
  value: string
}
/** select element props also include options to display */
export interface SelectProps extends InputProps<string> {
  options: Array<OptionLabel>
}
export class InputSelect extends React.Component<SelectProps> {
  render() {
    var optionMap: {[key: string]: OptionLabel} = {};
    this.props.options.forEach(opt => {optionMap[opt.value] = opt});
    return (
      <Select 
        className={getControlClasses(this.props.className)}
        value={optionMap[this.props.value]}
        onChange={(newValue: {value: string, label: string}) => this.props.valueChanger(newValue.value)}
        options={this.props.options}
        isDisabled={this.props.display_disabled}
      />
    )
  }
}
export class ControlSelect extends ControlTemplate<string, SelectProps> {
  component = InputSelect
}


type BoolKey = '' | 'True' | 'False';
type BoolProps = InputProps<BoolKey>;
function getSelectProps(props: BoolProps): SelectProps {
  return {...props, options: [
    {
      value: '', 
      label: ' '
    }, {
      value: 'False', 
      label: 'False'
    }, {
      value: 'True', 
      label: 'True'
    }
  ]}
}
export class ControlBool extends ControlTemplate<string, SelectProps> {
  component = InputSelect
  constructor(key: string,  emitter: NodeEditor, node: Node, componentProps: BoolProps, dataHandler: DataHandler=ctrlValProcess) {
    super(key, emitter, node, getSelectProps(componentProps), dataHandler);
  }
}

/** 
 * Button control
 * button body is supported through passing text or react element in `props.buttonInner`
 * onClick calls `props.valueChanger` with number of clicks 
 * control "value" contains number of clicks
 * */
/** button props also include string/element to display in button */
export interface ButtonProps extends InputProps<number> {
  buttonInner: string | JSX.Element
}
export class InputButton extends React.Component<ButtonProps, {clickCount: number}> {
  constructor(props: ButtonProps) {
    super(props);
    this.state = {
      clickCount: 0
    }
  }

  onClick = () => {
    this.setState((state) => ({
      clickCount: state.clickCount + 1
    }));
    this.props.valueChanger(this.state.clickCount);
  }
  
  render() {
    return (
      <Button
         className={getControlClasses(this.props.className)}
         disabled={this.props.display_disabled}
         onClick={() => this.onClick()}
      >{this.props.buttonInner}</Button>
    );
  }
}
// rete control class for holding a button object
export class ControlButton extends ControlTemplate<number, ButtonProps> {
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