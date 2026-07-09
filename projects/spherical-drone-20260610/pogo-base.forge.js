// Pogo-pin carrier insert: Ø26 disc, press-fit holes for 4 spring pins
// (1 center + 3 on the r11.5 circle), M2 pilots from below, wire channels
// on the underside. Drops into the port-module pedestal pocket; stack height
// is tuned with 0.5mm printed shims (lld.md §5.1, §2.3).
// Local coords: disc base at z=0.

const { DRONE, STATION } = require("./dims.js");
const S = STATION;

let base = cylinder(S.pogoBaseT, S.pogoBaseD / 2, S.pogoBaseD / 2, 64);

const cuts = [];
// pin press-fit bores (Ø body - 0.05), through — pins soldered from below
const pinHole = (S.pinBodyD - 0.05) / 2;
cuts.push(cylinder(S.pogoBaseT + 2, pinHole).translate(0, 0, -1));
for (const { x, y } of circularLayout(3, S.pinCircleR, { startDeg: 90 })) {
  cuts.push(cylinder(S.pogoBaseT + 2, pinHole).translate(x, y, -1));
}
// M2 pilots from below (screws come up through the pedestal web)
for (const { x, y } of circularLayout(3, S.pogoScrewPcd / 2)) {
  cuts.push(cylinder(5, DRONE.m2Pilot / 2).translate(x, y, -1));
}
// underside wire channels: center pad lead + ring leads, meeting the
// pedestal's central wire bore
for (const deg of [90, 210, 330]) {
  cuts.push(box(S.pinCircleR + 2, 2.2, 1.6).translate((S.pinCircleR + 2) / 2, 0, -0.01).rotateZ(deg));
}
base = difference(base, ...cuts);

const vol = base.volume();
console.log(`pogo-base: ${(vol / 1000).toFixed(1)} cm3 -> PETG ${((vol / 1000) * 1.27).toFixed(1)} g`);

return { shape: base.color("#d9c178") };
