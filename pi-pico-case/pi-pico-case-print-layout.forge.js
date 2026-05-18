// Print-ready layout for FDM (K1 Max etc.):
//   - Case: cavity-up, sits at origin (bottom at z=0). The shelled cavity opens upward.
//   - Lid: engraving-up, plug-down. Placed beside the case along +Y; gap derived from bbox
//     so changes to outer dims propagate automatically (no hardcoded 26.8).

const main = require("./pi-pico-case.forge.js", {
  "Lift lid above case for visualization": 0,
});
const [caseBody, lidStacked] = main;

const lidOnBed = lidStacked.placeReference("bottom", [0, 0, 0]);

const gap = 6.0;
const caseBox = caseBody.boundingBox();
const lidBox = lidOnBed.boundingBox();
const caseY = caseBox.max[1] - caseBox.min[1];
const lidY = lidBox.max[1] - lidBox.min[1];
const yOffset = caseY / 2 + gap + lidY / 2;

const lid = lidOnBed.translate(0, yOffset, 0);

return group(caseBody, lid);
