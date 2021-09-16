export type JSONObject = { [key: string]: JSONValue }; 
export type JSONValue =
| Partial<{ [key: string]: JSONValue }>
| JSONValue[]
| string
| number
| boolean
| null;
export const isObject = (v: JSONValue) => Boolean(v && typeof v === "object" && !Array.isArray(v));
export const getObject = (v: JSONValue) => isObject(v) ? v as JSONObject : null;

/**
 * extract a reference name from JSON schema after the last "/"
 * e.g. get_ref_name("/schemas/hello") = "hello"
 */
 export function get_ref_name(ref_str: string): string | null {
  return /.*\/(?<name>.*)$/.exec(ref_str)?.groups?.name ?? null;
}