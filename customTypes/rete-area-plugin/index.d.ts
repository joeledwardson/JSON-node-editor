declare module 'rete-area-plugin' {
    import { Plugin as RetePlugin } from 'rete/types/core/plugin';
    import { NodeEditor, Node } from 'rete';
    
    interface ReteAreaPlugin extends RetePlugin {
        zoomAt(editor: NodeEditor, nodes: Node[]): void;
    }
    declare const _default: ReteAreaPlugin;
    export default _default;
}