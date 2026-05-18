// Raspberry Pi Pico (original, RP2040, micro-USB) — snap-fit case with crawd-kun engraving
// Board reference: 51.0 x 21.0 x 1.0 mm PCB, USB micro-B on +X short edge
// Mounting holes (M2.0, 2.1mm dia) at (±23.5, ±5.7) in board-centered coords

// ---- Parameters ----
const boardW   = param("Board width (X)",  51.0, { min: 50, max: 52, unit: "mm" });
const boardD   = param("Board depth (Y)",  21.0, { min: 20, max: 22, unit: "mm" });
// v6: bumped 0.4→0.55 after first print — board was too tight to slot in, accounting for FDM
//     dimensional drift (~0.2mm shrink per side) plus easier insertion margin.
const boardClr = param("Board side clearance", 0.55, { min: 0.2, max: 1.0, unit: "mm" });

const wall     = param("Wall thickness", 1.6, { min: 1.2, max: 3.0, unit: "mm" });
const floorTh  = param("Floor thickness", 1.0, { min: 0.8, max: 2.0, unit: "mm" });
const lidTh    = param("Lid thickness",   1.4, { min: 1.0, max: 2.5, unit: "mm" });

const airBelow = param("Air gap below board", 0.6, { min: 0.5, max: 2.0, unit: "mm" });
// v5: 2.0→5.0 to clear Pi Pico R3 component envelope (2.2mm above PCB top).
// v6: 5.0→5.5 for taller v6 plug clearance.
// v7: 5.5→5.0 reverted — plugH back to 2.0, retention now from detent bumps instead.
const airAbove = param("Air gap above board components", 5.0, { min: 3.0, max: 7.0, unit: "mm" });

const usbW     = param("USB cutout width",  9.0, { min: 7, max: 12, unit: "mm" });
const usbH     = param("USB cutout height", 4.0, { min: 3, max: 6,  unit: "mm" });

// v6: 0.2→0.1 for tighter friction. v7: 0.15 to give detent bumps room to compress on insertion.
const plugClr  = param("Lid plug clearance per side", 0.15, { min: 0.05, max: 0.4, unit: "mm" });
// v6: 2.0→3.0 for longer engagement. v7: revert to 2.0mm — taller case felt awkward and lid still floated.
//     Retention now comes from detent bumps (see plugDetent params) instead of plug friction.
const plugH    = param("Lid plug height", 2.0, { min: 1.0, max: 4.0, unit: "mm" });

// v7: Detent snap-fit — small bumps on plug + matching grooves in case inner wall
const detentEnable  = Param.bool("Add lid detent snap-fit",  true);
const detentBumpW   = param("Detent bump width (along X)", 3.0, { min: 2.0, max: 6.0, unit: "mm" });
const detentBumpOut = param("Detent bump outward protrusion", 0.4, { min: 0.2, max: 0.6, unit: "mm" });
const detentBumpH   = param("Detent bump height (Z)", 0.5, { min: 0.3, max: 0.8, unit: "mm" });
const detentBumpX   = param("Detent bump X offset from plug center", 12.0, { min: 5, max: 20, unit: "mm" });
const detentSlack   = param("Detent groove clearance", 0.15, { min: 0.05, max: 0.3, unit: "mm" });

const filletR  = param("Outer vertical edge fillet", 2.0, { min: 0.5, max: 4.0, unit: "mm" });

// Crawd-kun emblem on lid: ENGRAVED (recessed) body + deeper engraved eyes
// Two-step depth: body is the first level of carving, eyes go deeper for shadow contrast.
const crawdW    = param("Crawd silhouette width", 32, { min: 20, max: 48, unit: "mm" });
const bodyDepth = param("Crawd body engraving depth", 0.6, { min: 0.3, max: 1.0, unit: "mm" });
const eyeDepth  = param("Crawd eye engraving depth (total from lid)", 1.0, { min: 0.4, max: 1.3, unit: "mm" });
const eyeSize   = param("Crawd eye dot size", 2.0, { min: 0.8, max: 3.0, unit: "mm" });

// Mounting pin geometry (engages 2.1mm dia hole in PCB)
// v6: pinDia 1.95→2.0. v7: 2.0→2.1 (match Pi Pico R3 hole spec exactly per official STEP — should
//     print as snug-fit cylinder. User reported v6 print produced <1mm pin, so we're also passing
//     explicit cylinder segments=32 below to defeat any auto-tessellation issue.)
const pinDia      = param("Mounting pin dia", 2.1, { min: 1.7, max: 2.2, unit: "mm" });
const pinShoulder = param("Pin shoulder dia", 4.0, { min: 3.0, max: 5.0, unit: "mm" });
const pinOverhang = param("Pin overhang above PCB", 1.5, { min: 0.0, max: 2.5, unit: "mm" });
const pinSegments = 32;   // explicit tessellation to keep small cylinders well-defined for slicers

// v6: LED viewing hole on lid (Pi Pico R3: LED is ~5.5mm from USB-end short edge, on BOOTSEL side)
const ledX     = param("LED hole X (from case center, +X is USB side)", 20.0, { min: 0, max: 25, unit: "mm" });
const ledY     = param("LED hole Y (board-center offset toward LED side)", -7.0, { min: -10, max: 10, unit: "mm" });
const ledHoleW = param("LED hole width",  3.5, { min: 1.5, max: 6, unit: "mm" });
const ledHoleD = param("LED hole depth",  3.5, { min: 1.5, max: 6, unit: "mm" });

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
// v7 BUGFIX: ForgeCAD's cylinder() signature is `cylinder(height, radius)` despite docs.
// All earlier versions (v1-v6) had this swapped — shoulder was actually 1.2mm-dia × 4mm tall,
// pin was 5mm-dia × 1.05mm tall. That explains user's "印刷ピンが <1mm" feedback.
const shoulderH = airBelow;                            // pico bottom touches shoulder top
const pinTotalH = 1.0 + pinOverhang;                   // PCB thickness + overhang
for (const [px, py] of holePositions) {
  const shoulder = cylinder(shoulderH, pinShoulder / 2).translate(px, py, floorTh);
  const pin      = cylinder(pinTotalH, pinDia / 2).translate(px, py, floorTh + shoulderH);
  caseBody = caseBody.add(shoulder).add(pin);
}

// v7: Detent grooves in case inner walls (on long sides, Y=±innerD/2) — paired with plug bumps
if (detentEnable) {
  const grooveDepth = detentBumpOut + detentSlack;    // cut into the wall this deep from inner surface
  const grooveH = detentBumpH + 2 * detentSlack;       // taller than bump for vertical play
  const grooveW = detentBumpW + 2 * detentSlack;       // wider than bump for X play
  // Z position of the groove — bump sits near the BOTTOM of the plug (= deepest insertion point)
  // plug bottom z = outerH - plugH; bump centered there + 0.4mm above
  const grooveZ = outerH - plugH + 0.4 + detentBumpH / 2;
  const detentX = detentBumpX;
  for (const [sx, sy] of [[+detentX, +innerD/2], [+detentX, -innerD/2], [-detentX, +innerD/2], [-detentX, -innerD/2]]) {
    // Cutter centered just inside the wall, extending outward by grooveDepth
    const cutterCenter = sy + Math.sign(sy) * grooveDepth / 2;
    const cutter = box(grooveW, grooveDepth, grooveH).translate(sx, cutterCenter, grooveZ);
    caseBody = caseBody.subtract(cutter);
  }
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

// 3. LED viewing hole — cut all the way through the lid plate at the Pi Pico LED position
// v7 fix: previously cutter was translated to z=lidTh/2 but box() base is at z=0 so the cutter only
// reached z=lidTh/2+lidTh+0.2 (top half of plate). Now translate so cutter is centered on plate:
//   plate spans z=0..lidTh, cutter (height=lidTh+0.2) needs z=-0.1..lidTh+0.1
const ledCutter = box(ledHoleW, ledHoleD, lidTh + 0.2).translate(ledX, ledY, -0.1);
lidPlate = lidPlate.subtract(ledCutter);

// Plug uses a rounded rectangle so it slides past the case's rounded inner corners
const innerCornerR = Math.max(0.1, filletR - wall);
const plugW = innerW - 2 * plugClr;
const plugD = innerD - 2 * plugClr;
let plug = roundedRect(plugW, plugD, innerCornerR + 0.1)
  .extrude(plugH)
  .translate(0, 0, -plugH);

// v7: Add 4 detent bumps on the plug's long sides (+Y/-Y) — paired with case-wall grooves above
if (detentEnable) {
  // Bump z-position: 0.4mm above plug bottom (= z = -plugH + 0.4)
  const bumpCenterZ = -plugH + 0.4 + detentBumpH / 2;
  for (const [sx, sy] of [[+detentBumpX, +plugD/2], [+detentBumpX, -plugD/2], [-detentBumpX, +plugD/2], [-detentBumpX, -plugD/2]]) {
    // Bump centered just outside the plug face, protruding by detentBumpOut
    const bumpCenter = sy + Math.sign(sy) * detentBumpOut / 2;
    const bump = box(detentBumpW, detentBumpOut, detentBumpH).translate(sx, bumpCenter, bumpCenterZ);
    plug = plug.add(bump);
  }
}

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
