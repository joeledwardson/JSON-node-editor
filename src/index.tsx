import { useEffect, RefObject } from "react";
import { createRef } from "react";
import * as ReactDOM from "react-dom";
import { createEditor } from "./app/app";
import * as CSS from 'csstype';
import './styles/styles.scss';
// eslint-disable-next-line
const fontawesomeTypes = require('@fortawesome/fontawesome-free/js/all');
// eslint-disable-next-line
const bootStrapTypes = require('bootstrap/dist/css/bootstrap.min.css');


// import "./styles.css";
const containerStyle: CSS.Properties = {
  width: "100vw",
  height: "100vh"
}

function Editor() {

  const divRef: RefObject<HTMLInputElement> = createRef()

  useEffect(() => {
    divRef.current && createEditor(divRef.current);
  })

  return (
    <div
      style={containerStyle}
      ref={divRef}
    />
  );
}



const rootElement = document.getElementById("root");
ReactDOM.render(<Editor />, rootElement);
