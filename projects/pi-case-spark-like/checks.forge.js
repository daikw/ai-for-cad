// Fit-check suite for the DGX-Spark-like Pi4 case candidate.
// Run: forgecad run checks.forge.js --backend manifold
//
// Backend note: this suite runs on manifold, deviating from the repo rule
// "numbers from occt only", because forgecad 0.9.4 cannot importMesh under
// occt and the case candidate exists only as STL. Every numeric check below
// is built from pairwise intersection() calls on imported meshes — no
// union-base difference / safeCut patterns where manifold is known to lie
// (see lib/forge-verify/kernel-pitfalls.md #1/#6). Cross-checked against the
// occt STEP import for the Pi (volume 18782 occt vs 18764 manifold, -0.1%).
//
// Known artifacts of the community Pi4 STEP (reference/rpi4b.step):
//   - GPIO pins are bare splayed pins (no plastic header); a few lean past
//     the board edge by up to 1.7mm. A real Pi4 header stays inside the edge.
//   - All 4 mounting holes are plugged inside the PCB thickness (z 9.5-11.1
//     placed). Alignment is instead established by the hole-ring fit:
//     model grid 49.03×58.00 vs tray post grid 49.03×58.00 (≤0.05mm).
const V = require("../../playgrounds/forgecad/lib/forge-verify/verify.js");
V.requireBackend(getActiveBackend, "manifold");

const suite = V.createSuite("pi-case-spark-like fit", { union, difference, intersection });

const [tray, pi, body] = require("./fit-assembly.forge.js", { "Explode lift": 0 });

// Geometry facts measured from the meshes (2026-07-17):
const POSTS = [
  [-8.5, -21.5],
  [-8.5, 36.5],
  [40.53, -21.5],
  [40.53, 36.5],
]; // ⌀6 posts, tops at z=9.5 — Pi4 mounting grid 49×58
const DECK_Z = 6.5; // tray deck top
const CEILING_Z = 31.5; // body inner ceiling
const PCB_EDGE_X = 44.03; // GPIO-side board edge, placed frame
const WALL_FACE_X = 44.6; // +X wall inner face (recessed panel), from Pi∩body blob
const BODY_OUTER = { x: 50.0, ymin: -50.25, ymax: 50.25, top: 34.33 };

// --- 1. pairwise interference -------------------------------------------
suite.expectNoOverlap("Pi vs tray", pi, tray, 1);
suite.expectNoOverlap("body vs tray", body, tray, 1);

// Pi vs body: the raw overlap is entirely the splayed-GPIO-pin artifact.
// Prove it with intersections only: the blob must lie fully beyond the wall
// face (x > 44.55); any interference on the board side of that plane is real.
const piBodyBlob = intersection(pi, body);
const rawVol = piBodyBlob.volume();
const boardSide = box(300, 300, 300).translate(44.55 - 150, 0, -100); // x ≤ 44.55
const realVol = intersection(piBodyBlob, boardSide).volume();
console.log(`  [diag] raw Pi∩body ${rawVol.toFixed(2)} mm3 (splayed-pin artifact zone)`);
suite.expectTrue(
  "Pi vs body (excluding GPIO-pin model artifact)",
  realVol <= 1,
  `real interference ${realVol.toFixed(2)} mm3; raw ${rawVol.toFixed(2)} mm3 sits in x>${44.55} artifact zone`
);
suite.expectNear("GPIO-edge to +X wall clearance", WALL_FACE_X - PCB_EDGE_X, 0.57, 0.3, "mm");

// --- 2. seating ----------------------------------------------------------
const piBB = pi.boundingBox();
suite.expectTrue(
  "under-board parts clear tray deck",
  piBB.min[2] > DECK_Z + 0.3,
  `lowest Pi point z=${piBB.min[2].toFixed(2)}, deck z=${DECK_Z} (clearance ${(piBB.min[2] - DECK_Z).toFixed(2)}mm)`
);
// Contact proofs: sinking a part by 0.15mm must produce material overlap,
// otherwise the part floats instead of seating.
const piSeat = intersection(pi.translate(0, 0, -0.15), tray).volume();
suite.expectTrue("Pi seats on post tops", piSeat > 2, `overlap when sunk 0.15mm: ${piSeat.toFixed(1)} mm3`);
const bodySeat = intersection(body.translate(0, 0, -0.15), tray).volume();
suite.expectTrue("body seats on tray", bodySeat > 5, `overlap when sunk 0.15mm: ${bodySeat.toFixed(1)} mm3`);

// --- 3. lateral registration of tray in body rim -------------------------
for (const [dx, dy] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
  const v = intersection(tray.translate(dx, dy, 0), body).volume();
  suite.expectTrue(
    `tray lateral play <0.5mm toward (${dx},${dy})`,
    v > 5,
    `overlap at 0.5mm shift: ${v.toFixed(1)} mm3`
  );
}

// --- 4. headroom ---------------------------------------------------------
suite.expectTrue(
  "tallest connector clears body ceiling",
  piBB.max[2] < CEILING_Z - 0.5,
  `highest Pi point z=${piBB.max[2].toFixed(2)}, ceiling z=${CEILING_Z} (clearance ${(CEILING_Z - piBB.max[2]).toFixed(2)}mm)`
);

// --- 5. envelope: Pi must stay inside the body outer shell ---------------
const world = box(300, 300, 300).translate(0, 0, -100);
const bodyEnvelope = box(2 * BODY_OUTER.x, BODY_OUTER.ymax - BODY_OUTER.ymin, BODY_OUTER.top + 1).translate(
  0,
  (BODY_OUTER.ymax + BODY_OUTER.ymin) / 2,
  0
);
const outside = difference(world, bodyEnvelope);
suite.expectNoOverlap("Pi inside body outer envelope", pi, outside, 1);

// --- 6. screw-head zone above PCB stays clear -----------------------------
// The through-hole path can't be tested against this model (plugged holes),
// but the head/driver zone above the PCB must be free of components.
// The USB-corner post (40.53, -21.5) is Pi-intrinsically tight: the PoE
// header sits 1.95mm from the hole axis, so only a ⌀4 head clears there
// (⌀4.5 pan head clips it by 0.67mm³, ⌀5 by 2.31mm³). Not a case defect.
for (const [x, y] of POSTS) {
  const tight = x === 40.53 && y === -21.5;
  const r = tight ? 2.0 : 2.5;
  const headZone = cylinder(4, r).translate(x, y, 11.2);
  suite.expectNoOverlap(
    `⌀${2 * r} screw-head zone clear at post (${x}, ${y})${tight ? " [PoE-header side: use ⌀4 head]" : ""}`,
    headZone,
    pi,
    0.5
  );
}

// --- 7. known open items --------------------------------------------------
suite.waived(
  "M2.5 through-hole path",
  "model artifact: all 4 mounting holes are plugged inside the PCB; alignment verified instead via hole-grid fit (49.03×58.00 vs posts, ≤0.05mm)"
);
suite.waived(
  "side ports (USB-C power / micro-HDMI / AV) reachable",
  "placement puts them at x≈-12 facing -X, buried inside the case — power must come via PoE/GPIO or the design needs an opening; design decision for the user"
);
suite.waived(
  "occt cross-check of interference numbers",
  "importMesh unsupported on occt in forgecad 0.9.4; manifold pairwise intersections used instead"
);
suite.waived(
  "physical print verification",
  "0.1mm-order fits (0.57mm GPIO-edge wall gap, <0.5mm tray play, post seating) need a test print"
);

suite.summary();
return [tray, pi, body];
