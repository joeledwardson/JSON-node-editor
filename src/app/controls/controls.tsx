import { NodeEditor } from "rete";
import { ControlBase as ReteControlBase } from "../../rete/control";
import { CSSProperties } from 'react';
import * as Display from './display';


/** function to update control value passed into react component itself */
type ValueChanger = (ctrl: ReteControlBase, emitter: NodeEditor, key: string, data: any) => void;
export function controlValueChange(ctrl: ReteControlBase, emitter: NodeEditor, key: string, data: any): void {
  ctrl.props.value = data;  // update props value used to update control value when re-rendering
  ctrl.putData(key, data);  //  put into node data objects for connections
  ctrl.update && ctrl.update();  // re-render
  emitter.trigger('process');  // trigger process so that connected nodes update
}

abstract class ControlTemplate extends ReteControlBase {
  props: Display.InputProps
  constructor(
    emitter: NodeEditor, 
    key: string, 
    value: any, 
    valueChanger?: ValueChanger, 
    style?: CSSProperties, 
    className?: string
  ) {
    super(key)
    this.props = {
      value, style, className, 
      valueChanger: valueChanger ? data => valueChanger(this, emitter, key, data) : data => controlValueChange(this, emitter, key, data)
    }
  }
}

export class ControlNumber extends ControlTemplate {
  component = Display.InputNumber
}

export class ControlText extends ControlTemplate {
  component = Display.InputText
}

export class ControlBool extends ControlTemplate {
  component = Display.InputBool
}

export class ControlSelect extends ReteControlBase {
  component = Display.InputSelect
  props: Display.SelectProps
  constructor(
    emitter: NodeEditor, 
    key: string, 
    value: any, 
    options: Array<Display.OptionLabel>,
    valueChanger?: ValueChanger, 
    style?: CSSProperties, 
    className?: string
  ) {
    super(key);
    this.props = {
      options, value, style, className, 
      valueChanger: valueChanger ? data => valueChanger(this, emitter, key, data) : data => controlValueChange(this, emitter, key, data)
    }
  }

}

// rete control class for holding a button object
export class ControlButton extends ReteControlBase {
  component = Display.InputButton
  props: Display.ButtonProps;
  constructor(
    emitter: NodeEditor, 
    key: string, 
    buttonInner: string | JSX.Element, 
    valueChanger?: ValueChanger, 
    style?: CSSProperties, 
    className?: string
  ) {
      super(key);
      this.props = {
        buttonInner,
        value: null, 
        style, className, 
        valueChanger: valueChanger ? data => valueChanger(this, emitter, key, data) : data => controlValueChange(this, emitter, key, data)
      }
  }
}


export default {
  ControlBase: ReteControlBase,
  ControlNumber,
  ControlText,
  ControlBool,
  ControlSelect,
  ControlButton,
}