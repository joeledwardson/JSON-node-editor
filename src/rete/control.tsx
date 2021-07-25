import React from "react";
import { Control } from "rete";



export class ReteControlBase extends Control {
    props: any;
    update?: () => Promise<void>; // update() is declared at load time by rete react render plugin implementation
    render?: "react"; // render should be set to "react" or left as undefined for react render plugin
    component: typeof React.Component; // "component" React property used to render Control with "props" variable
    constructor(component: typeof React.Component, key: string) {
        super(key);
        this.component = component;
    }
}
