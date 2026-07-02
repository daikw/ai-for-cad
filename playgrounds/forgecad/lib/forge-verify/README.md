# lib/forge-verify

A small numeric verification library for ForgeCAD models. It turns a design
doc's acceptance criteria — clearances, interference volumes, envelope
containment, bed fit, mass budgets — into a runnable `checks.forge.js` suite
that fails loudly instead of relying on a render looking plausible.

Generalized from `spherical-drone/dims.js` (`balancedUnion`/`safeCut`) and
`spherical-drone/checks.forge.js` (the `expectNoOverlap`/`expectTrue`
pattern). See `spherical-drone/CHANGELOG.md` for the kernel pitfalls this
library exists to guard against.

## What it is

`verify.js` is a plain CommonJS module — **no forge globals are available
inside it**. Every forge function (`union`, `difference`, `intersection`,
`getActiveBackend`) is injected by the caller from the `.forge.js` script's
own scope, because plain `.js` modules don't get ForgeCAD's injected API.

```js
module.exports = { createSuite, requireBackend, balancedUnion, safeCut };
```

## Backend policy: numbers only from `occt`

`manifold` silently drops union operands when `difference()` runs on a
union-base, and double-counts overlap volume in `safeCut()` results (see the
"manifold バックエンドの difference 崩壊" note in
`spherical-drone/CHANGELOG.md`). Every check script must guard itself with
`requireBackend`:

```js
requireBackend(getActiveBackend, "occt");
```

If the script is run under any other backend, `requireBackend` throws
immediately with a message naming the kernel pitfall — it does not let a
wrong number silently reach the console. `manifold` is fine for interactive
renders; it is never a source of truth for a check.

## API

- `requireBackend(getActiveBackendFn, want)` — throws with a clear message
  (naming the kernel pitfall) if the active backend isn't `want`.
- `balancedUnion(unionFn, shapes, chunk = 16)` — chunked, pairwise
  tree-merge union. `union(array)` folds sequentially and gets slow for large
  shape counts (O(n) ever-growing merges); this produces the same solid much
  faster.
- `safeCut(unionFn, diffFn, positives, cutters)` — `(A∪B)−C ≡ (A−C)∪(B−C)`,
  so the cutters are distributed onto each positive primitive before
  unioning. Sidesteps the manifold union-then-difference bug and stays
  correct on occt too.
- `createSuite(name, forge)` — `forge = { union, difference, intersection }`
  (pass only what the checks being written actually use). Returns:
  - `expectNoOverlap(name, a, b, tolMm3 = 1)` — `intersection(a, b).volume() <= tol`.
    Prints `PASS/FAIL name: overlap X mm3 (tol Y)`.
  - `expectTrue(name, cond, detail)` — arbitrary boolean assertion.
  - `expectNear(name, actual, expected, tol, unit = '')` — `|actual - expected| <= tol`.
  - `expectFitsBed(name, shape, bed = [300, 300, 300])` — bounding-box dims
    within the printer bed.
  - `waived(name, reason)` — records a known-unmet criterion. Never fails the
    suite, but always appears in `summary()`, so a criterion can never
    silently disappear from the report.
  - `budget(name, { items, maxGrams, waivedReason })` — mass budget
    aggregation. `items` are `{ name, grams }` (fixed mass) or
    `{ name, shape, densityGcm3 }` (`mass = shape.volume() mm3 / 1000 *
    density`). Prints a per-item table and the total.
    - total `<= maxGrams` → PASS.
    - total `> maxGrams` and `waivedReason` given → WAIVED, with the reason
      and the overage amount.
    - total `> maxGrams` and no `waivedReason` → FAIL.
  - `summary()` — prints `"N passed, M waived, K failed"` and lists every
    waived item with its reason. Throws an `Error` if `K > 0`. Returns
    `{ passed, waived, failed }` when it doesn't throw.

## Minimal `checks.forge.js` example

```js
// LLD §10 verification suite. Run with: forgecad run checks.forge.js --backend occt
const { createSuite, requireBackend } = require("../lib/forge-verify/verify.js");
requireBackend(getActiveBackend, "occt"); // manifold drops union operands in difference()

const bracket = require("./parts/bracket.forge.js").shape;
const housing = require("./parts/housing.forge.js").shape;

const suite = createSuite("widget", { union, difference, intersection });

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

## Why `waived`/`budget` matter

A criterion that "cannot be met yet" (an unmeasured placeholder dimension, a
known-overweight mock BOM line) must never just be left out of the suite —
that silently reads as "passing" to anyone skimming the output. `waived()`
and the waived branch of `budget()` force it into the summary every single
run, with the reason attached, so "all geometric checks pass but it cannot
fly" stays impossible to miss. They never cause `summary()` to throw, but
they are never invisible either.

## Self-test

`selftest.forge.js` exercises every exported function on both the pass path
and the fail path (a deliberately-failing suite whose `summary()` must
throw), and numerically checks `safeCut`/`balancedUnion` against the plain
`union`/`difference` equivalents.

```sh
forgecad run lib/forge-verify/selftest.forge.js --backend occt
# ... SELFTEST OK

forgecad run lib/forge-verify/selftest.forge.js --backend manifold
# ERROR: requireBackend: expected --backend occt but got "manifold" ...
```

## `forgecad.json` and project root resolution

`forgecad run` resolves each script's project root by searching upward from
the script's path for the nearest `forgecad.json`, and blocks any `require()`
that would reach outside that root. The minimal `{}` at the repo root exists
so model directories (e.g. `spherical-drone/`) can
`require('../lib/forge-verify/verify.js')` — without it, that `require`
would resolve outside the model's own project root and get blocked.

This `forgecad.json` is local-only: `forgecad run` never parses its
contents, and it never contacts forgecad.io. Only `forgecad project`
subcommands (push/pull/publish) talk to forgecad.io, and only when invoked
explicitly.
