// cable-guide — drag-chain anchor / cable clip (lld.md §4.6).
// Manages the 3 runs of moving cable (head X, bed Y, gantry Z — hld.md
// Concern 3). A small footed clip: base plate + two throat walls forming a
// channel the loom snaps into. Local frame: base on z [0, baseT].

const { PART, safeCut } = require("./dims.js");
const P = PART.cable;

const positives = [];
const cuts = [];

// base plate
positives.push(box(P.baseL, P.baseW, P.baseT).translate(0, 0, 0));
// two throat walls forming the cable channel (throatW gap)
for (const sx of [1, -1])
  positives.push(box(P.wallT, P.baseW, P.throatH).translate(sx * (P.throatW / 2 + P.wallT / 2), 0, P.baseT));
// retention lips angled inward at the top of each wall
for (const sx of [1, -1])
  positives.push(box(P.wallT + 1.5, P.baseW, 2).translate(sx * (P.throatW / 2 + P.wallT / 2 - 0.75), 0, P.baseT + P.throatH - 2));

// two M3 mount holes in the base, outboard of the throat
for (const sx of [1, -1])
  cuts.push(cylinder(P.baseT + 2, P.boltD / 2).translate(sx * (P.baseL / 2 - 4), 0, -1));

const guide = safeCut(union, difference, positives, cuts);
console.log(`cable-guide: volume ${(guide.volume() / 1000).toFixed(1)} cm3 -> PLA ${((guide.volume() / 1000) * 1.24).toFixed(1)} g`);

return { shape: guide.color("#f59f00") };
