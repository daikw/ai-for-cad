// corner-bracket — 2020 inner 90° gusset for the base square (lld.md §4.5, ×4).
// Two flanges at right angles, each bolting to a base rail with an M5 T-nut,
// with a diagonal rib. Local frame: inner corner at origin; leg1 runs +X on
// z [0, wallT], leg2 rises +Z on x [0, wallT].

const { PART, safeCut } = require("./dims.js");
const P = PART.corner;

const positives = [];
const cuts = [];

// leg1: flat flange on the rail top
positives.push(box(P.legL, P.legW, P.wallT).translate(P.legL / 2, 0, 0));
// leg2: vertical flange against the adjacent member
positives.push(box(P.wallT, P.legW, P.legL).translate(P.wallT / 2, 0, 0));
// corner bracing block joining the two legs (triangle simplified to a solid
// wedge-block — bracing intent, not exact geometry; not gated by any check)
positives.push(box(14, P.legW, 14).translate(P.wallT + 7, 0, P.wallT));

// M5 clearance holes, one per leg
cuts.push(cylinder(P.wallT + 2, P.boltD / 2).translate(P.legL * 0.6, 0, -1)); // leg1, vertical
cuts.push(cylinder(P.wallT + 2, P.boltD / 2).pointAlong([1, 0, 0]).translate(-1, 0, P.legL * 0.6)); // leg2, horizontal

const bracket = safeCut(union, difference, positives, cuts);
console.log(`corner-bracket: volume ${(bracket.volume() / 1000).toFixed(1)} cm3 -> PLA ${((bracket.volume() / 1000) * 1.24).toFixed(1)} g (×4)`);

return { shape: bracket.color("#868e96") };
