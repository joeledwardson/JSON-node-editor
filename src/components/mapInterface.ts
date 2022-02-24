import * as Rete from "rete";
import * as Sockets from "../sockets/sockets";
import * as Controls from "../controls/controls";
import * as Data from "../data/attributes";
import { ReteReactControl } from "rete-react-render-plugin";
import { JSONTypeMap } from "../jsonschema";
import { MyJSONSchema } from "../jsonschema";

export const getReactKey = (coreName: string) => `k-${coreName}`;  // generate react key
export const getDataKey = (coreName: string) => `${coreName} input`; // generate data input control key
export const getOutputKey = (coreName: string) => `${coreName} output`; // generate node output key
export const getTypeKey = (coreName: string) => `${coreName} type`; // generate type select control key
export const getNamekey = (coreName: string) => `${coreName} name`; // generate name control key

/** get control data handler for name editing */
function getNameHandler(oMap: Data.DataMap): Controls.DataHandler {
  return (
    ctrl: ReteReactControl,
    emitter: Rete.NodeEditor,
    key: string,
    data: any
  ) => {
    ctrl.props.value = data;
    oMap.nameValue = data;
    emitter.trigger("process");
    ctrl.update && ctrl.update();
  };
};

/** get control handler for data input editing */
function getValueHandler(oMap: Data.DataMap): Controls.DataHandler {
  return (
    ctrl: ReteReactControl,
    emitter: Rete.NodeEditor,
    key: string,
    data: any
  ) => {
    ctrl.props.value = data;
    oMap.dataValue = data;
    emitter.trigger("process");
    ctrl.update && ctrl.update();
  };
};

/** get control handler for type selection */
function getTypeSelectHandler(node: Rete.Node, oMap: Data.DataMap): Controls.DataHandler {
  return (
    ctrl: ReteReactControl,
    editor: Rete.NodeEditor,
    key: string,
    data: any
  ) => {
    ctrl.props.value = data;
    oMap.selectValue = data;

    let schema = null;
    if (oMap.schemaMap && data in oMap.schemaMap) {
      // set mapped schema if selected value exists in map
      schema = oMap.schemaMap[data];
    }
    // update core map for data control/value with new selected schema
    if(oMap.coreName) {
      setCoreMap(oMap, oMap.coreName, schema, false)
    } else {
      throw new Error(`map with new type value ${data} does not have core name`);
    }
    //re-create map items
    createMapItems(node, oMap, editor);
    editor.trigger("process");
    if (ctrl.update) {
      ctrl.update();
    }
    if (node.update) {
      node.update();
    }
  };
};


/** get mapped data value based on type
 * try existing value, then default, then 0/""/false based on type
 * if type is invalid, return undefined
 */
function getDataValue(value: any, typ: string, default_value: any): any {
  let checks: Array<{
    use: () => boolean,
    validator: (value: any) => boolean, 
    get_default: () => any
  }> = [
    {
      use: () => typ === "integer" || typ === "number",
      validator: (val: any) => !(isNaN(val)),
      get_default: () => 0
    },
    {
      use: () => typ === "string",
      validator: (val: any) => typeof val === "string",
      get_default: () => ""
    },
    {
      use: () => typ === "boolean",
      validator: (val: any) => typeof val === "boolean",
      get_default: () => false
    },
    {
      use: () => typ === "null",
      validator: () => false,
      get_default: () => null,
    }
  ]
  for(const check of checks) {
    if(check.use()) {
      if(check.validator(value)) {
        return value;
      } else if(check.validator(default_value)) {
        return default_value;
      } else {
        return check.get_default();
      }
    }
  }
  return undefined;
}


/** set core attributes of mapped output */
export function setCoreMap(
  oMap: Data.DataMap,
  coreName: string,
  property: MyJSONSchema | null,
  disableAdditional: boolean = true
) {
  let dataValue: any = null;
  let hasFixedData = false;
  let hasControl = false;

  if (property !== null) {
    if (property.const !== undefined) {
      // const specified, fixed
      dataValue = property.const;
      hasFixedData = true;
    } else {
      let typ = property.type;
      if(typeof typ === "string") {
        // type is valid string, get data for matching type
        dataValue = getDataValue(oMap.dataValue, typ, property.default);
        if(typ !== "null") {
          // use data control if type non-null
          hasControl = true;
        }
      }
    }
  }

  oMap.coreName = coreName;
  oMap.reactKey = getReactKey(coreName);
  oMap.hasDataControl = hasControl;
  oMap.dataKey = getDataKey(coreName);
  oMap.hasFixedData = hasFixedData;
  oMap.dataValue = dataValue;
  oMap.schema = property;

  // disable additional functions
  if(disableAdditional) {
    oMap.canMove = false;
    oMap.hasFixedName = false;
    oMap.hasOutput = false;
    oMap.hasSelectControl = false;
    oMap.hasNameControl = false;
    oMap.isNullable = false;
  }
}

/** set elementary attributes of mapped output */
export function setElementaryMap(
  oMap: Data.ElementaryMap,
  property: MyJSONSchema | null,
  coreName: string,
  nameDisplay: string | null = null,
  canMove: boolean = true,
  hasFixedName: boolean = false
) {
  let schemaMap: { [key in string]: MyJSONSchema } = {};
  const addToMap = (schema: MyJSONSchema): void => {
    let namedId = schema.customNodeIdentifier;
    if (namedId && typeof namedId === "string") {
      // check for named schema
      schemaMap[namedId] = schema;
      return;
    }

    if(schema.const !== undefined) {
      // increment index to produce "const" name until unique 
      let i = 1;
      let name = "";
      do {
        name = `Const ${i}`;
      } while (name in schemaMap);
      // assign const to schema
      schemaMap[name] = schema;
      return;
    }

    if (typeof schema.type === "string" && schema.type in JSONTypeMap) {
      // check if type is valid
      let name = JSONTypeMap[schema.type];
      schemaMap[name] = schema;
      return;
    }

    if (typeof schema.type === "object" && Array.isArray(schema.type)) {
      // loop list of types
      schema.type.forEach((t) => {
        if (typeof t === "string" && t in JSONTypeMap) {
          // create new schema with type as a constant rather than an array
          const newSchema: MyJSONSchema = JSON.parse(JSON.stringify(schema));
          let name = JSONTypeMap[t];
          newSchema.type = t;
          schemaMap[name] = newSchema;
        }
      });
      return;
    }

    if (typeof schema.anyOf === "object" && Array.isArray(schema.anyOf)) {
      // process anyOf array
      schema.anyOf.forEach((s) => {
        if(typeof s === "object") addToMap(s)
      });
    }
    if (typeof schema.oneOf === "object" && Array.isArray(schema.oneOf)) {
      // process oneOf array
      schema.oneOf.forEach((s) => {
        if(typeof s === "object") addToMap(s)
      });
    }
  };
  if (property) {
    addToMap(property);
  }

  let schema: MyJSONSchema | null = oMap.schema ?? null;
  let selectValue: string | null = oMap.selectValue ?? null;

  if (selectValue && selectValue in schemaMap) {
    // leave select value unchanged
    schema = schemaMap[selectValue];
  } else {
    // clear selected in case list empty
    selectValue = null;
    schema = null;

    // take first in list
    for (const key in schemaMap) {
      selectValue = key;
      schema = schemaMap[key];
      break;
    }
  }

  setCoreMap(oMap, coreName, schema);
  oMap.canMove = canMove;
  oMap.hasFixedName = hasFixedName;
  oMap.nameDisplay = nameDisplay;
  oMap.hasOutput = true;
  oMap.outputKey = getOutputKey(coreName);
  oMap.schemaMap = schemaMap;
  oMap.hasSelectControl = true;
  oMap.selectValue = selectValue;
  oMap.selectKey = getTypeKey(coreName);
}

/** set mapped attributes for object properties */
export function setFixedObjectMap(
  oMap: Data.DataMap,
  key: string,
  required: string[],
  property: MyJSONSchema,
  coreName: string
) {
  let nullable = false;
  let isNulled = false;

  if (!required.includes(key) && !(property && typeof property === "object" && property.const !== undefined)) {
    // property not in required
    nullable = true;

    if (oMap.isNulled === undefined) {
      // only set value if it doesnt already exist in map data

      if (property["default"] === null) {
        // nulled if schema default is null
        isNulled = true;
      } else if (property["default"] === undefined) {
        // pydantic will not set a JSON "default" value if default "None" is provided, hence checking for default "undefined"
        isNulled = true;
      } else {
        isNulled = false;
      }
    } else {
      // use existing value
      isNulled = oMap.isNulled;
    }
  }
  let title = property["title"] ? String(property["title"]) : key;

  setElementaryMap(oMap, property, coreName, title, false, true);
  oMap.hasNameControl = false;
  oMap.nameKey = getNamekey(coreName);
  oMap.nameValue = key;
  oMap.isNullable = nullable;
  oMap.isNulled = isNulled;
}

/** set mapped attributes for dynamic object property (i.e. specified by additionalProperties) */
export function setDynamicObjectMap(
  oMap: Data.DataMap,
  coreName: string,
  property: MyJSONSchema | null
) {
  setElementaryMap(oMap, property, coreName, null, true, false);
  oMap.hasNameControl = true;
  oMap.nameKey = `${coreName} name`;
  oMap.nameValue = oMap.nameValue ?? "";
  oMap.isNullable = false;
  oMap.isNulled = false;
}


/** create node control(s) and output as specified by map */
export function createMapItems(
  node: Rete.Node,
  oMap: Data.DataMap,
  editor: Rete.NodeEditor
) {

  // remove control if exists
  const removeControl = (key: string | undefined | null) => {
    if (key) {
      let control = node.controls.get(key);
      if (control) {
        node.removeControl(control);
      }
    }
  };

  // remove name control if not needed
  if (!oMap.hasNameControl) {
    removeControl(oMap.nameKey);
  }
  if (oMap.hasNameControl && oMap.nameKey) {
    // name control required
    if (!node.controls.get(oMap.nameKey)) {
      // add control with same key as output and blank value
      node.addControl(
        new Controls.TextControl(
          oMap.nameKey,
          editor,
          node,
          { value: oMap.nameValue || "" },
          getNameHandler(oMap)
        )
      );
    }
  }

  // remove data control if exists
  if (!oMap.hasDataControl) {
    removeControl(oMap.dataKey);
  }
  if (oMap.hasDataControl && oMap.dataKey) {
    let newControl = true; // assume we need a new value control
    let control = node.controls.get(oMap.dataKey); // get existing control instance
    let typ: string | null = null;

    if (
      oMap.schema &&
      oMap.schema?.type &&
      typeof oMap.schema?.type === "string"
    ) {
      // type is a valid string
      typ = oMap.schema?.type;
    }

    // control matches specified type
    let controlValid: boolean =
      (typ === "string" && control instanceof Controls.TextControl) ||
      ((typ === "number" || typ === "integer") &&
        control instanceof Controls.NumberControl) ||
      (typ === "boolean" && control instanceof Controls.BoolControl);

    if (control) {
      if (controlValid) {
        // control valid, no need for new control
        newControl = false;
      } else {
        // if control does not match specified type then remove it
        node.removeControl(control);
        if (node.update) node.update();
      }
    }

    if (newControl) {
      // create new value control if required
      if (typ === "string") {
        node.addControl(
          new Controls.TextControl(
            oMap.dataKey,
            editor,
            node,
            { value: oMap.dataValue, display_disabled: oMap.isNulled },
            getValueHandler(oMap)
          )
        );
      } else if (typ === "number" || typ === "integer") {
        node.addControl(
          new Controls.NumberControl(
            oMap.dataKey,
            editor,
            node,
            { value: oMap.dataValue, display_disabled: oMap.isNulled },
            getValueHandler(oMap)
          )
        );
      } else if (typ === "boolean") {
        node.addControl(
          new Controls.BoolControl(
            oMap.dataKey,
            editor,
            node,
            { value: oMap.dataValue, display_disabled: oMap.isNulled },
            getValueHandler(oMap)
          )
        );
      }
    }
  }

  // remove select control if not required
  if (!oMap.hasSelectControl) {
    removeControl(oMap.selectKey);
  }
  if (oMap.schemaMap && oMap.selectKey && !node.controls.get(oMap.selectKey)) {
    // convert schema map keys to label/value pairs
    let options: Controls.OptionLabel[] = Object.keys(oMap.schemaMap).map(
      (k) => {
        return { label: k, value: k };
      }
    );
    // generate type select control
    let control = new Controls.SelectControl(oMap.selectKey, editor, node, {
      value: oMap.selectValue,
      options: options,
    }, getTypeSelectHandler(node, oMap));
    node.addControl(control);
  }

  // remove output if unrequired
  if (!oMap.hasOutput && oMap.outputKey) {
    let output = node.outputs.get(oMap.outputKey);
    if (output) {
      output.connections.forEach((c) => editor.removeConnection(c));
      node.removeOutput(output);
    }
  }

  let oKey = oMap.outputKey;
  let selVal = oMap.selectValue;
  if (oMap.hasOutput && oKey && selVal) {
    // output specified and output key/type select are non-null
    let output = node.outputs.get(oKey);
    let socket = Sockets.sockets.get(selVal)?.socket;
    let createOutput = true;  // assume new output creation
    
    if (output && output.socket !== socket) {
      // existing output doesnt match socket, remove it
      node.removeOutput(output);
    } else if (output && socket && output.socket === socket) {
      // output matches socket, no need for new output creation
      createOutput = false;
    }
    if (createOutput && socket) {
      // create output if required and socket valid
      node.addOutput(new Rete.Output(oKey, oKey, socket));
    }
  }
}


/** remove all control(s) and output specified by map */
export function removeMapItems(
  node: Rete.Node,
  oMap: Data.DataMap,
  editor: Rete.NodeEditor
) {
  let control: Rete.Control | undefined = undefined;
  if (oMap.nameKey) {
    control = node.controls.get(oMap.nameKey);
    if (control) {
      node.removeControl(control);
    }
  }

  if (oMap.dataKey) {
    control = node.controls.get(oMap.dataKey);
    if (oMap.dataKey && control) {
      node.removeControl(control);
    }
  }

  if (oMap.outputKey) {
    let output = node.outputs.get(oMap.outputKey);
    if (output) {
      // remove connections from view
      output.connections.map((c) => editor.removeConnection(c));
      node.removeOutput(output);
    }
  }

  if (oMap.selectKey) {
    control = node.controls.get(oMap.selectKey);
    if (control) {
      node.removeControl(control);
    }
  }
}
