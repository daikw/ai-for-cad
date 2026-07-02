// Generic numeric verification suite for ForgeCAD models, generalized from
// spherical-drone/dims.js (balancedUnion/safeCut) and
// spherical-drone/checks.forge.js (expectNoOverlap/expectTrue pattern).
// Plain CommonJS module — no forge globals exist here; every forge function
// (union, difference, intersection, getActiveBackend) is injected by the
// caller from the .forge.js script's own scope.

// requireBackend: manifold silently drops union operands when difference()
// runs on a union-base, and double-counts overlap volume in safeCut results
// (see spherical-drone/CHANGELOG.md "manifold バックエンドの difference 崩壊").
// Every numeric check must run on occt; this guard fails loudly instead of
// reporting wrong numbers under manifold.
function requireBackend(getActiveBackendFn, want) {
  const got = getActiveBackendFn();
  if (got !== want) {
    throw new Error(
      `requireBackend: expected --backend ${want} but got "${got}". ` +
        `manifold silently drops union operands inside difference() and double-counts ` +
        `overlap volume in safeCut() results — see spherical-drone/CHANGELOG.md ` +
        `("manifold バックエンドの difference 崩壊"). Re-run with --backend ${want}.`
    );
  }
}

// balancedUnion: union(array) folds sequentially (O(n) ever-growing merges —
// slow for large shape counts). Chunked + pairwise tree merging is much
// faster and produces the same solid.
function balancedUnion(unionFn, shapes, chunk = 16) {
  if (shapes.length === 0) throw new Error("balancedUnion: no shapes");
  if (shapes.length === 1) return shapes[0];
  let level = [];
  for (let i = 0; i < shapes.length; i += chunk) level.push(unionFn(shapes.slice(i, i + chunk)));
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? unionFn(level[i], level[i + 1]) : level[i]);
    level = next;
  }
  return level[0];
}

// safeCut: (A∪B)−C ≡ (A−C)∪(B−C), so distribute the cutters onto each
// positive primitive before unioning — sidesteps the manifold union-then-
// difference bug and stays correct on occt too.
function safeCut(unionFn, diffFn, positives, cutters) {
  const drilled = cutters.length ? positives.map((p) => diffFn(p, ...cutters)) : positives;
  return balancedUnion(unionFn, drilled);
}

// createSuite(name, forge): forge = { union, difference, intersection } —
// pass only what the checks being written actually need.
function createSuite(name, forge) {
  let passed = 0;
  let failed = 0;
  const waivedItems = [];

  function expectNoOverlap(checkName, a, b, tolMm3) {
    const tol = tolMm3 == null ? 1 : tolMm3;
    const v = forge.intersection(a, b).volume();
    const ok = v <= tol;
    console.log(`${ok ? "PASS" : "FAIL"} ${checkName}: overlap ${v.toFixed(1)} mm3 (tol ${tol})`);
    if (ok) passed++;
    else failed++;
    return ok;
  }

  function expectTrue(checkName, cond, detail) {
    console.log(`${cond ? "PASS" : "FAIL"} ${checkName}${detail ? ` — ${detail}` : ""}`);
    if (cond) passed++;
    else failed++;
    return cond;
  }

  function expectNear(checkName, actual, expected, tol, unit) {
    const u = unit || "";
    const diff = Math.abs(actual - expected);
    const ok = diff <= tol;
    console.log(
      `${ok ? "PASS" : "FAIL"} ${checkName}: ${actual}${u} (expected ${expected}${u} ± ${tol}${u}, diff ${diff.toFixed(3)}${u})`
    );
    if (ok) passed++;
    else failed++;
    return ok;
  }

  function expectFitsBed(checkName, shape, bed) {
    const b = bed || [300, 300, 300];
    const bb = shape.boundingBox();
    const dims = [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]];
    const ok = dims[0] <= b[0] && dims[1] <= b[1] && dims[2] <= b[2];
    console.log(`${ok ? "PASS" : "FAIL"} ${checkName}: ${dims.map((v) => v.toFixed(1)).join("x")} (bed ${b.join("x")})`);
    if (ok) passed++;
    else failed++;
    return ok;
  }

  // waived: a known-unmet criterion. Never fails the suite, but always shows
  // up in the summary — so "all checks pass" can never silently mean "except
  // the ones I quietly skipped".
  function waived(checkName, reason) {
    console.log(`WAIVED ${checkName} — ${reason}`);
    waivedItems.push({ name: checkName, reason });
  }

  // budget: mass aggregation. items are { name, grams } (fixed mass) or
  // { name, shape, densityGcm3 } (mass = shape.volume() mm3 / 1000 * density).
  function budget(checkName, opts) {
    const items = (opts && opts.items) || [];
    const maxGrams = opts && opts.maxGrams;
    const waivedReason = opts && opts.waivedReason;
    let total = 0;
    console.log(`--- budget: ${checkName} ---`);
    for (const item of items) {
      const grams = item.grams != null ? item.grams : (item.shape.volume() / 1000) * item.densityGcm3;
      total += grams;
      console.log(`  ${item.name}: ${grams.toFixed(2)} g`);
    }
    console.log(`  TOTAL: ${total.toFixed(2)} g (max ${maxGrams} g)`);
    const ok = total <= maxGrams;
    if (ok) {
      console.log(`PASS ${checkName}: ${total.toFixed(2)}g <= ${maxGrams}g`);
      passed++;
    } else if (waivedReason) {
      const over = total - maxGrams;
      const reason = `${waivedReason} (over budget by ${over.toFixed(2)}g: ${total.toFixed(2)}g > ${maxGrams}g)`;
      console.log(`WAIVED ${checkName} — ${reason}`);
      waivedItems.push({ name: checkName, reason });
    } else {
      console.log(`FAIL ${checkName}: ${total.toFixed(2)}g > ${maxGrams}g`);
      failed++;
    }
    return { total, ok };
  }

  function summary() {
    console.log(`${passed} passed, ${waivedItems.length} waived, ${failed} failed`);
    if (waivedItems.length) {
      console.log("Waived items:");
      for (const w of waivedItems) console.log(`  - ${w.name}: ${w.reason}`);
    }
    const result = { passed, waived: waivedItems.length, failed };
    if (failed > 0) throw new Error(`${name}: ${failed} check(s) failed`);
    return result;
  }

  return { expectNoOverlap, expectTrue, expectNear, expectFitsBed, waived, budget, summary };
}

module.exports = { createSuite, requireBackend, balancedUnion, safeCut };
