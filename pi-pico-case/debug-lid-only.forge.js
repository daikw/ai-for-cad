// Debug: export lid only (closed lid position, no print-layout translation)
const main = require("./pi-pico-case.forge.js", {
  "Lift lid above case for visualization": 0,
});
const [_caseBody, lid] = main;
return [lid];
