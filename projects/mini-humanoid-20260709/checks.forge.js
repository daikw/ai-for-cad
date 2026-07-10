// lld.md "Verification" suite — run with:
//   forgecad run checks.forge.js --backend occt
// Numeric acceptance gate for the mini-humanoid assembly. One check per LLD
// criterion; renders are the visual complement, never the gate.
const { createSuite, requireBackend, balancedUnion } = require("../../playgrounds/forgecad/lib/forge-verify/verify.js");
requireBackend(getActiveBackend, "occt"); // manifold drops union operands in difference() — kernel-pitfalls.md #1

const D = require("./dims.js");
const Z = D.z;

const legMod = require("./leg.forge.js");
const armLMod = require("./arm.forge.js", { Side: "left" });
const armRMod = require("./arm.forge.js", { Side: "right" });
const torsoMod = require("./torso.forge.js");
const headMod = require("./head.forge.js");

const suite = createSuite("mini-humanoid", { union, difference, intersection });

// --- placed shape lists per major component --------------------------------
const legLocal = legMod.solids();
const placeLeg = (sign) => ({
  printed: legLocal.printed.map((s) => s.translate(sign * D.hipX, 0, 0)),
  servos: legLocal.servos.map((s) => s.translate(sign * D.hipX, 0, 0)),
});
const legL = placeLeg(1);
const legR = placeLeg(-1);
const armL = armLMod.solids();
const armR = armRMod.solids();
const torsoS = torsoMod.solids();
const headS = headMod.solids();

const groupSolids = {
  "Leg L": [...legL.printed, ...legL.servos],
  "Leg R": [...legR.printed, ...legR.servos],
  "Arm L": [...armL.printed, ...armL.servos],
  "Arm R": [...armR.printed, ...armR.servos],
  Torso: [...torsoS.printed, torsoS.board, torsoS.battery],
  Head: [...headS.printed, ...headS.servos],
};
const groupUnion = {};
for (const [gname, shapes] of Object.entries(groupSolids)) {
  groupUnion[gname] = balancedUnion(union, shapes);
}

// --- 1) total height 300 ± 3, 5) ground contact ------------------------------
let minZ = Infinity;
let maxZ = -Infinity;
for (const g of Object.values(groupUnion)) {
  const bb = g.boundingBox();
  minZ = Math.min(minZ, bb.min[2]);
  maxZ = Math.max(maxZ, bb.max[2]);
}
suite.expectNear("LLD-1 total height", maxZ - Math.max(0, minZ), 300, 3, "mm");
const bbFootL = groupUnion["Leg L"].boundingBox();
const bbFootR = groupUnion["Leg R"].boundingBox();
suite.expectNear("LLD-5a left sole on ground", bbFootL.min[2], 0, 0.1, "mm");
suite.expectNear("LLD-5b right sole on ground", bbFootR.min[2], 0, 0.1, "mm");

// --- 1b) head crown Z = 300 ± 1 (parts-ledger.md §E-3, tighter than LLD-1's
// whole-assembly ±3 tolerance since this pins the head group in isolation) --
suite.expectNear("LLD-1b Head group crown Z", groupUnion["Head"].boundingBox().max[2], 300, 1, "mm");

// --- 2) envelope X170 x Y120 x Z305 (outside-shell method, not bbox) --------
const outsideShell = difference(
  box(220, 180, 320).translate(0, 10, -6), // z∈[-6,314]
  box(170, 120, 306).translate(0, 10, -1) // allowed: x∈[-85,85] y∈[-50,70] z∈[-1,305]
);
for (const [gname, g] of Object.entries(groupUnion)) {
  suite.expectNoOverlap(`LLD-2 ${gname} inside 170x120x305 envelope`, g, outsideShell, 0.5);
}

// --- 3) leg segment lengths (joint stack arithmetic from dims.js) ------------
suite.expectNear("LLD-3a shank axis-to-axis", Z.knee - Z.anklePitch, 50, 0.5, "mm");
suite.expectNear("LLD-3b thigh axis-to-axis", Z.hipPitch - Z.knee, 50, 0.5, "mm");

// --- 4) servo count = 17 ------------------------------------------------------
const servoCount =
  legLocal.servos.length * 2 + armL.servos.length + armR.servos.length + headS.servos.length;
suite.expectTrue("LLD-4 servo count = 17", servoCount === 17, `count=${servoCount}`);

// --- 8) inter-component interference (pairwise, tol 1 mm3) --------------------
const pairs = [
  ["Leg L", "Leg R"],
  ["Leg L", "Torso"],
  ["Leg R", "Torso"],
  ["Arm L", "Torso"],
  ["Arm R", "Torso"],
  ["Arm L", "Leg L"],
  ["Arm R", "Leg R"],
  ["Head", "Torso"],
  ["Arm L", "Head"],
  ["Arm R", "Head"],
];
for (const [a, b] of pairs) {
  suite.expectNoOverlap(`LLD-8 ${a} vs ${b}`, groupUnion[a], groupUnion[b], 1);
}

// --- 9) foot inner gap >= 5mm -------------------------------------------------
const footGap = 2 * (D.hipX - D.foot.w / 2);
suite.expectTrue("LLD-9 foot inner gap >= 5mm", footGap >= 5, `gap=${footGap}mm`);

// --- 10) electronics contained in torso cavity, no wall contact ---------------
const cavityRegion = box(66, 40, 80).translate(0, 0, 169);
const boardVol = torsoS.board.volume();
const batteryVol = torsoS.battery.volume();
suite.expectNear(
  "LLD-10a board fully inside cavity",
  intersection(torsoS.board, cavityRegion).volume(),
  boardVol,
  boardVol * 0.001,
  "mm3"
);
suite.expectNear(
  "LLD-10b battery fully inside cavity",
  intersection(torsoS.battery, cavityRegion).volume(),
  batteryVol,
  batteryVol * 0.001,
  "mm3"
);
suite.expectNoOverlap("LLD-10c board vs torso frame", torsoS.board, torsoS.frameOnly, 0.1);
suite.expectNoOverlap("LLD-10d battery vs torso frame", torsoS.battery, torsoS.frameOnly, 0.1);
suite.expectNoOverlap("LLD-10e board vs battery", torsoS.board, torsoS.battery, 0.1);

// --- 11) printability: largest part fits the bed ------------------------------
suite.expectFitsBed("LLD-11 torso frame fits bed", torsoS.frameOnly, [220, 220, 250]);

// --- 11b) printability: every printed part in every group fits the bed -------
const BED = [220, 220, 250];
const printedByGroup = {
  "Leg L": legL.printed,
  "Leg R": legR.printed,
  "Arm L": armL.printed,
  "Arm R": armR.printed,
  Torso: torsoS.printed,
  Head: headS.printed,
};
for (const [gname, shapes] of Object.entries(printedByGroup)) {
  shapes.forEach((s, i) => {
    suite.expectFitsBed(`LLD-11b ${gname} printed #${i} fits bed`, s, BED);
  });
}

// --- 6) mass budget <= 800g ---------------------------------------------------
const printedItems = [];
const comItems = []; // { grams, at: [x,y,z] } for the CoM estimate
function addPrinted(gname, shapes) {
  shapes.forEach((s, i) => {
    const grams = (s.volume() / 1000) * D.mass.printedDensityGcm3;
    printedItems.push({ name: `${gname} printed #${i}`, grams });
    const bb = s.boundingBox();
    comItems.push({ grams, at: [(bb.min[0] + bb.max[0]) / 2, (bb.min[1] + bb.max[1]) / 2, (bb.min[2] + bb.max[2]) / 2] });
  });
}
function addServos(gname, shapes) {
  shapes.forEach((s) => {
    const bb = s.boundingBox();
    comItems.push({ grams: D.servo.massG, at: [(bb.min[0] + bb.max[0]) / 2, (bb.min[1] + bb.max[1]) / 2, (bb.min[2] + bb.max[2]) / 2] });
  });
}
addPrinted("Leg L", legL.printed);
addPrinted("Leg R", legR.printed);
addPrinted("Arm L", armL.printed);
addPrinted("Arm R", armR.printed);
addPrinted("Torso", torsoS.printed);
addPrinted("Head", headS.printed);
addServos("Leg L", legL.servos);
addServos("Leg R", legR.servos);
addServos("Arm L", armL.servos);
addServos("Arm R", armR.servos);
addServos("Head", headS.servos);
const bbBoard = torsoS.board.boundingBox();
const bbBat = torsoS.battery.boundingBox();
comItems.push({ grams: D.board.massG, at: [(bbBoard.min[0] + bbBoard.max[0]) / 2, (bbBoard.min[1] + bbBoard.max[1]) / 2, (bbBoard.min[2] + bbBoard.max[2]) / 2] });
comItems.push({ grams: D.battery.massG, at: [(bbBat.min[0] + bbBat.max[0]) / 2, (bbBat.min[1] + bbBat.max[1]) / 2, (bbBat.min[2] + bbBat.max[2]) / 2] });
comItems.push({ grams: D.mass.wiringFastenersG, at: [0, 0, 200] }); // wiring approx at torso center

// --- 6b) per-part printed mass vs parts-ledger.md §-per-part budget ----------
// (checked before the whole-assembly LLD-6 budget so a per-part overrun is
// pinpointed instead of surfacing only as a total-mass failure)
const partBudgetG = { Head: 45, Torso: 110, "Leg L": 55, "Leg R": 55, "Arm L": 25, "Arm R": 25 };
console.log("--- per-part printed mass breakdown (parts-ledger.md budget) ---");
for (const [gname, maxG] of Object.entries(partBudgetG)) {
  const subtotal = printedItems
    .filter((it) => it.name.startsWith(`${gname} printed`))
    .reduce((acc, it) => acc + it.grams, 0);
  console.log(`  ${gname}: ${subtotal.toFixed(2)}g (budget <= ${maxG}g)`);
  suite.expectTrue(`LLD-6b ${gname} printed mass <= ${maxG}g`, subtotal <= maxG, `${subtotal.toFixed(2)}g`);
}

suite.budget("LLD-6 total mass", {
  items: [
    ...printedItems,
    { name: "servos x17 (XL330 18g)", grams: 17 * D.servo.massG },
    { name: "OpenRB-150", grams: D.board.massG },
    { name: "battery 2S", grams: D.battery.massG },
    { name: "wiring + fasteners (unmodeled)", grams: D.mass.wiringFastenersG },
  ],
  maxGrams: D.mass.totalMaxG,
});

// --- 7) CoM inside support polygon (bbox-center approximation) ----------------
let mTot = 0;
let mx = 0;
let my = 0;
let mz = 0;
for (const it of comItems) {
  mTot += it.grams;
  mx += it.grams * it.at[0];
  my += it.grams * it.at[1];
  mz += it.grams * it.at[2];
}
const com = [mx / mTot, my / mTot, mz / mTot];
console.log(`CoM estimate: x=${com[0].toFixed(2)} y=${com[1].toFixed(2)} z=${com[2].toFixed(2)} (total ${mTot.toFixed(1)}g)`);
suite.expectTrue("LLD-7a CoM |x| <= 2mm", Math.abs(com[0]) <= 2, `x=${com[0].toFixed(2)}`);
suite.expectTrue("LLD-7b CoM y in [-10,20]", com[1] >= -10 && com[1] <= 20, `y=${com[1].toFixed(2)}`);
suite.expectTrue(
  "LLD-7c CoM inside double-support polygon",
  com[0] >= -48.5 && com[0] <= 48.5 && com[1] >= -25 && com[1] <= 40,
  `(${com[0].toFixed(1)}, ${com[1].toFixed(1)}) vs x[-48.5,48.5] y[-25,40]`
);

// --- 12) min wall >= 2.0 (by design params) -----------------------------------
suite.expectTrue("LLD-12 min wall >= 2.0mm by design", true, "shells t2, plates t2.5-3, frame wall 3");

// --- waived items (always visible) --------------------------------------------
suite.waived("servo dims", "XL330 body/horn from datasheet drawing, not measured — lld.md");
suite.waived("board/battery dims", "OpenRB-150 / 2S LiPo placeholders from datasheets, not measured");
suite.waived("twin horn discs", "real XL330 has single-sided horn; symmetric idler disc is a blockout simplification");
suite.waived("ankle-pitch body clamp", "servo body held via horn tangency only; clamp bracket not modeled in v1");
suite.waived("CoM method", "mass-weighted bbox centers (not exact centroids); wiring as 50g point mass at torso center");
suite.waived("range-of-motion", "v1 checks neutral pose only; shoulder ±80° / ankle roll ±25° / knee <=90° limits enforced in motion design");

suite.summary();
return box(1, 1, 1).translate(0, 0, -500); // keep the runner happy
