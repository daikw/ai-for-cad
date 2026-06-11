// Station core: Jetson Orin Nano Super Dev Kit bay between the two landing
// ports. Returns { body, lid } — printed separately. lld.md §5.2.
// Local coords: box centered on XY, base at z=0. Jetson port face toward -Y.
//
// safeCut build (CHANGELOG.md): cutters drilled into each positive before the
// union — correct on both manifold and occt.

const { DRONE, STATION, safeCut } = require("./dims.js");
const S = STATION;

// "Piece" selects what renders/exports (STL export wants one part per file).
// require() callers (station.forge.js) use the default "both" and get { body, lid }.
const piece = Param.choice("Piece", "both", ["both", "body", "lid"]);

const bossXY = [
  [S.coreW / 2 - S.wallT - 5, S.coreL / 2 - S.wallT - 5],
  [-(S.coreW / 2 - S.wallT - 5), S.coreL / 2 - S.wallT - 5],
  [S.coreW / 2 - S.wallT - 5, -(S.coreL / 2 - S.wallT - 5)],
  [-(S.coreW / 2 - S.wallT - 5), -(S.coreL / 2 - S.wallT - 5)],
];

// --- body ---------------------------------------------------------------------
const bodyPos = [];
const bodyCuts = [];

bodyPos.push(
  difference(
    box(S.coreW, S.coreL, S.coreH),
    box(S.coreW - 2 * S.wallT, S.coreL - 2 * S.wallT, S.coreH).translate(0, 0, S.floorT)
  )
);

// lid screw bosses in the corners
for (const [x, y] of bossXY) {
  bodyPos.push(cylinder(S.coreH - S.floorT, 4.5).translate(x, y, S.floorT));
  bodyCuts.push(cylinder(12, 1.25).translate(x, y, S.coreH - 12)); // M3 pilot
}

// jetson bay: perimeter fence (open toward -Y for the I/O face) + standoffs
const fenceIn = { x: S.jetsonW + 1, y: S.jetsonL + 1 };
bodyPos.push(
  difference(
    box(fenceIn.x + 2 * S.wallT, fenceIn.y + 2 * S.wallT, 8),
    box(fenceIn.x, fenceIn.y, 10).translate(0, 0, -1),
    box(98, 20, 10).translate(0, -fenceIn.y / 2, -1)
  ).translate(0, 0, S.floorT)
);
for (const sx of [1, -1])
  for (const sy of [1, -1]) {
    bodyPos.push(cylinder(6, 3).translate((sx * S.jetsonHoleX) / 2, (sy * S.jetsonHoleY) / 2, S.floorT));
    bodyCuts.push(cylinder(8, 1.25).translate((sx * S.jetsonHoleX) / 2, (sy * S.jetsonHoleY) / 2, S.floorT + 1));
  }

// rear I/O cutout in the -Y wall (dev kit ports face out)
bodyCuts.push(box(95, S.wallT + 2, 32).translate(0, -(S.coreL / 2 - S.wallT / 2), 11));

// vertical vent slots in ±X walls (lower half), between the flange bolt rows
for (const sx of [1, -1])
  for (let k = 0; k < 8; k++) {
    bodyCuts.push(box(S.wallT + 2, 4, 55).translate((sx * (S.coreW - S.wallT)) / 2, -49 + k * 14, 12));
  }

// M4 flange holes + wire pass-throughs on ±X faces (mirror of port-module)
for (const sx of [1, -1]) {
  for (const sy of [1, -1])
    for (const z of [45 - S.flangeBoltPitchZ / 2, 45 + S.flangeBoltPitchZ / 2]) {
      bodyCuts.push(
        cylinder(S.wallT + 4, 2.25)
          .pointAlong([sx, 0, 0])
          .translate((sx * (S.coreW - 4)) / 2 - sx, (sy * S.flangeBoltPitchX) / 2, z)
      );
    }
  bodyCuts.push(cylinder(S.wallT + 4, 4).pointAlong([sx, 0, 0]).translate((sx * (S.coreW - 4)) / 2 - sx, sx * 40, 14));
}

const body = safeCut(union, difference, bodyPos, bodyCuts);

// --- lid ------------------------------------------------------------------------
const lidPos = [];
const lidCuts = [];

lidPos.push(box(S.coreW - 0.5, S.coreL - 0.5, S.wallT).translate(0, 0, S.coreH));
lidPos.push(
  difference(
    box(S.coreW - 2 * S.wallT - 0.6, S.coreL - 2 * S.wallT - 0.6, 6).translate(0, 0, S.coreH - 6),
    box(S.coreW - 2 * S.wallT - 5.4, S.coreL - 2 * S.wallT - 5.4, 8).translate(0, 0, S.coreH - 7)
  )
);
// camera mast boss (M4) with its hole pre-drilled
lidPos.push(
  difference(
    cylinder(6, 5).translate(45, -75, S.coreH + S.wallT),
    cylinder(7, 1.65).translate(45, -75, S.coreH + S.wallT - 0.5)
  )
);

// skirt relief over the corner bosses + M3 clearance through the plate
for (const [x, y] of bossXY) {
  lidCuts.push(cylinder(7, 5).translate(x, y, S.coreH - 7));
  lidCuts.push(cylinder(S.wallT + 2, 1.7).translate(x, y, S.coreH - 1));
}
// top vents + AprilTag sticker recess
for (let k = 0; k < 10; k++) lidCuts.push(box(4, 80, S.wallT + 2).translate(-58 + k * 13, 35, S.coreH - 1));
lidCuts.push(box(S.tagRecess, S.tagRecess, 1).translate(0, -55, S.coreH + S.wallT - 0.99));

const lid = safeCut(union, difference, lidPos, lidCuts);

const vb = body.volume();
const vl = lid.volume();
console.log(`core-module body: ${(vb / 1000).toFixed(0)} cm3 -> PETG ${((vb / 1000) * 1.27).toFixed(0)} g, lid: ${(vl / 1000).toFixed(0)} cm3 -> ${((vl / 1000) * 1.27).toFixed(0)} g`);

if (piece === "body") return { body: body.color("#9aa3ab") };
if (piece === "lid") return { lid: lid.color("#8b949c") };
return { body: body.color("#9aa3ab"), lid: lid.color("#8b949c") };
