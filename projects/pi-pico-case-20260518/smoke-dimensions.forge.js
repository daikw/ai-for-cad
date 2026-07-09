// Smoke test for pi-pico-case-dimensions.js — verifies require() of a plain .js helper
// and runs the assertion helpers. Renders a single box whose size encodes the PCB dims
// so a visual run prints something recognizable.
const { BOARDS, holePositions, assertPositive, assertNear } = require("./pi-pico-case-dimensions.js");

const board = BOARDS.picoRp2040MicroUsb;
assertPositive("pcb.w", board.pcb.w);
assertNear("pcb.w expected 51", board.pcb.w, 51.0);
const holes = holePositions(board);
if (holes.length !== 4) throw new Error(`expected 4 holes, got ${holes.length}`);

// Visual: PCB-sized plate
return box(board.pcb.w, board.pcb.d, board.pcb.th).color("#0e7f4e");
