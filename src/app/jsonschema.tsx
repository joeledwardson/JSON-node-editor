import * as Rete from 'rete';
import { multiSocket, sockets, anySocket, getTypeString } from './sockets/sockets';

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

export function JSONTypeConvert(typ: string): string {
  let type_maps: { [key: string]: string } = {
    "string": "Text",
    "integer": "Number",
    "number": "Number",
    "array": "List",
    "boolean": "Boolean",
    "null": "None",
    "object": "Dictionary"
  }
  return type_maps[typ] ?? typ;
}

/**
 * Get socket from JSON schema definition
 * 
 * @param property JSON Schema type definition
 * @returns Socket
 */
export function getJSONSocket(property: JSONObject | null | undefined): Rete.Socket {
  if( property === null || property === undefined ) {
    return anySocket;
  }

  /**
   * Create socket with outer name and inner specification. 
   * name of inner specification key passed as well for error handling
   * 
   * e.g. getInnerSocket("items", {type: "boolean"}, "Array") would yield a socket Array[boolean]
   * 
   * @param innerVarName key used to retrieve `innerVar` in schema (for error handling)
   * @param innerVar JSON schema specification of socket inner type
   * @param baseName outer name for socket
   * @returns 
   */
  const getInnerSocket = (innerVarName: string, innerVar: JSONObject, baseName: string) => {
    let innerSocket =  getJSONSocket(innerVar);
    let outerSocket = sockets.get(baseName);
    if(!innerSocket) {
      throw new Error(`couldnt retrieve inner socket from "${innerVarName}" parameter`);
    }
    if(!outerSocket) {
      throw new Error(`expected socket "${baseName}" to already exist`);
    }
    return multiSocket(
      [baseName], 
      `${baseName}[${innerSocket.name}]`, 
      outerSocket.colour
    );
  }

    /**
 * helper function to create a socket with name indicating what child features it contains 
 * e.g. anySocketContainer(Dict) produces a socket that matches with "Dict" but has name "Dict[any]"
 * n.b. the socket returned does not provide any information about the child other than in the name
 **/
  const anySocketContainer = (baseName: string) => {
    return getInnerSocket("(any)", {}, baseName);
  }

  // read JSON schema definitions
  let varType = property["type"] ? String(property["type"]) : "";
  let anyOf = property["anyOf"];
  let varRef = property["$ref"];

  if(varRef) {

    // if a schema reference is passed, used the final part of the reference name for the socket
    if(typeof varRef === "string") {
      let refName = get_ref_name(varRef);
      if( refName ) {
        return multiSocket([refName], refName);
      } else {
        throw new Error(`reference name invalid: "${varRef}"`);
      }
    } else {
      throw new Error(`expected "$ref to be a string`);
    }

  } else if(["string", "integer", "number", "boolean", "null"].includes(varType)) {

    // match basic JSON schema types (excluding array and object)
    return multiSocket([JSONTypeConvert(varType)]);

  } else if( varType === "array" ) {

    // type is array, parse inner type from "items" key (if given)
    let arrayName = JSONTypeConvert("array");
    let varItems = property["items"];
    if(varItems) {

      // "items" key in JSON Schema passed to indicate inner type
      if(typeof varItems === "object" && Array.isArray(varItems)) {

        // do not currently support tuple types, where "items" is an array of definitions
        throw new Error('Currently do not support items in list form')

      } else if(typeof varItems === "object" && !Array.isArray(varItems)) {
        
        // inner definition has its own definitions - call function recursively
        return getInnerSocket("items", varItems as JSONObject, arrayName);

      } else {
        throw new Error('unknown format of array items');
      }
    } else {
      // if "items" not passed assume "any" as inner type
      return anySocketContainer(arrayName);
    }

  } else if( varType === "object" ) {

    // type "object" is taken as a dict in python
    let objectName = JSONTypeConvert("object");

    if(property["properties"]) {
      // at present custom objects with required "properties" as well as additional keys are not supported
      // they should be defined in $refs
      throw new Error(`property has its own properties set - this should be defined as its own type in "definitions"`);
    }

    let ap = property["additionalProperties"];
    if(ap !== null && typeof ap === "object" && !Array.isArray(ap)) {

      // additionalProperties defines the type of values for dictionary keys
      return getInnerSocket("additionalProperties", ap as JSONObject, objectName)
    
    } else {

      // if additionalProperties not passed assume "any" for inner values
      return anySocketContainer(objectName);
    
    }
  } else if( anyOf ) {

    // "anyOf" means the type is a Union of different types
    if( typeof anyOf === "object" && Array.isArray(anyOf)) {

      // loop each type definition and create array of sockets
      let innerSockets = anyOf.map(t => getJSONSocket(t as JSONObject)).filter((s): s is Rete.Socket => Boolean(s));
      
      // concatenate socket names together
      let socketName = getTypeString(innerSockets.map(s => s.name));
      
      // get socket based on its name from existing list
      let socket = sockets.get(socketName)?.socket;
      if(!socket) {
        // socket doesnt exist, create it and combine with each socket in the list
        let newSocket = multiSocket([],  socketName);
        innerSockets.forEach(s => {
          newSocket.combineWith(s)
          s.compatible.forEach(_s => newSocket.combineWith(_s));
        });
        return newSocket;
      } else {
        // socket already exists
        return socket;
      }
    } else {
      throw new Error(`expected "anyOf" of property to be an array`);
    }
  } 
    
  return anySocket;
}