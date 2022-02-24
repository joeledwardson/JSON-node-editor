import * as Rete from 'rete';
import { getDataAttribute, setDataAttribute } from "./access";
import { MyJSONSchema } from '../jsonschema';

export interface CoreMap {
  coreName?: string;
  reactKey?: string; // key to use in react indexing
  hasDataControl?: boolean; 
  dataKey?: string;  // control key for data 
  hasFixedData?: boolean;  // true if data value fixed
  dataValue?: any;  // control value for data
  schema?: MyJSONSchema | null; // JSON schema for entry
}

export interface ElementaryMap extends CoreMap {
  canMove?: boolean;  // dynamic output that can move up and down
  hasFixedName?: boolean;
  nameDisplay?: string | null; // fixed name
  hasOutput?: boolean;
  outputKey?: string; // key for output
  schemaMap?: {[key: string]: MyJSONSchema} // type selection map of socket name => schema
  hasSelectControl?: boolean; 
  selectKey?: string;  // control key for type select
  selectValue?: string | null;  // control value for type select used for output socket
}

export interface ObjectMap extends ElementaryMap {
  hasNameControl?: boolean;
  nameKey?: string | null; // control key for property name (dynamic only)
  nameValue?: string; // value of property name (used as key for getting JSON data)
  isNullable?: boolean; // true if output can be nulled
  isNulled?: boolean;  // nullable only
}

export interface DataMap extends ObjectMap {}



export function getOutputMap(node: Rete.Node): Array<DataMap> {
  return getDataAttribute<Array<DataMap>>(node, "nodeMap", ()=>[]);
}
export function setOutputMap(node: Rete.Node, outputMaps: Array<DataMap>): void {
  return setDataAttribute(node, "nodeMap", outputMaps);
}

/** get controls data from node object */
export function getControlsData(node: Rete.Node): {[key: string]: any} {
  return getDataAttribute<{[key: string]: any}>(node, 'controlsData');
}
/** set controls data from node object */
export function setControlsData(node: Rete.Node, data: {[key: string]: any}) {
  setDataAttribute(node, 'controlsData', data);
}


/** 
 * connection processing function type
 * */
export type ConnectionFunc = (connection: Rete.Connection, editor: Rete.NodeEditor, isInput: boolean) => void;
export interface ConnectionFuncs {
  created ?: ConnectionFunc,
  removed ?: ConnectionFunc
}
/** map of node name to connection processor functions */
export var nodeConnectionFuns: {[key: string]: ConnectionFuncs} = {};


/** get general attributes */
export interface GeneralAttributes {
  outputTracker?: number
  componentSchema?: MyJSONSchema
  attributeSchema?: MyJSONSchema
}
export function getGeneralAttributes(node: Rete.Node): GeneralAttributes {
  return getDataAttribute<any>(node, "generalAttributes") as GeneralAttributes;
}

