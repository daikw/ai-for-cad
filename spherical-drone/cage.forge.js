// Geodesic cage hemisphere (subdiv-1 icosphere, vertex-at-pole).
// `Half = top`    — access opening at the pole, safety hoop above the prop plane
// `Half = bottom` — landing foot + funnel-contact hoop, wire-channel chain thickened
// Mates to the deck's equatorial ring: trimmed at |z| >= 3, pads on the ring face.
// See lld.md §3-4. Coordinates: sphere center = origin (deck frame).

// Backend note: this build is manifold-safe (no difference() on a union base —
// pad holes are pre-drilled, see below), so no occt guard. The cage STL is in
// fact exported WITH --backend manifold: OCCT's tessellation of the strut
// lattice has cracks that importMesh() rejects, manifold's is watertight.

const { DRONE, icosphere1, arcPoints, hemisphereEdges, capVerts, balancedUnion } = require("./dims.js");

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
// Exception: the 5 pentagon-ring edges around the south pole follow the
// LATITUDE circle (constant z=-66.8, r=41.3). Their great-circle arcs would
// sag ~2mm toward the pole, right through the ToF sight corridor between the
// foot edge and the pentagon ring (caught by checks.forge.js).
const pentagonSet = top ? new Set() : new Set(capVerts(geo, "bottom"));
const latitudeArc = (p1, p2, segs) => {
  const r = Math.hypot(p1[0], p1[1]);
  const a1 = Math.atan2(p1[1], p1[0]);
  let d = Math.atan2(p2[1], p2[0]) - a1;
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const an = a1 + (d * i) / segs;
    pts.push([r * Math.cos(an), r * Math.sin(an), p1[2]]);
  }
  return pts;
};
const solids = [];
const usedVerts = new Set();
for (const [a, b] of edges) {
  usedVerts.add(a);
  usedVerts.add(b);
  const dia = wirePairs.has(a < b ? `${a}-${b}` : `${b}-${a}`) ? 3.0 : D.strutD;
  const pts =
    pentagonSet.has(a) && pentagonSet.has(b)
      ? latitudeArc(geo.verts[a], geo.verts[b], 3)
      : arcPoints(geo.verts[a], geo.verts[b], D.cageR, 3);
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const dir = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    const len = Math.hypot(dir[0], dir[1], dir[2]);
    // segments start 0.2 early and run 0.4 long, and joint spheres are 0.08
    // oversized: exact tangency between segment ends and spheres leaves
    // boundary edges in manifold's union output (open mesh -> CSG reject)
    const ux = dir[0] / len;
    const uy = dir[1] / len;
    const uz = dir[2] / len;
    solids.push(cylinder(len + 0.4, dia / 2, dia / 2, 16).pointAlong(dir).translate(p[0] - 0.2 * ux, p[1] - 0.2 * uy, p[2] - 0.2 * uz));
    if (i > 0) solids.push(sphere(dia / 2 + 0.08, 12).translate(p[0], p[1], p[2])); // chord joints
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
    solids.push(cylinder(len + 0.4, dia / 2, dia / 2, 16).pointAlong(dir).translate(px - 0.2 * (dir[0] / len), py - 0.2 * (dir[1] / len), pz - 0.2 * (dir[2] / len)));
  }
}

// --- trim at the ring face, add mounting pads ------------------------------
// NOTE: screw holes are pre-drilled in each pad BEFORE the big union.
// Subtracting them from the merged cage afterwards triggers a manifold
// robustness failure that silently drops the entire strut body (the result
// degenerates to pads-only, 0.9 cm3) — keep small booleans local.
let cage = balancedUnion(union, solids); // tree-merge: ~170x faster than the flat fold
// trim at the ring face via box intersection — trimByPlane leaves an uncapped
// cross-section in the render-server backend (93 boundary edges -> CSG reject)
const trimBox = box(2 * D.ringRO + 10, 2 * D.ringRO + 10, D.cageR + 30);
cage = intersection(cage, top ? trimBox.translate(0, 0, D.ringH / 2) : trimBox.translate(0, 0, -D.ringH / 2 - D.cageR - 30));

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
  // clip to the Ø160 envelope — a full Ø7 pad at r78.3 would poke out to r81.8.
  // The clip is the LAST op: difference-after-intersection silently reverted
  // the clip on OCCT (caught by checks: top pads measured r81.87)
  pad = intersection(pad, cylinder(D.padH + 2, D.ringRO).translate(0, 0, top ? D.ringH / 2 - 1 : -D.ringH / 2 - D.padH - 1));
  pads.push(pad);
}
cage = union(cage, ...pads);

const vol = cage.volume();
console.log(`cage-${half}: volume ${(vol / 1000).toFixed(1)} cm3 -> PETG ${((vol / 1000) * 1.27).toFixed(1)} g`);

return { shape: cage.color(top ? "#dde3e8" : "#c8d0d8"), half };
