// v9: collision check using the OFFICIAL Pi Pico R3 STEP file (slow but exact).
// Coordinate frame conversion (STEP corner-origin → our case-centered frame):
//   STEP X (0..21, PCB short edge)  → my Y
//   STEP Y (±0.5, PCB thickness)    → my Z
//   STEP Z (0..−51, long edge, USB at Z=0) → my X (positive)
// Equivalent rotation: rotateX(90) ∘ rotateZ(90)
// Translation: place PCB corner (STEP origin) at the +X +Y top-half corner of our case interior:
//   my X = +25.5 (USB short edge), my Y = -10.5 (one long edge), my Z = seatZ = 1.6
// Numerically that becomes translate(+25.5, -10.5, 2.1) after the +0.5 PCB-bottom shift.
setActiveBackend("occt");

const main = require("./pi-pico-case.forge.js", {
  "Lift lid above case for visualization": 0,    // closed lid
});
const [caseBody, lid] = main;

const pico = importStep("./reference/Pico-R3.step")
  .rotateX(90)
  .rotateZ(90)
  .translate(25.5, -10.5, 2.1)
  .color("#0e7f4e")
  .as("pico");

return [caseBody, lid, pico];
