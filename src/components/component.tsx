import * as Rete from "rete";
import * as Controls from "../controls/controls";
import * as Data from "../data/attributes";
import * as MapInt from './mapInterface';
import * as Pos from './positional';
import { anySchema, CustomSchema } from "../jsonschema";
import { BaseComponent, getConnectedData } from "./base";
import { SomeJSONSchema } from "ajv/dist/types/json-schema";
import { DynamicDisplay } from "./displayDynamic";



/** list of available types */
export let componentsList: Array<string> = [];


export class SchemaComponent extends BaseComponent {
  data = { component: DynamicDisplay };
  schema: CustomSchema;
  socket: Rete.Socket | null;  // socket for parent connection
  constructor(name: string, schema: CustomSchema, socket: Rete.Socket | null) {
    super(name);
    componentsList.push(name);
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
  getConnectedSchema(node: Rete.Node): SomeJSONSchema | undefined {
    let connection = node
      .getConnections()
      .find((c) => c.input.node === node && c.input.key === "parent");
    if (connection && connection.output.node) {
      let connMap = Data.getOutputMap(connection.output.node).find(
        (m) => m.hasOutput && m.outputKey === connection?.output.key
      );
      if(connMap && connMap.selectValue && connMap.schemaMap) {
        if(connMap.selectValue in connMap.schemaMap) {
          return connMap.schemaMap[connMap.selectValue];
        }
      } 
    }
    return undefined;
  }
  internalBuilder(node: Rete.Node, editor: Rete.NodeEditor): void {
    this.addParent(node);
    let attrs = Data.getGeneralAttributes(node);

    // use component schema (on node connected this can be updated)
    let schema: CustomSchema = this.getConnectedSchema(node) ?? this.schema;
    attrs.componentSchema = schema; // set schema in node data
    let typ = schema.type as string;

    let outputMaps = Data.getOutputMap(node);
    let newMaps: Data.DataMap[] = []; // new output map
    let addButton: boolean = false; // flag to denote button to add dynamic component

    // check type is basic
    if (["null", "boolean", "number", "integer", "string"].includes(typ)) {
      let firstMap: Data.DataMap = {};
      if (outputMaps.length >= 1) {
        // if node data exists already then retrieve it
        firstMap = outputMaps[0];
      } else {
        // if no maps exist then add empty map to list
        MapInt.setCoreMap(firstMap, "input", schema);
      }
      newMaps.push(firstMap);
    } else if (typ === "array") {
      addButton = true;
      let attrSchema: SomeJSONSchema = anySchema;
      if (schema.attributesNotDefined !== true) {
        attrSchema = schema["items"];
      }

      outputMaps.forEach((o) => {
        let coreName = Pos.getNextCoreName(node);
        MapInt.setElementaryMap(o, attrSchema, coreName);
        newMaps.push(o);
      });
      attrs.attributeSchema = attrSchema;
    }
    if (typ === "object") {
      let attrSchema = anySchema;
      if (
        schema.attributesNotDefined !== true &&
        schema.additionalProperties !== undefined
      ) {
        attrSchema = schema.additionalProperties;
      }

      // loop properties
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, property], index) => {
          let coreName = Pos.getNextCoreName(node);
          let oMap: Data.ObjectMap = {};

          // check if matching entry exists
          let mapIndex = outputMaps.findIndex((m) => m.nameValue == key);
          if (mapIndex >= 0) {
            oMap = outputMaps[mapIndex]; // copy to map object
            outputMaps.splice(mapIndex, 1); // splice from exisitng list
          }

          // get list of required properties or empty array
          let required: string[] = [];
          if (schema["required"] && Array.isArray(schema["required"])) {
            required = schema["required"];
          }
          MapInt.setFixedObjectMap(
            oMap,
            key,
            required,
            (property as SomeJSONSchema) ?? null,
            coreName
          );
          newMaps.push(oMap);
        });
      }

      if (schema["additionalProperties"] !== false) {
        // if additional properties are allowed, loop remaining data and add as dynamic outputs
        addButton = true;
        outputMaps.forEach((o) => {
          let coreName = Pos.getNextCoreName(node); // get new core name
          MapInt.setDynamicObjectMap(o, coreName, attrSchema);
          newMaps.push(o);
        });
      }
      attrs.attributeSchema = attrSchema;
    }

    if (addButton) {
      node.addControl(
        new Controls.ButtonControl(
          "add-button",
          editor,
          node,
          {
            value: 0, // value is press count
            buttonInner: "Add Item +",
          },
          () => Pos.elementAdd(node, editor, Data.getOutputMap(node).length)
        )
      );
    }

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
      let output = oMap.outputKey ? node.outputs.get(oMap.outputKey) : null;
      if (output && output.hasConnection()) {
        return getConnectedData(output, editor);
      } else {
        if (oMap.isNulled) {
          return null;
        } else if (oMap.dataValue !== undefined) {
          return oMap.dataValue;
        } else {
          return null;
        }
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
