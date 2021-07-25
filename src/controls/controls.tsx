import React from "react";
import { NodeEditor, Control } from "rete";
import { Form } from 'react-bootstrap';
import { ReteControlBase } from "../rete/control";
import { Button } from "react-bootstrap";
import TextareaAutosize from 'react-textarea-autosize';
import { CSSProperties } from 'react';
import * as Display from './display';


// Rete Control class for handling some input which is used to update node data
export class ControlBase extends ReteControlBase {
    props: Display.InputProps;

    // function to update control value passed into react component itself
    controlValueChange(emitter: NodeEditor, key: string, data: any): void {
      this.props.value = data;  // update props value used to update control value when re-rendering
      this.putData(key, data);  //  put into node data objects for connections
      this.update && this.update();  // re-render
      emitter.trigger('process');  // trigger process so that connected nodes update
    }

    constructor(
      emitter: NodeEditor, 
      key: string, 
      value: any, 
      controlComponent: typeof Display.InputBase, 
      style?: CSSProperties,
      className?: string,
    ) {
        super(controlComponent, key);
        this.props = {
            emitter,
            id: key,
            value,
            valueChanger: (key: string, data: unknown) => this.controlValueChange(emitter, key, data),
            style,
            className,
        };
    }
}

export class ControlNumber extends ControlBase {
  constructor(emitter: NodeEditor, key: string, value: any) {
    super(emitter, key, value, Display.InputNumber);
  }
}

export class ControlText extends ControlBase {
  constructor(emitter: NodeEditor, key: string, value: any) {
    super(emitter, key, value, Display.InputText);
  }
}

export class ControlBool extends ControlBase {
  constructor(emitter: NodeEditor, key: string, value: any) {
    super(emitter, key, value, Display.InputBool);
  }
}

export class ControlSelect extends ControlBase {
  props: Display.SelectProps
  constructor(
    emitter: NodeEditor, 
    key: string, 
    value: any,
    options: Array<Display.OptionLabel>,
    valueChanger?: (control: ReteControlBase,  key: string, data: any) => void,
    className?: string
  ) {
    super(emitter, key, value, Display.InputSelect);
    let _valueChanger = (key: string, data: any) => this.controlValueChange(emitter, key, data);
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

// rete control class for holding a button object
export class ControlButton extends ReteControlBase {
  props: Display.ButtonProps;
  constructor( 
      key: string, 
      buttonInner: string | JSX.Element, 
      onButtonClick: () => void,
      componentType: typeof React.Component = Display.InputButton
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