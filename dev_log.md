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

Plan

- Make generic component whose composition is entirely defined by schema - will create stock components for each type e.g. `{type: string}` and named components

Notes:

- can remove `outputTracker` from list in future and just use output map (**nope**)
- could split output map into different interfaces that combine together for basic components / list / object



Future

- support components defined as `anyOf` or `oneOf`

## 16/02/22

So how to resolve `const`?

If a property is a const then it shouldnt really have a socket as it will always be constant

The only problem with this is if you have named references with const? This shouldnt be a problem if named references take priority over getting socket name from the schema definition

Still outstanding

- [x] Copy data from objects across
- [ ] make type selection work to create data entry controls
- [ ] Allow named components
- [ ] schema update on connection
- [ ] lists with named tuples
- [ ] How to resolve custom names in definitions? I.e. schemas can have any name `#/$defs/` or `#/definitions/`, so need to be able to recognise that?

If I have designed the builder well enough, should just be able to override schema changes in component data and run the builder again:

- If I use this method, will need to wipe node of existing controls/outputs which shouldnt be a problem

## 17/02/22

Wondering about resolving refs myself, but it gets very complicated with multiple schemas.

A better way to handle would be to require all schemas to be combined when using the tool

At this point, I'm thinking

- Objects and arrays will have type selection at their outputs when connecting to other objects
- If so, then wont need sockets that combine other sockets as the type selection will be handled at the output?
- Socket will just become a lookup from the type or custom node identifier? Ok, I can leave socket generation for now and focus on type selection...
- Will also have to think about on dropping/adding a connection, how to not fuck with the existing outputs?
- Hmm, if a type is an `anyOf` there is still an exception case where one `#def` might point to another `#def` which is an anof, meaning any checks for `anyOf` at the point of declaration might get missed
  - Basically, if `#defs` are allowed where they can be an anyof it just makes things a bit more complex in the node creation
- Instead, when creating sockets for named attributes, can scan for anyof to combine with
- need to create sockes dynamically based off name lookup

- [ ] Should set schema be enfored? 
- [ ] builder to remove old components
- [ ] Ok, because of circular references will now have to resolve refs myself



New problem, cannot print circular referenced JSONified types to string, `JSON.stringify` throws an error:

- need to resolve this, otherwise cannot store stringified JSON data output from editor



Now adding to my list is to make select controls change the selected type

- [ ] type selection control
  - [ ] change data control based on selected type - will need to find a way of validating current control against new selected type
  - [ ] re-validate entered data stored (even if dont have a control - e.g. for object )
  - [ ] change output socket - need to detect if current output socket is the right type
- [ ] Allow named components from `$ref`
  - [ ] need to build my own `$ref` parser
- [ ] schema update on connection
  - [ ] change node schema and re-run builder
  - [ ] rather than removing all mapped outputs - clear any unused entries in existing map and re-run object creation so it replaces any controls/outputs
- [ ] lists with named tuples
- [ ] How to resolve custom names in definitions? I.e. schemas can have any name `#/$defs/` or `#/definitions/`, so need to be able to recognise that?
  - [ ] Can just have a parameter on input where to lookup custom definition locations - any others will still (hopefully) be resolved, but wont appear as named nodes

## 18/02/22

So for custom nodes, need to identify a few rules 

- Custom nodes locations must be specified, default paths are `/$defs` or `/definitions/`
- Custom nodes must have a singular type (not array of types) defined as `array` `object` `number` `integer` `bool` (or enum later)
- Custom nodes must not be `anyOf` or `oneOf`

Just thinking about map items creation and re-creation:

- if a `valueKey` is changed to null then the map creator will not create it 
- However if this is an indication of the value control being destroyed then it will persist
- A way to solve this is to use a bool flag instead that denotes whether the control is active - if false and the string is valid then destroy
- The only possible changes are between types of objects and arrays 
- [x] type selection control
  - [x] change data control based on selected type - will need to find a way of validating current control against new selected type
  - [x] re-validate entered data stored (even if dont have a control - e.g. for object )
  - [x] change output socket - need to detect if current output socket is the right type
  - [x] disable value control on connection - need to write the connection created / removed functions
- [x] initial non-required item is showing mouse but control is not disabled
  - [x] Will need to combine checks for output connections and isNulled to disable value control (should also be checking for `isNullable` when looking at `isnulled`)
- [x] Allow named components from `$ref`
  - [x] need to build my own `$ref` parser - or not, https://www.npmjs.com/package/json-pointer exists!
  - [ ] components must dynamically resolve `$ref`s 
- [ ] schema update on connection
  - [ ] change node schema and re-run builder
  - [x] rather than removing all mapped outputs - clear any unused entries in existing map and re-run object creation so it replaces any controls/outputs
  - [x] build function should remove unused parts (name/output etc)
- [ ] lists with named tuples
- [ ] How to resolve custom names in definitions? I.e. schemas can have any name `#/$defs/` or `#/definitions/`, so need to be able to recognise that?
  - [ ] Can just have a parameter on input where to lookup custom definition locations - any others will still (hopefully) be resolved, but wont appear as named nodes
- [ ] enums

## 21/02/22

How to resolve `#ref`?

Should not resolve circular references or it will break converting to JSON

However, need to keep track of schema somewhere (not in node data) as it is JSONified....

instead can just resolve refs using `json-schema-ref-parser` and the use `refs.get()` to resolve them and and when I need to

So, if the schema contains refs then will need to resolve them at runtime

What about circular?

```json
{
  $id: "https://example.com/schemas/customer",
  type: "object",
  properties: {
    first_name: { $ref: "#/$defs/name" },
    last_name: { $ref: "#/$defs/name" },
    objs: { $ref: "#/$defs/hello" },
  },
  required: ["first_name", "last_name", "shipping_address", "billing_address"],
  $defs: {
    name: { $ref: "#/$defs/pls" },
    pls: { type: "string" },
    hello: {
      type: "object",
      additionalProperties: {
        anyOf: [
          { $ref: "#/$defs/hello" },
          { type: "string" },
          { $ref: "#/$defs/hello" },
        ],
      },
    },
  },
};
```

So solution is to...

- not resolve any refs at runtime
- loop through refs specified at the start to create named components
  - named components given custom identifiers
- At different stages refs will need to be resolved, on fail (return undefined) must abort:
  - Component builder (root schema at build time)
  - looping each property within an object/list
  - elementary output  type selection

Whilst it would be easier to resolve references at the start, if they are circular this will break the whole flow - so they must be resolved on an ad-hoc basis to enable JSONifying

## 22/02/22

- [ ] How to access root schema from all nodes at any time?

## 23/02/22

So now that  `$ref`  references will be resolved dynamically, nodes will need access to the root schema.

Give this, perhaps it would be better to use schema pointers to positions in the schema, rather than holding the schema in output maps.

Could hold root schema in components - this would not be dynamic, and on changing the root schema would require all components to be updated.

The only way around this would be to have an object that can be edited?

The other issue is that if the custom keyword for base components can be edited then if the schema is changed and custom keywords components will need to be updated?

Ok, note this for a future update

- [ ] How to dynamically modify schema?
- [ ] What happens if base position for schema is modified for already created `List`/`Object` nodes?
- [ ] What happens in rete if components no longer exist in new schema?

Ok so fresh problem: In the case of `type` as an array, how would one use JSON pointers, given that you would not know which type is selected?

So could either

1. use schema Objects and create objects where there is a type array, for each index value
   1. This is simpler, but means creating more objects which could fail when JSONifying/ de-JSONifying to deep copy
2. use schema pointers but have an additional `typeSelect` value which indicates which type have selected in `type` array
   1. This means storing less data in the editor, as all you have is pointers
   2. but more complex as have to store selection type

Going to choose 1st option 

- [x] Also, should be using the JSON type map for named nodes otherwise its ambiguous
- [x] Do we still need controls data attribute?
- [ ] still need general connection functions? Just run builder on connection/disconnection

So run into a problem of resetting data control values on type selection.

Also, if type selection is const then don't want to hide it

The opposite, want to display but dont allow editing - will need additional properties in map to facilitate this

- [x] Why does `rete-context-menu-plugin`  need vue?
Context menu plugin is rendered using vue but doesn't seem to fight react.
Just need to make sure vue isn't in development mode when in production
- [x] can remove data control default handler and remove controls data attribute entirely?
Only thing that uses it is the "add item" button which doesn't need data
- [x] do really need template values for controls? Feel like any should suffice

## 24/02/22

- [x] What happens if an object in schema is a `$ref` but that is actually just data? No data contained in schema so no problem
- [x] Need to modify select controls props on schema updating - and name control props

## 25/02/22

Controls successfully refactored finally, and schema types as well

Had a problem where react textarea autosize conflicts if user tries to modify size as it moves the node

- [ ] can use `resize=none` in props to disable user access
- [ ] multi socket function redundant?

Other outstanding task list from above

- [ ] How to access root schema from all nodes at any time?
  - [ ] components must dynamically resolve `$ref`s 
- [ ] schema update on connection
  - [ ] change node schema and re-run builder
- [ ] lists with named tuples
- [ ] enums

## 26/02/22

- [ ] `react select` has `value` as well as `label` where value can be an object, so rather than indexing a schema map in node data for type select could just use the values stored in the select?
- [ ] Value check for integers?
