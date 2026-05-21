// Debug: re-create lid in 3 stages and export each as separate objects so we
// can isolate which boolean kills the plate.
//
// Reproduces the v9.4 lid build path with the same params.
const {
  BOARDS, holePositions, assertPositive, assertNear, assertGreaterEqual,
} = require("./pi-pico-case-dimensions.js");

const board = BOARDS.picoRp2040MicroUsb;

// Same params as v9.4 (default values, no override needed for the lid)
const wall = 1.6;
const floorTh = 1.0;
const lidTh = 1.05;
const boardClr = 0.55;
const airBelow = 1.0;
const airAbove = 5.0;
const plugH = 1.4;
const plugClr = 0.15;
const lidGap = 0.2;
const filletR = 2.0;
const ledX = 22.0;
const ledY = -8.5;
const ledHoleW = 5.0;
const ledHoleD = 5.0;
const crawdW = 32;
const bodyDepth = 0.45;
const eyeDepth = 0.75;
const eyeSize = 2.0;
const plugStepInsetY = 1.0;
const plugStepBottomH = 1.0;

const innerW = board.pcb.w + 2 * boardClr;
const innerD = board.pcb.d + 2 * boardClr;
const outerW = innerW + 2 * wall;
const outerD = innerD + 2 * wall;
const innerCornerR = Math.max(0.1, filletR - wall);
const plugW = innerW - 2 * plugClr;
const plugD = innerD - 2 * plugClr;

// ---- Stage 1: bare lidPlate ----
let lidPlate1 = roundedRect(outerW, outerD, filletR)
  .extrude(lidTh, { labels: { start: "bottom", end: "top" } });
// Tag for naming in STL export
const stage1 = lidPlate1.translate(0, 0, 0).color("#ff0000").as("stage1_bare_plate");

// ---- Stage 2: plate + crawd cutout + eye cutters ----
let lidPlate2 = roundedRect(outerW, outerD, filletR)
  .extrude(lidTh, { labels: { start: "bottom", end: "top" } });
const svgScale = crawdW / 110;
const SVG_IMPORT_OPTS = { centerOnOrigin: true, scale: svgScale, flattenTolerance: 0.5, simplify: 0.2 };
const bodySketch = importSvgSketch("./crawd-body.svg", SVG_IMPORT_OPTS);
const bodyProfile = bodySketch.onFace(lidPlate2, "top");
lidPlate2 = lidPlate2.cutout(bodyProfile, { depth: bodyDepth });
const eyeZ = lidTh - eyeDepth;
const eyePositions = [[-24.75 * svgScale, +25.25 * svgScale], [+21.10 * svgScale, +27.25 * svgScale]];
for (const [ex, ey] of eyePositions) {
  const eyeCutter = box(eyeSize, eyeSize, eyeDepth + 0.1).translate(ex, ey, eyeZ);
  lidPlate2 = lidPlate2.subtract(eyeCutter);
}
const stage2 = lidPlate2.translate(70, 0, 0).color("#00ff00").as("stage2_with_engraving");

// ---- Stage 3: plate + crawd + eye + plug (stepped) — no LED cut yet ----
let lidPlate3 = roundedRect(outerW, outerD, filletR)
  .extrude(lidTh, { labels: { start: "bottom", end: "top" } });
const bodySketch3 = importSvgSketch("./crawd-body.svg", SVG_IMPORT_OPTS);
const bodyProfile3 = bodySketch3.onFace(lidPlate3, "top");
lidPlate3 = lidPlate3.cutout(bodyProfile3, { depth: bodyDepth });
for (const [ex, ey] of eyePositions) {
  const eyeCutter = box(eyeSize, eyeSize, eyeDepth + 0.1).translate(ex, ey, eyeZ);
  lidPlate3 = lidPlate3.subtract(eyeCutter);
}
// Stepped plug
const plugStepTopH = plugH - plugStepBottomH;
const topPlug3 = roundedRect(plugW, plugD, innerCornerR + 0.1)
  .extrude(plugStepTopH).translate(0, 0, -plugStepTopH);
const bottomD = plugD - 2 * plugStepInsetY;
const bottomR = Math.max(0.1, innerCornerR + 0.1 - plugStepInsetY);
const bottomPlug3 = roundedRect(plugW, bottomD, bottomR)
  .extrude(plugStepBottomH).translate(0, 0, -plugH);
let plug3 = topPlug3.add(bottomPlug3);
let lid3 = lidPlate3.add(plug3);
const stage3 = lid3.translate(140, 0, 0).color("#0000ff").as("stage3_plate_plus_plug");

// ---- Stage 4: stage3 + LED cut ----
let lidPlate4 = roundedRect(outerW, outerD, filletR)
  .extrude(lidTh, { labels: { start: "bottom", end: "top" } });
const bodySketch4 = importSvgSketch("./crawd-body.svg", SVG_IMPORT_OPTS);
const bodyProfile4 = bodySketch4.onFace(lidPlate4, "top");
lidPlate4 = lidPlate4.cutout(bodyProfile4, { depth: bodyDepth });
for (const [ex, ey] of eyePositions) {
  const eyeCutter = box(eyeSize, eyeSize, eyeDepth + 0.1).translate(ex, ey, eyeZ);
  lidPlate4 = lidPlate4.subtract(eyeCutter);
}
const topPlug4 = roundedRect(plugW, plugD, innerCornerR + 0.1)
  .extrude(plugStepTopH).translate(0, 0, -plugStepTopH);
const bottomPlug4 = roundedRect(plugW, bottomD, bottomR)
  .extrude(plugStepBottomH).translate(0, 0, -plugH);
let plug4 = topPlug4.add(bottomPlug4);
let lid4 = lidPlate4.add(plug4);
const ledCutter = box(ledHoleW, ledHoleD, lidTh + plugH + 0.4)
  .translate(ledX, ledY, -plugH - 0.2);
lid4 = lid4.subtract(ledCutter);
const stage4 = lid4.translate(210, 0, 0).color("#ffff00").as("stage4_final_lid");

return [stage1, stage2, stage3, stage4];
