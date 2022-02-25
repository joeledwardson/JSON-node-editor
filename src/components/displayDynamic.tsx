import * as Rete from "rete";
import * as Controls from "../controls/controls";
import * as Data from "../data/attributes";
import * as Display from "./displayBase";
import * as ReactRete from "rete-react-render-plugin";
import * as Pos from './positional';
import { ReteReactControl } from "rete-react-render-plugin";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faMouse,
  faPlus,
  faTimes,
  faTrash
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";


export class DynamicDisplay extends ReactRete.Node {
  /** process object member null button click -  */
  nullButtonClick(oMap: Data.ObjectMap): void {
    // ignore click if output has a connection
    let output: Rete.Output | null = null;
    if (oMap.outputKey) {
      output = this.props.node.outputs.get(oMap.outputKey) ?? null;
    }

    if (output && output.hasConnection()) {
      return;
    }

    // if not "null" then user is clicking to null, delete all connections
    if (!oMap.isNulled) {
      if (output) {
        output.connections.forEach((c) => this.props.editor.removeConnection(c)
        );
      }
    }

    // invert "null" value
    oMap.isNulled = !oMap.isNulled;

    // update node and connections
    this.props.node.update();
    this.props.editor.view.updateConnections({ node: this.props.node });
    this.props.editor.trigger("process");
  }

  getPositionalButtons(index: number): JSX.Element {
    return (
      <div className="output-item-controls">
        <div className="output-item-arrows">
          <div>
            <button
              onClick={() => Pos.elementUp(this.props.node, this.props.editor, index)}
            >
              <FontAwesomeIcon icon={faChevronUp} size="xs" />
            </button>
          </div>
          <div>
            <button
              onClick={() => Pos.elementDown(this.props.node, this.props.editor, index)}
            >
              <FontAwesomeIcon icon={faChevronDown} size="xs" />
            </button>
          </div>
        </div>
        <Button
          variant="light"
          className=""
          size="sm"
          onClick={() => Pos.elementAdd(this.props.node, this.props.editor, index)}
        >
          <FontAwesomeIcon icon={faPlus} />
        </Button>
        <Button
          variant="warning"
          className=""
          size="sm"
          onClick={() => Pos.elementRemove(this.props.node, this.props.editor, index)}
        >
          <FontAwesomeIcon icon={faTrash} />
        </Button>
      </div>
    );
  }

  /** set control disabled prop if props are valid */
  setControlDisabled(control: Rete.Control, disabled: boolean): void {
    if(control instanceof ReteReactControl &&
        typeof control.props === "object" &&
        !Array.isArray(control.props)
        ) {
      // cast control to template form (to access "disabled" prop)
      (control.props as Controls.BaseProps).display_disabled = disabled;
    }
  }

  getMappedOutput(oMap: Data.DataMap, index: number): JSX.Element {
    let control: Rete.Control | null = null;

    // get name element
    let nameElement: JSX.Element = <div></div>;
    if (oMap.hasFixedName) {
      // name element fixed - use static name, non editable
      nameElement = <span className="me-1 ms-1">{oMap.nameDisplay}</span>;
    } else if (oMap.hasNameControl && oMap.nameKey) {
      // name element editable - display control
      control = this.props.node.controls.get(oMap.nameKey) ?? null;
      if (control) {
        nameElement = Display.getControl(control, this.props.bindControl);
      }
    }

    // create positional / nullable element
    let dynamicElement: JSX.Element = <div></div>;
    if (oMap.canMove) {
      // get up/down buttons
      dynamicElement = this.getPositionalButtons(index);
    } else if (oMap.isNullable) {
      // if item is nullable, display null/un-null button
      let btnIcon = oMap.isNulled ? faMouse : faTimes;
      dynamicElement = (
        <Button
          variant="secondary"
          size="lg"
          className="display-button"
          onClick={() => this.nullButtonClick(oMap)}
        >
          <FontAwesomeIcon icon={btnIcon} />
        </Button>
      );
    }

    // get output socket
    let socketElement = <div></div>;
    let output: Rete.Output | null = null;
    if (oMap.hasOutput && oMap.outputKey) {
      output = this.props.node.outputs.get(oMap.outputKey) ?? null;
      if (output) {
        socketElement = Display.getSocket(
          output,
          "output",
          this.props.bindSocket,
          {
            visibility: oMap.isNulled ? "hidden" : "visible", // dont display if output nulled
          }
        );
      }
    }

    // get data value/control
    let dataElement = <div></div>;
    if(oMap.hasFixedData) {
      dataElement = <div>{oMap.dataValue}</div>
    } else if(oMap.hasDataControl && oMap.dataKey) {
      control = this.props.node.controls.get(oMap.dataKey) ?? null;
      // check props are a valid object
      if (control) {
        // set disabled true if has connection or is nulled
        let disabled = (output && output.hasConnection()) || oMap.isNulled;
        this.setControlDisabled(control, Boolean(disabled));

        // encapsulate with key as type & disabled so that if control type changes or disables, react will re-render
        let key = `${oMap?.schema?.type} ${disabled}`;
        dataElement = (
          <div key={key}>
            {Display.getControl(control, this.props.bindControl)}
          </div>
        );
      }
    }1

    // get type select control
    let selectElement = <div></div>;
    if (oMap.hasSelectControl && oMap.selectKey) {
      let selectControl = this.props.node.controls.get(oMap.selectKey);
      if (selectControl) {
        // disable type select if nulled
        let disabled = Boolean(oMap.isNulled)
        this.setControlDisabled(selectControl, disabled);
        // use disabled in key to prompt react to update
        selectElement = <div key={`select ${disabled}`}>{Display.getControl(
          selectControl,
          this.props.bindControl
        )}</div>
      }
    }

    return (
      <div className="dynamic-output" key={oMap.reactKey}>
        {nameElement}
        {dataElement}
        {dynamicElement}
        {selectElement}
        {socketElement}
      </div>
    );
  }

  /** render elementary outputs with their mapped controls */
  renderMappedOutputs(): JSX.Element[] {
    let outputMaps = Data.getOutputMap(this.props.node);
    return outputMaps.map((o, i) => this.getMappedOutput(o, i));
  }

  renderUnmappedControls(): JSX.Element[] {
    let outputMaps = Data.getOutputMap(this.props.node);
    return Array.from(this.props.node.controls.values())
      .filter(
        (ctrl) => !outputMaps.find((o) => [o.dataKey, o.nameKey, o.selectKey].includes(ctrl.key)
        )
      )
      .map((c) => Display.getControl(c, this.props.bindControl));
  }

  render() {
    return Display.renderComponent(
      this.props,
      this.state,
      () => this.renderMappedOutputs(),
      () => this.renderUnmappedControls()
    );
  }
}
