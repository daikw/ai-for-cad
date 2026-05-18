// Print-ready layout for FDM (K1 Max etc.):
//   - Case: cavity-up, sits at origin (bottom at z=0). The shelled cavity opens upward,
//     so the slicer needs no internal supports — only minor bridging across the USB cutout.
//   - Lid: engraving-up, plug-down. Translated so plug bottom = z=0 and placed beside the
//     case along +Y with a small gap. The lid plate's narrow rim (2.65mm) overhangs the
//     plug → slicer auto-supports will catch it.

const main = require("./pi-pico-case.forge.js", {
  "Lift lid above case for visualization": 0,
});

const [caseBody, lidStacked] = main;

// In the original .forge.js, when lidLifted=false, the lid is at z=outerH=6.0 with the plug
// hanging into the case opening. Drop the lid so its bottom-most point sits at z=0.
const lidOnBed = lidStacked.placeReference("bottom", [0, 0, 0]);

// Shift along +Y beside the case. Case is centered at origin with depth 26.8;
// lid is also centered with depth 26.8. Total gap = 6mm.
const lid = lidOnBed.translate(0, 26.8 + 6, 0);

return group(caseBody, lid);
