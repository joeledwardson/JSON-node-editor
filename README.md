# JSON Node Editor

Node editor based around `rete.js` framework for editing JSON data.

As opposed to editing YAML/JSON data in text format:

```JSON
{
    "a": {
        "b": 1,
        "c": "hello"
    }
}
```

the editor allows setting values in nodes, where sub-elements (like "b" and "c" to "a" above) are represented by connecting an output to subsequent nodes.

### Schema

The editor supports JSON editing via a schema. 



JSON Schema definitions is taken from here (Release 2019-09): https://json-schema.org/understanding-json-schema/UnderstandingJSONSchema.pdf 

Known limitations

- `#ref` must conform to standardised form: `#/.../.../<refName>` 

- foreign schemas not supported

- Schema composition:

  - currently `anyOf` supported, but not the following:
    - `allOf`
    - `oneOf`
    - `not`

- JSON `object`

  - `properties` not supported , only `additionalProperties` like a Python `dictionary`
  - Keywords not supported on html user input:
    - `patternProperties`
    - `propertyNames`
    - `minProperties`
    - `maxProperties`

- JSON `integer`

  - Input only validated if numeric, not if integer

- JSON `number`:

  - The following keywords not validated on html user input:
    - `multipleOf`
    - `minimum`
    - `exclusiveMinimum`
    - `maximum` 
    - `exclusiveMaximum`

- JSON `array` types

  - *tuple validation* not supported where `items` is specified as a list, only `list validation`, where `items` is a JSON `object` schema
  - Keywords unsupported
    - `additionalItems`
    - `contains`
    - `minItems`
    - `maxItems`
    - `uniqueItems`

- `enumerations`

  

> Output JSON can be validated against schema, just not in html input



### Components

Each element in JSON is represented by a visual node in the editor - this could be a complex object or just a number or a string. By default a set of core components are provided as standard

**Text Component**

The text component provides a text area for input

**Number Component**

Input restricted to numeric values

**Boolean Component**

Boolean components provide a dropdown selection for `True` and `False`, with an option for blank (null)

**Select Component**

Dropdown component, same as Boolean, except the user specifies the options to display

 ### Elementary Components

Elementary components have individual outputs representing a single element, to be connecting to another node where data is entered.

For each output, functionality is provided to:

- **Insert** a new output directly after
- **Delete** the output
- Move the output ***up*** in the list 
- Move the output ***down*** in the list

(insert diagram how schema is passed down tree)

### Named Components

Named components are defined in the schema 

