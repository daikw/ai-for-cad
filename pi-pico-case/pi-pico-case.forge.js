// Raspberry Pi Pico (original, RP2040, micro-USB) — snap-fit case with crawd-kun engraving
// Board reference: 51.0 x 21.0 x 1.0 mm PCB, USB micro-B on +X short edge
// Mounting holes (M2.0, 2.1mm dia) at (±23.5, ±5.7) in board-centered coords

// ---- Parameters ----
const boardW   = param("Board width (X)",  51.0, { min: 50, max: 52, unit: "mm" });
const boardD   = param("Board depth (Y)",  21.0, { min: 20, max: 22, unit: "mm" });
const boardClr = param("Board side clearance", 0.4, { min: 0.2, max: 1.0, unit: "mm" });

const wall     = param("Wall thickness", 1.6, { min: 1.2, max: 3.0, unit: "mm" });
const floorTh  = param("Floor thickness", 1.0, { min: 0.8, max: 2.0, unit: "mm" });
const lidTh    = param("Lid thickness",   1.4, { min: 1.0, max: 2.5, unit: "mm" });

const airBelow = param("Air gap below board", 0.6, { min: 0.5, max: 2.0, unit: "mm" });
// v5: bumped airAbove 2.0→5.0 to clear Pi Pico R3 component envelope (2.2mm above PCB top, per official
// STEP bbox) + lid plug penetration. v4 collided with components by ~0.7cm³.
const airAbove = param("Air gap above board components", 5.0, { min: 3.0, max: 7.0, unit: "mm" });

const usbW     = param("USB cutout width",  9.0, { min: 7, max: 12, unit: "mm" });
const usbH     = param("USB cutout height", 4.0, { min: 3, max: 6,  unit: "mm" });

const plugClr  = param("Lid plug clearance per side", 0.2, { min: 0.1, max: 0.4, unit: "mm" });
// v5: dropped plugH 2.2→2.0 — combined with airAbove=5.0, plug bottom z=5.6 vs component top z=4.8 → 0.8mm clearance
const plugH    = param("Lid plug height", 2.0, { min: 1.0, max: 3.5, unit: "mm" });

const filletR  = param("Outer vertical edge fillet", 2.0, { min: 0.5, max: 4.0, unit: "mm" });

// Crawd-kun emblem on lid: ENGRAVED (recessed) body + deeper engraved eyes
// Two-step depth: body is the first level of carving, eyes go deeper for shadow contrast.
const crawdW    = param("Crawd silhouette width", 32, { min: 20, max: 48, unit: "mm" });
const bodyDepth = param("Crawd body engraving depth", 0.6, { min: 0.3, max: 1.0, unit: "mm" });
const eyeDepth  = param("Crawd eye engraving depth (total from lid)", 1.0, { min: 0.4, max: 1.3, unit: "mm" });
const eyeSize   = param("Crawd eye dot size", 2.0, { min: 0.8, max: 3.0, unit: "mm" });

// Mounting pin geometry (engages 2.1mm dia hole in PCB)
const pinDia      = param("Mounting pin dia", 1.95, { min: 1.7, max: 2.05, unit: "mm" });
const pinShoulder = param("Pin shoulder dia", 3.5, { min: 3.0, max: 5.0, unit: "mm" });
const pinOverhang = param("Pin overhang above PCB", 0.4, { min: 0.0, max: 1.0, unit: "mm" });

const lidLifted = Param.bool("Lift lid above case for visualization", true);

// ---- Derived dimensions ----
const innerW = boardW + 2 * boardClr;
const innerD = boardD + 2 * boardClr;
const innerH = airBelow + 1.0 + airAbove;

const outerW = innerW + 2 * wall;
const outerD = innerD + 2 * wall;
const outerH = floorTh + innerH;

const boardZ = floorTh + airBelow;             // bottom of PCB
const usbCenterZ = boardZ + 0.5;               // center of 1mm PCB

// PCB hole positions in case-centered coords (board centered in pocket)
const HOLE_X = 23.5;   // (51/2) - 2.0 mm from short edge
const HOLE_Y = 5.7;    // (21/2) - 4.8 mm from long edge
const holePositions = [
  [ HOLE_X,  HOLE_Y],
  [ HOLE_X, -HOLE_Y],
  [-HOLE_X,  HOLE_Y],
  [-HOLE_X, -HOLE_Y],
];

// ---- Bottom case ----
// Use a rounded-rectangle extrusion so vertical corners are already filleted
// (avoids post-hoc fillet() which fights tessellation-split edges).
let caseBody = roundedRect(outerW, outerD, filletR)
  .extrude(outerH, { labels: { start: "bottom", end: "top" } });
caseBody = caseBody.shell(wall, { openFaces: ["top"] });

// USB cutout on +X face
const usbCutter = box(wall * 2 + 1, usbW, usbH)
  .translate(outerW / 2, 0, usbCenterZ);
caseBody = caseBody.subtract(usbCutter);

// Mounting posts: shoulder (Pico rests on top) + pin (passes through hole)
const shoulderH = airBelow;                            // pico bottom touches shoulder top
const pinTotalH = 1.0 + pinOverhang;                   // PCB thickness + overhang
for (const [px, py] of holePositions) {
  const shoulder = cylinder(pinShoulder / 2, shoulderH).translate(px, py, floorTh);
  const pin      = cylinder(pinDia / 2, pinTotalH).translate(px, py, floorTh + shoulderH);
  caseBody = caseBody.add(shoulder).add(pin);
}

// ---- Top lid ----
let lidPlate = roundedRect(outerW, outerD, filletR)
  .extrude(lidTh, { labels: { start: "bottom", end: "top" } });

// Crawd-kun emblem: engraved silhouette + deeper engraved eyes (2-level shadow)
const svgScale = crawdW / 110;
const SVG_IMPORT_OPTS = {
  centerOnOrigin: true,
  scale: svgScale,
  flattenTolerance: 0.5,
  simplify: 0.2,
};

// 1. Engrave the body silhouette into the lid top
const bodySketch = importSvgSketch("./crawd-body.svg", SVG_IMPORT_OPTS);
const bodyProfile = bodySketch.onFace(lidPlate, "top");
lidPlate = lidPlate.cutout(bodyProfile, { depth: bodyDepth });

// 2. Engrave eye dots deeper than the body floor (extra eyeDepth - bodyDepth below body floor)
// Eye positions from the source SVG viewBox math (see crawd-eyes.svg)
// Eye 1 center = (37.25, 22.25); Eye 2 center = (83.10, 20.25); body center = (62, 47.5)
const eyeZ = lidTh - eyeDepth;     // eye cutter bottom z
const eyePositions = [
  [-24.75 * svgScale, +25.25 * svgScale],   // (-7.2, +7.3) at crawdW=32
  [+21.10 * svgScale, +27.25 * svgScale],   // (+6.1, +7.9) at crawdW=32
];
for (const [ex, ey] of eyePositions) {
  // Box extends from eyeZ up by eyeDepth + 0.1; the +0.1 ensures it pokes above the lid surface for a clean cut
  const eyeCutter = box(eyeSize, eyeSize, eyeDepth + 0.1).translate(ex, ey, eyeZ);
  lidPlate = lidPlate.subtract(eyeCutter);
}

// Plug uses a rounded rectangle so it slides past the case's rounded inner corners
const innerCornerR = Math.max(0.1, filletR - wall);
const plugW = innerW - 2 * plugClr;
const plugD = innerD - 2 * plugClr;
const plug = roundedRect(plugW, plugD, innerCornerR + 0.1)
  .extrude(plugH)
  .translate(0, 0, -plugH);

let lid = lidPlate.add(plug);

// Lid outer corners are already rounded via roundedRect — no post-hoc fillet needed.

// Position the lid (lifted for explosion view, or seated)
lid = lidLifted
  ? lid.translate(0, 0, outerH + 6)
  : lid.translate(0, 0, outerH);

// Return as array so consumers (e.g. print-layout) can destructure.
return [
  caseBody.color("#3a86ff").as("case"),
  lid.color("#ff7a4d").as("lid"),
];
