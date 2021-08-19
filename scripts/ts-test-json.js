var y = { hello: { "type": "there" } };
Object.entries(y).forEach(function (_a) {
    var k = _a[0], v = _a[1];
    if (v && typeof v === "object" && !Array.isArray(v) && v["type"]) {
        // check for type "integer", "number", "string"
        console.log(v["type"]);
    }
});
