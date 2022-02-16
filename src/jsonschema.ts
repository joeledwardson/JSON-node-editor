import * as Rete from 'rete';
import * as Sockets from './sockets/sockets';
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
export const getObject: (v: JSONValue) => JSONObject | null = (v: JSONValue) => isObject(v) ? v as JSONObject : null;

/**
 * extract a reference name from JSON schema after the last "/"
 * e.g. get_ref_name("/schemas/hello") = "hello"
 */
 export function get_ref_name(ref_str: string): string | null {
  return /.*\/(?<name>.*)$/.exec(ref_str)?.groups?.name ?? null;
}


/**
 * Get socket from JSON schema definition
 * 
 * @param property JSON Schema type definition
 * @returns Socket
 */
export function getJSONSocket(property: JSONValue, getInner: boolean = true): Rete.Socket | null {
  if( property === null || property === undefined ) {
    return anySocket;
  }
  if (!(typeof(property) === "object" && !Array.isArray(property))) {
    return anySocket;
  }
  if(property["const"]) {
    return null;
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

  } else if(varType === "string") {
    return Sockets.stringSocket;
  } else if(varType === "integer" || varType === "number") {
    return Sockets.numberSocket;
  } else if(varType === "boolean") {
    return Sockets.boolSocket;
  } else if(varType === "null") {
    return Sockets.nullSocket;
  } else if( varType === "array" ) {

    // type is array, parse inner type from "items" key (if given)
    let varItems = property["items"];
    if(varItems) {

      // "items" key in JSON Schema passed to indicate inner type
      if(typeof varItems === "object" && Array.isArray(varItems)) {

        // do not currently support tuple types, where "items" is an array of definitions
        throw new Error('Currently do not support array item specification in list form')

      } else if(typeof varItems === "object" && !Array.isArray(varItems)) {
        
        // inner definition has its own definitions - call function recursively
        let innerSocket = getJSONSocket(varItems, false);
        let name = `List[${innerSocket?.name ?? ""}]`;
        return multiSocket(["List"], name, Sockets.listColour);

      } else {
        throw new Error('unknown format of array items');
      }
    } else {
      // if "items" not passed assume "any" as inner type
      return Sockets.listSocket;
    }

  } else if( varType === "object" ) {

    let ap = property["additionalProperties"];
    if(ap !== null && typeof ap === "object" && !Array.isArray(ap)) {

      // additionalProperties defines the type of values for dictionary keys
      let innerSocket = getJSONSocket(ap, false);
      let name = `Object[${innerSocket?.name ?? ""}]`;
      return multiSocket(["Object"], name, Sockets.objColour);
    
    } else {

      // if additionalProperties not passed assume "any" for inner values
      return Sockets.objectSocket;
    
    }
  } else if( anyOf ) {

    // "anyOf" means the type is a Union of different types
    if( typeof anyOf === "object" && Array.isArray(anyOf)) {

      // loop each type definition and create array of sockets
      let innerSockets = anyOf.map(t => getJSONSocket(t as JSONObject)).filter(s => s instanceof Rete.Socket);
      
      // concatenate socket names together
      let socketName = getTypeString(innerSockets.map(s => s.name));
      
      // get socket based on its name from existing list
      let socket = sockets.get(socketName)?.socket;
      if(!socket) {
        // socket doesnt exist, create it and combine with each socket in the list
        let newSocket = multiSocket([], socketName);
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