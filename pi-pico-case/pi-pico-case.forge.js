// Raspberry Pi Pico (original, RP2040, micro-USB) — snap-fit case with crawd-kun engraving.
// Version history lives in CHANGELOG.md — keep inline comments to *current* design intent only.

const {
  BOARDS,
  holePositions,
  assertPositive,
  assertNear,
  assertGreaterEqual,
} = require("./pi-pico-case-dimensions.js");

const board = BOARDS.picoRp2040MicroUsb;

// ---- Parameters (defaults track board spec; user can override in UI/CLI) ----
const boardW   = param("Board width (X)", board.pcb.w, { min: 50, max: 52, unit: "mm" });
const boardD   = param("Board depth (Y)", board.pcb.d, { min: 20, max: 22, unit: "mm" });
// Accounts for FDM dimensional drift (~0.2mm shrink per side) + insertion margin.
const boardClr = param("Board side clearance", 0.55, { min: 0.2, max: 1.0, unit: "mm" });

const wall     = param("Wall thickness", 1.6, { min: 1.2, max: 3.0, unit: "mm" });
const floorTh  = param("Floor thickness", 1.0, { min: 0.8, max: 2.0, unit: "mm" });
const lidTh    = param("Lid thickness",   1.4, { min: 1.0, max: 2.5, unit: "mm" });

const airBelow = param("Air gap below board", 0.6, { min: 0.5, max: 2.0, unit: "mm" });
// Must exceed board.components.topMargin (2.2mm) — checked below.
const airAbove = param("Air gap above board components", 5.0, { min: 3.0, max: 7.0, unit: "mm" });

const usbW     = param("USB cutout width",  board.usbCutout.w, { min: 7, max: 12, unit: "mm" });
const usbH     = param("USB cutout height", board.usbCutout.h, { min: 3, max: 6,  unit: "mm" });

const plugClr  = param("Lid plug clearance per side", 0.15, { min: 0.05, max: 0.4, unit: "mm" });
// Retention comes from detent bumps, so plug height is just lead-in for alignment.
const plugH    = param("Lid plug height", 2.0, { min: 1.0, max: 4.0, unit: "mm" });

const detentEnable  = Param.bool("Add lid detent snap-fit",  true);
const detentBumpW   = param("Detent bump width (along X)", 3.0, { min: 2.0, max: 6.0, unit: "mm" });
const detentBumpOut = param("Detent bump outward protrusion", 0.4, { min: 0.2, max: 0.6, unit: "mm" });
const detentBumpH   = param("Detent bump height (Z)", 0.5, { min: 0.3, max: 0.8, unit: "mm" });
const detentBumpX   = param("Detent bump X offset from plug center", 12.0, { min: 5, max: 20, unit: "mm" });
const detentSlack   = param("Detent groove clearance", 0.15, { min: 0.05, max: 0.3, unit: "mm" });
// Bump centered this far above plug bottom — chosen so the detent engages near deepest insertion.
const DETENT_Z_OFFSET = 0.4;

const filletR  = param("Outer vertical edge fillet", 2.0, { min: 0.5, max: 4.0, unit: "mm" });

// Crawd-kun emblem on lid: 2-level engraving (body recess + deeper eye dots)
const crawdW    = param("Crawd silhouette width", 32, { min: 20, max: 48, unit: "mm" });
const bodyDepth = param("Crawd body engraving depth", 0.6, { min: 0.3, max: 1.0, unit: "mm" });
const eyeDepth  = param("Crawd eye engraving depth (total from lid)", 1.0, { min: 0.4, max: 1.3, unit: "mm" });
const eyeSize   = param("Crawd eye dot size", 2.0, { min: 0.8, max: 3.0, unit: "mm" });

// Mounting pin geometry — engages 2.1mm hole in PCB. cylinder() is (height, radius).
const pinDia      = param("Mounting pin dia", board.holePos.dia, { min: 1.7, max: 2.2, unit: "mm" });
const pinShoulder = param("Pin shoulder dia", 4.0, { min: 3.0, max: 5.0, unit: "mm" });
const pinOverhang = param("Pin overhang above PCB", 1.5, { min: 0.0, max: 2.5, unit: "mm" });
const pinSegments = 32;   // keep small cylinders well-tessellated so slicers don't drop polygons

// LED viewing hole — Pi Pico LED sits ~5.5mm from USB-end short edge on the BOOTSEL side
const ledX     = param("LED hole X (from case center, +X is USB side)", board.led.x, { min: 0, max: 25, unit: "mm" });
const ledY     = param("LED hole Y (board-center offset toward LED side)", board.led.y, { min: -10, max: 10, unit: "mm" });
const ledHoleW = param("LED hole width",  3.5, { min: 1.5, max: 6, unit: "mm" });
const ledHoleD = param("LED hole depth",  3.5, { min: 1.5, max: 6, unit: "mm" });

const lidLifted = Param.bool("Lift lid above case for visualization", true);

// ---- Derived dimensions ----
const innerW = boardW + 2 * boardClr;
const innerD = boardD + 2 * boardClr;
const innerH = airBelow + board.pcb.th + airAbove;

const outerW = innerW + 2 * wall;
const outerD = innerD + 2 * wall;
const outerH = floorTh + innerH;

const boardZ = floorTh + airBelow;
const usbCenterZ = boardZ + board.pcb.th / 2;

// ---- Invariant checks (fail-fast on param sweeps) ----
assertPositive("innerW", innerW);
assertPositive("innerD", innerD);
assertGreaterEqual("airAbove vs component top margin", airAbove, board.components.topMargin);
assertPositive("plug clearance per side", (innerW - (innerW - 2 * plugClr)) / 2);
assertPositive("pin shoulder fits in cavity", innerD - 2 * (pinShoulder / 2 + board.holePos.y - board.pcb.d / 2));
assertNear("expected outer width matches dimensions sheet", outerW, board.pcb.w + 2 * (boardClr + wall));

const holes = holePositions(board);

// ---- Bottom case ----
let caseBody = roundedRect(outerW, outerD, filletR)
  .extrude(outerH, { labels: { start: "bottom", end: "top" } });
caseBody = caseBody.shell(wall, { openFaces: ["top"] });

const usbCutter = box(wall * 2 + 1, usbW, usbH)
  .translate(outerW / 2, 0, usbCenterZ);
caseBody = caseBody.subtract(usbCutter);

// Mounting posts: shoulder (PCB rests on top) + pin (passes through hole)
// cylinder() signature: cylinder(height, radius) — height first.
const shoulderH = airBelow;
const pinTotalH = board.pcb.th + pinOverhang;
for (const [px, py] of holes) {
  const shoulder = cylinder(shoulderH, pinShoulder / 2).translate(px, py, floorTh);
  const pin      = cylinder(pinTotalH, pinDia / 2).translate(px, py, floorTh + shoulderH);
  caseBody = caseBody.add(shoulder).add(pin);
}

// Detent grooves in case inner walls — paired with plug bumps below
if (detentEnable) {
  const grooveDepth = detentBumpOut + detentSlack;
  const grooveH = detentBumpH + 2 * detentSlack;
  const grooveW = detentBumpW + 2 * detentSlack;
  const grooveZ = outerH - plugH + DETENT_Z_OFFSET + detentBumpH / 2;
  for (const [sx, sy] of [
    [+detentBumpX, +innerD / 2], [+detentBumpX, -innerD / 2],
    [-detentBumpX, +innerD / 2], [-detentBumpX, -innerD / 2],
  ]) {
    const cutterCenter = sy + Math.sign(sy) * grooveDepth / 2;
    const cutter = box(grooveW, grooveDepth, grooveH).translate(sx, cutterCenter, grooveZ);
    caseBody = caseBody.subtract(cutter);
  }
}

// ---- Top lid ----
let lidPlate = roundedRect(outerW, outerD, filletR)
  .extrude(lidTh, { labels: { start: "bottom", end: "top" } });

const svgScale = crawdW / 110;
const SVG_IMPORT_OPTS = {
  centerOnOrigin: true,
  scale: svgScale,
  flattenTolerance: 0.5,
  simplify: 0.2,
};

const bodySketch = importSvgSketch("./crawd-body.svg", SVG_IMPORT_OPTS);
const bodyProfile = bodySketch.onFace(lidPlate, "top");
lidPlate = lidPlate.cutout(bodyProfile, { depth: bodyDepth });

// Eye positions derived from source SVG viewBox (37.25,22.25) / (83.10,20.25) vs body center (62, 47.5)
const eyeZ = lidTh - eyeDepth;
const eyePositions = [
  [-24.75 * svgScale, +25.25 * svgScale],
  [+21.10 * svgScale, +27.25 * svgScale],
];
for (const [ex, ey] of eyePositions) {
  // +0.1 overshoot pokes above the lid surface so the boolean leaves a clean opening
  const eyeCutter = box(eyeSize, eyeSize, eyeDepth + 0.1).translate(ex, ey, eyeZ);
  lidPlate = lidPlate.subtract(eyeCutter);
}

// LED viewing hole — through-cut: cutter spans z=-0.1..lidTh+0.1 so plate (z=0..lidTh) is fully cut.
const ledCutter = box(ledHoleW, ledHoleD, lidTh + 0.2).translate(ledX, ledY, -0.1);
lidPlate = lidPlate.subtract(ledCutter);

// Plug uses rounded rectangle so it slides past the case's rounded inner corners
const innerCornerR = Math.max(0.1, filletR - wall);
const plugW = innerW - 2 * plugClr;
const plugD = innerD - 2 * plugClr;
let plug = roundedRect(plugW, plugD, innerCornerR + 0.1)
  .extrude(plugH)
  .translate(0, 0, -plugH);

if (detentEnable) {
  const bumpCenterZ = -plugH + DETENT_Z_OFFSET + detentBumpH / 2;
  for (const [sx, sy] of [
    [+detentBumpX, +plugD / 2], [+detentBumpX, -plugD / 2],
    [-detentBumpX, +plugD / 2], [-detentBumpX, -plugD / 2],
  ]) {
    const bumpCenter = sy + Math.sign(sy) * detentBumpOut / 2;
    const bump = box(detentBumpW, detentBumpOut, detentBumpH).translate(sx, bumpCenter, bumpCenterZ);
    plug = plug.add(bump);
  }
}

let lid = lidPlate.add(plug);

lid = lidLifted
  ? lid.translate(0, 0, outerH + 6)
  : lid.translate(0, 0, outerH);

return [
  caseBody.color("#3a86ff").as("case"),
  lid.color("#ff7a4d").as("lid"),
];
