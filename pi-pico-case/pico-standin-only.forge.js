// Render-only file: Pi Pico stand-in (the simplified box-based model used for collision detection)
// shown in isolation so we can audit whether the geometry actually matches a real Pi Pico R3.

const { BOARDS } = require("./pi-pico-case-dimensions.js");
const board = BOARDS.picoRp2040MicroUsb;

// Match the assembly's coordinate system so positions are comparable
const floorTh = 1.0;
const airBelow = 0.6;
const seatZ = floorTh + airBelow;

const pcb = box(board.pcb.w, board.pcb.d, board.pcb.th)
  .translate(0, 0, seatZ).color("#0e7f4e").as("pcb");

const c = board.components;
const components = box(c.w, c.d, c.topMargin)
  .translate(c.offsetX, 0, seatZ + board.pcb.th).color("#1c1c1c").as("components");

const u = board.usbConnector;
const usbConn = box(u.w, u.d, u.h)
  .translate(board.pcb.w / 2 + u.w / 2 - u.overhang, 0, seatZ + board.pcb.th)
  .color("#b0b0b0").as("usb_connector");

return [pcb, components, usbConn];
