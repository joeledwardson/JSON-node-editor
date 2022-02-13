import { Socket } from "rete";

type SocketHolder = {
  socket: Socket,
  colour: string
}

// colours stolen from Kelly's 22 colours minus black and white
const colours: Array<string> = [
  '#F3C300',
  '#875692',
  '#F38400',
  '#A1CAF1',
  '#BE0032',
  '#C2B280',
  '#848482',
  '#885600',
  '#E68FAC',
  '#0067A5',
  '#F99379',
  '#604E97',
  '#F6A600',
  '#B3446C',
  '#DCD300',
  '#882D17',
  '#8DB600',
  '#654522',
  '#E25822',
  '#2B3D26'
];


export let sockets = new Map<string, SocketHolder>()
let colourIndex = 0;

export function addSocket(typeName: string, colour?: string): SocketHolder {
  if (sockets.has(typeName)) {
    throw new Error(`socket "${typeName}" already exists`);
  }
  let socketColour = colour ?? colours[colourIndex % colours.length];
  if (!colour) colourIndex += 1;

  const holder: SocketHolder = {
    socket: new Socket(typeName),
    colour: socketColour
  }
  sockets.set(typeName, holder)
  return holder;
}


/** create type string from a list of valid types */
export const getTypeString = (typs: string[]) => typs.join(' | ');




/** generate socket from list of valid types - socket name created by joining types together, or can be passed optionally */
export function multiSocket(typs: string[], key?: string, colour?: string): Socket {
  let socketName: string = key ?? getTypeString(typs);
  const socket = sockets.get(socketName)?.socket;

  if (!socket) {
    for (const t of typs) {
      // take the first valid socket to use as the colour
      if (colour) break;
      colour = sockets.get(t)?.colour;
    }
    const newSocket = addSocket(socketName, colour).socket;
    typs.forEach(t => {
      let s = sockets.get(t)?.socket;
      s && newSocket.combineWith(s);
      if (!s)
        throw new Error(`multi-socket type "${t}" not recognised`);
    });
    return newSocket;
  } else {
    return socket;
  }
}

var anyHolder = addSocket("Any");
var listHolder = addSocket("List");
var dictHolder = addSocket("Dictionary");

export var numberSocket: Socket = addSocket("Number").socket;
export var stringSocket: Socket = addSocket("Text").socket;
export var boolSocket: Socket = addSocket("Boolean").socket;
export var nullSocket: Socket = addSocket("None").socket;
export var listSocket: Socket = listHolder.socket;
export var dictSocket: Socket = dictHolder.socket;
export var anySocket = anyHolder.socket;

export var dictColour: string = dictHolder.colour;
export var listColour: string = listHolder.colour;
export var anyColour: string = anyHolder.colour;


// export default {
//     numberSocket,
//     stringSocket,
//     boolSocket,
//     nullSocket,
//     dictSocket,
//     dictKeySocket,
//     listSocket,
//     listItemSocket,
//     anySocket,
//     multiSocket,
//     getTypeString,
// }