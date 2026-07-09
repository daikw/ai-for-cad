// lld.md §7 verification suite. Run with:
//   forgecad run checks.forge.js --backend occt
// Every criterion in lld.md §7 maps to one named check here. Numbers are only
// trustworthy on occt (manifold drops union operands in difference()); the
// guard below fails loudly on any other backend.

const { createSuite, requireBackend } = require("../../playgrounds/forgecad/lib/forge-verify/verify.js");
requireBackend(getActiveBackend, "occt"); // see lib/forge-verify/kernel-pitfalls.md

const {
  REQ, EXT, FRAME, AXIS, COMP, RAIL, PART,
  FRAME_EXTRUSION_MM, extrusionMassG, railMassG, PLA_G_PER_CM3,
} = require("./dims.js");

const zbase = require("./z-base-bracket.forge.js");
const zcar = require("./z-carriage.forge.js");
const head = require("./head-carriage.forge.js");
const bed = require("./bed-carriage.forge.js");
const corner = require("./corner-bracket.forge.js");
const cable = require("./cable-guide.forge.js");

const suite = createSuite("handy-fdm-mini", { union, difference, intersection });

const W = EXT.w; // 20
const gz = 150; // representative X-gantry bottom height (matches blockout)
const gantryXc = FRAME.columnX + FRAME.gantryLen / 2; // +5

// ── world placement of the printed parts ────────────────────────────────────
// z-base-bracket: local origin = column axis at rail top → (columnX, 0, baseZTop)
const zbaseW = zbase.shape.translate(FRAME.columnX, 0, FRAME.baseZTop);
// z-carriage: clamp concentric with the gantry beam near the column end
const zcarW = zcar.shape.translate(-70, 0, gz + W / 2);
// head-carriage: rides X rail at head home (x=0), just in front of the gantry
const headW = head.shape.translate(0, -W / 2 - 6, gz + W / 2);
// bed-carriage at home (rides Y rail on the base center support)
const bedHomeW = bed.shape.translate(0, 0, FRAME.baseZTop + COMP.railH);
// bed-carriage at full rear Y travel (+40) — the tight case vs the low Y motor
const bedRearW = bed.shape.translate(0, AXIS.yTravel / 2, FRAME.baseZTop + COMP.railH);
// four corner brackets at the base corners (rotated to each corner)
const cornersW = [0, 90, 180, 270].map((deg) =>
  corner.shape.rotateZ(deg).translate(
    (deg === 0 || deg === 270 ? 1 : -1) * (FRAME.baseOuter / 2 - 34),
    (deg < 180 ? -1 : 1) * (FRAME.baseOuter / 2 - 10),
    0));

// ── frame + constrained motors (ghosts, for the envelope check) ─────────────
const frame = [
  box(FRAME.railXLen, W, W).translate(0, -(FRAME.baseOuter / 2 - W / 2), 0),
  box(FRAME.railXLen, W, W).translate(0, FRAME.baseOuter / 2 - W / 2, 0),
  box(W, FRAME.railYLen, W).translate(-(FRAME.baseOuter / 2 - W / 2), 0, 0),
  box(W, FRAME.railYLen, W).translate(FRAME.baseOuter / 2 - W / 2, 0, 0),
  box(W, FRAME.railYLen, W).translate(0, 0, 0),
  box(W, W, FRAME.columnLen).translate(FRAME.columnX, 0, FRAME.baseZTop),
  box(FRAME.gantryLen, W, W).translate(gantryXc, FRAME.gantryY, gz),
];
const m = COMP.nema17;
const yMotor = box(m.w, m.h, 24).translate(0, FRAME.baseOuter / 2 - m.h / 2 + 8, 2);
const motors = [
  yMotor,
  box(m.w, m.h, m.len).translate(-110 + m.w / 2, 0, FRAME.baseZTop + FRAME.columnLen - m.len),
  box(COMP.nema14.w, COMP.nema14.h, COMP.nema14.len).translate(FRAME.columnX + 2, 0, gz + W),
];

// ════════════════════════════════════════════════════════════════════════════
// C1 — everything stays inside the 220×220×260 body envelope (lld.md §7.1)
// Volume-based, not boundingBox(): intersect against an outside-the-envelope
// shell and require ≈ 0 (kernel-pitfalls.md #4).
const outsideShell = difference(
  box(500, 500, 500).translate(0, 0, -120),
  box(REQ.envX, REQ.envY, REQ.envZ).translate(0, 0, 0)
);
const placedPrinted = [zbaseW, zcarW, headW, bedHomeW, bedRearW, ...cornersW];
const everything = union([...frame, ...motors, ...placedPrinted]);
suite.expectNoOverlap("C1 all bodies inside 220×220×260 envelope", everything, outsideShell, 1);

// C2 — build volume 80³ sits within the envelope height (arithmetic)
suite.expectTrue("C2 build volume top ≤ envelope Z",
  AXIS.bedTopZ + AXIS.zTravel <= REQ.envZ, `${AXIS.bedTopZ + AXIS.zTravel} ≤ ${REQ.envZ}`);

// C3 — bed Y-sweep stays inside the base footprint (Concern 5)
const bedSweep = box(AXIS.bedPlate, AXIS.bedPlate + AXIS.yTravel, AXIS.bedPlateT)
  .translate(0, 0, AXIS.bedTopZ - AXIS.bedPlateT);
const outsideBase = difference(
  box(500, 500, 60).translate(0, 0, AXIS.bedTopZ - AXIS.bedPlateT - 1),
  box(FRAME.baseOuter, FRAME.baseOuter, 60).translate(0, 0, AXIS.bedTopZ - AXIS.bedPlateT - 1)
);
suite.expectNoOverlap("C3 bed Y-sweep within base footprint", bedSweep, outsideBase, 1);

// C4 — bed carriage at full rear travel clears the low rear Y motor
suite.expectNoOverlap("C4 bed carriage (rear travel) vs Y motor", bedRearW, yMotor, 0.1);

// ── C5/C6 — pocket/clamp seat clearance (lld.md §7.2) ───────────────────────
suite.expectNear("C5 z-base pocket seats 2020 column (0.4 clearance)", zbase.pocket - W, 0.4, 0.05, "mm");
suite.expectNear("C6 z-carriage clamp seats 2020 gantry (0.4 clearance)", zcar.clampBore - W, 0.4, 0.05, "mm");

// ── C7 — every printed part fits the K1 Max 300³ bed ────────────────────────
const printedLocal = [
  ["z-base-bracket", zbase.shape], ["z-carriage", zcar.shape], ["head-carriage", head.shape],
  ["bed-carriage", bed.shape], ["corner-bracket", corner.shape], ["cable-guide", cable.shape],
];
for (const [name, s] of printedLocal) suite.expectFitsBed(`C7 ${name} fits 300³ bed`, s, [300, 300, 300]);

// ── C8 — co-located printed parts seat their 2020 without interpenetration ──
// The bracket pocket (20.4) holds the 20 mm member with a 0.2 mm gap all round,
// so bracket solid ∩ member solid ≈ 0. A non-zero result means the pocket is
// undersized (crush fit) — a real fit failure.
const columnGhost = box(W, W, FRAME.columnLen).translate(FRAME.columnX, 0, FRAME.baseZTop);
const gantryGhost = box(FRAME.gantryLen, W, W).translate(gantryXc, FRAME.gantryY, gz);
suite.expectNoOverlap("C8 z-base-bracket seats column (pocket clears)", zbaseW, columnGhost, 0.5);
suite.expectNoOverlap("C8 z-carriage seats gantry (clamp clears)", zcarW, gantryGhost, 0.5);

// ════════════════════════════════════════════════════════════════════════════
// C9 — carry mass budget (lld.md §7.3, §9). Printed parts by measured volume;
// everything else from the documented component masses. PSU + spool detached.
const printedForBudget = [
  { name: "z-base-bracket", shape: zbase.shape, densityGcm3: PLA_G_PER_CM3 },
  { name: "z-carriage", shape: zcar.shape, densityGcm3: PLA_G_PER_CM3 },
  { name: "head-carriage", shape: head.shape, densityGcm3: PLA_G_PER_CM3 },
  { name: "bed-carriage", shape: bed.shape, densityGcm3: PLA_G_PER_CM3 },
  { name: "corner-bracket ×4", grams: (corner.shape.volume() / 1000) * PLA_G_PER_CM3 * 4 },
  { name: "cable-guide ×2", grams: (cable.shape.volume() / 1000) * PLA_G_PER_CM3 * 2 },
];
suite.budget("C9 one-hand carry mass (PSU + spool detached)", {
  items: [
    { name: "frame 2020 (1310mm × 0.45)", grams: extrusionMassG(FRAME_EXTRUSION_MM) },
    { name: "motors Y+Z NEMA17", grams: COMP.nema17.g * 2 },
    { name: "motor X NEMA14", grams: COMP.nema14.g },
    { name: "rails+carriages (X+Y+Z)", grams: railMassG(RAIL.xLen) + railMassG(RAIL.yLen) + railMassG(RAIL.zLen) },
    { name: "Z drive T8+nut", grams: RAIL.zLen * COMP.t8SteelGPerMm + COMP.t8NutG },
    { name: "head cluster (extruder+hotend+fans)", grams: COMP.extruder.g + COMP.hotend.g + COMP.headFans.g },
    { name: "electronics (SKR Pico+Pi+buck)", grams: COMP.skrPico.g + COMP.piZero.g + COMP.buck.g },
    { name: "bed plate", grams: COMP.bedPlateG },
    { name: "fasteners", grams: COMP.fastenersG },
    { name: "wiring/drag-chain", grams: COMP.wiringG },
    ...printedForBudget,
  ],
  maxGrams: REQ.carryMaxG, // 4000 g hard ceiling
});

// ── known placeholders (lld.md §7.4 / §11) ──────────────────────────────────
suite.waived("MGN9H mounting-hole pitch (z/head/bed carriages)",
  "placeholder 20mm until the carriage SKU is fixed — lld.md §11");
suite.waived("extruder mount pattern (head-carriage)",
  "placeholder until Orbiter 2 vs Sherpa Mini decided — hld.md Decision #6 / lld.md §11");

suite.summary();

// render something small so the runner is happy
return box(1, 1, 1).translate(0, 0, -500);
