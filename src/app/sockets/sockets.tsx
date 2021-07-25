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

export function addSocket(typeName: string): SocketHolder {
    if (sockets.has(typeName)) {
        throw new Error(`socket "${typeName}" already exists`);
    }         
    const holder: SocketHolder = {
        socket: new Socket(typeName), 
        colour: colours[sockets.size % colours.length]
    }
    sockets.set(typeName, holder)
    return holder;
}

var numberSocket: Socket = addSocket("Number").socket;
var stringSocket: Socket = addSocket("Text").socket;
var boolSocket: Socket = addSocket("Boolean").socket;
var nullSocket: Socket =addSocket("Null").socket;
var listSocket: Socket = addSocket("List").socket;
var listItemSocket: Socket = addSocket("List Item").socket;
var dictSocket: Socket = addSocket("Dictionary").socket;
var dictKeySocket: Socket = addSocket("Dictionary Key").socket;


export default {
    numberSocket,
    stringSocket,
    boolSocket,
    nullSocket,
    dictSocket,
    dictKeySocket,
    listSocket,
    listItemSocket
}