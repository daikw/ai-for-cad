---
name: forgecad-verify
description: Build and run a numeric verification suite (checks.forge.js) for a ForgeCAD model from its LLD verification criteria. Use after implementing any model with an LLD, any multi-part assembly, or when asked to verify a model. Completion of a modeling task means the suite passes — not that renders look right.
forgecad-public: true
---

# ForgeCAD Verify

Turn an LLD's verification section into a numeric test suite (`checks.forge.js`) and run it. A model is done when the suite says `ALL PASS`, not when a render looks plausible.

## Core Principles

1. **Numbers over pixels.** LLM eyes miss mm-scale interference in a render — a 0.3mm overlap or a 1.4mm wall renders indistinguishably from a correct one. Every acceptance criterion in the LLD becomes a named numeric check: interference volume, clearance, envelope containment, bed fit. Renders are for humans; the suite is for correctness.
2. **`checks.forge.js` is a first-class artifact next to the model**, implementing the LLD's verification section 1:1 (one check per criterion, same names where practical). A modeling task is DONE only when the suite reports `ALL PASS` — not when `forgecad run` exits 0 on the model file, and not when a render looks right.
3. **Physics budgets are checks too.** Mass, CG, and thrust budget lines from the design doc go into `suite.budget()`, not a comment. Exceeding a budget is FAIL unless explicitly waived with a reason — waivers stay visible in every run, because "all geometric checks pass but it cannot fly" must be impossible to miss.
4. **Backend policy: `--backend occt` for every number.** manifold silently drops union operands inside `difference()` and double-counts overlap volume in `safeCut` results (see `lib/forge-verify/kernel-pitfalls.md`). Guard every check script with `requireBackend` so a manifold run fails loudly instead of reporting wrong numbers.
5. **Unmeasured reality is UNKNOWN, not assumed.** Placeholder dimensions (motor PCD, unmeasured mounting-hole pitch, etc.) get marked in the dims file with a comment pointing at the LLD section that flags them, and the suite lists the checks that depend on them as waived until the real number is measured.

## The Library

`lib/forge-verify/verify.js` is a plain CommonJS module — no forge globals are available inside it, every forge function (`union`, `difference`, `intersection`, `getActiveBackend`) is injected by the caller from the `.forge.js` script's own scope.

```js
module.exports = { createSuite, requireBackend, balancedUnion, safeCut };
```

- `requireBackend(getActiveBackendFn, want)` — throws a clear error naming the kernel pitfall if the active backend isn't `want`.
- `balancedUnion(unionFn, shapes, chunk = 16)` / `safeCut(unionFn, diffFn, positives, cutters)` — same chunked-tree-merge and per-primitive-cutter-distribution semantics as `spherical-drone/dims.js`; use these instead of a raw `union(array)` fold once shape counts get large.
- `createSuite(name, forge)` where `forge = { union, difference, intersection }` (pass only what the checks you're writing actually need) returns:
  - `expectNoOverlap(name, a, b, tolMm3=1)` — intersection volume ≤ tolerance.
  - `expectTrue(name, cond, detail)`
  - `expectNear(name, actual, expected, tol, unit='')`
  - `expectFitsBed(name, shape, bed=[300,300,300])`
  - `waived(name, reason)` — a known-unmet criterion; never fails the suite, but always shows up in the summary.
  - `budget(name, { items, maxGrams, waivedReason })` — mass budget aggregation; `items` are `{ name, grams }` or `{ name, shape, densityGcm3 }`.
  - `summary()` — prints pass/waived/fail counts and every waived item with its reason, throws if any check failed, returns `{ passed, waived, failed }`.

Example `checks.forge.js`:

```js
// LLD §10 verification suite. Run with: forgecad run checks.forge.js --backend occt
const { createSuite, requireBackend } = require("../lib/forge-verify/verify.js");
requireBackend(getActiveBackend, "occt"); // manifold drops union operands in difference() — see CHANGELOG.md

const bracket = require("./parts/bracket.forge.js").shape;
const housing = require("./parts/housing.forge.js").shape;

const suite = createSuite("widget", { union, difference, intersection });

// outside-shell envelope: real material outside a slightly-larger cylinder,
// not boundingBox() — OCCT boundingBox() over-reports trimmed B-rep extents
const envelope = difference(
  cylinder(100, 60.05, 60.05, 64).translate(0, 0, -50),
  cylinder(102, 60, 60, 64).translate(0, 0, -51)
);
suite.expectNoOverlap("housing inside Ø120 envelope", housing, envelope, 0.5);
suite.expectNoOverlap("bracket vs housing", bracket, housing, 0.1);
suite.expectFitsBed("housing fits printer bed", housing, [300, 300, 300]);
suite.budget("mass budget", {
  items: [
    { name: "housing", shape: housing, densityGcm3: 1.24 },
    { name: "bracket", shape: bracket, densityGcm3: 1.24 },
    { name: "fasteners", grams: 4.5 },
  ],
  maxGrams: 80,
});
suite.waived("motor PCD tolerance", "motor SKU not fixed yet — see lld.md §11");

const result = suite.summary();
return box(1, 1, 1).translate(0, 0, -500); // render something small so the runner is happy
```

## Printability Layer

- **Bed fit** — `suite.expectFitsBed(name, shape, bed)` per printed part; do not eyeball it against a render.
- **Wall thickness** — not something `checks.forge.js` can compute directly; run `forgecad render inspect model.forge.js /tmp/model-thickness --channels thickness --min-thickness <mm> --warn-thickness <mm> --force` and read the numbers from `manifest.json` (`minThickness`, `p05Thickness`, `criticalAreaPercent`), not the PNG alone. See `forgecad-render-inspect` for channel selection and command patterns.
- **Print orientation and support intent** are not numeric checks — record them as a "Print plan" note per part in the LLD or the project `CHANGELOG.md` (orientation, expected supports, seam placement), not inside `checks.forge.js`.

## Workflow

1. **Read the LLD's verification section** and enumerate every criterion as a named check (interference, clearance, envelope, bed fit, mass/CG/thrust budget). If a criterion has no obvious numeric form, ask how to measure it before skipping it.
2. **Write `checks.forge.js`** next to the model files using `lib/forge-verify/verify.js`, one check per LLD criterion, same names where practical so the suite output can be diffed against the doc.
3. **Run it**: `forgecad run checks.forge.js --backend occt`. Never omit `--backend occt` — see Core Principles above.
4. **On failure, fix the model.** Only fix the design doc instead if the doc itself is wrong (e.g. a stale dimension), and say so explicitly. Never weaken a check's tolerance or delete a check just to make the suite pass — waive it with a reason instead if the criterion genuinely cannot be met yet.
5. **Re-run until `ALL PASS`.**
6. **Report the summary verbatim**, including every waived item and its reason — do not summarize waivers away as "passing".

## Reference Example

`spherical-drone/checks.forge.js` is the real working example this library was generalized from: 31 checks covering prop/cage clearance, Ø160 sphere envelope containment, battery/ESC/deck fit, ToF sensor line-of-sight, docking-station pogo-pin compression tolerance chain, and per-part bed fit. Read it alongside `spherical-drone/dims.js` (which holds `balancedUnion`/`safeCut` in their original, model-specific form) and `spherical-drone/CHANGELOG.md` for the manifold-vs-occt pitfalls that motivated `requireBackend`.

## Relationship to Other Skills

| Stage | Skill | Output |
|-------|-------|--------|
| 1. Explore the problem space | `/forgecad-high-level-spec` | `*-hld.md` |
| 2. Detailed design | `/forgecad-lld` | `*-lld.md` (includes verification section) |
| 3. Implementation | `/forgecad-make-a-model` + `/forgecad` | `.forge.js` files |
| 4. Verification | `/forgecad-verify` (this skill) | `checks.forge.js`, ALL PASS |

A modeling task is not complete at stage 3. `forgecad run` passing on the model file only means the code didn't crash — stage 4 is what proves the geometry actually meets the LLD's numbers.
