// Viewer helper: the Pi 4B mesh pre-transformed into its assembled position,
// so the shared viewer (which has no per-part rotation) can load it directly.
// Export: forgecad export stl viewer-pi-placed.forge.js --backend manifold \
//           --output reference/rpi4b-placed.stl
const [, pi] = require("./fit-assembly.forge.js", { "Explode lift": 0 });
return [pi];
