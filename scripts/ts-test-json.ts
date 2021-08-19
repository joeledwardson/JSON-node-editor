type JSONValue =
| Partial<{ [key: string]: JSONValue }>
| JSONValue[]
| string
| number
| boolean
| null
var y: JSONValue = {hello: {"type": "there"}}
Object.entries(y).forEach(([k, v]) => {
if( v && typeof v === "object" && !Array.isArray(v) && v["type"] ) {
  // check for type "integer", "number", "string"
  console.log(v["type"]);
}
});