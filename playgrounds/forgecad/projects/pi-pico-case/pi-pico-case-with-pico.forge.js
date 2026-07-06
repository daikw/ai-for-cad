// Verification scene: case + lid + simplified Pi Pico stand-in
// (Full official STEP import works under --backend occt but is slow with the case's many
// CSG unions; this simplified model is fast and sufficient for fit verification.)

const main = require("./pi-pico-case.forge.js", {
  "Lift lid above case for visualization": 1,    // exploded view so we can see inside
});

// Simplified Pi Pico stand-in
const PCB_W = 51.0, PCB_D = 21.0, PCB_TH = 1.0;
const floorTh = 1.0, airBelow = 0.6;
const seatZ = floorTh + airBelow;                 // PCB bottom z

// 1. PCB (green FR4) — box() centers on XY, just translate up to seatZ
const pcb = box(PCB_W, PCB_D, PCB_TH).translate(0, 0, seatZ);

// 2. Component cluster on PCB top (RP2040 + flash + headers envelope, slightly offset from USB end)
const compW = 32, compD = 16, compH = 2.0;
const components = box(compW, compD, compH).translate(-3, 0, seatZ + PCB_TH);

// 3. USB micro-B connector on +X short edge (overhangs board by ~1mm)
const usbConnW = 7.6, usbConnD = 5.9, usbConnH = 2.7;
const usbConn = box(usbConnW, usbConnD, usbConnH)
  .translate(PCB_W/2 + usbConnW/2 - 1, 0, seatZ + PCB_TH * 0.5);

// 4. Holes through PCB to show how the mounting pins engage
const HOLE_DIA = 2.1, HOLE_X = 23.5, HOLE_Y = 5.7;
let pcbWithHoles = pcb;
for (const [x, y] of [[ HOLE_X, HOLE_Y], [ HOLE_X,-HOLE_Y], [-HOLE_X, HOLE_Y], [-HOLE_X,-HOLE_Y]]) {
  const hole = cylinder(HOLE_DIA / 2, PCB_TH + 0.2).translate(x, y, seatZ - 0.1);
  pcbWithHoles = pcbWithHoles.subtract(hole);
}

return [
  ...(Array.isArray(main) ? main : [main]),
  pcbWithHoles.color("#0e7f4e"),                 // PCB green
  components.color("#1c1c1c"),                   // dark components
  usbConn.color("#b0b0b0"),                      // silver USB shield
];
