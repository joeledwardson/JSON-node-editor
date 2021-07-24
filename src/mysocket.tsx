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


function addSocket(name: string) {
    if (sockets.has(name)) {
        throw new Error(`socket "${name}" already exists`);
    } else {
        sockets.set(name, {
            socket: new Socket(name), 
            colour: colours[sockets.size % colours.length]
        })
    }
}

addSocket("Number Socket");
addSocket("Text Socket");
addSocket("Boolean Socket");
addSocket("Null Socket");
addSocket("List Socket");
addSocket("List Item Socket");
addSocket("Dictionary Socket");
addSocket("Dictionary Key Socket");


var numberSocket: Socket = sockets.get('Number Socket')?.socket as Socket;
var stringSocket: Socket = sockets.get('Text Socket')?.socket as Socket;
var boolSocket: Socket = sockets.get('Boolean Socket')?.socket as Socket;
var nullSocket: Socket = sockets.get('Dictionary Key Socket')?.socket as Socket;
var dictSocket: Socket = sockets.get('Dictionary Socket')?.socket as Socket;
var dictKeySocket: Socket = sockets.get('Dictionary Key Socket')?.socket as Socket;
var listSocket: Socket = sockets.get('List Socket')?.socket as Socket;
var listItemSocket: Socket = sockets.get('List Item Socket')?.socket as Socket;

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