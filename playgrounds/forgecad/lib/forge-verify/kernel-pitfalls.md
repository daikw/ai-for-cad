# Kernel & Toolchain Pitfalls

Distilled from `spherical-drone/CHANGELOG.md` (forgecad 0.9.4). These are
concrete failures observed on real models, not speculative warnings — every
number below traces back to that changelog. Load this file before any
boolean-heavy model (many union/difference/intersection operations on a
shared base), and use `lib/forge-verify/verify.js` (repo-relative path) as
the canonical helper implementation of the countermeasures.

## 1. manifold silently drops union operands under `difference()`

**Symptom**: `union()` a base shape, then `difference()` it against a
cutter. The part of the base that was near/touching the cutter survives;
the rest of the base vanishes with no warning, no error, no zero-volume
exception — just a wrong small shape.

**Minimal repro sketch** (forgecad 0.9.4, manifold backend):

```js
const shell = difference(box(150, 200, 95), box(145, 195, 95).translate(0, 0, 3)); // 248 cm3
const boss = cylinder(92, 4.5).translate(60, 80, 3);
difference(union(shell, boss), cylinder(12, 1.25).translate(60, 80, 84));
// -> 5.8 cm3 (boss - hole only; shell is gone).
// occt on the same script: 254.5 cm3 (correct).
```

`.subtract()`, `add()`, and array-form `union()` all fail the same way.
It reproduces both on tangent contact and on 1mm deliberate overlap. Real
damage seen in this repo: `cage.forge.js` (only a pad survived, 0.9 cm3),
`center-deck` (main bar missing, caught only by rendering), `core-module`
(shell reduced to 1 cm3).

**How to detect**: run the numbers-critical script twice — once per
backend — and diff the volumes:

```
forgecad run checks.forge.js --backend manifold
forgecad run checks.forge.js --backend occt
```

A large, unexplained drop under manifold (not a rounding-level difference)
means this bug fired. Because manifold fails silently, do not treat a
clean manifold run as evidence of correctness — treat occt as ground
truth and manifold as suspect by default whenever `difference()` runs on
a `union()`-derived base.

**Countermeasure**: run all numbers-critical work (mass, volume, checks,
STL export) on `--backend occt`. Guard every script with
`requireBackend(getActiveBackend, 'occt')` at the top, since
`await activateBackend()` cannot be used (see pitfall 8). As a structural
defense, use `safeCut` to distribute cutters onto each primitive *before*
unioning — `(A∪B)−C ≡ (A−C)∪(B−C)` — so `difference()` never runs on a
union base at all.

OCCT was also measured 4–5x **faster** than manifold for cage generation in
the source project (cage-top: 61s vs 245–322s), so choosing occt for
official numbers is not a correctness-for-speed tradeoff. (Source:
`spherical-drone/CHANGELOG.md`.)

## 2. manifold leaves open meshes on exactly-tangent union contact

**Symptom**: two solids that touch at an exact tangent (e.g. strut
end meeting a joint node with zero overlap) union into a mesh with
boundary edges — an open, non-manifold surface instead of a closed solid.

**Minimal repro sketch**: build a lattice/cage of thin struts (`strutD`
~1.8mm) connecting node spheres (`nodeD` ~2.6mm) placed exactly at the
strut endpoints, then `union()` the whole set on manifold.

**How to detect**: inspect the unioned mesh for boundary edges (open
mesh) rather than assuming `union()` always yields a closed solid;
render/STL artifacts with visible gaps or a mesh validity check that
flags boundary edges are the signal.

**Countermeasure**: extend strut ends by 0.2mm and grow node-sphere
overlap margins by +0.08mm so contacts are a small positive overlap
instead of an exact tangent. This is the pattern used for the cage
lattice in this repo.

## 3. `union(array)` folds sequentially — O(n) ever-growing merges

**Symptom**: unioning a large flat array of solids via `union([...])`
takes far longer than expected and keeps getting slower as more solids
are added, because each step re-unions an ever-larger accumulated solid
against the next small one.

**Minimal repro sketch**: union a 277-solid cage lattice with a plain
`union(structsArray)` call — measured at ~96s in this repo.

**How to detect**: time the `union()` call for a solid count above a few
dozen; if wall time scales worse than roughly linear in the solid count,
this is the cause.

**Countermeasure**: `balancedUnion(unionFn, shapes, chunk=16)` — chunk
the array, union each chunk, then pairwise-tree-merge the chunk results
(instead of one ever-growing linear fold). This repo measured ~170x
speedup (96s -> 0.6s) on the same 277-solid cage.

## 4. OCCT `boundingBox()` over-reports trimmed B-rep extents

**Symptom**: a bounding-box-based envelope check (e.g. "does this feature
stay inside radius X?") fails or looks suspicious even though the actual
solid geometry is fine — the bounding box reports a larger extent than
any real point on the trimmed surface.

**Minimal repro sketch**: cage mounting pads clipped to fit inside a
Ø160 sphere envelope (r80). `boundingBox()` on the pad geometry reported
r81.87 — a phantom ~1.87mm overshoot — even though the pads contain no
real material beyond r80. The overshoot traces to trimmed-surface control
points, not the actual trimmed boundary.

**How to detect**: if a bbox-based envelope check fails or is borderline,
cross-check with a volume-based test before treating it as a real
violation.

**Countermeasure**: never gate envelope/fit checks on `boundingBox()`
alone. Use `expectNoOverlap` — intersect the candidate shape with an
"outside-the-envelope" solid (e.g. everything beyond the allowed radius)
and require that intersection volume to be 0 (or below a small
tolerance), never a bbox comparison.

## 5. Chaining `difference()` then `intersection()` on the same primitive drops one operation (both kernels)

**Symptom**: apply `difference()` and then `intersection()` (or the
reverse order) to the same base primitive in a chain, and one of the two
boolean operations is silently lost from the result — the shape reflects
only one of the two clips. This happens on **both** manifold and occt,
unlike pitfall 1 which is manifold-only.

**Minimal repro sketch**: take a cage mounting pad, clip it with
`intersection()` against an envelope cylinder, then `difference()` a
pilot hole out of the same primitive (or vice versa) — the clip gets
"rewound" and the final geometry doesn't reflect both operations.

**How to detect**: if a shape that should be both clipped to an envelope
*and* have a feature cut/kept shows only one of those effects, suspect a
boolean-chain drop rather than a logic error in the feature placement.

**Countermeasure**: avoid chaining `difference()` and `intersection()` on
the same primitive. Reposition geometry instead so each primitive only
needs one boolean pass — e.g. move the pad center inward (r76.5) and
place the pilot hole on its own offset circle (r78.3) rather than
clipping the pad's own boolean chain.

## 6. manifold double-counts overlap volume in `safeCut` results

**Symptom**: after applying the `safeCut` distribute-then-union pattern
(pitfall 1's countermeasure), the reported volume on manifold is larger
than the true volume — manifold counts the overlap region between the
distributed positives twice.

**Minimal repro sketch**: `safeCut(union, difference, positives, cutters)`
on the drone center-deck reported 21.2 cm3 on manifold vs. 18.6 cm3 on
occt for the same geometry.

**How to detect**: compare `safeCut` output volume across backends; a
manifold-vs-occt gap in the same direction as pitfall 1 (manifold too
high, not too low) confirms this rather than a modeling bug.

**Countermeasure**: treat manifold as display-only. All official numbers
— mass, volume, any value that goes into a BOM, a spec check, or a
budget — must be computed on `--backend occt`.

## 7. CLI backend/param flag asymmetries across subcommands

**Symptom**: a script that depends on `--backend` or `--param` behaves
correctly under `forgecad run` but silently ignores those flags (or
errors) under a different subcommand, because CLI subcommands accept
different flag sets.

**Detail** (forgecad 0.9.4): `render 3d` and `render inspect` accept
neither `--backend` nor `--param`. `export stl` accepts `--backend` but
not `--param`. `render` in the render-server environment also cannot
`importMesh` (binary read). `render hq` is a paid path.

**How to detect**: if a model variant (parametrized via `--param`) or a
non-default backend renders/exports as the wrong variant or wrong
geometry with no error, check whether the subcommand you used actually
accepts the flag you passed — it may have been silently dropped.

**Countermeasure**: bake variants into thin `print-*.forge.js` wrapper
files (one per parameter set) instead of relying on `--param` at export
time. Keep the render path manifold-safe: build with `Build=group`
(returns a `ShapeGroup`, no booleans) so `render 3d`/`render inspect`
work without `--backend occt`. Keep the STL/checks path on
`Build=solid` (booleans allowed, run under occt) since that path goes
through `--backend`-aware subcommands.

## 8. Top-level `await` is unavailable in `.forge.js`, so `activateBackend()` can't be awaited

**Symptom**: attempting to force the occt backend from inside a
`.forge.js` script via `await activateBackend('occt')` fails, because
`.forge.js` files don't support top-level await — there is no reliable
in-script way to switch backends before geometry runs.

**How to detect**: a script that assumes it controls its own backend
(rather than being invoked with `--backend occt` from the CLI) may
silently run on whatever the default/active backend is.

**Countermeasure**: never assume the active backend inside the script.
Guard every numbers-critical script at the top with a synchronous check
against the currently active backend, and fail loudly if it doesn't
match: `requireBackend(getActiveBackend, 'occt')` in
`lib/forge-verify/verify.js`. This makes a manifold invocation
(`forgecad run foo.forge.js` without `--backend occt`) fail fast instead
of silently producing pitfall-1/6-poisoned numbers.

## 9. Selector-less `fillet()` silently skips edges past a broad-edge budget

**Symptom**: `fillet(shape, r)` with no edge selector produces
non-deterministic volumes — some edges stay sharp depending on
`FORGECAD_BROAD_EDGE_FEATURE_BUDGET`, with no warning.

**How to detect**: the same script reports different volumes across runs,
or a "fillet all edges" call leaves visibly sharp edges in the render.

**Countermeasure**: always pass an explicit selector, even when you mean
"all edges" — e.g. `fillet(box(...), r, { convex: true })` (a box's 12
edges are all convex). Observed on mini-humanoid's helmet (forgecad 0.9.4).

## 10. Fillet ordering vs booleans differs per backend

**Symptom** (truck, the backend `render 3d` is pinned to): `fillet()` after
a multi-cutter `difference()` fails with "edge finish size is too large";
follow-up partial fillets adjacent to existing fillet topology fail with
"native tangent-chain propagation not yet supported"; occt tolerates both,
so the script "works" under `--backend occt` but the render pipeline dies.
Related: `shell({openFaces})` only accepts primitive-family shapes (box,
cylinder, extrude) — a filleted shape can't be shelled, and shelling first
then filleting rejects the open-boundary edges.

**Countermeasure**: fillet the primitive FIRST, then run the (single-pass)
difference; prefer one fillet call per shape over sequential partial
fillets; for rounded open shells use fillet → oversized-cavity difference
instead of `shell()`. Complex boolean results (multi-cutter difference)
may only tolerate per-edge fillets via `selectEdges(...)` filtered to
non-boundary edges. Observed on mini-humanoid torso/arm/head
(forgecad 0.9.4).

## Checklist: before any boolean-heavy model

- [ ] Every numbers-critical script (checks, export, BOM) starts with
      `requireBackend(getActiveBackend, 'occt')` — don't rely on the CLI
      caller to remember `--backend occt`.
- [ ] `difference()` never runs directly on a `union()`-derived base; use
      `safeCut` to distribute cutters onto primitives first.
- [ ] No primitive is chained through both `difference()` and
      `intersection()`; reposition geometry instead.
- [ ] Large unions (dozens of solids) go through `balancedUnion`, not a
      flat `union(array)`.
- [ ] Tangent-contact joints (struts/nodes, panel seams) carry a small
      positive overlap margin (e.g. +0.2mm strut extension, +0.08mm node
      growth), not exact tangency.
- [ ] Envelope/fit checks use volume-based intersection against an
      outside-shell solid, never `boundingBox()` alone.
- [ ] All mass/volume numbers reported as "official" are computed on
      occt; manifold output is treated as display/render-only.
- [ ] Render-path geometry (`Build=group`, no booleans) and STL/checks
      geometry (`Build=solid`) are kept as separate build modes if the
      model has any lattice/tangent-contact unions.
- [ ] Backend/param assumptions are verified against the actual CLI
      subcommand in use (`render 3d`/`render inspect` take neither flag;
      `export stl` takes `--backend` only) rather than assumed uniform.
