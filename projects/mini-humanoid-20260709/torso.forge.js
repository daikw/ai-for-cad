// Pelvis + torso frame (doubles as the chest shell) + electronics placeholders.
// All boolean cuts run on single primitives (never on a union base) —
// see lib/forge-verify/kernel-pitfalls.md #1/#5.
const D = require("./dims.js");
const Z = D.z;

// -- shallow panel-line groove between two XZ points on a box's front/back face.
// faceY > 0 cuts inward from +Y (front); faceY < 0 cuts inward from -Y (back).
// pointAlong reorients the box's own Z-run (0..len) onto (dx,0,dz) with the
// origin fixed, so translating by (x1, ..., z1) places the segment exactly
// from (x1,z1) to (x2,z2) — no manual trig needed (boss()/pocket() are
// unavailable on occt in forgecad 0.9.4: "slice() not yet implemented").
function grooveLine(x1, z1, x2, z2, faceY, width = 1.6, depth = 1.0) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const inward = faceY > 0 ? -1 : 1;
  return box(width, depth, len)
    .pointAlong([dx, 0, dz])
    .translate(x1, faceY + (inward * depth) / 2, z1);
}

// pelvis block with pockets that swallow the hip-roll servo bodies.
// Fillet the 4 outer vertical corners on the plain primitive *before*
// differencing the pockets — filleting after a multi-cutter difference()
// is unreliable on the truck backend (render 3d's fixed backend, no
// --backend flag there per kernel-pitfalls.md #7): it throws
// "edge finish size is too large" because the pocket cuts fragment the
// mesh-tracked corner edge into short unfilletable pieces. Rounding the
// clean box first, then cutting, sidesteps that entirely and matches
// occt's result (verified both backends during authoring).
const pelvisOuter = fillet(box(D.pelvis.w, D.pelvis.d, D.pelvis.h).translate(0, 0, Z.pelvisBottom), 2, {
  parallel: [0, 0, 1],
  convex: true,
});
const pelvisPocketL = box(28, 7.5, 19.5).translate(D.hipX, -17.25, Z.pelvisBottom - 0.5);
const pelvisPocketR = box(28, 7.5, 19.5).translate(-D.hipX, -17.25, Z.pelvisBottom - 0.5);
const pelvisSolid = difference(pelvisOuter, pelvisPocketL, pelvisPocketR)
  .color(D.colors.graphite)
  .material({ metalness: 0.05, roughness: 0.65 });

// torso frame: box shell (wall 3) + shoulder holes + neck hole + shallow
// chest/abdomen panel-line grooves (ref-1 front: trapezoid chest plate over a
// narrower abdomen plate, split by a waist seam + a small chest vent detail).
// Fillet the outer box's 4 vertical corners *first* (same truck-backend
// reasoning as the pelvis above), then run every cut in one difference()
// call against that single filleted primitive.
const outerBoxFilleted = fillet(box(D.torso.w, D.torso.d, D.torso.h).translate(0, 0, Z.torsoBottom), 2.5, {
  parallel: [0, 0, 1],
  convex: true,
});

const cavity = box(D.torso.w - 2 * D.torso.wall, D.torso.d - 2 * D.torso.wall, D.torso.h - 2 * D.torso.wall)
  .translate(0, 0, Z.torsoBottom + D.torso.wall); // 66x40x80, z∈[169,249]
const shoulderHoleL = box(5, 30, 30).translate(34.5, 0, 207); // x∈[32,37] z∈[207,237]
const shoulderHoleR = box(5, 30, 30).translate(-34.5, 0, 207);
const neckHole = box(40, 29, 12).translate(-8, 0, 246); // clears neck servo body + horns

const frontY = D.torso.d / 2; // +23, outer front surface
const waistZ = 206; // chest/abdomen split, well clear of shoulderHole z[207,237]
const chestTopZ = 248; // 4mm below the top rim (252)
const abdomenBottomZ = 171; // 5mm above the pelvis interface (166)
const chestGrooves = [
  grooveLine(-26, chestTopZ, -19, waistZ, frontY), // chest left slant
  grooveLine(19, waistZ, 26, chestTopZ, frontY), // chest right slant
  grooveLine(-26, chestTopZ, 26, chestTopZ, frontY), // chest top edge
  grooveLine(-19, waistZ, 19, waistZ, frontY), // waist seam (chest/abdomen split)
  grooveLine(-19, waistZ, -13, abdomenBottomZ, frontY), // abdomen left slant
  grooveLine(13, abdomenBottomZ, 19, waistZ, frontY), // abdomen right slant
  grooveLine(-13, abdomenBottomZ, 13, abdomenBottomZ, frontY), // abdomen bottom edge
];
const chestVent = box(18, 1.0, 6).translate(0, frontY - 0.5, 227); // shallow vent/sensor slot, chest center

const torsoFrame = difference(
  outerBoxFilleted,
  cavity,
  shoulderHoleL,
  shoulderHoleR,
  neckHole,
  ...chestGrooves,
  chestVent
)
  .color(D.colors.shellWhite)
  .material({ metalness: 0.02, roughness: 0.6 });

// backpack shell: side-view bulge on the back (-Y) face, upper-back height —
// a separate glued-on part (not booleaned into torsoFrame), so it carries its
// own fillet without touching the frame's difference chain. 0.2mm embed into
// the frame's back wall (tangent-contact margin, kernel-pitfalls.md #2);
// protrudes 2mm outward to y=-25, at the shell budget's +2mm limit.
// explicit edge selector below — an omitted selector ("fillet all") is
// throttled by a script-wide broad-edge-feature budget and gets silently
// skipped once that budget is spent (hit this on Pelvis Cover during
// authoring: zero rounding, no error). Single fillet pass only: a second
// pass on an already-filleted thin box fails on the truck backend
// ("edge finish size is too large for a selected cluster edge") — truck
// is `render 3d`'s fixed backend (no --backend flag on that subcommand,
// kernel-pitfalls.md #7), so the render path must survive it, not just occt.
const backpackShell = fillet(box(32, 2.2, 44).translate(0, -23.9, 206), 1, { parallel: [0, 0, 1] })
  .color(D.colors.shellWhite)
  .material({ metalness: 0.02, roughness: 0.6 });

// pelvis cover: contrasting white accent face on the pelvis front (+Y),
// separate part glued on the same way; 0.2mm embed, 1.5mm total depth.
const pelvisCover = fillet(box(48, 1.5, 20).translate(0, 20.55, 144), 0.6, { parallel: [0, 0, 1] })
  .color(D.colors.shellWhite)
  .material({ metalness: 0.02, roughness: 0.55 });

// electronics stacked flat below z=195 so the shoulder pitch servo bodies
// (z >= 196) clear them: battery on the cavity floor, board on the battery
const batteryShape = box(D.battery.w, 30, D.battery.t)
  .translate(0, 0, 169.5) // 50 x 30 x 15, z∈[169.5,184.5]
  .color(D.colors.lipoBlue)
  .material({ metalness: 0.05, roughness: 0.55 });
const boardShape = box(D.board.w, D.board.h, D.board.t)
  .translate(0, 0, 184.7) // 47 x 39 x 10, z∈[184.7,194.7]
  .color(D.colors.pcbGreen)
  .material({ metalness: 0.1, roughness: 0.5 });

const torsoGroup = group(
  { name: "Pelvis", shape: pelvisSolid },
  { name: "Torso Frame", shape: torsoFrame },
  { name: "Backpack Shell", shape: backpackShell },
  { name: "Pelvis Cover", shape: pelvisCover },
  { name: "OpenRB-150", shape: boardShape },
  { name: "Battery 2S", shape: batteryShape }
);

console.log(
  "torso printed volume mm3:",
  pelvisSolid.volume(),
  torsoFrame.volume(),
  backpackShell.volume(),
  pelvisCover.volume()
);
console.log(
  "torso printed mass g (0.8 g/cm3):",
  ((pelvisSolid.volume() + torsoFrame.volume() + backpackShell.volume() + pelvisCover.volume()) / 1000) * 0.8
);

return {
  group: torsoGroup,
  solids: () => ({
    printed: [pelvisSolid, torsoFrame, backpackShell, pelvisCover],
    fixed: [
      { name: "OpenRB-150", shape: boardShape, grams: D.board.massG },
      { name: "Battery 2S", shape: batteryShape, grams: D.battery.massG },
    ],
    frameOnly: torsoFrame,
    pelvisOnly: pelvisSolid,
    board: boardShape,
    battery: batteryShape,
  }),
};
