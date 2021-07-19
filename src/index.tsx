import React, { useEffect, useState, RefObject } from "react";
import { createRef } from "react";
import ReactDOM from "react-dom";
import { createEditor } from "./rete";

// import "./styles.css";

function Editor() {

  const divRef: RefObject<HTMLInputElement> = createRef()

  useEffect(() => {
    divRef.current && createEditor(divRef.current);
  })

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh"
      }}
      ref={divRef}
    />
  );
}



const rootElement = document.getElementById("root");
ReactDOM.render(<Editor />, rootElement);
