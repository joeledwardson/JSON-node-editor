import { Socket } from "rete";

type SocketHolder = {
    socket: Socket,
    colour: string
}

const colours: Array<string> = [
    "#F8B195",
    "#F67280",
    "#C06C84",
    "#6C5B7B",
    "#355C7D",
    "#99B898",
    "#FECEAB",
    "#FF847C",
    "#E84A5F",
    "#2A363B",
    "#A8E6CE",
    "#DCEDC2",
    "#FFD3B5",
    "#FFAAA6",
    "#FF8C94"
]
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

addSocket("socket-number");
addSocket("socket-dict-key");


export var socketNumber: Socket = sockets.get('socket-number')?.socket as Socket;
export var socketDictKey: Socket = sockets.get('socket-dict-key')?.socket as Socket;

