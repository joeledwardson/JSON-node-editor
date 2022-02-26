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
  const getColour: (() => string) = () => {
    if(colour) {
      return colour;
    } else {
      let newColour = colours[colourIndex % colours.length];
      colourIndex++;
      return newColour;
    }
  }

  const holder: SocketHolder = {
    socket: new Socket(typeName),
    colour: getColour()
  }
  sockets.set(typeName, holder)
  return holder;
}
