import { JsonPointer } from "json-ptr";
import { JSONSchema7, JSONSchema7TypeName} from 'json-schema';

type MyBaseSchema = JSONSchema7;
export type MyTypeName = JSONSchema7TypeName;


export type MyJSONSchema = MyBaseSchema & {
  customNodeIdentifier?: string;
  // attributesNotDefined?: true;  // denotes for object/array that attribute schemas are not yet defined
};

export const stringSchema: MyJSONSchema = { type: "string" };
export const nullSchema: MyJSONSchema = { type: "null" };
export const numberSchema: MyJSONSchema = { type: "number" };
export const objectSchema: MyJSONSchema = {
  type: "object",
  // attributesNotDefined: true,
};
export const intSchema: MyJSONSchema = { type: "integer" };
export const boolSchema: MyJSONSchema = { type: "boolean" };
export const arraySchema: MyJSONSchema = {
  type: "array",
  // attributesNotDefined: true,
};

export const anySchema: MyJSONSchema = {
  anyOf: [
    stringSchema,
    numberSchema,
    intSchema,
    objectSchema,
    arraySchema,
    boolSchema,
    nullSchema,
  ],
};

export type JSONObject = { [key: string]: JSONValue };
export type JSONValue =
  | Partial<{ [key: string]: JSONValue }>
  | JSONValue[]
  | string
  | number
  | boolean
  | null;
export const isObject = (v: JSONValue) =>
  Boolean(v && typeof v === "object" && !Array.isArray(v));
export const getObject: (v: JSONValue) => JSONObject | null = (v: JSONValue) =>
  isObject(v) ? (v as JSONObject) : null;

/**
 * extract a reference name from JSON schema after the last "/"
 * e.g. get_ref_name("/schemas/hello") = "hello"
 */
export function get_ref_name(ref_str: string): string | null {
  return /.*\/(?<name>.*)$/.exec(ref_str)?.groups?.name ?? null;
}


function _refResolve(value: any, cache: Object[], schema: Object): any | undefined {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    // value is not an object
    return value;
  }
  if (!value["$ref"]) {
    // value is not a ref
    return value;
  }
  let resolved = JsonPointer.get(schema, value["$ref"]);
  if (resolved === undefined) {
    // resolve ref failed
    return value;
  }
  if(!(resolved && typeof resolved === "object")) {
    // resolved value not an object, return it
    return resolved;
  }
  if(cache.includes(resolved)) {
    // circular reference, abort
    return undefined;
  }
  // put resolved object into cache
  cache.push(resolved);
  return _refResolve(resolved, cache, schema);
}

export function refResolve(value: any, schema: Object) {
  return _refResolve(value, [], schema);
}

export const JSONTypeMap: { [key in MyTypeName]: string } = {
  null: "None",
  boolean: "Boolean",
  object: "Object",
  array: "List",
  number: "Number",
  integer: "Number",
  string: "Text",
};
