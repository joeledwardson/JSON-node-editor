import React from "react";
import { Control } from "rete";
import Rete from "rete";


/* 
rete react plugin implementation of rete control
- `component` must be set as the react component to render
- `props` must be the props passed to react component
*/
export abstract class ReteReactControl extends Control {
    props: any;
    update?: () => Promise<void>; // update() is declared at load time by rete react render plugin implementation
    render?: "react"; // render should be set to "react" or left as undefined for react render plugin
    abstract component: typeof React.Component; // "component" React property used to render Control with "props" variable
}

/*
rete react plugin implementation of rete component
- "data" has an optional "component" attribute used to render
*/
export interface DataObject {
    component?: typeof React.Component
}
export abstract class ReteReactComponent extends Rete.Component {
    update?: () => Promise<void>; // update() is declared at load time by rete react render plugin implementation
    render?: "react";
    abstract data: DataObject; // "data" property passed to renderer, which if it has "component" is used for component rendering
}
