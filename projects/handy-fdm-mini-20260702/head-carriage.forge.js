// head-carriage — X MGN9H carriage → extruder/hotend mount (lld.md §4.3).
// Rides the X rail and holds the ~250 g extruder+hotend+fan cluster 25 mm in
// front of the rail. Local frame: rail plate centered at origin, normal +Y
// (faces the gantry rail); extruder mount face is parallel, 25 mm forward (−Y).

const { PART, safeCut } = require("./dims.js");
const P = PART.head;
const standoff = 25; // extruder face offset in front of the rail plate

const positives = [];
const cuts = [];

// rail plate against the X MGN9H carriage
positives.push(box(P.plateL, P.plateT, P.plateW).translate(0, P.plateT / 2, -P.plateW / 2));
// extruder mount face, 25 mm forward
positives.push(box(P.extMountW, P.extMountT, P.extMountH).translate(0, -standoff - P.extMountT / 2, -P.extMountH / 2));
// two side webs bridging rail plate to extruder face
for (const sx of [1, -1])
  positives.push(box(P.plateT, standoff + P.plateT, P.plateW * 0.8)
    .translate(sx * (P.plateL / 2 - P.plateT / 2), -standoff / 2 + P.plateT / 2, -P.plateW * 0.4));

// MGN9H mounting holes (M3, 20 mm pitch PLACEHOLDER §11) through the rail plate
for (const sx of [1, -1])
  for (const sz of [1, -1])
    cuts.push(cylinder(P.plateT + 2, P.boltD / 2).pointAlong([0, 1, 0])
      .translate(sx * P.carHoleP / 2, -1, sz * P.carHoleP / 2));
// extruder mount holes — PLACEHOLDER pattern (§11): a nominal 2×M3 pair, axis Y
for (const sx of [1, -1])
  cuts.push(cylinder(standoff + P.extMountT + 4, P.boltD / 2).pointAlong([0, 1, 0])
    .translate(sx * 8, 2, -P.extMountH * 0.35));

const head = safeCut(union, difference, positives, cuts);
console.log(`head-carriage: volume ${(head.volume() / 1000).toFixed(1)} cm3 -> PLA ${((head.volume() / 1000) * 1.24).toFixed(1)} g`);

return { shape: head.color("#e8590c") };
