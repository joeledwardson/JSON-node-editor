import * as Rete from "rete";
import * as Controls from "../controls/controls";
import * as Data from "../data/attributes";
import * as MapInt from "./mapInterface";
import * as Pos from "./positional";
import { anySchema, MyJSONSchema } from "../jsonschema";
import { BaseComponent, getConnectedData } from "./base";
import { DynamicDisplay } from "./displayDynamic";


export class SchemaComponent extends BaseComponent {
  data = { component: DynamicDisplay };
  schema: MyJSONSchema;
  socket: Rete.Socket | null; // socket for parent connection
  constructor(name: string, schema: MyJSONSchema, socket: Rete.Socket | null) {
    super(name);
    this.schema = schema;
    this.socket = socket;
  }

  /** add parent input */
  addParent(node: Rete.Node): void {
    if (this.socket) {
      node.addInput(new Rete.Input("parent", "Parent", this.socket));
    }
  }
  
  /** get schema from node connection to input if exists */
  getConnectedSchema(node: Rete.Node): MyJSONSchema | undefined {
    // find connection to "parent" input
    let connection = node
      .getConnections()
      .find((c) => c.input.node === node && c.input.key === "parent");
    if (connection && connection.output.node) {
      // get output map matching connection output
      let connMap = Data.getOutputMap(connection.output.node).find(
        (m) => m.hasOutput && m.outputKey === connection?.output.key
      );
      // check schema map and selected schema exist
      if (connMap && connMap.selectValue && connMap.schemaMap) {
        // check selected schema exists in map
        if (connMap.selectValue in connMap.schemaMap) {
          return connMap.schemaMap[connMap.selectValue];
        }
      }
    }
    return undefined;
  }

  /** get output map for core type (null, boolean, number, string, integer) */
  getCoreMap(
    schema: MyJSONSchema,
    maps: Data.DataMap[],
    node: Rete.Node,
    editor: Rete.NodeEditor
  ): Data.DataMap {
    let firstMap: Data.DataMap = {};
    if (maps.length >= 1) {
      // if node data exists already then retrieve it
      firstMap = maps.splice(0, 1)[0];
      // (remove any existing controls incase name is changed when setCoreMap() called)
      MapInt.removeMapItems(node, firstMap, editor);
    }
    // reset map values with new name "input"
    MapInt.setCoreMap(firstMap, "input", schema);
    return firstMap;
  }

  /** get items schema for array type */
  getArrayAttrSchema(schema: MyJSONSchema): MyJSONSchema {
    if (
      // schema.attributesNotDefined !== true &&
      typeof schema["items"] === "object" &&
      !Array.isArray(schema["items"])
    ) {
      // if "items" is a valid object then use it
      return schema["items"];
    } else {
      return anySchema;
    }
  }

  /** get output maps for array type */
  getArrayMaps(
    schema: MyJSONSchema,
    attrSchema: MyJSONSchema,
    maps: Data.DataMap[],
    node: Rete.Node,
    editor: Rete.NodeEditor
  ): Data.DataMap[] {
    let newMaps: Data.DataMap[] = [];
    maps.forEach((o) => {
      if (o.coreName) {
        // if name valid then update map using existing name
        MapInt.setElementaryMap(o, attrSchema, o.coreName);
      } else {
        // name invalid - clear items and use a new name
        MapInt.removeMapItems(node, o, editor);
        let newName = Pos.getNextCoreName(node);
        MapInt.setElementaryMap(o, attrSchema, newName);
      }
      newMaps.push(o);
    });
    return newMaps;
  }

  /** get items schema for object type */
  getObjectAttrSchema(schema: MyJSONSchema) {
    if (
      // schema.attributesNotDefined !== true &&
      typeof schema.additionalProperties === "object" &&
      !Array.isArray(schema.additionalProperties)
    ) {
      return schema.additionalProperties;
    } else {
      return anySchema;
    }
  }

  /** get output maps for object type */
  getObjectMaps(
    schema: MyJSONSchema,
    attrSchema: MyJSONSchema,
    maps: Data.DataMap[],
    node: Rete.Node,
    editor: Rete.NodeEditor
  ): Data.DataMap[] {
    let newMaps: Data.DataMap[] = [];

    if (schema.properties) {
      // get list of required properties or empty array
      let required: string[] = [];
      if (schema["required"] && Array.isArray(schema["required"])) {
        required = schema["required"];
      }

      // loop properties
      Object.entries(schema.properties).forEach(([key, property], index) => {
        if (!(typeof property === "object")) {
          return;
        }
        let oMap: Data.ObjectMap = {};

        // check if matching entry exists
        let mapIndex = maps.findIndex((m) => m.nameValue == key);
        if (mapIndex >= 0) {
          // copy to map object
          oMap = maps.splice(mapIndex, 1)[0];
          if (!oMap.coreName) {
            // remove map items if core name invalid
            MapInt.removeMapItems(node, oMap, editor);
          }
        }

        // use existing core name if valid else get a new one
        let name = oMap.coreName ?? Pos.getNextCoreName(node);
        MapInt.setFixedObjectMap(oMap, key, required, property, name);
        newMaps.push(oMap);
      });
    }

    if (schema["additionalProperties"] !== false) {
      // if additional properties are allowed, loop remaining data and add as dynamic outputs
      let index = 0;
      while (index < maps.length) {
        let m = maps[index];
        if (m.coreName) {
          // set to dynamic output with existing core name
          MapInt.setDynamicObjectMap(m, m.coreName, attrSchema);
          newMaps.push(m);
          // splice from existing list
          maps.splice(index, 1);
        } else {
          // name invalid, increment index
          index++;
        }
      }
    }

    return newMaps;
  }
  /** "add item" button requirement checker
   * for JSON objects, if additional properties is a schema or undefined then additional properties are allowed
   *  The only case where additional properties are not allowed if `additionalProperties` is false
   * 
   * For JSON arrays, where `items` is a schema object (or undefined) this is used for all items hence additional items are allowed
   *  If `items` is an array of schemas then it is a tuple. In this case:
   *    If `additionalItems` is undefined or a valid schema then additional items are allowed
   *    If `additionalItemd` then only tuple properties are allowed
   */
  needAddButton(schema: MyJSONSchema): boolean {
    return (
      (schema.type === "object" && schema.additionalProperties !== false) ||
      (schema.type === "array" &&
        (schema.items === undefined ||
          (typeof schema.items === "object" && !Array.isArray(schema.items)) ||
          (typeof schema.items === "object" &&
            Array.isArray(schema.items) &&
            schema.additionalItems !== false)))
    );
  }
  /** build "add item" button for additional properties/items */
  buildAddButton(
    node: Rete.Node,
    editor: Rete.NodeEditor
  ): Controls.ButtonControl {
    let props: Controls.ButtonInputs = {buttonInner: "Add Item +"}
    return new Controls.ButtonControl(
      "add-button",
      props,
      () => Pos.elementAdd(node, editor, Data.getOutputMap(node).length)
    );
  }
  internalBuilder(node: Rete.Node, editor: Rete.NodeEditor): void {
    this.addParent(node);

    // use component schema (on node connected this can be updated)
    let schema: MyJSONSchema = this.getConnectedSchema(node) ?? this.schema;
    let typ = schema.type;

    let maps = Data.getOutputMap(node);
    let newMaps: Data.DataMap[] = []; // new output map
    let attrSchema: MyJSONSchema | undefined = undefined;

    if (typ && !Array.isArray(typ) && ["null", "boolean", "number", "integer", "string"].includes(typ)) {
      // type is basic
      newMaps.push(this.getCoreMap(schema, maps, node, editor));
    } else if (typ === "array") {
      // array type
      attrSchema = this.getArrayAttrSchema(schema);
      let arrayMaps = this.getArrayMaps(schema, attrSchema, maps, node, editor);
      newMaps.push(...arrayMaps);
    }
    if (typ === "object") {
      // object type
      attrSchema = this.getObjectAttrSchema(schema);
      let objMaps = this.getObjectMaps(schema, attrSchema, maps, node, editor);
      newMaps.push(...objMaps);
    }

    if (this.needAddButton(schema)) {
      node.addControl(this.buildAddButton(node, editor));
    }

    // set component and inner attributes schema
    let attrs = Data.getGeneralAttributes(node);
    attrs.componentSchema = schema;
    attrs.attributeSchema = attrSchema;

    // remove unused map items
    maps.forEach(m => MapInt.removeMapItems(node, m, editor));

    // add new map items
    newMaps.forEach((oMap) => MapInt.createMapItems(node, oMap, editor));
    Data.setOutputMap(node, newMaps);
  }

  getData(node: Rete.Node, editor: Rete.NodeEditor) {
    /**
     * retrieve data from an output map
     *
     * if it has a valid output with connection, data will be retrieved from connected node
     * if fixed value is nulled, return null
     * otherwise return stored data value
     */
    const getValue = (oMap: Data.DataMap) => {
      let output: Rete.Output | undefined = undefined;
      if (oMap.outputKey) {
        output = node.outputs.get(oMap.outputKey);
      }
      if (output && output.hasConnection()) {
        return getConnectedData(output, editor);
      } else if (oMap.isNulled) {
        return null;
      } else if (oMap.dataValue !== undefined) {
        return oMap.dataValue;
      } else {
        return null;
      }
    };
    let outputMaps = Data.getOutputMap(node);

    if (this.schema.type === "object") {
      // for objects, return data in key value pairs
      return Object.fromEntries(
        outputMaps.map((oMap) => [oMap.nameValue, getValue(oMap)])
      );
    } else if (this.schema.type === "array") {
      // for arrays, return data as a list
      return outputMaps.map((oMap) => getValue(oMap));
    } else if (outputMaps.length >= 1) {
      // for anything else, should be 1 entry with a data value
      return getValue(outputMaps[0]);
    } else {
      return null;
    }
  }
}

export class RootComponent extends SchemaComponent {
  addParent(node: Rete.Node): void {} // root component has no parent
  internalBuilder(node: Rete.Node, editor: Rete.NodeEditor) {
    // modify schema so that it is presented as mapped output named "data"
    this.schema = {
      type: "object",
      properties: {
        data: this.schema,
      },
      required: ["data"],
      additionalProperties: false,
    };
    super.internalBuilder(node, editor);
  }
  getData(node: Rete.Node, editor: Rete.NodeEditor) {
    // data is expected to an object with a single entry with key "data", otherwise return null
    let dat = super.getData(node, editor);
    if(dat && typeof dat === "object" && !Array.isArray(dat)) {
      return dat["data"] ?? null;
    } else {
      return null;
    }
  }
}
