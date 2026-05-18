// Collision-check assembly: case + lid + simplified Pi Pico stand-in.
// Uses primitive boxes instead of OCCT STEP import so spatial analysis stays interactive.

const { BOARDS } = require("./pi-pico-case-dimensions.js");

const main = require("./pi-pico-case.forge.js", {
  "Lift lid above case for visualization": 0,    // closed lid for collision test
});
const [caseBody, lid] = main;

const board = BOARDS.picoRp2040MicroUsb;
// PCB seat height must match pi-pico-case.forge.js: boardZ = floorTh + airBelow.
// We can't read params from the imported file, but the assertion in dimensions.js plus
// the values being treated as the authoritative defaults keeps these aligned.
const floorTh  = 1.0;
const airBelow = 0.6;
const seatZ = floorTh + airBelow;

const pcb = box(board.pcb.w, board.pcb.d, board.pcb.th)
  .translate(0, 0, seatZ).color("#0e7f4e").as("pcb");

const c = board.components;
const components = box(c.w, c.d, c.topMargin)
  .translate(c.offsetX, 0, seatZ + board.pcb.th).color("#1c1c1c").as("components");

const u = board.usbConnector;
const usbConn = box(u.w, u.d, u.h)
  .translate(board.pcb.w / 2 + u.w / 2 - u.overhang, 0, seatZ + board.pcb.th * 0.5)
  .color("#b0b0b0").as("usb_connector");

return [caseBody, lid, pcb, components, usbConn];
