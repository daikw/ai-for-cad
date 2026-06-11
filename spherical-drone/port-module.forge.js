// Station landing port: 200x200x95 box with a 45° funnel that self-centers
// the drone sphere, a central pedestal carrying the pogo-pin base, vent
// slots, M4 connection flanges on both ±X faces (same print serves left and
// right ports), and AprilTag plate slots on the ±Y walls. lld.md §5.1.
// Local coords: funnel axis = Z axis, box base at z=0, rim plane z=95.

if (getActiveBackend() !== "occt") throw new Error("Run with --backend occt: manifold drops union operands in difference() — see CHANGELOG.md");

const { DRONE, STATION } = require("./dims.js");
const S = STATION;

const rimZ = S.portH; // 95
const holeZ = rimZ - S.funnelDepth; // 20 — funnel bottom hole plane
const radialT = S.wallT / Math.sin(Math.PI / 4); // 3.4 — cone wall, measured radially

// --- outer shell box ---------------------------------------------------------
let portBody = difference(
  box(S.portW, S.portL, S.portH),
  box(S.portW - 2 * S.wallT, S.portL - 2 * S.wallT, S.portH - S.floorT - 3).translate(0, 0, S.floorT)
);

// top plate with the rim opening
portBody = union(portBody, difference(
  box(S.portW, S.portL, 3).translate(0, 0, rimZ - 3),
  cylinder(5, S.funnelTopD / 2).translate(0, 0, rimZ - 4)
));

// --- 45° funnel cone (inner surface r(z) = z, so r=20 @z20, r=95 @z95) -----
const innerCone = cylinder(80, 17, 97).translate(0, 0, 17);
const outerCone = cylinder(80, 17 + radialT, 97 + radialT).translate(0, 0, 17 - radialT);
let funnel = difference(outerCone, innerCone)
  .trimByPlane([0, 0, 1], holeZ)
  .trimByPlane([0, 0, -1], -rimZ);
portBody = union(portBody, funnel);

// radial support ribs under the cone (filled only below the cone surface)
const ribs = [];
for (let k = 0; k < 8; k++) {
  const rib = box(72, S.wallT, rimZ - S.floorT - 2).translate(59, 0, S.floorT).rotateZ(k * 45);
  ribs.push(difference(rib, outerCone));
}
portBody = union(portBody, ...ribs);

// --- pedestal: pogo base carrier in the funnel hole --------------------------
// top at z = rimZ - pedestalTopDepth = 33; pogo pocket Ø26.4 x 6 deep;
// M2 screws come up through the floor of the pocket (heads under the bridge)
let pedestal = cylinder(33 - S.floorT, S.pedestalD / 2).translate(0, 0, S.floorT);
pedestal = difference(
  pedestal,
  cylinder(6.5, (S.pogoBaseD + 0.4) / 2).translate(0, 0, 33 - 6), // insert pocket
  box(18, 12, 14).translate(10, 0, S.floorT + 2) // side window for wiring
);
portBody = union(portBody, pedestal);
// wire bore + M2 driver channels — cut through pedestal AND station floor
// (the station is flipped over to drive the pogo-base screws; Ø4.8 channels
// leave a 2mm web under the pocket floor for the M2 threads to clamp)
portBody = difference(
  portBody,
  cylinder(30, 4).translate(0, 0, -1), // central wire bore, opens into the pocket
  ...circularLayout(3, S.pogoScrewPcd / 2).flatMap(({ x, y }) => [
    cylinder(26, 2.4).translate(x, y, -1),
    cylinder(4, DRONE.m2Clear / 2).translate(x, y, 24.5),
  ])
);

// --- vent / drain slots through the cone near the bottom ---------------------
const vents = [];
for (let k = 0; k < 6; k++) {
  vents.push(box(30, 25, 6).translate(32, 0, 25).rotateZ(k * 60 + 30));
}
portBody = difference(portBody, ...vents);

// --- M4 connection flange holes on both ±X faces + wire pass-through --------
const flangeCuts = [];
for (const sy of [1, -1])
  for (const z of [45 - S.flangeBoltPitchZ / 2, 45 + S.flangeBoltPitchZ / 2]) {
    flangeCuts.push(
      cylinder(S.portW + 4, 2.25)
        .pointAlong([1, 0, 0])
        .translate(-S.portW / 2 - 2, (sy * S.flangeBoltPitchX) / 2, z)
    );
  }
flangeCuts.push(cylinder(S.portW + 4, 4).pointAlong([1, 0, 0]).translate(-S.portW / 2 - 2, 40, 14));
portBody = difference(portBody, ...flangeCuts);

// --- AprilTag plate slots on the ±Y walls (boss ridge + slot pocket) ---------
for (const sy of [1, -1]) {
  const yWall = sy * (S.portL / 2 - S.wallT); // inner face of the wall
  port = union(port, box(90, 6, 18).translate(0, yWall - sy * 3, S.portH - 18));
  portBody = difference(
    portBody,
    box(S.tagSlotW, S.tagSlotT, S.tagSlotDepth + 2).translate(0, yWall - sy * 3, S.portH - S.tagSlotDepth)
  );
}

const vol = portBody.volume();
console.log(`port-module: volume ${(vol / 1000).toFixed(0)} cm3 -> PETG ${((vol / 1000) * 1.27).toFixed(0)} g`);
console.log(`  funnel hole r=${holeZ}, pedestal top z=33 (depth ${rimZ - 33}), pin tips free z=${(rimZ - S.pinFreeDepth).toFixed(1)}`);

return { shape: portBody.color("#aeb6bd") };
