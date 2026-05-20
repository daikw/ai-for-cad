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
// v9.3: 0.7 → 1.05 (1.5×) — v9.2 lid was too thin and the rim curled during print.
const lidTh    = param("Lid thickness",   1.05, { min: 0.4, max: 2.5, unit: "mm" });

// v9.3: 0.6 → 1.0 — lift the PCB ~1mm off the floor so the wide pin base seats the board cleanly.
const airBelow = param("Air gap below board", 1.0, { min: 0.5, max: 2.0, unit: "mm" });
// Must exceed board.components.topMargin (2.2mm) — checked below.
const airAbove = param("Air gap above board components", 5.0, { min: 3.0, max: 7.0, unit: "mm" });

const usbW     = param("USB cutout width",  board.usbCutout.w, { min: 7, max: 12, unit: "mm" });
const usbH     = param("USB cutout height", board.usbCutout.h, { min: 3, max: 6,  unit: "mm" });

const plugClr  = param("Lid plug clearance per side", 0.15, { min: 0.05, max: 0.4, unit: "mm" });
// Retention comes from detent bumps, so plug height is just lead-in for alignment.
// v9.2: 2.0 → 1.4mm to keep the overall case shorter now that the lid itself is 0.7mm.
const plugH    = param("Lid plug height", 1.4, { min: 1.0, max: 4.0, unit: "mm" });
// v9: small Z gap between case top face and lid bottom — makes the lid easier to grip and open.
const lidGap   = param("Lid–case Z gap", 0.2, { min: 0, max: 0.5, unit: "mm" });

const detentEnable  = Param.bool("Add lid detent snap-fit",  true);
const detentBumpW   = param("Detent bump width (along X)", 3.0, { min: 2.0, max: 6.0, unit: "mm" });
const detentBumpOut = param("Detent bump outward protrusion", 0.4, { min: 0.2, max: 0.6, unit: "mm" });
const detentBumpH   = param("Detent bump height (Z)", 0.5, { min: 0.3, max: 0.8, unit: "mm" });
const detentBumpX   = param("Detent bump X offset from plug center", 12.0, { min: 5, max: 20, unit: "mm" });
const detentSlack   = param("Detent groove clearance", 0.15, { min: 0.05, max: 0.3, unit: "mm" });

// v9.4 (revised): stepped plug — top section keeps the original outline (carries the
// detent bumps + meets the plate), bottom section is inset on the long sides only.
// Result: visible step at z=-plugStepBottomH, slight "tucked-in" look from below.
// Only overhang is plugStepInsetY × plug X length on each side of the bottom section's
// top — slicer prints it as normal wall overhang (no long bridges needed).
//
// The earlier shell-style hollow plug (v9.4 first attempt) was rejected because the
// open-bottom cavity forced a 50mm cap bridge, blowing up the print time by 7+ minutes.
const plugStepEnable  = Param.bool("Stepped plug (narrower bottom)", true);
const plugStepInsetY  = param("Plug step inset (long sides)", 1.0, { min: 0.3, max: 3.0, unit: "mm" });
const plugStepBottomH = 1.0;  // height of the inset lower section (out of plugH=1.4)
// Bump centered this far above plug bottom — chosen so the detent engages near deepest insertion.
const DETENT_Z_OFFSET = 0.4;

const filletR  = param("Outer vertical edge fillet", 2.0, { min: 0.5, max: 4.0, unit: "mm" });

// Crawd-kun emblem on lid: 2-level engraving (body recess + deeper eye dots)
// v9.3: depths scaled 1.5× with the thicker lid (0.7 → 1.05).
//   - bodyDepth 0.3 → 0.45 (leaves 0.6mm of lid below the relief)
//   - eyeDepth  0.5 → 0.75 (leaves 0.3mm below — eyes still solid, not pierced)
const crawdW    = param("Crawd silhouette width", 32, { min: 20, max: 48, unit: "mm" });
const bodyDepth = param("Crawd body engraving depth", 0.45, { min: 0.15, max: 1.0, unit: "mm" });
const eyeDepth  = param("Crawd eye engraving depth (total from lid)", 0.75, { min: 0.2, max: 1.5, unit: "mm" });
const eyeSize   = param("Crawd eye dot size", 2.0, { min: 0.8, max: 3.0, unit: "mm" });

// Mounting pin geometry — 2-step. cylinder() is (height, radius).
// Bottom (shoulder/base): slightly fat (φ2.5) × 1mm — wider than the PCB hole so the
//   board rests on it and lifts 1mm above the floor.
// Top (pin): φ1.9 (vs 2.1mm hole = 0.1mm slack each side) × pcb.th + overhang = 2.5mm.
// v9.3: pinShoulder 4.0 → 2.5 — was too wide; the new narrower base is what the user requested.
const pinDia      = param("Mounting pin dia", 1.9, { min: 1.7, max: 2.2, unit: "mm" });
const pinShoulder = param("Pin shoulder dia", 2.5, { min: 2.0, max: 5.0, unit: "mm" });
const pinOverhang = param("Pin overhang above PCB", 1.5, { min: 0.0, max: 2.5, unit: "mm" });
const pinSegments = 32;   // keep small cylinders well-tessellated so slicers don't drop polygons

// v9: LED (GP25) is on the BOOTSEL side — opposite short edge from the micro-USB connector.
const ledX     = param("LED hole X (from case center, +X is USB side)", board.led.x, { min: -25, max: 25, unit: "mm" });
const ledY     = param("LED hole Y (board-center offset toward LED side)", board.led.y, { min: -10, max: 10, unit: "mm" });
// v9: hole width 3.5 → 5.0 — v7 print did not visually pierce the lid (likely slicer wall filling).
const ledHoleW = param("LED hole width",  5.0, { min: 1.5, max: 7, unit: "mm" });
const ledHoleD = param("LED hole depth",  5.0, { min: 1.5, max: 7, unit: "mm" });

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

// v9: USB cutout extends all the way through the top — no upper wall above the connector.
// The lid (sitting on top of the case rim) covers the opening from above instead.
// box() has its base at z=0, so translate Z = bottom of the cutter, not its center.
const usbCutterBottomZ = boardZ - 0.5;                  // start just below PCB underside for clean cut
const usbCutterH       = outerH - usbCutterBottomZ + 0.5;
const usbCutter = box(wall * 2 + 1, usbW, usbCutterH)
  .translate(outerW / 2, 0, usbCutterBottomZ);
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
  // v9: groove follows plug position after the lid is lifted by lidGap
  const grooveZ = outerH + lidGap - plugH + DETENT_Z_OFFSET + detentBumpH / 2;
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

// (LED hole cut is applied AFTER lid = lidPlate.add(plug) so the cutter pierces BOTH
//  the plate AND the plug below it. Earlier versions cut only the plate, leaving the
//  plug intact under the hole — the visible "still blocked" symptom in v6/v7/v9.2 prints.)

// Plug uses rounded rectangle so it slides past the case's rounded inner corners
const innerCornerR = Math.max(0.1, filletR - wall);
const plugW = innerW - 2 * plugClr;
const plugD = innerD - 2 * plugClr;
let plug;
if (plugStepEnable) {
  // Top section (z=-plugStepTopH..0): full outline, mates to plate + carries detent bumps.
  const plugStepTopH = plugH - plugStepBottomH;
  const topPlug = roundedRect(plugW, plugD, innerCornerR + 0.1)
    .extrude(plugStepTopH)
    .translate(0, 0, -plugStepTopH);
  // Bottom section (z=-plugH..-plugStepTopH): inset on long sides → narrower in Y.
  const bottomD = plugD - 2 * plugStepInsetY;
  const bottomR = Math.max(0.1, innerCornerR + 0.1 - plugStepInsetY);
  const bottomPlug = roundedRect(plugW, bottomD, bottomR)
    .extrude(plugStepBottomH)
    .translate(0, 0, -plugH);
  plug = topPlug.add(bottomPlug);
} else {
  plug = roundedRect(plugW, plugD, innerCornerR + 0.1)
    .extrude(plugH)
    .translate(0, 0, -plugH);
}

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

// v9.3: LED hole must pierce the ENTIRE lid (plate + plug). The plug lives at z=[-plugH, 0]
// and the LED position is inside the plug footprint, so cutting only the plate left a
// 1.4mm-thick chunk of plug blocking the light. Cutter span: plug bottom to plate top.
const ledCutter = box(ledHoleW, ledHoleD, lidTh + plugH + 0.4)
  .translate(ledX, ledY, -plugH - 0.2);
lid = lid.subtract(ledCutter);

lid = lidLifted
  ? lid.translate(0, 0, outerH + 6)
  : lid.translate(0, 0, outerH + lidGap);

return [
  caseBody.color("#3a86ff").as("case"),
  lid.color("#ff7a4d").as("lid"),
];
