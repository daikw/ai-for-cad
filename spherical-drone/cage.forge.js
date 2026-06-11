// Geodesic cage hemisphere (subdiv-1 icosphere, vertex-at-pole).
// `Half = top`    — access opening at the pole, safety hoop above the prop plane
// `Half = bottom` — landing foot + funnel-contact hoop, wire-channel chain thickened
// Mates to the deck's equatorial ring: trimmed at |z| >= 3, pads on the ring face.
// See lld.md §3-4. Coordinates: sphere center = origin (deck frame).

if (getActiveBackend() !== "occt") throw new Error("Run with --backend occt: manifold drops union operands in difference() — see CHANGELOG.md");

const { DRONE, icosphere1, arcPoints, hemisphereEdges, capVerts } = require("./dims.js");

const half = Param.choice("Half", "top", ["top", "bottom"]);
const D = DRONE;
const top = half === "top";
const sign = top ? 1 : -1;

const geo = icosphere1(D.cageR, -18); // one equator vertex at lon 0
const edges = hemisphereEdges(geo, half);

// --- wire-channel chain (bottom only): foot -> pentagon(lon18) -> lower(lon18)
//     -> equator(lon36). Printed at Ø3.0 instead of Ø1.8; the charge leads are
//     zip-tied along it (lld.md specifies a groove — deferred to v2, the groove
//     would leave <0.7mm of wall in a Ø3 strut).
const findVert = (lonDeg, z) =>
  geo.verts.findIndex(
    (v) => Math.abs(v[2] - z) < 0.5 && Math.abs(((Math.atan2(v[1], v[0]) * 180) / Math.PI + 360) % 360 - lonDeg) < 1
  );
const wirePairs = new Set();
if (!top) {
  const pent = findVert(18, -66.8);
  const lower = findVert(18, -35.1);
  const eq36 = findVert(36, 0);
  for (const [a, b] of [[pent, lower], [lower, eq36]]) {
    if (a >= 0 && b >= 0) wirePairs.add(a < b ? `${a}-${b}` : `${b}-${a}`);
  }
}

// --- struts along great-circle arcs (3 chords/edge keeps sag < 0.4mm) ------
const solids = [];
const usedVerts = new Set();
for (const [a, b] of edges) {
  usedVerts.add(a);
  usedVerts.add(b);
  const dia = wirePairs.has(a < b ? `${a}-${b}` : `${b}-${a}`) ? 3.0 : D.strutD;
  const pts = arcPoints(geo.verts[a], geo.verts[b], D.cageR, 3);
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const dir = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    const len = Math.hypot(dir[0], dir[1], dir[2]);
    solids.push(cylinder(len, dia / 2, dia / 2, 16).pointAlong(dir).translate(p[0], p[1], p[2]));
    if (i > 0) solids.push(sphere(dia / 2, 12).translate(p[0], p[1], p[2])); // chord joints
  }
}
for (const i of usedVerts) {
  const [x, y, z] = geo.verts[i];
  solids.push(sphere(D.nodeD / 2, 16).translate(x, y, z));
}

// --- hoops -----------------------------------------------------------------
if (top) {
  const r = Math.sqrt(D.cageR ** 2 - D.safetyRingZ ** 2);
  solids.push(torus(r, D.strutD / 2, 96).translate(0, 0, D.safetyRingZ));
} else {
  const r = Math.sqrt(D.cageR ** 2 - D.landingRingZ ** 2);
  solids.push(torus(r, D.landingRingD / 2, 96).translate(0, 0, D.landingRingZ));
}

// --- landing foot + legs (bottom only) --------------------------------------
if (!top) {
  let foot = cylinder(D.footT, D.footD / 2, D.footD / 2, 64).translate(0, 0, -77);
  // rib-grid lightening: 1.8 pocket from the top leaves a 1.2 skin + cross ribs
  const pocket = difference(
    cylinder(1.8, 15.5, 15.5, 48),
    box(32, 2.4, 1.8),
    box(2.4, 32, 1.8)
  ).translate(0, 0, -75.8);
  foot = difference(
    foot,
    pocket,
    cylinder(6, D.m2Pilot / 2).translate(0, 15, -78), // contact-disc M2 x2
    cylinder(6, D.m2Pilot / 2).translate(0, -15, -78),
    cylinder(6, 1.5).translate(3, 0, -78), // charge-lead pass-throughs
    cylinder(6, 1.5).translate(10, 0, -78)
  );
  solids.push(foot);
  for (const vi of capVerts(geo, "bottom")) {
    const [px, py, pz] = geo.verts[vi];
    const lon = Math.atan2(py, px);
    const q = [16 * Math.cos(lon), 16 * Math.sin(lon), -75]; // embed into foot
    const dir = [q[0] - px, q[1] - py, q[2] - pz];
    const len = Math.hypot(dir[0], dir[1], dir[2]);
    const lonDeg = ((lon * 180) / Math.PI + 360) % 360;
    const dia = !top && Math.abs(lonDeg - 18) < 1 ? 3.0 : D.legD; // wire-channel leg
    solids.push(cylinder(len, dia / 2, dia / 2, 16).pointAlong(dir).translate(px, py, pz));
  }
}

// --- trim at the ring face, add mounting pads ------------------------------
// NOTE: screw holes are pre-drilled in each pad BEFORE the big union.
// Subtracting them from the merged cage afterwards triggers a manifold
// robustness failure that silently drops the entire strut body (the result
// degenerates to pads-only, 0.9 cm3) — keep small booleans local.
let cage = union(solids);
cage = top ? cage.trimByPlane([0, 0, 1], D.ringH / 2) : cage.trimByPlane([0, 0, -1], D.ringH / 2);

const screwLonSet = new Set(D.screwLons[half]);
const pads = [];
for (let k = 0; k < D.padCount; k++) {
  const lonDeg = k * 36;
  const lon = (lonDeg * Math.PI) / 180;
  const x = D.ringPadR * Math.cos(lon);
  const y = D.ringPadR * Math.sin(lon);
  let pad = cylinder(D.padH, D.padD / 2).translate(x, y, top ? D.ringH / 2 : -D.ringH / 2 - D.padH);
  if (screwLonSet.has(lonDeg)) {
    pad = difference(pad, cylinder(D.padH + 2, D.m2Clear / 2).translate(x, y, top ? D.ringH / 2 - 1 : -D.ringH / 2 - D.padH - 1));
  }
  pads.push(pad);
}
cage = union(cage, ...pads);

const vol = cage.volume();
console.log(`cage-${half}: volume ${(vol / 1000).toFixed(1)} cm3 -> PETG ${((vol / 1000) * 1.27).toFixed(1)} g`);

return { shape: cage.color(top ? "#dde3e8" : "#c8d0d8"), half };
