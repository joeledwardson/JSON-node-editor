import { ReteReactControl } from "rete-react-render-plugin";
import * as React from "react";
import { Form, Button } from 'react-bootstrap';
import TextareaAutosize from 'react-textarea-autosize';
import Select from 'react-select';


/** get css classes for control groups combined with any additional class names */
function getControlClasses(customClasses?: string): string {
  return 'control-input input-group ' + (customClasses ?? '');
}

export interface BaseProps {
  display_disabled?: boolean;
}


export interface NumberInputs extends BaseProps {
  value: number;
}
interface NumberProps extends NumberInputs {
  valueChanger: (value: number) => void;
}
export class NumberControl extends ReteReactControl {
  props: NumberProps
  constructor(key: string, props: NumberInputs, dataHandler: (ctrl: NumberControl, value: number) => void) {
    super(key);
    this.props = {
      ...props,
      valueChanger: (value: number) => dataHandler(this, value)
    }
  }
  component = class NumberInput extends React.Component<NumberProps> {
    render() {
      const onChange = (e: React.FormEvent<HTMLInputElement>) => {
        let number = Number(e.currentTarget.value);
        if(!isNaN(number)) {
          this.props.valueChanger(number);
        }
      }
      return (
        <input 
          type="number"
          value={this.props.value}
          onChange={onChange}
          className={getControlClasses()}
          disabled={this.props.display_disabled}
        />
      );
    }
  }
}


export interface TextInputs extends BaseProps {
  value: string
}
interface TextProps extends TextInputs {
  valueChanger: (value: string) => void
}
export class TextControl extends ReteReactControl {
  props: TextProps
  constructor(key: string, props: TextInputs, dataHandler: (control: TextControl, value: string) => void) {
    super(key);
    this.props = {
      ...props, 
      valueChanger: (value: string) => dataHandler(this, value)
    }
  }
  component = class TextInput extends React.Component<TextProps> {
    render() {
      const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        this.props.valueChanger(e.currentTarget.value);
      }
      return (
        <TextareaAutosize
          style={{resize: "none"}}
          className={getControlClasses()}
          value={this.props.value}
          disabled={this.props.display_disabled}
          onChange={onChange}
          rows={1}
        />
      );
    }
  }
}


/** select input where the options are passed in the constructor - on select change calls `props.valueChanger()` with key of option selected */
/** value & label pairs displayed in select options */
export type OptionLabel = {
  label: string, 
  value: any
}
/** select element props also include options to display */
export interface SelectInputs extends BaseProps {
  options: Array<OptionLabel>,
  value: any
}
interface SelectProps extends SelectInputs {
  valueChanger: (value: any) => void;
}
class SelectInput extends React.Component<SelectProps> {
  render() {
    let selectedOption = this.props.options.find(o => o.value === this.props.value);
    const onChange = (opt: OptionLabel | null) => {
      let x = opt?.value ?? null;
      this.props.valueChanger(x);
    }
    return (
      <Select
        isMulti={false}
        className={getControlClasses()} // dont apply width constrains to selects
        value={selectedOption}
        onChange={onChange}
        options={this.props.options}
        isDisabled={this.props.display_disabled}
      />
    )
  }
}
export class SelectControl extends ReteReactControl {
  component = SelectInput
  props: SelectProps
  constructor(key: string, props: SelectInputs, dataHandler: (control: SelectControl, value: any) => void) {
    super(key);
    this.props = {
      ...props,
      valueChanger: (value: any) => dataHandler(this, value),
    }
  }
}



export interface BoolInputs extends BaseProps {
  value: boolean
}
export class BoolControl extends ReteReactControl {
  component = SelectInput
  props: SelectProps
  constructor(key: string, props: BoolInputs, dataHandler: (control: BoolControl, value: boolean) => void) {
    super(key);
    this.props = {
      ...props,
      options: [
        {
           value: false, 
           label: 'False'
         }, {
           value: true, 
           label: 'True'
         }
       ],
      valueChanger: (value: boolean) => dataHandler(this, value),
    }
  }
}


export interface ButtonInputs extends BaseProps {
  buttonInner: string | JSX.Element
}
interface ButtonProps extends ButtonInputs {
  valueChanger: () => void
}
export class ButtonControl extends ReteReactControl {
  props: ButtonProps
  constructor(key: string, props: ButtonInputs, dataHandler: (control: ButtonControl) => void) {
    super(key);
    this.props = {
      ...props,
      valueChanger: () => dataHandler(this)
    }
  }
  component = class InputButton extends React.Component<ButtonProps> {
    render() {
      return (
        <Button
          className={getControlClasses()}
          disabled={this.props.display_disabled}
          onClick={() => this.props.valueChanger()}
          size="sm"
        >{this.props.buttonInner}</Button>
      );
    }
  }
}
