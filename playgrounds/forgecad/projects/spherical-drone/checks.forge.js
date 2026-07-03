// lld.md §10 verification suite. Run with:  forgecad run checks.forge.js --backend occt
// Every check computes an intersection volume (mm3) between bodies that must
// not interfere, or a bounding-box/derived dimension. suite.summary() throws
// on any failed check, so CI-style usage is just the exit code.

const { createSuite, requireBackend } = require("../../lib/forge-verify/verify.js");
requireBackend(getActiveBackend, "occt"); // manifold drops union operands in difference() — see CHANGELOG.md

const { DRONE, STATION } = require("./dims.js");
const D = DRONE;
const S = STATION;

const deck = require("./center-deck.forge.js").shape;
const cageTop = require("./cage.forge.js", { Half: "top", Build: "solid" }).shape;
const cageBottom = require("./cage.forge.js", { Half: "bottom", Build: "solid" }).shape;
const tray = require("./battery-tray.forge.js").shape;
const portBody = require("./port-module.forge.js").shape;
const core = require("./core-module.forge.js");
const pogo = require("./pogo-base.forge.js").shape;

const suite = createSuite("spherical-drone", { union, difference, intersection });

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
suite.expectNoOverlap("props vs cage-top", props, cageTop, 0.1);
suite.expectNoOverlap("props vs deck", props, deck, 0.1);
suite.expectNoOverlap("props(+6mm guard) vs cage-top", union(propGuard), cageTop, 0.1);

// cage stays inside the Ø160 sphere envelope. Measured as real material
// outside an r=80.05 cylinder — OCCT boundingBox() over-reports trimmed
// B-rep extents (phantom r=81.87 with zero actual volume out there).
const outsideShell = difference(
  cylinder(170, 95, 95, 64).translate(0, 0, -85),
  cylinder(172, 80.05, 80.05, 64).translate(0, 0, -86)
);
for (const [name, c] of [["cage-top", cageTop], ["cage-bottom", cageBottom]]) {
  suite.expectNoOverlap(`${name} inside Ø160.1 envelope`, c, outsideShell, 0.5);
}
const bbB = cageBottom.boundingBox();
suite.expectTrue("foot bottom at z=-77", Math.abs(bbB.min[2] + 77) < 0.05, `zmin=${bbB.min[2].toFixed(2)}`);

// component ghosts vs structure
const battery = box(D.batL, D.batW, D.batH).translate(0, 0, D.trayTopZ - D.batH);
const esc = union(box(30, 30, 1.2).translate(0, 0, -6.7), box(20, 20, 4).translate(0, 0, -5.5));
const pico = box(51, 21, 5).translate(0, 0, 4);
suite.expectNoOverlap("battery vs tray", battery, tray, 0.1);
suite.expectNoOverlap("battery vs deck", battery, deck, 0.1);
suite.expectNoOverlap("esc vs deck (bosses clear)", esc, deck, 0.1);
suite.expectNoOverlap("pico vs cage-top", pico, cageTop, 0.1);
suite.expectNoOverlap("cage-top vs cage-bottom", cageTop, cageBottom, 0.1);
suite.expectNoOverlap("cage-top vs deck (pads tangent on ring)", cageTop, deck, 2);
suite.expectNoOverlap("cage-bottom vs deck", cageBottom, deck, 2);
suite.expectNoOverlap("tray vs deck (prong hooks tangent)", tray, deck, 2);

// ToF: shifted-ROI cone (15°), mounted at r=19 on the lon -18° leg-gap axis,
// axis tilted 9° outboard along that azimuth — must clear foot, legs and
// pentagon ring (dims.js tofR/tofAzDeg/tofRoiTiltDeg note)
const tofCone = cylinder(72, 0.5, 0.5 + 72 * Math.tan((D.tofRoiFovDeg / 2) * Math.PI / 180))
  .rotateX(180) // apex up: cylinder grows downward after flip
  .rotateY(-D.tofRoiTiltDeg) // tilt toward +X below the pivot...
  .rotateZ(D.tofAzDeg) // ...then swing the tilt onto the leg-gap azimuth
  .translate(D.tofR * Math.cos((D.tofAzDeg * Math.PI) / 180), D.tofR * Math.sin((D.tofAzDeg * Math.PI) / 180), -5);
suite.expectNoOverlap("ToF ROI cone vs cage-bottom (incl. foot)", tofCone, cageBottom, 0.1);

// === station ================================================================

// pins compress 2.6mm: pad plane minus free-tip plane (pure arithmetic re-check)
const padPlaneZ = S.portH + S.seatCenterAboveRim - 77 - D.pcbT;
const pinTipZ = S.portH - S.pinFreeDepth;
suite.expectNear("pogo compression", pinTipZ - padPlaneZ, 2.6, 0.1, "mm");

// idealized drone sphere seated in the funnel: tangent contact only
const seated = sphere(80, 64).translate(0, 0, S.portH + S.seatCenterAboveRim);
suite.expectNoOverlap("seated sphere vs port", seated, portBody, 60);

// landing ring torus at the seated pose vs funnel cone (the real contact body)
const ringR = Math.sqrt(D.cageR ** 2 - D.landingRingZ ** 2);
const landingTorus = torus(ringR, D.landingRingD / 2, 96).translate(0, 0, S.portH + S.seatCenterAboveRim + D.landingRingZ);
suite.expectNoOverlap("landing ring vs funnel", landingTorus, portBody, 30);

// seated foot + contact disc reach into the bottom hole without touching
const footSolid = union(
  cylinder(D.footT, D.footD / 2).translate(0, 0, -77),
  cylinder(D.pcbT, D.footD / 2).translate(0, 0, -77 - D.pcbT)
).translate(0, 0, S.portH + S.seatCenterAboveRim);
suite.expectNoOverlap("seated foot/disc vs port pedestal", footSolid, portBody, 0.1);
suite.expectNoOverlap("seated foot/disc vs pogo base", footSolid, pogo.translate(0, 0, 26), 0.1);

// jetson fits the bay fence with clearance; lid drops over the bosses
const jetson = box(S.jetsonW, S.jetsonL, S.jetsonH).translate(0, 0, S.floorT + 6);
suite.expectNoOverlap("jetson vs core body", jetson, core.body, 0.1);
suite.expectNoOverlap("core lid vs core body", core.lid, core.body, 2);

// modules mate face-to-face without interpenetration
const portPlaced = portBody.translate(S.coreW / 2 + S.portW / 2, 0, 0);
suite.expectNoOverlap("port vs core (mating faces tangent)", portPlaced, core.body, 5);

// every printed part fits the K1 Max bed (300x300x300)
const printedParts = [
  ["center-deck", deck], ["cage-top", cageTop], ["cage-bottom", cageBottom],
  ["battery-tray", tray], ["port-module", portBody], ["core-body", core.body],
  ["core-lid", core.lid], ["pogo-base", pogo],
];
for (const [name, s] of printedParts) {
  suite.expectFitsBed(`${name} fits 300^3 bed`, s, [300, 300, 300]);
}

// === mass budget =============================================================
// AUW (All-Up Weight) is a drone-only figure — it must NOT include the
// stationary dock (port-module, core-body/lid, pogo-base). Printed parts
// here are the 4 drone bodies only; PLA 1.24 g/cm3 for printed volumes (per
// task spec — lld.md §9 itself budgets PETG 1.27 g/cm3; this check is a
// separate PLA-stock sanity pass). Electronics + wiring/screws/contacts are
// the conservative (upper) end of the documented ranges in lld.md §9
// ("電装（HLD 表合計）43–56 g" / "配線・ネジ・接点 5–7 g"), not invented numbers.
const dronePrintedParts = [
  ["center-deck", deck], ["cage-top", cageTop], ["cage-bottom", cageBottom], ["battery-tray", tray],
];
suite.budget("drone AUW budget (printed parts PLA + electronics upper-bound)", {
  items: [
    ...dronePrintedParts.map(([name, s]) => ({ name, shape: s, densityGcm3: 1.24 })),
    { name: "electronics (HLD table total, lld.md §9 upper bound)", grams: 56 },
    { name: "wiring/screws/contacts (lld.md §9 upper bound)", grams: 7 },
  ],
  maxGrams: 75, // design.md 60-75g flight-viability line, upper end
  waivedReason: "v1 is form-verification; over the 60-75g AUW line — v2 lightening levers in CHANGELOG",
});

// === known placeholder dimensions (lld.md §11) ==============================
suite.waived("motorPcd (dims.js DRONE.motorPcd)", "placeholder 6.6mm until motor SKU is fixed — lld.md §11");
suite.waived("jetsonHoleX (dims.js STATION.jetsonHoleX)", "placeholder 86mm until measured on real hardware — lld.md §11");
suite.waived("jetsonHoleY (dims.js STATION.jetsonHoleY)", "placeholder 58mm until measured on real hardware — lld.md §11");

suite.summary();

// render something small so the runner is happy
return box(1, 1, 1).translate(0, 0, -500);
