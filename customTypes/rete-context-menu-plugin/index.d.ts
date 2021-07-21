
declare module 'rete-context-menu-plugin' {
    import { Plugin as RetePlugin } from 'rete/types/core/plugin';
    import { Component } from "rete";
    export interface ContextParams {
        searchBar?: boolean,
        searchKeep?: (title: string) => boolean,
        delay?: number,
        allocate?: (component: Component) => string[],
        rename?: (component: Component) => string[],
        items?: object,
        nodeItems?: object
    } 
    declare const _default: RetePlugin;
    export default _default;
}