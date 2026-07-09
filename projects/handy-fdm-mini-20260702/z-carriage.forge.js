// z-carriage — Z MGN9H carriage → X gantry clamp (lld.md §4.2).
// Carries the whole cantilever moment (hld.md Concern 1). A plate bolts to the
// Z carriage; a 2020 clamp grips the X gantry beam; side gussets stiffen the
// junction. Local frame: gantry axis = +X through origin; plate faces −Y (the
// Z-carriage side).

const { PART, safeCut } = require("./dims.js");
const P = PART.zcar;
const clampOuter = P.clampBore + 2 * P.clampWall; // 30.4

const positives = [];
const cuts = [];

// gantry clamp collar, centered on origin
positives.push(box(P.clampL, clampOuter, clampOuter).translate(0, 0, -clampOuter / 2));
// mounting plate on the −Y face (against the Z MGN9H carriage)
const plateY = -(clampOuter / 2 + P.plateT / 2); // −18.2
positives.push(box(P.plateL, P.plateT, P.plateW).translate(0, plateY, -P.plateW / 2));
// two side gussets tying plate to clamp
for (const sx of [1, -1])
  positives.push(box(P.ribT, clampOuter / 2 + P.plateT, P.plateW * 0.8)
    .translate(sx * (P.clampL / 2 - P.ribT / 2), plateY / 2, -P.plateW * 0.4));

// gantry through-bore (20.4 square) along X
cuts.push(box(P.clampL + 2, P.clampBore, P.clampBore).translate(0, 0, -P.clampBore / 2));
// MGN9H mounting holes (M3, 20 mm pitch PLACEHOLDER §11) through the plate, axis Y
for (const sx of [1, -1])
  for (const sz of [1, -1])
    cuts.push(cylinder(P.plateT + 2, P.boltD / 2).pointAlong([0, 1, 0])
      .translate(sx * P.carHoleP / 2, plateY + P.plateT / 2 + 1, sz * P.carHoleP / 2));

const carriage = safeCut(union, difference, positives, cuts);
console.log(`z-carriage: volume ${(carriage.volume() / 1000).toFixed(1)} cm3 -> PLA ${((carriage.volume() / 1000) * 1.24).toFixed(1)} g`);

return { shape: carriage.color("#7048e8"), clampBore: P.clampBore };
