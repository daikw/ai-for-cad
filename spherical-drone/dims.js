// Shared dimensions + geodesic math for the spherical drone & dock station.
// Single source of truth — see lld.md for rationale behind every value.
// Pure JS only (no forge API): importable from any .forge.js or runnable
// directly with `node lib/dims.js` for the dimension self-check.

const DRONE = {
  sphereOD: 160,
  cageR: 78.5, // strut centerline radius = 80 - strutD/2 - arc-sag allowance
  strutD: 1.8,
  nodeD: 2.6, // joint spheres at geodesic vertices
  motorPitchR: 42.5, // diagonal motor pitch 85
  armAngles: [45, 135, 225, 315], // deg from +X
  propD: 51,
  propTipR: 42.5 + 25.5, // 68
  propZ: 14, // prop plane height (motor on arm top z=2 + ~12 motor stack)

  // center deck
  plateL: 56,
  plateW: 26,
  crossW: 31, // square cross-bar under ESC bosses (25.5 pitch + boss overhang)
  plateT: 2.5,
  plateTopZ: 2.0, // plate spans z [-0.5, 2.0]
  picoHoleX: 23.5,
  picoHoleY: 5.7,
  escPitch: 25.5,
  armW: 6,
  armT: 3,
  spokeW: 4,
  motorBossD: 15,
  motorBossT: 3,
  motorWireHoleD: 5,
  motorPcd: 6.6, // placeholder until motor SKU is fixed (lld.md §11)
  motorHoleD: 1.6,

  // equatorial ring: z [-3, +3], radial r [77.5, 80.0]
  ringH: 6,
  ringRO: 80,
  ringRI: 77.5,
  ringPadR: 78.75, // pad/pilot-hole circle = ring mid-wall
  padCount: 10, // geodesic equator vertices, every 36deg starting at lon 0
  padD: 7,
  padH: 2.5, // pads span z [3, 5.5] (top) / [-5.5, -3] (bottom)
  screwLons: { top: [0, 72, 144, 216, 288], bottom: [36, 108, 180, 252, 324] },
  m2Pilot: 1.7,
  m2Clear: 2.2,

  // cage extra hoops
  safetyRingZ: 24, // splits openings just above the prop plane
  landingRingZ: -55.5, // 45deg latitude: funnel contact line
  landingRingD: 2.5,

  // landing foot
  footD: 36,
  footT: 3,
  footTopZ: -74, // disc spans z [-77, -74]
  pcbT: 1.6, // contact disc under the foot: z [-78.6, -77]
  legD: 2.5,

  // ToF line of sight (VL53L1X on deck underside, looking down)
  tofX: 18,
  tofFovDeg: 27,

  // camera tab — kept entirely below the prop plane (props z 13..16 sweep
  // the whole XY ring r17..68, so nothing wide may cross that band)
  camTabW: 28,
  camTabH: 11, // z [-0.5, 10.5]
  camTabT: 2,
  camHolePitch: 20,

  // battery tray (1S 450-650mAh, 60x30x7 envelope)
  batL: 60,
  batW: 30,
  batH: 7,
  trayWall: 1.5,
  trayFloor: 1.2,
  trayTopZ: -8, // battery top; ESC bottom is -5.5, leave 2.5 wire room
  fitClear: 0.25,
};

const STATION = {
  funnelTopD: 190,
  funnelRimD: 196,
  funnelAngleDeg: 45,
  funnelHoleD: 40,
  funnelDepth: 75, // (95 - 20) * tan45
  portW: 200,
  portL: 200,
  portH: 95,
  coreW: 150,
  coreL: 200,
  coreH: 95,
  wallT: 2.4,
  floorT: 3.0,

  // tolerance chain (lld.md §2.3) — depths measured down from the rim plane
  seatCenterAboveRim: 18.1, // sphere(R80) center sits above the rim
  padPlaneDepth: 60.5, // contact-disc face
  pinFreeDepth: 57.9, // un-compressed pogo tip -> 2.6mm compression
  pedestalTopDepth: 62.0,
  pedestalD: 30,
  pinCircleR: 11.5,
  pinBodyD: 2.5,
  pinFreeLen: 8,

  // pogo base insert — Ø26: the lld.md §5.3 Ø20 disc cannot host the r11.5
  // pin circle (11.5 + pin radius > 10). Mounted with 3 M2 screws from below
  // through the pedestal floor instead of ear flanges (ears at PCD25 would
  // force a pedestal wider than the Ø40 funnel hole).
  pogoBaseD: 26,
  pogoBaseT: 8,
  pogoScrewPcd: 16,

  // jetson orin nano super dev kit
  jetsonW: 103,
  jetsonL: 90.5,
  jetsonH: 34.8,
  jetsonHoleX: 86, // placeholder until measured (lld.md §11)
  jetsonHoleY: 58,

  // apriltag plate
  tagPlate: 82,
  tagPlateT: 3,
  tagRecess: 62,
  tagSlotW: 82.5,
  tagSlotT: 3.4,
  tagSlotDepth: 12,

  flangeBoltPitchX: 160, // M4 connection pattern between modules
  flangeBoltPitchZ: 60,
};

// ---------------------------------------------------------------------------
// Geodesic: icosphere subdiv-1, vertex-at-poles orientation.
// Returns vertices on radius R and unique edges as index pairs.
// Rotated by lonOffsetDeg so one equator vertex lands at lon = 0.
// ---------------------------------------------------------------------------
function icosphere1(R, lonOffsetDeg) {
  const lat = Math.atan(0.5); // 26.565deg — icosahedron ring latitude
  const verts = [];
  const D2R = Math.PI / 180;
  const push = (v) => verts.push(v) - 1;

  const N = push([0, 0, 1]);
  const upper = [],
    lower = [];
  for (let i = 0; i < 5; i++) {
    const lonU = (72 * i + lonOffsetDeg) * D2R;
    const lonL = (72 * i + 36 + lonOffsetDeg) * D2R;
    upper.push(push([Math.cos(lat) * Math.cos(lonU), Math.cos(lat) * Math.sin(lonU), Math.sin(lat)]));
    lower.push(push([Math.cos(lat) * Math.cos(lonL), Math.cos(lat) * Math.sin(lonL), -Math.sin(lat)]));
  }
  const S = push([0, 0, -1]);

  const faces = [];
  for (let i = 0; i < 5; i++) {
    const j = (i + 1) % 5;
    faces.push([N, upper[i], upper[j]]);
    faces.push([upper[i], lower[i], upper[j]]);
    faces.push([lower[i], lower[j], upper[j]]);
    faces.push([S, lower[j], lower[i]]);
  }

  // subdivide once: midpoint of every edge, projected back onto the sphere
  const midCache = new Map();
  const midpoint = (a, b) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (midCache.has(key)) return midCache.get(key);
    const [ax, ay, az] = verts[a];
    const [bx, by, bz] = verts[b];
    const m = [ax + bx, ay + by, az + bz];
    const n = Math.hypot(m[0], m[1], m[2]);
    const idx = push([m[0] / n, m[1] / n, m[2] / n]);
    midCache.set(key, idx);
    return idx;
  };

  const edgeSet = new Set();
  const addEdge = (a, b) => edgeSet.add(a < b ? `${a}-${b}` : `${b}-${a}`);
  for (const [a, b, c] of faces) {
    const ab = midpoint(a, b);
    const bc = midpoint(b, c);
    const ca = midpoint(c, a);
    addEdge(a, ab);
    addEdge(ab, b);
    addEdge(b, bc);
    addEdge(bc, c);
    addEdge(c, ca);
    addEdge(ca, a);
    addEdge(ab, bc);
    addEdge(bc, ca);
    addEdge(ca, ab);
  }

  const scaled = verts.map(([x, y, z]) => [x * R, y * R, z * R]);
  const edges = [...edgeSet].map((k) => k.split("-").map(Number));
  return { verts: scaled, edges, poleN: N, poleS: S };
}

// Great-circle interpolation between two points on a sphere of radius R.
// Returns `segs + 1` points including both ends.
function arcPoints(p1, p2, R, segs) {
  const dot = (p1[0] * p2[0] + p1[1] * p2[1] + p1[2] * p2[2]) / (R * R);
  const omega = Math.acos(Math.min(1, Math.max(-1, dot)));
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    let a, b;
    if (omega < 1e-9) {
      a = 1 - t;
      b = t;
    } else {
      a = Math.sin((1 - t) * omega) / Math.sin(omega);
      b = Math.sin(t * omega) / Math.sin(omega);
    }
    pts.push([a * p1[0] + b * p2[0], a * p1[1] + b * p2[1], a * p1[2] + b * p2[2]]);
  }
  return pts;
}

// Classify subdiv-1 edges for one hemisphere build.
//  - drop the 10-edge equator decagon (the deck's equatorial ring replaces it)
//  - drop the 5 spoke edges touching the requested pole (access opening / foot)
function hemisphereEdges(geo, which) {
  const eps = 1e-4;
  const sign = which === "top" ? 1 : -1;
  const pole = which === "top" ? geo.poleN : geo.poleS;
  return geo.edges.filter(([a, b]) => {
    const za = geo.verts[a][2] * sign;
    const zb = geo.verts[b][2] * sign;
    if (za < -eps || zb < -eps) return false; // other hemisphere
    if (Math.abs(za) < eps && Math.abs(zb) < eps) return false; // equator decagon
    if (a === pole || b === pole) return false; // pole cap opening
    return true;
  });
}

// Pentagon ring around a pole (the 5 midpoint vertices of the pole spokes).
function capVerts(geo, which) {
  const pole = which === "top" ? geo.poleN : geo.poleS;
  const ids = new Set();
  for (const [a, b] of geo.edges) {
    if (a === pole) ids.add(b);
    if (b === pole) ids.add(a);
  }
  return [...ids];
}

module.exports = { DRONE, STATION, icosphere1, arcPoints, hemisphereEdges, capVerts };

// --- self-check: `node lib/dims.js` ---------------------------------------
if (require.main === module) {
  const D = DRONE;
  const S = STATION;
  const geo = icosphere1(D.cageR, -18); // -18 puts an equator vertex at lon 0
  console.log("=== geodesic ===");
  console.log("  verts:", geo.verts.length, "edges:", geo.edges.length); // 42 / 120
  const eq = geo.verts.filter((v) => Math.abs(v[2]) < 1e-4);
  console.log("  equator verts:", eq.length, "first lon:", (Math.atan2(eq[0][1], eq[0][0]) * 180) / Math.PI);
  // 120 = 10 decagon + 55 per hemisphere; minus 5 pole spokes each => 50
  console.log("  top edges:", hemisphereEdges(geo, "top").length, "(expect 50)");
  console.log("  bottom edges:", hemisphereEdges(geo, "bottom").length, "(expect 50)");
  const cap = capVerts(geo, "bottom").map((i) => geo.verts[i]);
  console.log("  S-cap pentagon z:", cap[0][2].toFixed(1), "r:", Math.hypot(cap[0][0], cap[0][1]).toFixed(1));

  console.log("=== clearances ===");
  const innerAtPropZ = Math.sqrt(D.cageR ** 2 - D.propZ ** 2) - D.strutD / 2;
  console.log("  cage inner R at prop plane:", innerAtPropZ.toFixed(1), "tip sweep:", D.propTipR, "gap:", (innerAtPropZ - D.propTipR).toFixed(1));
  if (innerAtPropZ - D.propTipR < 6) throw new Error("prop clearance < 6mm");

  console.log("=== funnel tolerance chain ===");
  const rimR = S.funnelTopD / 2; // 95
  const seat = rimR - 80 * Math.SQRT2; // -18.1 => above rim
  console.log("  sphere center vs rim:", seat.toFixed(1), "(negative = above rim)");
  const padDepth = 77 + D.pcbT + seat; // foot print face 77 below center
  console.log("  pad plane depth:", padDepth.toFixed(1), "(spec", S.padPlaneDepth, ")");
  if (Math.abs(padDepth - S.padPlaneDepth) > 0.15) throw new Error("pad plane drifted from spec");
  console.log("  pin compression:", (padDepth - S.pinFreeDepth).toFixed(1), "mm (target 2.6)");
  console.log("✓ all self-checks passed");
}
