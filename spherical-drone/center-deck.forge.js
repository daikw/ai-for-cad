// Center deck: cross plate (Pico W on top / ESC+IMU below) + 4 motor arms +
// 4 spokes + equatorial ring, printed as one piece. lld.md §4.1.
// Coordinates: sphere center = origin; plate spans z [-0.5, +2.0].
//
// Build pattern: positives[] and cuts[] are kept separate and merged with
// safeCut() — cutters are drilled into each positive BEFORE the union, because
// manifold drops union operands when difference() runs on a union base
// (CHANGELOG.md). Works identically on occt.

const { DRONE, safeCut } = require("./dims.js");
const D = DRONE;

const plateZ = D.plateTopZ - D.plateT; // -0.5
const positives = [];
const cuts = [];

// --- plate: 56x26 main bar + 31x31 cross bar (ESC bosses overhang the bar) --
positives.push(box(D.plateL, D.plateW, D.plateT).translate(0, 0, plateZ));
positives.push(box(D.crossW, D.crossW, D.plateT).translate(0, 0, plateZ));

// --- arms + motor bosses + spokes at 45/135/225/315 -------------------------
for (const ang of D.armAngles) {
  // arm: plate edge (r~12) -> motor boss (r 42.5), top face flush with plate top
  positives.push(box(33.5, D.armW, D.armT).translate(28.75, 0, D.plateTopZ - D.armT).rotateZ(ang));
  positives.push(cylinder(D.motorBossT, D.motorBossD / 2).translate(0, 0, D.plateTopZ - D.motorBossT).translatePolar(D.motorPitchR, ang));
  // spoke: motor boss rim -> into the ring wall (r 47.2 .. 77.7)
  positives.push(box(30.5, D.spokeW, D.armT).translate(62.45, 0, D.plateTopZ - D.armT).rotateZ(ang));
}

// --- equatorial ring ---------------------------------------------------------
positives.push(
  difference(
    cylinder(D.ringH, D.ringRO, D.ringRO, 180),
    cylinder(D.ringH + 2, D.ringRI, D.ringRI, 180).translate(0, 0, -1)
  ).translate(0, 0, -D.ringH / 2)
);

// --- camera tab on +X edge ---------------------------------------------------
// Height capped at z 10.5: props sweep the full r17..68 annulus at z 13..16,
// so nothing wide may cross that band (lld.md §4.1 said 20 tall — corrected).
positives.push(box(D.camTabT, D.camTabW, D.camTabH).translate(D.plateL / 2 + D.camTabT / 2, 0, plateZ));

// --- bosses ------------------------------------------------------------------
for (const sx of [1, -1])
  for (const sy of [1, -1]) {
    // Pico W standoffs on top
    positives.push(cylinder(2, 2.5).translate(sx * D.picoHoleX, sy * D.picoHoleY, D.plateTopZ));
    cuts.push(cylinder(8, D.m2Pilot / 2).translate(sx * D.picoHoleX, sy * D.picoHoleY, -2));
    // ESC bosses hanging below the cross bar
    const ex = (sx * D.escPitch) / 2;
    const ey = (sy * D.escPitch) / 2;
    positives.push(cylinder(5, 2.25).translate(ex, ey, plateZ - 5));
    cuts.push(cylinder(5, D.m2Pilot / 2).translate(ex, ey, plateZ - 5.5));
  }

// --- cuts ----------------------------------------------------------------------

// plate lightening slots (clear of Pico bosses x±23.5, ESC bosses ±12.75)
cuts.push(box(6, 12, 6).translate(16, 0, -2));
cuts.push(box(6, 12, 6).translate(-16, 0, -2));

// ToF pocket on the underside, on the lon -18° leg-gap axis (see dims.js note);
// board is 13x18, long side radial-ish -> pocket 19(x) x 14(y), depth 1
const tofX = D.tofR * Math.cos((D.tofAzDeg * Math.PI) / 180);
const tofY = D.tofR * Math.sin((D.tofAzDeg * Math.PI) / 180);
cuts.push(box(19, 14, 2).translate(tofX, tofY, plateZ - 1));

// motor wire hole + mount holes (PCD placeholder, lld.md §11)
for (const ang of D.armAngles) {
  const rad = (ang * Math.PI) / 180;
  const cx = D.motorPitchR * Math.cos(rad);
  const cy = D.motorPitchR * Math.sin(rad);
  cuts.push(cylinder(8, D.motorWireHoleD / 2).translate(cx, cy, -3));
  for (const { x, y } of circularLayout(3, D.motorPcd / 2, { centerX: cx, centerY: cy, startDeg: ang })) {
    cuts.push(cylinder(8, D.motorHoleD / 2).translate(x, y, -3));
  }
}

// ring pilot holes for the cage screws: 5 from the top face, 5 from the bottom
for (const lonDeg of D.screwLons.top) {
  const rad = (lonDeg * Math.PI) / 180;
  cuts.push(cylinder(5, D.m2Pilot / 2).translate(D.ringPadR * Math.cos(rad), D.ringPadR * Math.sin(rad), D.ringH / 2 - 5));
}
for (const lonDeg of D.screwLons.bottom) {
  const rad = (lonDeg * Math.PI) / 180;
  cuts.push(cylinder(5, D.m2Pilot / 2).translate(D.ringPadR * Math.cos(rad), D.ringPadR * Math.sin(rad), -D.ringH / 2));
}

// camera M2 holes, horizontal through the tab
for (const sy of [1, -1]) {
  cuts.push(
    cylinder(D.camTabT + 2, D.m2Clear / 2)
      .pointAlong([1, 0, 0])
      .translate(D.plateL / 2 - 1, (sy * D.camHolePitch) / 2, 5)
  );
}

const deck = safeCut(union, difference, positives, cuts);

const vol = deck.volume();
console.log(`center-deck: volume ${(vol / 1000).toFixed(1)} cm3 -> PETG ${((vol / 1000) * 1.27).toFixed(1)} g`);

return { shape: deck.color("#36393f") };
