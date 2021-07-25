import React from "react";
import Rete from "rete";


export interface DataObject {
    component?: typeof React.Component
}
export abstract class ComponentBase extends Rete.Component {
    update?: () => Promise<void>; // update() is declared at load time by rete react render plugin implementation
    render?: "react";
    data: DataObject; // "data" property passed to renderer, which if it has "component" is used for component rendering
    constructor(name: string, component?: typeof React.Component) {
        super(name);
        this.data = {
            component: component
        };
    }
}