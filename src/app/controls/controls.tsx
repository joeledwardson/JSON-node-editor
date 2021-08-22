import { NodeEditor } from "rete";
import { ReteControl as ReteControlBase } from "../../rete/control";
import { cGetData } from "../data/component";
import { CSSProperties } from 'react';
import * as Display from './display';
import { ControlPropsBase, ControlTemplate } from "./core";


export interface ControlPropsSelect extends ControlPropsBase {
  options: Array<Display.OptionLabel>,
}
export interface ControlPropsButton extends ControlPropsBase {
  buttonInner: string | JSX.Element
}


export class ControlNumber extends ControlTemplate<ControlPropsBase> {
  component = Display.InputNumber
}

export class ControlText extends ControlTemplate<ControlPropsBase> {
  component = Display.InputText
}

export class ControlBool extends ControlTemplate<ControlPropsBase> {
  component = Display.InputBool
}

export class ControlSelect extends ControlTemplate<ControlPropsSelect> {
  component = Display.InputSelect
}

// rete control class for holding a button object
export class ControlButton extends ControlTemplate<ControlPropsButton> {
  component = Display.InputButton
}


export default {
  ControlBase: ReteControlBase,
  ControlNumber,
  ControlText,
  ControlBool,
  ControlSelect,
  ControlButton,
}