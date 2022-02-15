## 15/02/22

Leaning towards using a reference parser to parse the schema given how complicated it is: However, would still want named components where they are used as #refs

One method could be that I use a schema parser, but navigate through the original unchanged schema but refer to the parsed schema when encountering a #ref

Few cases where a ref points to another ref?

``` json
{
    $id: "https://example.com/schemas/customer",
    type: "object",
    properties: {
      first_name: { $ref: "#/$defs/name" },
      last_name: { $ref: "#/$defs/name" },
    },
    required: [
      "first_name",
      "last_name",
      "shipping_address",
      "billing_address",
    ],
    $defs: {
      name: { $ref: "#/$defs/pls" },
      pls: { type: "string" },
    },
  }
```

For example, the socket for `name` would not work as it is `pls` that is the actual definition

Could do a completely different approach - similar to suggested first:

- schema parser all the refs first
- combine schema allofs

So, traverse through the original schema - firstly, would need to resolve external schemas into a single schema (without resolving $refs) - then collect all the "\$ defs" so create sockets.

- perhaps shouldn't even create the definitions for nodes until they are created

- a generic builder looks at "type" - will create a single control for basic types

  - for object and list, can create dynamic nodes like have been doing
  - Nodes will all the same builder function, but will have a set schema like `{type: number}` or something like that - this can be overriden when connected to a node

- SO steps are

  1. resolve external schemas

  2. create sockets for named defs (note that for type selection, will need to resolve that some named types are just integers so can show control in Objects/arrays)

     

A remaining problem is that need to view defs after resolving the schema to be able to create an empty node - i.e. to create node `#MyObject` need to know its internal schema (resolved, in-case it points to another definition like above)

- however, schema resolver does not resolve defs, only shows them in-place
- a way to solve this could be to make a "dummy" schema - once external references are resolved, we manually override `properties` to create an instance of each `$ref` so its fully resolved schema can be read

So... the steps are:

1. resolve external schemas
2. resolve allofs (dont know what name it will use when combining named schemas?)
3. copy schema to new dummy schema with `properties` set to each `$def`, 
4. resolve dummy schema - loop properties and set named node component schemas
   1. What about where one `#ref` refers to another `ref`?
   2. Or where ref is an object with references to another `#ref`?

Ok... what about?

1. Resolve external schemas

2. enter custom key to denote defs, e.g. for each `#def` could add a key `defIdentifier` to indicate it is a named definition - looks like `json-schema-ref-parser` retains custom keys

3. resolve schema refs

   1. when having type selection in Object/Array nodes can use the selection name/socket as `defIdentifier` but use the `type` for control selection

      