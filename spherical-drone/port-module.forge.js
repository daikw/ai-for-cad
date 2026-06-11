// Station landing port: 200x200x95 box with a 45° funnel that self-centers
// the drone sphere, a central pedestal carrying the pogo-pin base, vent
// slots, M4 connection flanges on both ±X faces (same print serves left and
// right ports), and AprilTag plate slots on the ±Y walls. lld.md §5.1.
// Local coords: funnel axis = Z axis, box base at z=0, rim plane z=95.
//
// safeCut build (CHANGELOG.md): cutters are drilled into each positive before
// the union so the model is correct on both manifold and occt.

const { DRONE, STATION, safeCut } = require("./dims.js");
const S = STATION;

const rimZ = S.portH; // 95
const holeZ = rimZ - S.funnelDepth; // 20 — funnel bottom hole plane
const radialT = S.wallT / Math.sin(Math.PI / 4); // 3.4 — cone wall, measured radially
const pedestalTopZ = rimZ - S.pedestalTopDepth; // 33

const positives = [];
const cuts = [];

// --- outer shell: open-top box (cavity reaches z=portH — v1 had it 3mm short,
//     which sealed the funnel mouth with a solid slab; caught by checks.forge.js)
positives.push(
  difference(
    box(S.portW, S.portL, S.portH),
    box(S.portW - 2 * S.wallT, S.portL - 2 * S.wallT, S.portH).translate(0, 0, S.floorT)
  )
);

// top plate with the rim opening
positives.push(
  difference(
    box(S.portW, S.portL, 3).translate(0, 0, rimZ - 3),
    cylinder(5, S.funnelTopD / 2).translate(0, 0, rimZ - 4)
  )
);

// --- 45° funnel cone (inner surface r(z) = z, so r=20 @z20, r=95 @z95) -----
const innerCone = cylinder(80, 17, 97).translate(0, 0, 17);
const outerCone = cylinder(80, 17 + radialT, 97 + radialT).translate(0, 0, 17 - radialT);
positives.push(
  difference(outerCone, innerCone)
    .trimByPlane([0, 0, 1], holeZ)
    .trimByPlane([0, 0, -1], -rimZ)
);

// radial support ribs under the cone (filled only below the cone surface)
for (let k = 0; k < 8; k++) {
  const rib = box(72, S.wallT, rimZ - S.floorT - 2).translate(59, 0, S.floorT).rotateZ(k * 45);
  positives.push(difference(rib, outerCone));
}

// --- pedestal: pogo base carrier in the funnel hole --------------------------
positives.push(cylinder(pedestalTopZ - S.floorT, S.pedestalD / 2).translate(0, 0, S.floorT));
// pocket: 7 deep so the T8 pogo base top sits 0.5mm BELOW the contact-disc
// plane (the v1 6mm pocket left the base 0.5mm proud — caught by checks)
cuts.push(cylinder(S.pogoPocketDepth + 0.5, (S.pogoBaseD + 0.4) / 2).translate(0, 0, pedestalTopZ - S.pogoPocketDepth));
cuts.push(box(18, 12, 14).translate(10, 0, S.floorT + 2)); // side window for wiring
// central wire bore, opens into the pocket
cuts.push(cylinder(30, 4).translate(0, 0, -1));
// M2 driver channels through the station floor (flip the station to drive
// the pogo-base screws); 2mm web stays under the pocket floor
for (const { x, y } of circularLayout(3, S.pogoScrewPcd / 2)) {
  cuts.push(cylinder(25, 2.4).translate(x, y, -1));
  cuts.push(cylinder(4, DRONE.m2Clear / 2).translate(x, y, 23.5));
}

// --- vent / drain slots through the cone near the bottom ---------------------
for (let k = 0; k < 6; k++) {
  cuts.push(box(30, 25, 6).translate(32, 0, 25).rotateZ(k * 60 + 30));
}

// --- M4 connection flange holes on both ±X faces + wire pass-through --------
for (const sy of [1, -1])
  for (const z of [45 - S.flangeBoltPitchZ / 2, 45 + S.flangeBoltPitchZ / 2]) {
    cuts.push(
      cylinder(S.portW + 4, 2.25)
        .pointAlong([1, 0, 0])
        .translate(-S.portW / 2 - 2, (sy * S.flangeBoltPitchX) / 2, z)
    );
  }
cuts.push(cylinder(S.portW + 4, 4).pointAlong([1, 0, 0]).translate(-S.portW / 2 - 2, 40, 14));

// --- AprilTag plate slots on the ±Y walls (boss ridge + slot pocket) ---------
for (const sy of [1, -1]) {
  const yWall = sy * (S.portL / 2 - S.wallT); // inner face of the wall
  positives.push(box(90, 6, 18).translate(0, yWall - sy * 3, S.portH - 18));
  cuts.push(box(S.tagSlotW, S.tagSlotT, S.tagSlotDepth + 2).translate(0, yWall - sy * 3, S.portH - S.tagSlotDepth));
}

const portBody = safeCut(union, difference, positives, cuts);

const vol = portBody.volume();
console.log(`port-module: volume ${(vol / 1000).toFixed(0)} cm3 -> PETG ${((vol / 1000) * 1.27).toFixed(0)} g`);
console.log(`  funnel hole z=${holeZ}, pedestal top z=${pedestalTopZ}, pogo pocket floor z=${pedestalTopZ - S.pogoPocketDepth}`);

return { shape: portBody.color("#aeb6bd") };
