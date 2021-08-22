import { NodeEditor } from "rete";
import { ReteControl as ReteControlBase } from "../../rete/control";
import { cGetData } from "../data/component";
import { CSSProperties } from 'react';


/** function to update control value passed into react component itself */
type ValueChanger = (ctrl: ReteControlBase, emitter: NodeEditor, key: string, data: any) => void;

export function ctrlValChange(ctrl: ReteControlBase, emitter: NodeEditor, key: string, data: any): void {
  ctrl.props.value = data;  // update props value used to update control value when re-rendering
  ctrl.data = data;
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
  display_disabled?: boolean;
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