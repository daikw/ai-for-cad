// bed-carriage — Y MGN9H carriage → 3-point leveling bed support (lld.md §4.4).
// A spider that rides the Y rail and carries the 100 mm plate on three M3
// leveling screws. Its underside must clear the low rear Y motor (lld.md G6).
// Local frame: spider plate on z [0, plateT], leveling bosses on top.

const { PART, safeCut } = require("./dims.js");
const P = PART.bed;

const positives = [];
const cuts = [];

// spider plate
positives.push(box(P.plateL, P.plateW, P.plateT).translate(0, 0, 0));

// three leveling bosses on a triangle, radius levelPCD
const bossZ = P.plateT;
const bossH = 6;
const tri = [90, 210, 330];
for (const deg of tri) {
  const r = (deg * Math.PI) / 180;
  const bx = P.levelPCD * Math.cos(r);
  const by = P.levelPCD * Math.sin(r);
  positives.push(cylinder(bossH, P.armW / 2 + 1).translate(bx, by, bossZ));
  // radial arm from center out to the boss (stiffener): build along +X, then rotate
  positives.push(box(P.levelPCD, P.armW, P.armT).translate(P.levelPCD / 2, 0, 0).rotateZ(deg));
  // leveling screw hole through boss + plate
  cuts.push(cylinder(bossH + P.plateT + 2, P.levelHoleD / 2).translate(bx, by, -1));
}

// MGN9H mounting holes (M3, 20 mm pitch PLACEHOLDER §11) through the plate
for (const sx of [1, -1])
  for (const sy of [1, -1])
    cuts.push(cylinder(P.plateT + 2, 3.2 / 2).translate(sx * P.carHoleP / 2, sy * P.carHoleP / 2, -1));

const bed = safeCut(union, difference, positives, cuts);
console.log(`bed-carriage: volume ${(bed.volume() / 1000).toFixed(1)} cm3 -> PLA ${((bed.volume() / 1000) * 1.24).toFixed(1)} g`);

return { shape: bed.color("#2b8a3e"), levelPCD: P.levelPCD };
