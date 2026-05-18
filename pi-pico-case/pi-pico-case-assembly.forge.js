// Assembly with simplified Pi Pico stand-in (accurate component heights) for collision detection.
// Components modeled at their measured envelope dims (matching official Pico-R3 STEP bbox: 2.2mm
// above PCB top) so forgecad's spatial analysis catches lid-vs-component crashes.
//
// The full STEP import via OCCT works but is too slow for iterative collision testing,
// so this file uses primitive boxes instead.

const main = require("./pi-pico-case.forge.js", {
  "Lift lid above case for visualization": 0,    // close the lid for collision test
});
const [caseBody, lid] = main;

// ----- Pi Pico stand-in -----
const PCB_W = 51.0, PCB_D = 21.0, PCB_TH = 1.0;
const floorTh  = 1.0;
const airBelow = 0.6;
const seatZ = floorTh + airBelow;   // PCB bottom seats on mounting-post shoulders

// PCB (green FR4)
const pcb = box(PCB_W, PCB_D, PCB_TH).translate(0, 0, seatZ).color("#0e7f4e").as("pcb");

// Top components envelope — matches official STEP bbox (2.2mm above PCB top)
// On Pi Pico the bulk sits roughly centered (RP2040, flash, crystal, regulators)
const COMP_W = 32, COMP_D = 16, COMP_H = 2.2;
const components = box(COMP_W, COMP_D, COMP_H)
  .translate(-3, 0, seatZ + PCB_TH).color("#1c1c1c").as("components");

// USB micro-B connector — overhangs the board edge by ~1mm
const usbConnW = 7.6, usbConnD = 5.9, usbConnH = 2.7;
const usbConn = box(usbConnW, usbConnD, usbConnH)
  .translate(PCB_W / 2 + usbConnW / 2 - 1, 0, seatZ + PCB_TH * 0.5)
  .color("#b0b0b0").as("usb_connector");

return [caseBody, lid, pcb, components, usbConn];
