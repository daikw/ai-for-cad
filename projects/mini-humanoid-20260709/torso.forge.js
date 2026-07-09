// Pelvis + torso frame (doubles as the chest shell) + electronics placeholders.
// All boolean cuts run on single primitives (never on a union base) —
// see lib/forge-verify/kernel-pitfalls.md #1/#5.
const D = require("./dims.js");
const Z = D.z;

// pelvis block with pockets that swallow the hip-roll servo bodies
const pelvisPocketL = box(28, 7.5, 19.5).translate(D.hipX, -17.25, Z.pelvisBottom - 0.5);
const pelvisPocketR = box(28, 7.5, 19.5).translate(-D.hipX, -17.25, Z.pelvisBottom - 0.5);
const pelvisSolid = difference(
  box(D.pelvis.w, D.pelvis.d, D.pelvis.h).translate(0, 0, Z.pelvisBottom),
  pelvisPocketL,
  pelvisPocketR
)
  .color(D.colors.graphite)
  .material({ metalness: 0.05, roughness: 0.65 });

// torso frame: box shell (wall 3) + shoulder holes + neck hole
const cavity = box(D.torso.w - 2 * D.torso.wall, D.torso.d - 2 * D.torso.wall, D.torso.h - 2 * D.torso.wall)
  .translate(0, 0, Z.torsoBottom + D.torso.wall); // 66x40x80, z∈[169,249]
const shoulderHoleL = box(5, 30, 30).translate(34.5, 0, 207); // x∈[32,37] z∈[207,237]
const shoulderHoleR = box(5, 30, 30).translate(-34.5, 0, 207);
const neckHole = box(40, 29, 12).translate(-8, 0, 246); // clears neck servo body + horns
const torsoFrame = difference(
  box(D.torso.w, D.torso.d, D.torso.h).translate(0, 0, Z.torsoBottom),
  cavity,
  shoulderHoleL,
  shoulderHoleR,
  neckHole
)
  .color(D.colors.shellWhite)
  .material({ metalness: 0.02, roughness: 0.6 });

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
  { name: "OpenRB-150", shape: boardShape },
  { name: "Battery 2S", shape: batteryShape }
);

return {
  group: torsoGroup,
  solids: () => ({
    printed: [pelvisSolid, torsoFrame],
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
