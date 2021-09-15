import Rete from "rete";
import { Component as ReactComponent } from 'react';

let s = new Rete.Socket("pls");


console.log(typeof s);

let a = 1;

interface I {
  x: string,
  a: number,
}

export declare class Socket<T extends {x: string}> extends ReactComponent<T> {
}

class X extends Socket<I> {

}


function pls(): X {
  return new X({
    x: 'pls',
    a:3}
    );
  
}