// Pelvis + two-block torso (dark pinched waist -> white chest, ref-1's
// silhouette) + hip skirts + electronics placeholders.
// v3: the ref's trapezoid impression comes from a waist pinch, not from
// tapering the chest — the chest must stay ~72 wide the whole way up because
// the shoulder-pitch servo bodies (x=±32.8) fix the cavity width. The waist
// zone only houses the flat electronics stack (54-wide cavity is enough), so
// THAT is where the silhouette narrows: 60x42 at the pelvis -> 72x46 under
// the chest, via a tapered roundedRect extrude (exact, cheap, and — unlike
// fillet() — legal to difference() against afterwards on every backend).
// All boolean cuts run on single primitives (kernel-pitfalls.md #1/#5).
const D = require("./dims.js");
const Z = D.z;

// -- shallow panel-line groove between two XZ points on a flat +Y face.
function grooveLine(x1, z1, x2, z2, faceY, width = 1.6, depth = 1.0) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const inward = faceY > 0 ? -1 : 1;
  return box(width, depth, Math.hypot(dx, dz))
    .pointAlong([dx, 0, dz])
    .translate(x1, faceY + (inward * depth) / 2, z1);
}

// --- pelvis (dark) -----------------------------------------------------------
// fillet-before-difference ordering per kernel-pitfalls.md #10.
const pelvisOuter = fillet(box(D.pelvis.w, D.pelvis.d, D.pelvis.h).translate(0, 0, Z.pelvisBottom), 2, {
  parallel: [0, 0, 1],
  convex: true,
});
const pelvisPocketL = box(28, 7.5, 19.5).translate(D.hipX, -17.25, Z.pelvisBottom - 0.5);
const pelvisPocketR = box(28, 7.5, 19.5).translate(-D.hipX, -17.25, Z.pelvisBottom - 0.5);
const pelvisSolid = difference(pelvisOuter, pelvisPocketL, pelvisPocketR)
  .color(D.colors.graphite)
  .material({ metalness: 0.05, roughness: 0.65 });

// --- waist block (dark, pinched) — z∈[166,190] -------------------------------
// 60x42 r8 at the pelvis flaring to 72x46 r~9.5 under the chest. Cavity fits
// the battery (z 169.5-184.5, 50x30) and the lower half of the flat board
// (47x39, z 184.7-194.7 spans the 190 seam): 54 x 39.5 with a 1.5mm floor.
const WAIST_Z0 = Z.torsoBottom; // 166
const WAIST_H = 24; // -> 190
const waistOuter = roundedRect(60, 42, 8)
  .extrude(WAIST_H, { scaleTop: [72 / 60, 46 / 42] })
  .translate(0, 0, WAIST_Z0);
const waistCavity = box(54, 39.5, 26).translate(0, 0, WAIST_Z0 + 1.5); // overshoots past the open top
const waistFrame = difference(waistOuter, waistCavity)
  .color(D.colors.graphite)
  .material({ metalness: 0.05, roughness: 0.65 });

// --- chest block (white) — z∈[190,252] ---------------------------------------
// Straight 72x46 roundedRect extrude (corner r matches the waist's flared
// top). Functional cuts unchanged in intent from v1/v2: 66.2-wide cavity for
// the shoulder-pitch servo bodies, shoulder holes, neck hole, panel grooves.
const CHEST_Z0 = WAIST_Z0 + WAIST_H; // 190
const CHEST_H = Z.torsoTop - CHEST_Z0; // 62 -> 252
const chestOuter = roundedRect(D.torso.w, D.torso.d, 9.5).extrude(CHEST_H).translate(0, 0, CHEST_Z0);
const chestCavity = box(66.2, 40, 61).translate(0, 0, CHEST_Z0 - 2); // z∈[188,249], top wall 3, open bottom into waist
const shoulderHoleL = box(8, 30, 30).translate(35, 0, 207); // x∈[31,39] z∈[207,237], cuts through the full wall
const shoulderHoleR = box(8, 30, 30).translate(-35, 0, 207);
const neckHole = box(40, 29, 12).translate(-8, 0, 246); // clears neck servo body + horns

const frontY = D.torso.d / 2; // +23, flat outer front surface
const chestTopLineZ = 246;
const chestSeamZ = 200; // above the waist seam at 190, below shoulderHole z>=207 slants' start
const chestGrooves = [
  grooveLine(-27, chestTopLineZ, -20, chestSeamZ, frontY), // chest plate left slant
  grooveLine(20, chestSeamZ, 27, chestTopLineZ, frontY), // chest plate right slant
  grooveLine(-27, chestTopLineZ, 27, chestTopLineZ, frontY), // top edge
  grooveLine(-20, chestSeamZ, 20, chestSeamZ, frontY), // lower seam
];
const chestVent = box(18, 1.0, 6).translate(0, frontY - 0.5, 227); // shallow vent slot

const chestFrame = difference(
  chestOuter,
  chestCavity,
  shoulderHoleL,
  shoulderHoleR,
  neckHole,
  ...chestGrooves,
  chestVent
)
  .color(D.colors.shellWhite)
  .material({ metalness: 0.02, roughness: 0.6 });

// --- backpack shell (white) — on the chest's flat back face ------------------
// 0.2mm embed into the back wall (tangent-contact margin, kernel-pitfalls #2).
const backpackShell = fillet(box(32, 2.2, 40).translate(0, -23.9, 202), 1, { parallel: [0, 0, 1] })
  .color(D.colors.shellWhite)
  .material({ metalness: 0.02, roughness: 0.6 });

// --- pelvis cover + hip skirts (white) ---------------------------------------
// cover: front accent plate; skirts: side panels hanging over the hip gap so
// the hip-pitch servo boxes stop dominating the front view. Skirts stay at
// y∈[-13,18] to clear the hip-roll servo bodies (y<=-14, x up to 39.25) and
// end above the thigh hardware (z>=140 vs thigh/U-link z<=130, hip-pitch
// servo z<=137.25).
const pelvisCover = fillet(box(48, 1.5, 20).translate(0, 20.55, 144), 0.6, { parallel: [0, 0, 1] })
  .color(D.colors.shellWhite)
  .material({ metalness: 0.02, roughness: 0.55 });
const hipSkirtL = fillet(box(2.5, 31, 26).translate(36.05, 2.5, 140), 1, { parallel: [1, 0, 0] })
  .color(D.colors.shellWhite)
  .material({ metalness: 0.02, roughness: 0.6 }); // x∈[34.8,37.3], 0.2mm embed into pelvis side
const hipSkirtR = fillet(box(2.5, 31, 26).translate(-36.05, 2.5, 140), 1, { parallel: [1, 0, 0] })
  .color(D.colors.shellWhite)
  .material({ metalness: 0.02, roughness: 0.6 });

// --- electronics (frozen placements) ------------------------------------------
const batteryShape = box(D.battery.w, 30, D.battery.t)
  .translate(0, 0, 169.5) // 50 x 30 x 15, z∈[169.5,184.5]
  .color(D.colors.lipoBlue)
  .material({ metalness: 0.05, roughness: 0.55 });
const boardShape = box(D.board.w, D.board.h, D.board.t)
  .translate(0, 0, 184.7) // 47 x 39 x 10, z∈[184.7,194.7]
  .color(D.colors.pcbGreen)
  .material({ metalness: 0.1, roughness: 0.5 });

// frameOnly stays "the walls around the electronics" for the LLD-10 wall-
// contact checks — with the two-block torso that is waist + chest together.
const frameSolid = union(waistFrame, chestFrame);

const torsoGroup = group(
  { name: "Pelvis", shape: pelvisSolid },
  { name: "Waist Frame", shape: waistFrame },
  { name: "Chest Frame", shape: chestFrame },
  { name: "Backpack Shell", shape: backpackShell },
  { name: "Pelvis Cover", shape: pelvisCover },
  { name: "Hip Skirt L", shape: hipSkirtL },
  { name: "Hip Skirt R", shape: hipSkirtR },
  { name: "OpenRB-150", shape: boardShape },
  { name: "Battery 2S", shape: batteryShape }
);

const printedList = [pelvisSolid, waistFrame, chestFrame, backpackShell, pelvisCover, hipSkirtL, hipSkirtR];
console.log(
  "torso printed mass g (0.8):",
  (printedList.reduce((a, s) => a + s.volume(), 0) / 1000) * 0.8
);

return {
  group: torsoGroup,
  solids: () => ({
    printed: printedList,
    fixed: [
      { name: "OpenRB-150", shape: boardShape, grams: D.board.massG },
      { name: "Battery 2S", shape: batteryShape, grams: D.battery.massG },
    ],
    frameOnly: frameSolid,
    pelvisOnly: pelvisSolid,
    board: boardShape,
    battery: batteryShape,
  }),
};
