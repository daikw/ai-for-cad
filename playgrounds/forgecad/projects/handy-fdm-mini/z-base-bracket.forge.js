// z-base-bracket — column-to-base right-angle gusset (lld.md §4.1).
// THE stiffness-critical part (hld.md Concern 2). Wraps the 2020 Z column foot
// and bolts down to the base rail; the 20.4 mm square pocket is the datum face
// that squares the column to the base.
//
// Local frame: column axis = +Z through origin; flange lies on z [0, footT] and
// bolts to the base rail (which runs in Y here). Built at origin — the assembly
// places it at the column foot.

const { PART, EXT, safeCut } = require("./dims.js");
const P = PART.zbase;
const collarOuter = P.slotW + 2 * P.wallT; // 32.4

const positives = [];
const cuts = [];

// flange on the base rail top (long axis along Y, the left rail direction)
positives.push(box(P.footW, P.footL, P.footT).translate(0, 0, 0));
// collar hugging the column, z [footT, footT+wallH]
positives.push(box(collarOuter, collarOuter, P.wallH).translate(0, 0, P.footT));
// stiffening web on the outboard (−X) face, tying collar down to the flange
positives.push(box(P.ribT, P.footL * 0.55, P.wallH * 0.6).translate(-(collarOuter / 2 - P.ribT / 2), 0, P.footT));

// column through-pocket (datum), 20.4 square all the way up incl. flange
cuts.push(box(P.slotW, P.slotW, P.wallH + P.footT + 2).translate(0, 0, -1));
// base T-nut holes (M5) at the flange ends, clear of the pocket
for (const sy of [1, -1]) cuts.push(cylinder(P.footT + 2, P.boltD / 2).translate(0, sy * (P.footL / 2 - 8), -1));
// column T-nut hole (M5), horizontal through the +X collar wall into the slot
cuts.push(cylinder(collarOuter + 2, P.boltD / 2).pointAlong([1, 0, 0]).translate(-collarOuter / 2 - 1, 0, P.footT + P.wallH / 2));

const bracket = safeCut(union, difference, positives, cuts);

console.log(`z-base-bracket: volume ${(bracket.volume() / 1000).toFixed(1)} cm3 -> PLA ${((bracket.volume() / 1000) * 1.24).toFixed(1)} g`);

return { shape: bracket.color("#4c6ef5"), collarOuter, pocket: P.slotW };
