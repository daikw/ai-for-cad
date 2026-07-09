# Handy FDM Mini — build log

## 2026-07-02 — v1 structure: blockout + printed parts + verification

Implemented the CAD scope from [`hld.md`](./hld.md) end-to-end via the forgecad
skill pipeline (HLD → blockout → LLD → parts → verify).

### What was built

| File | Role |
|---|---|
| `dims.js` | single source of truth (frame layout, part dims, mass model) + `safeCut`/`balancedUnion` helpers. `node dims.js` runs an arithmetic self-check |
| `blockout.forge.js` | frame-layout blockout (resolves hld.md Decision #5) |
| `z-base-bracket.forge.js` | column↔base right-angle gusset (Concern 2, stiffness-critical) |
| `z-carriage.forge.js` | Z carriage → X gantry clamp (Concern 1, cantilever moment) |
| `head-carriage.forge.js` | X carriage → extruder/hotend mount |
| `bed-carriage.forge.js` | Y carriage → 3-point leveling bed support |
| `corner-bracket.forge.js` | 2020 base corner gusset (×4) |
| `cable-guide.forge.js` | drag-chain anchor / cable clip |
| `main.forge.js` | assembly scene (visual aid) |
| `checks.forge.js` | numeric verification suite — **the completion gate** |
| `lld.md` | low-level design |

### Verification — `forgecad run checks.forge.js --backend occt`

`15 passed, 2 waived, 0 failed`. Highlights:

- **Concern 5 resolved (C1/C3):** the 100 mm bed's ±40 Y sweep reaches y = ±90,
  inside the 200 mm base (±100). Every body — frame, motors, printed parts —
  sits inside the 220×220×260 envelope (outside-shell intersection = 0). A 200 mm
  base is sufficient; the 220 envelope absorbs the belt/motor/leadscrew.
- **Envelope tightness flagged (C4):** the 42 mm Y NEMA17 does not fit the base
  at bed level, so it mounts **low at the rear** (z ≤ 26). The bed carriage at
  full rear travel clears it (intersection = 0) with only ~0.5 mm vertical
  margin — a real constraint the bed-carriage height budget must respect.
- **Concern 4 resolved (C9):** carry mass **2058 g**, well under the 4000 g
  one-hand ceiling and near the 2500 g typical line (PSU + spool detached).
- **Fit (C5/C6/C8):** the 20.4 mm pockets seat the 20 mm 2020 members with a
  0.2 mm/side gap; bracket-vs-member interference = 0.
- **Waived (C7.4):** MGN9H mounting-hole pitch (20 mm placeholder) and the
  extruder mount pattern — both depend on unfixed SKUs (hld.md Decision #6).

### Print plan (orientation / support intent)

| Part | Orientation | Support | Notes |
|---|---|---|---|
| z-base-bracket | flat on the 60×40 flange | rib self-supports | strongest layer orientation for the column moment |
| z-carriage | mounting plate down, ribs vertical | none | clamp bore printed as a horizontal hole (bridged) |
| head-carriage | rail plate down | light on the extruder face | |
| bed-carriage | plate flat, arms in-plane | none | leveling bosses print upward |
| corner-bracket | on the L corner | self-supporting | |
| cable-guide | throat opening up | none | retention lips bridge |

Material: PLA (1.24 g/cm³) for v1 form/fit. Load parts (z-base, z-carriage)
move to PETG in v2 alongside the heated bed.

### Kernel / toolchain notes (see `lib/forge-verify/kernel-pitfalls.md`)

- **Primitive Z convention:** `box()`/`cylinder()` are centered in X/Y but their
  base face sits at the translate Z (they grow +Z). Every model here treats the
  translate Z as a bottom-face height. Getting this wrong silently shifts parts
  by half a dimension — caught early by diffing bbox output against intent.
- **`safeCut` everywhere:** all parts distribute cutters onto primitives before
  unioning, so `difference()` never runs on a `union()` base (manifold pitfall
  #1). Copied into `dims.js` so part files import only `./dims.js`.
- **`requireBackend(getActiveBackend, "occt")`** guards `checks.forge.js`;
  verified it fails loudly on the default `truck` backend.

### Observation (not fixed — out of scope)

`spherical-drone/checks.forge.js` line 6 still imports `../lib/forge-verify/...`,
which is stale after that project moved under `projects/` (should be
`../../lib/...`). This repo's new `handy-fdm-mini` uses the correct
`../../lib/...` path. Flagging for a follow-up commit.

### Open items (lld.md §10)

- MGN9H carriage SKU → fixes the mounting-hole pitch placeholder.
- Extruder choice (Orbiter 2 vs Sherpa Mini) → fixes the head mount pattern.
- Transport lock + carry handle: deferred to a later iteration (Decision #7).
- Cantilever tip deflection ≤ 0.1 mm: budgeted via rib design; FEA/measurement
  at the v1 build.
