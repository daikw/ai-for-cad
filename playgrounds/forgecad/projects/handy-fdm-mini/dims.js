// Handy FDM Mini — shared dimensions & mass model. Single source of truth.
// Pure JS only (no forge API): importable from any .forge.js, or run directly
// with `node dims.js` for the arithmetic self-check at the bottom.
//
// Coordinate system (world / assembly space):
//   origin  = center of the base footprint, on the ground plane
//   +X      = right   (X gantry / head travel axis)
//   +Y      = rear    (Y bedslinger travel axis, toward the back)
//   +Z      = up      (Z gantry lift axis)
//   z = 0   = bottom face of the base frame (machine sits on the table here)
//
// Kinematics = Prusa Mini cantilever (hld.md Approach): left vertical Z column,
// X gantry cantilevers to the right, bed slings front/back in Y. Build volume
// is centered on x=0,y=0 with the bed at mid-Y-travel ("home").
//
// See lld.md for the rationale behind every value. Values still tied to an
// unfixed SKU or an unmeasured part are tagged PLACEHOLDER and surfaced as
// waived checks in checks.forge.js (never silently trusted).

// ── requirement envelope (hld.md Problem) ───────────────────────────────────
const REQ = {
  buildX: 80, buildY: 80, buildZ: 80, // build volume, mm
  envX: 220, envY: 220, envZ: 260, // max body envelope, mm
  carryMaxG: 4000, // one-hand carry ceiling (hld.md 2.5–4.0 kg → 4.0 is the hard limit)
  carryTypG: 2500, // expected typical carry mass (lower end of the range)
};

// ── stock: 2020 T-slot aluminium extrusion ──────────────────────────────────
// Linear mass of generic 2020 (6063-T5, standard slot) ≈ 0.45 g/mm (0.45 kg/m).
const EXT = {
  w: 20, // cross-section 20×20 mm
  gPerMm: 0.45,
};

// ── frame layout ────────────────────────────────────────────────────────────
// Base is a 200×200 outer square of 2020 (fits inside the 220 envelope with a
// 10 mm belt/motor margin per side). Front/rear rails run full 200 in X; left/
// right + one center support run 160 in Y (between the inner faces, 200−2·20).
const FRAME = {
  baseOuter: 200, // outer square, mm
  baseZTop: 20, // base frame occupies z [0, 20]
  railXLen: 200, // front & rear rails (X-direction)
  railYLen: 160, // left, right & center rails (Y-direction), fit between X rails
  columnLen: 240, // Z column: z [20, 260] → column top = envelope top (260)
  columnX: -90, // column centerline at left rail (x = −(200/2 − 20/2))
  gantryLen: 190, // X gantry beam: x [−90, +100]
  gantryY: 0, // gantry centered front/back, over the bed center
};

// ── axis travels & build volume placement ───────────────────────────────────
// Bed top surface height: base top (20) + Y carriage stack (≈15) + plate (≈6).
const AXIS = {
  bedTopZ: 41, // z of the build surface at home
  yTravel: 80, // Y bedslinger stroke → bed center moves ±40
  xTravel: 80, // X head stroke → head center moves ±40
  zTravel: 80, // Z lift stroke (build height)
  bedPlate: 100, // square PEI/spring-steel plate edge, mm (hld.md 80–100)
  bedPlateT: 6, // plate + magnetic base stack thickness, mm
};

// ── market components (ghost envelopes for clearance/mass, hld.md 採用表) ─────
// Boxed envelopes only — enough to reserve space and carry mass, not detail.
const COMP = {
  // NEMA pancake steppers (faceplate × body length)
  nema17: { w: 42.3, h: 42.3, len: 24, g: 200 }, // Y & Z drive
  nema14: { w: 35.2, h: 35.2, len: 20, g: 110 }, // X drive
  // print head cluster (hld.md ~250 g): Orbiter 2 direct extruder + V6 hotend + fans
  extruder: { w: 34, h: 55, len: 42, g: 145 }, // Orbiter 2 class (motor included) — PLACEHOLDER SKU
  hotend: { d: 22, len: 42, g: 55 }, // 24V V6-compatible, 30–40 W
  headFans: { g: 45 }, // part-cooling + heatsink fan + duct
  // control electronics
  skrPico: { w: 58.4, h: 56.5, t: 12, g: 30 }, // BTT SKR Pico (RP2040 + TMC2209×4)
  piZero: { w: 65, h: 30, t: 6, g: 11 }, // Raspberry Pi Zero 2 W
  buck: { w: 30, h: 20, t: 12, g: 15 }, // 24V→5V converter for the Pi
  // motion hardware
  mgn9RailGPerMm: 0.09, // MGN9 rail linear mass
  mgn9CarriageG: 15, // MGN9H carriage block
  mgn9CarL: 30, mgn9CarW: 20, mgn9CarH: 10, // carriage block envelope
  railH: 6.5, // rail height above its mounting face
  t8LeadscrewD: 8, // Z leadscrew Ø8 (steel)
  t8SteelGPerMm: 0.387, // Ø8 steel rod ≈ π·4²·1·0.00785
  t8NutG: 10, // brass anti-backlash nut
  // consumables that stay ON the machine while carrying
  bedPlateG: 120, // 100×100 spring steel + magnetic PEI base
  fastenersG: 60, // screws, T-nuts, belts, pulleys, endstops
  wiringG: 90, // loom, connectors, drag-chain links
  // detached for carry (NOT counted in carry weight — hld.md 持ち運び手順)
  psuG: 350, // 24V 6A AC adapter brick (external)
  spoolG: 250, // filament spool (external holder)
};

// ── rail lengths per axis ───────────────────────────────────────────────────
const RAIL = {
  xLen: 200, // X MGN9 on the gantry
  yLen: 200, // Y MGN9 on the base
  zLen: 150, // Z MGN9 on the column
};

// ── printed structural parts (this repo's CAD scope) ─────────────────────────
// Dimensions of the parts modeled in *.forge.js. PLA @ 1.24 g/cm3 for mass.
const PLA_G_PER_CM3 = 1.24;
const PART = {
  // z-base-bracket: right-angle gusset joining the Z column foot to the base
  // frame — the "最重要剛性点" (hld.md Key Interfaces / Concern 2). Wraps the
  // 2020 column base and bolts to the base rail with a triangular web.
  zbase: {
    footL: 60, footW: 40, footT: 6, // base flange footprint
    wallH: 55, wallT: 6, // vertical wall hugging the column
    ribT: 5, // triangular gusset rib
    slotW: 20.4, // column-hugging pocket (2020 + 0.4 clearance) — datum face
    boltD: 5.2, // M5 clearance for T-nut into the extrusion
  },
  // z-carriage: bolts to the Z MGN9H carriage, clamps the X gantry 2020 —
  // the cantilever moment path (hld.md Concern 1). Heavy ribbing, target head
  // self-weight tip deflection ≤ 0.1 mm.
  zcar: {
    plateL: 44, plateW: 40, plateT: 6, // face against the MGN9H carriage
    clampL: 40, clampBore: 20.4, // 2020 gantry clamp (through-pocket)
    clampWall: 5, ribT: 5, ribN: 3,
    carHoleP: 20, // MGN9H mounting-hole pitch (PLACEHOLDER until carriage SKU)
    boltD: 3.2, // M3 clearance
  },
  // head-carriage: rides the X MGN9H, carries the extruder + hotend + fans.
  head: {
    plateL: 40, plateW: 46, plateT: 5, // rail-side plate
    extMountW: 36, extMountH: 50, extMountT: 5, // extruder mounting face
    boltD: 3.2,
    carHoleP: 20, // MGN9H pitch (PLACEHOLDER)
  },
  // bed-carriage: rides the Y MGN9H, 3-point leveling support for the plate.
  bed: {
    plateL: 90, plateW: 60, plateT: 5, // spider under the build plate
    armT: 6, armW: 12, // 3 leveling arms
    levelHoleD: 3.2, // M3 leveling screw
    levelPCD: 40, // leveling-screw triangle radius
    carHoleP: 20, // MGN9H pitch (PLACEHOLDER)
  },
  // corner-bracket: generic 2020 90° inner gusset for the base square (×4).
  corner: {
    legL: 34, legW: 20, wallT: 5, ribT: 4, boltD: 5.2,
  },
  // cable-guide: drag-chain anchor / cable clip on the moving bed & head.
  cable: {
    baseL: 30, baseW: 16, baseT: 4, throatW: 10, throatH: 12, wallT: 2.5, boltD: 3.2,
  },
};

// ── helpers ──────────────────────────────────────────────────────────────────
function extrusionMassG(totalLenMm) {
  return totalLenMm * EXT.gPerMm;
}
function railMassG(lenMm, carriages = 1) {
  return lenMm * COMP.mgn9RailGPerMm + carriages * COMP.mgn9CarriageG;
}

// Boolean-safety helpers (forge fns injected by the .forge.js caller). Same
// semantics as lib/forge-verify/verify.js — kept here so part files import only
// ./dims.js. See lib/forge-verify/kernel-pitfalls.md for the manifold bugs
// these sidestep.
//   safeCut: (A∪B)−C ≡ (A−C)∪(B−C) — distribute cutters onto each positive
//   BEFORE unioning, so difference() never runs on a union base (pitfall 1).
function safeCut(unionFn, diffFn, positives, cutters) {
  if (!cutters || cutters.length === 0) return unionFn(positives);
  const cut = positives.map((p) => diffFn(p, unionFn(cutters)));
  return unionFn(cut);
}
//   balancedUnion: chunked pairwise tree-merge instead of an O(n) linear fold.
function balancedUnion(unionFn, shapes, chunk = 16) {
  if (shapes.length <= 1) return shapes[0];
  let level = [];
  for (let i = 0; i < shapes.length; i += chunk) level.push(unionFn(shapes.slice(i, i + chunk)));
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? unionFn([level[i], level[i + 1]]) : level[i]);
    level = next;
  }
  return level[0];
}

// Total 2020 stock length in the frame (base square + center support + column + gantry).
const FRAME_EXTRUSION_MM =
  2 * FRAME.railXLen + // front + rear
  3 * FRAME.railYLen + // left + right + center support
  FRAME.columnLen + // Z column
  FRAME.gantryLen; // X gantry

// ── self-check (node dims.js) ────────────────────────────────────────────────
if (require.main === module) {
  const asserts = [];
  const check = (name, cond, detail) => asserts.push([cond ? "ok  " : "FAIL", name, detail]);

  // build volume fits inside the body envelope with room for the frame
  check("build X within envelope", AXIS.xTravel + 60 <= REQ.envX, `${AXIS.xTravel}+60 ≤ ${REQ.envX}`);
  check("build Z + base ≤ envelope Z", AXIS.bedTopZ + AXIS.zTravel <= REQ.envZ, `${AXIS.bedTopZ + AXIS.zTravel} ≤ ${REQ.envZ}`);
  // bed Y-sweep must stay within the base footprint (Concern 5)
  const bedRearEdge = AXIS.yTravel / 2 + AXIS.bedPlate / 2; // 40 + 50 = 90
  check("bed Y-sweep within base footprint", bedRearEdge <= FRAME.baseOuter / 2, `${bedRearEdge} ≤ ${FRAME.baseOuter / 2}`);
  // column top reaches the envelope top
  check("column top = envelope top", FRAME.baseZTop + FRAME.columnLen === REQ.envZ, `${FRAME.baseZTop + FRAME.columnLen} = ${REQ.envZ}`);

  const frameG = extrusionMassG(FRAME_EXTRUSION_MM);
  const motorsG = COMP.nema17.g * 2 + COMP.nema14.g; // Y, Z, X (E is inside extruder)
  const railsG = railMassG(RAIL.xLen) + railMassG(RAIL.yLen) + railMassG(RAIL.zLen);
  const zdriveG = RAIL.zLen * COMP.t8SteelGPerMm + COMP.t8NutG;
  const headG = COMP.extruder.g + COMP.hotend.g + COMP.headFans.g;
  const elecG = COMP.skrPico.g + COMP.piZero.g + COMP.buck.g;
  const carryNonPrintedG = frameG + motorsG + railsG + zdriveG + headG + elecG +
    COMP.bedPlateG + COMP.fastenersG + COMP.wiringG;

  console.log(`\nHandy FDM Mini — dims.js self-check`);
  console.log(`  frame 2020 total     ${FRAME_EXTRUSION_MM} mm → ${frameG.toFixed(0)} g`);
  console.log(`  motors (Y+Z+X)       ${motorsG.toFixed(0)} g`);
  console.log(`  rails+carriages      ${railsG.toFixed(0)} g`);
  console.log(`  Z drive (T8+nut)     ${zdriveG.toFixed(0)} g`);
  console.log(`  head cluster         ${headG.toFixed(0)} g`);
  console.log(`  electronics          ${elecG.toFixed(0)} g`);
  console.log(`  bed/fasteners/wiring ${(COMP.bedPlateG + COMP.fastenersG + COMP.wiringG).toFixed(0)} g`);
  console.log(`  ─ carry non-printed  ${carryNonPrintedG.toFixed(0)} g (printed parts add on top; ceiling ${REQ.carryMaxG} g)`);
  console.log(`  detached for carry   PSU ${COMP.psuG} g + spool ${COMP.spoolG} g (NOT counted)\n`);

  for (const [status, name, detail] of asserts) console.log(`  ${status} ${name}  (${detail})`);
  const failed = asserts.filter(([s]) => s === "FAIL").length;
  console.log(`\n  ${asserts.length - failed} ok, ${failed} failed`);
  if (failed) process.exit(1);
}

module.exports = {
  REQ, EXT, FRAME, AXIS, COMP, RAIL, PART,
  PLA_G_PER_CM3, FRAME_EXTRUSION_MM,
  extrusionMassG, railMassG, safeCut, balancedUnion,
};
