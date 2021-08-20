var json = require("./example-schema.json");

type JSONValue =
| Partial<{ [key: string]: JSONValue }>
| JSONValue[]
| string
| number
| boolean
| null
var y: JSONValue = {hello: {"type": "there"}}

const get_definitions = (spec: object) => spec["definitions"] ?? spec["$defs"] ?? {};
function get_ref_name(ref_str: string): string | null {
  return /^#\/(.*\/)*(?<name>.*)$/.exec(ref_str)?.groups["name"] ?? null;
}
// const get_ref_name = (ref_str: string) => /^#\/(.*\/)*(?<name>.*)$/.exec(ref_str)?.groups["name"] ?? null;


const isObject = (v: JSONValue) => typeof v === "object" && !Array.isArray(v);
const isArray = (v: JSONValue) => typeof v === "object" && Array.isArray(v);

const isJSONObject = (v: object) => v["type"] && v["type"] === "object";
const isJSONString = (v: object) => v["type"] && v["type"] === "string";
const isJSONNumber = (v: object) => v["type"] && v["type"] === "number";
const isJSONInteger = (v: object) => v["type"] && v["type"] === "integer";
const isJSONBool = (v: object) => v["type"] && v["type"] === "boolean";


Object.entries(y).forEach(([k, v]) => {
if( typeof v === "object" && !Array.isArray(v) && v["type"] ) {
    // check for type "integer", "number", "string"
    console.log(v["type"]);
  }
});