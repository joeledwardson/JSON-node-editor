// var json = require("./example-schema.json");
// const $RefParser = require("@apidevtools/json-schema-ref-parser");


// var my_debiug = 1;

// var json = {
//   "$id": "https://example.com/arrays.schema.json",
//   "$schema": "https://json-schema.org/draft/2020-12/schema",
//   "description": "A representation of a person, company, organization, or place",
//   "type": "object",
//   "properties": {
//     "fruits": {
//       "type": "array",
//       "items": {
//         "type": "string"
//       }
//     },
//     "vegetables": {
//       "type": "array",
//       "items": { "$ref": "#/$defs/veggie" }
//     }
//   },
//   "$defs": {
//     "veggie": {
//       "type": "object",
//       "required": [ "veggieName", "veggieLike" ],
//       "properties": {
//         "veggieName": {
//           "type": "string",
//           "description": "The name of the vegetable."
//         },
//         "veggieLike": {
//           "type": "boolean",
//           "description": "Do I like this vegetable?"
//         }
//       }
//     }
//   }
// }

// $RefParser.dereference(json, (err, schema) => {
//   if (err) {
//     console.error(err);
//   }
//   else {
//     // `schema` is just a normal JavaScript object that contains your entire JSON Schema,
//     // including referenced files, combined into a single object
//     console.log(schema);
//     var my_debug = 1;
//   }
// })

// let schema = $RefParser.dereference(json);
// // var parser = require("json-schema-parser");
 
// // var schema = parser.parse(json);
 
// console.log(schema);   // print the schema that is resolved $ref fields