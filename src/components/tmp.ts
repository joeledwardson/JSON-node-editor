// else if(typ === "object") {

//   // get list of required properties
//   let required: string[] = this.schema["required"] as string[] ?? [];
//   let properties = getObject(this.schema["properties"]);

//   if(properties) {
//     // loop properties
//     Object.entries(properties).forEach(([k, v], i) => {
//      let property = getObject(v);
//      if(property) {
//        let oMap = outputMaps[i];
//        if(!oMap) {
//          oMap = {};
//          outputMaps.push(oMap);
//          let coreName = new XLSXColumn(outputMaps.length).toString();
//          oMap.outputKey = `${coreName} output`;

//          // get control args with value and display disabled (common to all controls)
//          oMap.isNulled = false;
//          if(!required.includes(k)) {
//            oMap.nullable = true;
//            // property not required - set to null if default is null or no default provided
//            // pydantic will not set a JSON "default" value if default "None" is provided, hence checking for default "undefined" 
//            oMap.isNulled = property["default"] === null || property["default"] === undefined;
//          }


//          oMap.nameValue = new XLSXColumn(outputMaps.length).toString();
//            // create attribute name key
//          oMap.nameControl = `${newMap.outputKey} name`;
//        }
       

//         // pass JSON property to be processed with output null to show/hide control
//         this.process_property(node, editor, k, property, i, required.includes(k));
//       }
//     });
//   }
// }