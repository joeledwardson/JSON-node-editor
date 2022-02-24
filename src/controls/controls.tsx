import { ReteReactControl as ReteControlBase, ReteReactControl } from "rete-react-render-plugin";
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



/** props passed to control input React components */
export interface InputProps<ValueType> {
    value: ValueType; // initial value for control
    valueChanger?: (data: ValueType) => void; // custom handling of user entering new value in control
    className?: string; // CSS class names
    display_disabled?: boolean; // set to true to disable display
};

/** get css classes for control groups combined with any additional class names */
function getControlClasses(customClasses?: string): string {
  return 'control-input input-group ' + (customClasses ?? '');
}

export interface BaseProps {
  display_disabled?: boolean;
}
// export abstract class ControlBase extends ReteControlBase {
//   props: BaseProps
//   constructor(key: string, props: BaseProps) {
//     super(key);
//     this.props = props;
//   }
// }


/** 
 * Control template
 * Input props can be extended in implementations
  */
export abstract class ControlTemplate<T, P extends InputProps<T>> extends ReteControlBase {
  props: P
  constructor(key: string,  emitter: NodeEditor, node: Node, componentProps: P, dataHandler: DataHandler) {
    super(key)

    // set props instance to be passed to react component on render
    this.props = componentProps;

    // set value changer wrapped function
    this.props.valueChanger = (data: any) => dataHandler(this, emitter, key, data);
  }
}
export type ControlTemplateAny = ControlTemplate<any, InputProps<any>>;

/** input element only accepting numbers, when editing calls `props.valueChanger()` with the number in input */
type NumberProps = InputProps<number>
export class NumberInput extends React.Component<NumberProps> {
  render() {
    let vc = this.props.valueChanger;
    return (
      <input 
        type="number"
        value={this.props.value}
        onChange={(e: React.FormEvent<HTMLInputElement>) => {
          if(vc) vc(Number(e.currentTarget.value))
        }}
        className={getControlClasses(this.props.className)}
        disabled={this.props.display_disabled ? true : undefined}
      />
    );
  }
}
export class NumberControl extends ControlTemplate<number, NumberProps> {
  component = NumberInput
}

// export interface NumberProps2 extends BaseProps {
//   value: number;
//   valueChanger: (value: number) => void;
// }
// export class NumberControl2 extends ReteReactControl {
//   props: NumberProps2
//   constructor(key: string, initialValue: number, dataHandler: DataHandler<Number>, emitter: NodeEditor) {
//     super(key);
//     this.props = {
//       value: initialValue,
//       valueChanger: (value: number) => dataHandler(this, emitter, key, value)
//     }
//   }
//   component = class NumberInput extends React.Component<NumberProps2> {
//     render() {
//       let vc = this.props.valueChanger;
//       const onChange = (e: React.FormEvent<HTMLInputElement>) => {
//         let number = Number(e.currentTarget.value);
//         if(!isNaN(number)) {
//           if(vc) {
//             vc(number);
//           }
//         }
//       }
//       return (
//         <input 
//           type="number"
//           value={this.props.value}
//           onChange={onChange}
//           className={getControlClasses()}
//           disabled={this.props.display_disabled ? true : undefined}
//         />
//       );
//     }
//   }
// }

/** autosizing textarea element, when editing calls `props.valueChanger()` with text in textarea element  */
type TextProps = InputProps<string>
export class TextInput extends React.Component<TextProps> {
  render() {
    let vc = this.props.valueChanger;
    return (
      <TextareaAutosize
        className={getControlClasses(this.props.className)}
        value={this.props.value}
        disabled={this.props.display_disabled}
        rows={1}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => vc && vc(e.currentTarget.value)}
        autoFocus
      />
    );
  }
}
export class TextControl extends ControlTemplate<string, TextProps> {
  component = TextInput
}

export interface TextProps2 extends BaseProps {
  value: string,
  valueChanger: (value: string) => void
}

// class TextControl2 extends ReteReactControl {
//   props: TextProps2
//   constructor(key: string, initialValue: string, dataHandler: DataHandler<string>, emitter: NodeEditor) {
//     super(key);
//     this.props = {
//       value: initialValue,
//       valueChanger: (value: string) => dataHandler(this, emitter, key, value)
//     }
//   }
//   component = class TextInput extends React.Component<TextProps2> {
//     render() {
//       let vc = this.props.valueChanger;
//       const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//         if(vc) {
//           vc(e.currentTarget.value)
//         } 
//       }
//       return (
//         <TextareaAutosize
//           className={getControlClasses()}
//           value={this.props.value}
//           disabled={this.props.display_disabled}
//           rows={1}
//           onChange={onChange}
//           autoFocus
//         />
//       );
//     }
//   }
// }

/** select input where the options are passed in the constructor - on select change calls `props.valueChanger()` with key of option selected */
/** value & label pairs displayed in select options */
export type OptionLabel = {
  label: string, 
  value: any
}
/** select element props also include options to display */
export interface SelectProps extends InputProps<any> {
  options: Array<OptionLabel>
}
export class SelectInput extends React.Component<SelectProps> {
  render() {
    var optionMap: {[key: string]: OptionLabel} = {};
    this.props.options.forEach(opt => {optionMap[opt.value] = opt});
    let vc = this.props.valueChanger;
    return (
      <Select
        isMulti={false}
        className={this.props.className} // dont apply width constrains to selects
        value={optionMap[this.props.value]}
        onChange={(newValue: {value: any, label: any} | null) => {
          if(vc) {
            if(newValue) vc(newValue.value)
            else vc(null)
          }
        }}
        options={this.props.options}
        isDisabled={this.props.display_disabled}
      />
    )
  }
}
export class SelectControl extends ControlTemplate<string, SelectProps> {
  component = SelectInput
}

// export interface SelectProps2 extends BaseProps {
//   options: Array<OptionLabel>
// }


type BoolProps = InputProps<boolean>;
function getSelectProps(props: BoolProps): SelectProps {
  return {...props, options: [
   {
      value: false, 
      label: 'False'
    }, {
      value: true, 
      label: 'True'
    }
  ]}
}
export class BoolControl extends ControlTemplate<string, SelectProps> {
  component = SelectInput
  constructor(key: string,  emitter: NodeEditor, node: Node, componentProps: BoolProps, dataHandler: DataHandler) {
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
    if(this.props.valueChanger) {
      this.props.valueChanger(this.state.clickCount);
    }
  }
  
  render() {
    return (
      <Button
         className={this.props.className}  // dont apply width constraint to buttons
         disabled={this.props.display_disabled}
         onClick={() => this.onClick()}
         size="sm"
      >{this.props.buttonInner}</Button>
    );
  }
}
// rete control class for holding a button object
export class ButtonControl extends ControlTemplate<number, ButtonProps> {
  component = InputButton
}



const _default = {
  ControlBase: ReteControlBase,
  NumberControl,
  TextControl,
  BoolControl,
  SelectControl,
  ButtonControl,
};
export default _default;