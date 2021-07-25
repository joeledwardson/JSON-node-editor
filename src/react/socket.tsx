import { SocketProps } from "rete-react-render-plugin";
import { Socket as SocketComponent } from "rete-react-render-plugin";
import { CSSProperties } from "react";

export interface StyleSocketProps extends SocketProps {
    cssStyle?: CSSProperties
}
export class StylableSocket extends SocketComponent<StyleSocketProps> {
    render() {
        const { socket, type } = this.props;
        return (
            <div
                style={this.props.cssStyle}
                className={`socket ${type}`}
                title={socket.name}
                ref={el => el && this.createRef(el)} // force update for new IO with a same key 
            />
        );
    }
}
