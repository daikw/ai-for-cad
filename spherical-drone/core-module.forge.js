// Station core: Jetson Orin Nano Super Dev Kit bay between the two landing
// ports. Returns { body, lid } — printed separately. lld.md §5.2.
// Local coords: box centered on XY, base at z=0. Jetson port face toward -Y.

if (getActiveBackend() !== "occt") throw new Error("Run with --backend occt: manifold drops union operands in difference() — see CHANGELOG.md");

const { DRONE, STATION } = require("./dims.js");
const S = STATION;

// --- body shell --------------------------------------------------------------
let body = difference(
  box(S.coreW, S.coreL, S.coreH),
  box(S.coreW - 2 * S.wallT, S.coreL - 2 * S.wallT, S.coreH).translate(0, 0, S.floorT)
);

// lid screw bosses in the corners
const bossXY = [
  [S.coreW / 2 - S.wallT - 5, S.coreL / 2 - S.wallT - 5],
  [-(S.coreW / 2 - S.wallT - 5), S.coreL / 2 - S.wallT - 5],
  [S.coreW / 2 - S.wallT - 5, -(S.coreL / 2 - S.wallT - 5)],
  [-(S.coreW / 2 - S.wallT - 5), -(S.coreL / 2 - S.wallT - 5)],
];
for (const [x, y] of bossXY) {
  body = union(body, cylinder(S.coreH - S.floorT, 4.5).translate(x, y, S.floorT));
}

// --- jetson bay: standoffs + perimeter fence ---------------------------------
const fenceIn = { x: S.jetsonW + 1, y: S.jetsonL + 1 };
let fence = difference(
  box(fenceIn.x + 2 * S.wallT, fenceIn.y + 2 * S.wallT, 8),
  box(fenceIn.x, fenceIn.y, 10).translate(0, 0, -1),
  box(98, 20, 10).translate(0, -fenceIn.y / 2, -1) // open the -Y side (I/O face)
).translate(0, 0, S.floorT);
body = union(body, fence);
for (const sx of [1, -1])
  for (const sy of [1, -1]) {
    body = union(body, cylinder(6, 3).translate((sx * S.jetsonHoleX) / 2, (sy * S.jetsonHoleY) / 2, S.floorT));
  }

// --- cuts: I/O window, side vents, lid pilots, flange holes ------------------
const cuts = [];

// rear I/O cutout in the -Y wall (dev kit ports face out)
cuts.push(box(95, S.wallT + 2, 32).translate(0, -(S.coreL / 2 - S.wallT / 2), 11));

// vertical vent slots in ±X walls (lower half) — these walls also carry the
// connection flanges, so vents stay between the bolt rows (y ±55)
for (const sx of [1, -1])
  for (let k = 0; k < 8; k++) {
    cuts.push(box(S.wallT + 2, 4, 55).translate((sx * (S.coreW - S.wallT)) / 2, -49 + k * 14, 12));
  }

// M3 pilots into the lid bosses
for (const [x, y] of bossXY) cuts.push(cylinder(12, 1.25).translate(x, y, S.coreH - 12));

// jetson standoff pilots (M3 self-tap)
for (const sx of [1, -1])
  for (const sy of [1, -1])
    cuts.push(cylinder(8, 1.25).translate((sx * S.jetsonHoleX) / 2, (sy * S.jetsonHoleY) / 2, S.floorT + 1));

// M4 flange holes + wire pass-throughs on ±X faces (mirror of port-module)
for (const sx of [1, -1]) {
  for (const sy of [1, -1])
    for (const z of [45 - S.flangeBoltPitchZ / 2, 45 + S.flangeBoltPitchZ / 2]) {
      cuts.push(
        cylinder(S.wallT + 4, 2.25)
          .pointAlong([sx, 0, 0])
          .translate((sx * (S.coreW - 4)) / 2 - sx, (sy * S.flangeBoltPitchX) / 2, z)
      );
    }
  cuts.push(cylinder(S.wallT + 4, 4).pointAlong([sx, 0, 0]).translate((sx * (S.coreW - 4)) / 2 - sx, sx * 40, 14));
}

body = difference(body, ...cuts);

// --- lid ----------------------------------------------------------------------
let lid = union(
  box(S.coreW - 0.5, S.coreL - 0.5, S.wallT).translate(0, 0, S.coreH),
  difference(
    box(S.coreW - 2 * S.wallT - 0.6, S.coreL - 2 * S.wallT - 0.6, 6).translate(0, 0, S.coreH - 6),
    box(S.coreW - 2 * S.wallT - 5.4, S.coreL - 2 * S.wallT - 5.4, 8).translate(0, 0, S.coreH - 7)
  )
);
// skirt must clear the corner bosses
lid = difference(lid, ...bossXY.map(([x, y]) => cylinder(8, 5).translate(x, y, S.coreH - 7)));
// vents, M3 clearance, AprilTag recess, camera-mast boss
const lidCuts = [];
for (let k = 0; k < 10; k++) lidCuts.push(box(4, 80, S.wallT + 2).translate(-58 + k * 13, 35, S.coreH - 1));
for (const [x, y] of bossXY) lidCuts.push(cylinder(S.wallT + 2, 1.7).translate(x, y, S.coreH - 1));
lidCuts.push(box(S.tagRecess, S.tagRecess, 1).translate(0, -55, S.coreH + S.wallT - 0.99)); // tag sticker recess
lid = difference(lid, ...lidCuts);
lid = union(lid, difference(
  cylinder(6, 5).translate(45, -75, S.coreH + S.wallT), // camera mast boss (M4)
  cylinder(7, 1.65).translate(45, -75, S.coreH + S.wallT)
));

const vb = body.volume();
const vl = lid.volume();
console.log(`core-module body: ${(vb / 1000).toFixed(0)} cm3 -> PETG ${((vb / 1000) * 1.27).toFixed(0)} g, lid: ${(vl / 1000).toFixed(0)} cm3 -> ${((vl / 1000) * 1.27).toFixed(0)} g`);

return { body: body.color("#9aa3ab"), lid: lid.color("#8b949c") };
