import { SomeJSONSchema } from "ajv/dist/types/json-schema";
import * as Rete from "rete";
import * as Sockets from "./sockets/sockets";
import {
  multiSocket,
  sockets,
  anySocket,
  getTypeString,
} from "./sockets/sockets";

export type CustomSchema = SomeJSONSchema & {
  customNodeIdentifier?: string;
  attributesNotDefined?: true;  // denotes for object/array that attribute schemas are not yet defined
};

export const stringSchema: SomeJSONSchema = { type: "string" };
export const nullSchema: SomeJSONSchema = { type: "null", nullable: true };
export const numberSchema: SomeJSONSchema = { type: "number" };
export const objectSchema: CustomSchema = {
  type: "object",
  required: [],
  attributesNotDefined: true,
};
export const intSchema: SomeJSONSchema = { type: "integer" };
export const boolSchema: SomeJSONSchema = { type: "boolean" };
export const arraySchema: CustomSchema = {
  type: "array",
  items: { anyOf: [] },
  attributesNotDefined: true,
};

export const anySchema: SomeJSONSchema = {
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

// /**
//  * Get socket from JSON schema definition
//  *
//  * @param property JSON Schema type definition
//  * @returns Socket
//  */
// export function getJSONSocket(property: SomeJSONSchema | null | undefined, getInner: boolean = true): Rete.Socket | null {
//   if( property === null || property === undefined ) {
//     return anySocket;
//   }
//   if (!(typeof(property) === "object" && !Array.isArray(property))) {
//     return anySocket;
//   }
//   if(property["const"]) {
//     return null;
//   }
//   let custom = property as CustomSchema;
//   if(custom?.customNodeIdentifier) {
//     // TODO - would expect socket to be found - throw error if not found?
//     let holder = Sockets.sockets.get(custom.customNodeIdentifier);
//     return holder?.socket ?? anySocket;
//   }

//   // read JSON schema definitions
//   let varType = property["type"];
//   let anyOf = property["anyOf"];
//   let varRef = property["$ref"];

//   if(varRef) {
//     // TODO - dont expect references to be found as schema should be fully parsed
//     return anySocket;
//   } else if(varType === "string") {
//     return Sockets.stringSocket;
//   } else if(varType === "integer" || varType === "number") {
//     return Sockets.numberSocket;
//   } else if(varType === "boolean") {
//     return Sockets.boolSocket;
//   } else if(varType === "null") {
//     return Sockets.nullSocket;
//   } else if( varType === "array" ) {

//     // type is array, parse inner type from "items" key (if given)

//     if(property.items) {

//       // "items" key in JSON Schema passed to indicate inner type
//       if(typeof property.items === "object" && Array.isArray(property.items)) {

//         // do not currently support tuple types, where "items" is an array of definitions
//         throw new Error('Currently do not support array item specification in list form')

//       } else if(typeof property.items === "object" && !Array.isArray(property.items)) {
//         let varItems = property["items"] as SomeJSONSchema;
//         // inner definition has its own definitions - call function recursively
//         let innerSocket = getJSONSocket(varItems, false);
//         let name = `List[${innerSocket?.name ?? ""}]`;
//         return multiSocket(["List"], name, Sockets.listColour);

//       } else {
//         throw new Error('unknown format of array items');
//       }
//     } else {
//       // if "items" not passed assume "any" as inner type
//       return Sockets.listSocket;
//     }

//   } else if( varType === "object" ) {

//     if(property.additionalProperties !== null && typeof property.additionalProperties === "object" && !Array.isArray(property.additionalProperties)) {

//       // additionalProperties defines the type of values for dictionary keys
//       let ap: SomeJSONSchema = property.additionalProperties;
//       let innerSocket = getJSONSocket(ap, false);
//       let name = `Object[${innerSocket?.name ?? ""}]`;
//       return multiSocket(["Object"], name, Sockets.objColour);

//     } else {

//       // if additionalProperties not passed assume "any" for inner values
//       return Sockets.objectSocket;

//     }
//   } else if( property.anyOf || property.oneOf ) {

//     // "anyOf" means the type is a Union of different types
//     if( typeof anyOf === "object" && Array.isArray(anyOf)) {

//       // loop each type definition and create array of sockets
//       let innerSockets = anyOf.map(t => getJSONSocket(t as JSONObject)).filter(s => s instanceof Rete.Socket);

//       // concatenate socket names together
//       let socketName = getTypeString(innerSockets.map(s => s.name));

//       // get socket based on its name from existing list
//       let socket = sockets.get(socketName)?.socket;
//       if(!socket) {
//         // socket doesnt exist, create it and combine with each socket in the list
//         let newSocket = multiSocket([], socketName);
//         innerSockets.forEach(s => {
//           newSocket.combineWith(s)
//           s.compatible.forEach(_s => newSocket.combineWith(_s));
//         });
//         return newSocket;
//       } else {
//         // socket already exists
//         return socket;
//       }
//     } else {
//       throw new Error(`expected "anyOf" of property to be an array`);
//     }
//   }

//   return anySocket;
// }
