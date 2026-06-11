// lld.md §10 verification suite. Run with:  forgecad run checks.forge.js --backend occt
// Every check computes an intersection volume (mm3) between bodies that must
// not interfere, or a bounding-box/derived dimension. Throws on first failure
// so CI-style usage is just the exit code.

if (getActiveBackend() !== "occt") throw new Error("Run with --backend occt: manifold drops union operands in difference() — see CHANGELOG.md");

const { DRONE, STATION } = require("./dims.js");
const D = DRONE;
const S = STATION;

const deck = require("./center-deck.forge.js").shape;
const cageTop = require("./cage.forge.js", { Half: "top" }).shape;
const cageBottom = require("./cage.forge.js", { Half: "bottom" }).shape;
const tray = require("./battery-tray.forge.js").shape;
const portBody = require("./port-module.forge.js").shape;
const core = require("./core-module.forge.js");
const pogo = require("./pogo-base.forge.js").shape;

let failures = 0;
function expectNoOverlap(name, a, b, tolMm3) {
  const tol = tolMm3 == null ? 1 : tolMm3;
  const v = intersection(a, b).volume();
  const ok = v <= tol;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: overlap ${v.toFixed(1)} mm3 (tol ${tol})`);
  if (!ok) failures++;
}
function expectTrue(name, cond, detail) {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

// === drone ==================================================================

// prop swept discs (Ø51 x z 12..16, with the 6mm clearance margin baked in)
const propDiscs = [];
const propGuard = []; // expanded by the minimum clearance: overlap => gap < 6mm
for (const ang of D.armAngles) {
  const rad = (ang * Math.PI) / 180;
  const cx = D.motorPitchR * Math.cos(rad);
  const cy = D.motorPitchR * Math.sin(rad);
  propDiscs.push(cylinder(4, D.propD / 2).translate(cx, cy, 12));
  propGuard.push(cylinder(4, D.propD / 2 + 6).translate(cx, cy, 12));
}
const props = union(propDiscs);
expectNoOverlap("props vs cage-top", props, cageTop, 0.1);
expectNoOverlap("props vs deck", props, deck, 0.1);
expectNoOverlap("props(+6mm guard) vs cage-top", union(propGuard), cageTop, 0.1);

// cage stays inside the Ø160 sphere envelope
for (const [name, c] of [["cage-top", cageTop], ["cage-bottom", cageBottom]]) {
  const bb = c.boundingBox();
  const rMax = Math.max(Math.abs(bb.max[0]), Math.abs(bb.min[0]), Math.abs(bb.max[1]), Math.abs(bb.min[1]));
  expectTrue(`${name} XY extent <= 80.05`, rMax <= 80.05, `r=${rMax.toFixed(2)}`);
}
const bbB = cageBottom.boundingBox();
expectTrue("foot bottom at z=-77", Math.abs(bbB.min[2] + 77) < 0.05, `zmin=${bbB.min[2].toFixed(2)}`);

// component ghosts vs structure
const battery = box(D.batL, D.batW, D.batH).translate(0, 0, D.trayTopZ - D.batH);
const esc = union(box(30, 30, 1.2).translate(0, 0, -6.7), box(20, 20, 4).translate(0, 0, -5.5));
const pico = box(51, 21, 5).translate(0, 0, 4);
expectNoOverlap("battery vs tray", battery, tray, 0.1);
expectNoOverlap("battery vs deck", battery, deck, 0.1);
expectNoOverlap("esc vs deck (bosses clear)", esc, deck, 0.1);
expectNoOverlap("pico vs cage-top", pico, cageTop, 0.1);
expectNoOverlap("cage-top vs cage-bottom", cageTop, cageBottom, 0.1);
expectNoOverlap("cage-top vs deck (pads tangent on ring)", cageTop, deck, 2);
expectNoOverlap("cage-bottom vs deck", cageBottom, deck, 2);
expectNoOverlap("tray vs deck (prong hooks tangent)", tray, deck, 2);

// ToF: shifted-ROI cone (15°), mounted at r=19 on the lon -18° leg-gap axis,
// axis tilted 9° outboard along that azimuth — must clear foot, legs and
// pentagon ring (dims.js tofR/tofAzDeg/tofRoiTiltDeg note)
const tofCone = cylinder(72, 0.5, 0.5 + 72 * Math.tan((D.tofRoiFovDeg / 2) * Math.PI / 180))
  .rotateX(180) // apex up: cylinder grows downward after flip
  .rotateY(-D.tofRoiTiltDeg) // tilt toward +X below the pivot...
  .rotateZ(D.tofAzDeg) // ...then swing the tilt onto the leg-gap azimuth
  .translate(D.tofR * Math.cos((D.tofAzDeg * Math.PI) / 180), D.tofR * Math.sin((D.tofAzDeg * Math.PI) / 180), -5);
expectNoOverlap("ToF ROI cone vs cage-bottom (incl. foot)", tofCone, cageBottom, 0.1);

// === station ================================================================

// pins compress 2.6mm: pad plane minus free-tip plane (pure arithmetic re-check)
const padPlaneZ = S.portH + S.seatCenterAboveRim - 77 - D.pcbT;
const pinTipZ = S.portH - S.pinFreeDepth;
expectTrue("pogo compression = 2.6 ±0.1", Math.abs(pinTipZ - padPlaneZ - 2.6) < 0.1, `comp=${(pinTipZ - padPlaneZ).toFixed(2)}`);

// idealized drone sphere seated in the funnel: tangent contact only
const seated = sphere(80, 64).translate(0, 0, S.portH + S.seatCenterAboveRim);
expectNoOverlap("seated sphere vs port", seated, portBody, 60);

// landing ring torus at the seated pose vs funnel cone (the real contact body)
const ringR = Math.sqrt(D.cageR ** 2 - D.landingRingZ ** 2);
const landingTorus = torus(ringR, D.landingRingD / 2, 96).translate(0, 0, S.portH + S.seatCenterAboveRim + D.landingRingZ);
expectNoOverlap("landing ring vs funnel", landingTorus, portBody, 30);

// seated foot + contact disc reach into the bottom hole without touching
const footSolid = union(
  cylinder(D.footT, D.footD / 2).translate(0, 0, -77),
  cylinder(D.pcbT, D.footD / 2).translate(0, 0, -77 - D.pcbT)
).translate(0, 0, S.portH + S.seatCenterAboveRim);
expectNoOverlap("seated foot/disc vs port pedestal", footSolid, portBody, 0.1);
expectNoOverlap("seated foot/disc vs pogo base", footSolid, pogo.translate(0, 0, 26), 0.1);

// jetson fits the bay fence with clearance; lid drops over the bosses
const jetson = box(S.jetsonW, S.jetsonL, S.jetsonH).translate(0, 0, S.floorT + 6);
expectNoOverlap("jetson vs core body", jetson, core.body, 0.1);
expectNoOverlap("core lid vs core body", core.lid, core.body, 2);

// modules mate face-to-face without interpenetration
const portPlaced = portBody.translate(S.coreW / 2 + S.portW / 2, 0, 0);
expectNoOverlap("port vs core (mating faces tangent)", portPlaced, core.body, 5);

// every printed part fits the K1 Max bed (300x300x300)
for (const [name, s] of [
  ["center-deck", deck], ["cage-top", cageTop], ["cage-bottom", cageBottom],
  ["battery-tray", tray], ["port-module", portBody], ["core-body", core.body],
  ["core-lid", core.lid], ["pogo-base", pogo],
]) {
  const bb = s.boundingBox();
  const dims = [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]];
  expectTrue(`${name} fits 300^3 bed`, Math.max(...dims) <= 300, dims.map((v) => v.toFixed(0)).join("x"));
}

console.log(failures === 0 ? "✓ ALL CHECKS PASSED" : `✗ ${failures} CHECK(S) FAILED`);
if (failures > 0) throw new Error(`${failures} verification check(s) failed`);

// render something small so the runner is happy
return box(1, 1, 1).translate(0, 0, -500);
