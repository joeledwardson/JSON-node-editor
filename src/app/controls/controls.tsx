import { NodeEditor } from "rete";
import { ControlBase as ReteControlBase } from "../../rete/control";
import { cGetData } from "../data/control";
import { CSSProperties } from 'react';
import * as Display from './display';


/** function to update control value passed into react component itself */
type ValueChanger = (ctrl: ReteControlBase, emitter: NodeEditor, key: string, data: any) => void;

export function ctrlValChange(ctrl: ReteControlBase, emitter: NodeEditor, key: string, data: any): void {
  ctrl.props.value = data;  // update props value used to update control value when re-rendering
  cGetData(ctrl)[key] = data;  //  put into node data objects for connections
  ctrl.update && ctrl.update();  // re-render
}

export function ctrlValProcess(ctrl: ReteControlBase, emitter: NodeEditor, key: string, data: any): void {
  ctrlValChange(ctrl, emitter, key, data);
  emitter.trigger('process');  // trigger process so that connected nodes update
}

export interface ControlPropsBase {
  key: string;
  emitter: NodeEditor;
  value: any;
  valueChanger?: ValueChanger;
  style?: CSSProperties;
  className?: string;
  componentDidMount?: () => void;
}
export interface ControlPropsSelect extends ControlPropsBase {
  options: Array<Display.OptionLabel>,
}
export interface ControlPropsButton extends ControlPropsBase {
  buttonInner: string | JSX.Element
}


export abstract class ControlTemplate<T extends ControlPropsBase> extends ReteControlBase {
  props: T
  constructor(p: T) {
    super(p.key)
    let vc = p.valueChanger;
    p.valueChanger = vc ? data => vc && vc(this, p.emitter, p.key, data) : data => ctrlValProcess(this, p.emitter, p.key, data);
    this.props = p;
  }
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