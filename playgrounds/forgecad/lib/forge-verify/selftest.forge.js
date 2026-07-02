// Self-test for lib/forge-verify/verify.js. Exercises every exported
// function on both the pass path and the fail path (a deliberately-failing
// suite whose summary() must throw). Run with:
//   forgecad run lib/forge-verify/selftest.forge.js --backend occt
// Also run once with --backend manifold to confirm requireBackend rejects it.

const { createSuite, requireBackend, balancedUnion, safeCut } = require("./verify.js");

requireBackend(getActiveBackend, "occt");

function assertEq(label, actual, expected, tol) {
  const diff = Math.abs(actual - expected);
  if (diff > tol) throw new Error(`SELFTEST FAIL ${label}: actual=${actual} expected=${expected} diff=${diff} tol=${tol}`);
  console.log(`ok ${label}: ${actual.toFixed(3)} ~= ${expected.toFixed(3)} (diff ${diff.toFixed(4)}, tol ${tol})`);
}

function assertThrows(label, fn) {
  try {
    fn();
  } catch (e) {
    console.log(`ok ${label}: threw as expected — ${e.message}`);
    return e;
  }
  throw new Error(`SELFTEST FAIL ${label}: expected a throw, got none`);
}

// --- tiny primitives ------------------------------------------------------
// box() is centered in X/Y, spans Z [0,H]; cylinder() likewise (checked via
// probe against the running forgecad build before writing this suite).
const boxA = box(10, 10, 10); // 1000 mm3
const boxB = box(10, 10, 10).translate(6, 0, 0); // overlaps boxA by 4x10x10 = 400 mm3
const boxFar = box(10, 10, 10).translate(30, 0, 0); // no overlap with boxA
const cutter = cylinder(20, 3).translate(3, 0, -5); // passes through both A and B

// === 1. safeCut correctness: safeCut(A,B minus C) == difference(union(A,B),C) ===
const forgeOps = { union, difference, intersection };
const safeCutResult = safeCut(union, difference, [boxA, boxB], [cutter]);
const plainResult = difference(union(boxA, boxB), cutter);
assertEq("safeCut vs difference(union) volume", safeCutResult.volume(), plainResult.volume(), 0.1);

// === 2. balancedUnion correctness: same volume as a plain union(array) =====
const many = [];
for (let i = 0; i < 20; i++) many.push(box(10, 10, 10).translate(i * 12, 0, 0)); // non-overlapping, 12mm pitch
const plainUnionVol = union(many).volume();
const balancedUnionVol = balancedUnion(union, many, 6).volume();
assertEq("balancedUnion vs union(array) volume (20 shapes)", balancedUnionVol, plainUnionVol, 0.1);
assertEq("balancedUnion(array) matches sum of 20 x 1000mm3 boxes (non-overlapping)", balancedUnionVol, 20000, 0.1);

// === 3. pass-path suite: exercise every method with passing conditions =====
const passSuite = createSuite("selftest-pass", forgeOps);

passSuite.expectNoOverlap("boxA vs boxFar (no overlap)", boxA, boxFar, 0.1);
passSuite.expectTrue("2 + 2 === 4", 2 + 2 === 4, "sanity");
passSuite.expectNear("pi approx", 3.14159, Math.PI, 0.001, "rad");
passSuite.expectFitsBed("boxA fits 300^3 bed", boxA, [300, 300, 300]);
passSuite.waived("motor PCD tolerance", "placeholder dimension — SKU not fixed yet (selftest fixture)");
passSuite.budget("mass budget (under)", {
  items: [
    { name: "fastener-mock", grams: 4.5 },
    { name: "boxA-mock", shape: boxA, densityGcm3: 1.24 }, // 1000mm3 * 1.24/1000 = 1.24g
  ],
  maxGrams: 80,
});
passSuite.budget("mass budget (over, waived)", {
  items: [{ name: "heavy-mock", grams: 500 }],
  maxGrams: 80,
  waivedReason: "known overweight placeholder — real BOM not finalized (selftest fixture)",
});

const passResult = passSuite.summary();
assertEq("pass-path passed count", passResult.passed, 5, 0); // expectNoOverlap, expectTrue, expectNear, expectFitsBed, budget(under)
assertEq("pass-path waived count", passResult.waived, 2, 0); // waived() + budget(over,waived)
assertEq("pass-path failed count", passResult.failed, 0, 0);
console.log("ok pass-path suite: summary() did not throw and reported correct counts");

// === 4. fail-path suite: deliberately fail 2 checks, confirm summary() throws
const failSuite = createSuite("selftest-fail", forgeOps);

failSuite.expectNoOverlap("boxA vs boxB (deliberately overlapping, tight tol)", boxA, boxB, 1); // real overlap ~400mm3 > tol 1 => FAIL
failSuite.expectTrue("deliberately true check still counts as passed", true, "control");
failSuite.budget("mass budget (over, NOT waived)", {
  items: [{ name: "heavy-mock", grams: 500 }],
  maxGrams: 80,
  // no waivedReason => must FAIL, not WAIVED
});

const thrown = assertThrows("fail-path summary() throws", () => failSuite.summary());
if (!thrown.message.includes("2 check(s) failed")) {
  throw new Error(`SELFTEST FAIL: expected error message to report 2 failed checks, got: "${thrown.message}"`);
}
console.log("ok fail-path suite: threw with correct failed count (2)");

// === 5. requireBackend fail path (informational — real rejection is proven
// by running this file once with --backend manifold from the shell) =========
assertThrows("requireBackend rejects a mismatched backend", () => requireBackend(() => "manifold", "occt"));

console.log("SELFTEST OK");
return box(1, 1, 1).translate(0, 0, -500);
