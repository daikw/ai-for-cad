# pi-pico-case CHANGELOG

## v9.7 (2026-05-26) — LED hole actually over the LED

v9.6 print: PCB lift ✓, lid closes ✓, **LED hole misses the LED**. User-observed "the position hasn't changed since v7" — and they're right. v7 used `(20, -7)` hardcoded; v9 swapped to `(22, -8.5)` claiming a STEP correction. Both were Y-off.

**Audit method:** parse `reference/pico-parts/part-*.stl` bboxes (these are baked from the official STEP into the case-centered frame), find the 0603-sized footprint. part-07 = `0.8 × 1.6 × 0.6mm`, center `(20.70, -5.70)`. That's the LED.

| | X | Y |
|---|---|---|
| v9.6 design `board.led` | 22.0 | -8.5 |
| Real LED (part-07 center) | 20.70 | -5.70 |
| Offset | +1.30 | **-2.80** ← past hole half-width 2.5mm |

The v9 commit message claims `STEP coords X≈1.6–2.0, Z≈−2.8–−4.0 → case-centered (+22, -8.5)`. The X part is fine; the Z→Y remap picked up a sign or origin error and put the hole 2.8mm past the LED on Y, mostly over PCB edge. The parts-split STL gives the LED position directly with no axis-remap needed, so use that.

**Fix:** `led: { x: 20.7, y: -5.7 }`. Hole stays 5×5mm — that's already 3× the LED footprint so we don't need to grow it.

Verification image: [led-position-audit.png](./led-position-audit.png) shows v9.6 design (red dashed) vs real LED (yellow star).

## v9.6 (2026-05-21) — 2mm PCB lift with detent-safe Truck fallback

Goal: make the PCB sit 2mm above the floor, add a shallow underside pocket to the lid plug, and keep the detent snap-fit.

The direct `airBelow=2.0` approach still hits ForgeCAD 0.9.4 Truck's CSG boundary bug when detent groove cutters are enabled. I tried the OCCT path first, but file-level `setActiveBackend("occt")` fails in this CLI with `OCCT not initialized — call initOCCT() first`; the CLI-level `--backend occt` path also did not return in a useful time for this workflow. The Truck fallback attempts (`grooveZ` rounded to 0.1mm, then groove cutter depth through the wall) still reproduced the same `generic CSG input must be closed... found 3 boundary edges` error.

**Final fix:** keep `airBelow` at the Truck-safe 1.0mm and make the mounting posts two-stage:
- lower shoulder: φ4.0 × 1.0mm
- upper shoulder: φ2.5 × 1.0mm
- pin starts above that at 2.0mm, so the PCB physically sits 2mm above the floor

Added the v9.6 plug underside pocket: circular φ8.0mm × 0.3mm recess, cut with a cylinder and a small below-face overshoot so it actually removes material from the plug underside.

Verification:
- `forgecad run pi-pico-case/pi-pico-case.forge.js` passes with detents enabled on Truck.
- `forgecad export stl pi-pico-case/pi-pico-case-print-layout.forge.js --output /tmp/v96.stl` passes: Object 1 = 3,664 triangles, Object 2 = 1,040 triangles.
- STL lid check: `lid Z=[0.00,2.45], tris=1040`.

## v9.5 (2026-05-21) — fix the missing-plate STL bug

v9.4 printed: the plate of the lid was **entirely missing** from the printed part — and `Pi Pico` user-observation, *not* "the plate peeled off mid-print" but "the plate is just not in the STL." Stage-isolation export confirmed:

| stage | operation | tris | Z range |
|---|---|---|---|
| 1 | bare plate (extrude) | 140 | `[0, 1.05]` |
| 2 | + crawd cutout + eye cutters | 416 | `[0, 1.05]` |
| 3 | + plug.add() | 696 | `[-1.40, 1.05]` |
| **4** | **+ lid.subtract(ledCutter)** | **156** | **`[-1.40, 0.00]`** ← plate gone |

Root cause: in v9.3/v9.4 I applied a tall LED cutter to the unified lid AFTER `lidPlate.add(plug)`. The union creates a degenerate coplanar face at `z=0` (plate bottom == plug top). Truck's subtract took that face as a trigger and discarded everything above it — wiping the entire plate while leaving the plug intact.

**Fix:** cut the LED hole on `lidPlate` and `plug` SEPARATELY before the union. Each subtract operates on a single solid with no degenerate coplanar boundary, so Truck behaves correctly. After the union, the two holes align at z=0 to form a continuous LED light path.

Net effect: v9.5 STL has the plate back (lid tris 220 → 672, Z range `[0, 1.4]` → `[0, 2.45]`). Slice: 15m06s / 5.55cm³ / 54 layers — the extra ~4 minutes and 0.8cm³ vs v9.4 are the plate that v9.4 was silently skipping.

**Why earlier verification missed it:**
- Design-view render (lifted lid) showed plate + plug correctly because the lifted view is rendered from the in-memory shape graph, not the exported STL.
- Print-layout view render would have shown the missing plate, but I only made one for design view before the v9.4 submit.
- bbox/volume checks would have caught it (lid bbox z = 1.4 instead of 2.45), but I did not have a hard assert on the lid's final Z extent.

## v9.4 (2026-05-20) — stepped plug

- **Plug now has two sections**: full-outline top (z=-0.4..0, mates with plate + carries detent bumps) and inset bottom (z=-1.4..-0.4, narrowed by 1mm on each long side).
- Visible "tucked-in" step from below; the only print overhang is 1mm × plug-length per side, which the slicer handles as ordinary wall overhang. No bridge.
- Slice: 11m20s / 4.75cm³ / 50 layers — **identical** to v9.3 (the step costs nothing). Compare with the first hollow-plug attempt: 18m48s / 5.51cm³ (long cap bridge blew up support material).
- Param `Stepped plug (narrower bottom)` lets us revert by toggling.

## v9.3 (2026-05-20) — THE big LED-hole fix + 1.5× lid + lift-pin

After v9.2-fine print, user observed: LED hole still not pierced (third version with this symptom), lid too thin (rim curled), pins correct but should lift the board, USB OK.

### LED hole — root cause and fix

For v6 / v7 / v9.2 my LED cutter was applied to **`lidPlate` alone** with `lidPlate.subtract(ledCutter)`. The plate later got `add(plug)` to form the closed lid, leaving **the plug intact directly beneath the hole**. The plug at the LED position is 1.4mm thick and fully blocks the LED.

v9.3 applies the cutter to **`lid` after the union**:
```js
let lid = lidPlate.add(plug);
const ledCutter = box(ledHoleW, ledHoleD, lidTh + plugH + 0.4)
  .translate(ledX, ledY, -plugH - 0.2);
lid = lid.subtract(ledCutter);
```

### Why my earlier ray-cast verification missed it

I cast rays from `z=0` (which sits INSIDE the plug after `placeReference("bottom")`) and counted hits going +z. The plug bottom face at z=0 was tangent to my origin (numpy-stl drops tangent hits), so I only saw `hit=1` at z=plugH (plug top face) and called it "pierced". A ray from `z=−5` with odd/even hit counting would have seen 2 hits = solid. Spending another 10 minutes asking codex for the canonical ray-cast pattern would have caught it.

### Other v9.3 changes

- `lidTh` 0.7 → **1.05mm** (1.5×) — v9.2 rim curled during print
- `bodyDepth` 0.3 → 0.45 / `eyeDepth` 0.5 → 0.75 (engraving scales with lid)
- `airBelow` 0.6 → **1.0mm** — board now sits ~1mm above the floor
- `pinShoulder` 4.0 → **2.5mm** — the wide φ4 was unnecessary; the user requested a narrower "slightly fat" base
- Slice (0.16mm Optimal supports): **11m20s / 4.75cm³** (v9.2-fine was 14m07s / 5.26cm³ — savings from smaller shoulder)

## v9.1 (2026-05-19) — thinner lid + LED-position correction + official-mesh fit check

- **Lid thickness halved**: 1.4 → 0.7mm so the LED is easier to see through and the lid sits flush.
- Crawd engraving depths scaled with the lid: `bodyDepth` 0.6 → 0.3mm (leaves 0.4mm of lid), `eyeDepth` 1.0 → 0.5mm (leaves 0.2mm — eyes still solid).
- **LED position reverted to USB-side short edge**: subagent inspection of the official `Pico-R3.step` confirmed GP25 sits ~3.4mm inboard from the USB end, on the BOOTSEL/pin-1 long edge. Updated `dimensions.js` `led: { x: 22.0, y: -8.5 }`. (v9 had `-20, -7` based on user misobservation of the v7 print.)
- **New collision-check pipeline using the OFFICIAL Pi Pico mesh** (not the simplified box stand-in):
  1. `forgecad export stl pico-step-only.forge.js --output reference/pico-r3.stl --backend occt` — one-time OCCT-to-mesh conversion that bakes the `rotateX(90).rotateZ(90).translate(25.5,-10.5,2.1)` placement into vertex coordinates.
  2. trimesh `split` → 17 watertight components (PCB + 16 SMT/connector parts).
  3. trimesh mirror-X (because forgecad's two-step rotation inverts the X axis vs my intuition).
  4. `pi-pico-case-assembly-mesh.forge.js` `importMesh`'s each as a separate Object so the spatial analyzer reports per-component overlaps.
- v9.1 + lifted lid + 17-part official Pi Pico → **zero collisions**. Pins (φ1.9) clear PCB holes (φ2.1), USB connector exits through the +X cutout, all SMT parts stay under the lid.
- Slice: 13m04s / 5.68cm³ (v9 was 13m38s / 6.00cm³).

## v9 (2026-05-19) — v7-print fixes + stand-in audit

Driven by user feedback after handling the v7 print:

- **LED hole moved to opposite short edge** — `ledX` default 20 → −20 (BOOTSEL side, not USB side).
- **LED hole enlarged** — `3.5 → 5.0mm` square; v7 print did not visually pierce the lid (likely slicer wall-filling at 3.5mm).
- **Mounting pin slimmed** — `pinDia` 2.1 → 1.9mm so the 2.1mm board hole accepts the pin with ~0.1mm slack (v7 pin was too thick to seat the board).
- **USB cutout opens all the way to the lid** — vertical cutter now spans `boardZ−0.5` to `outerH+0.5`, removing the upper wall so the lid alone covers the connector from above. Also widened to `usbW=11mm` for cable shroud clearance.
- **Lid–case Z gap** — new `lidGap=0.2mm` parameter; lid sits 0.2mm above the case top rim so it's easier to grip and open. Detent groove Z is recomputed so the snap-fit still mates correctly.

### Bug fixes uncovered while doing the above

- **USB cutter Z position was wrong since v1.** `box(w,d,h)` has its base at `z=0`, so `translate(..., usbCenterZ)` placed the cutter from `z=usbCenterZ` upward — not centered on `usbCenterZ` as the variable name implied. Effect: only the *top* part of the USB region was carved; ~1mm of wall remained below the connector. Fixed by translating to the bottom Z explicitly.
- **Assembly stand-in had USB connector buried in the PCB.** `translate(..., seatZ + pcb.th * 0.5)` put the shell base at `z = seatZ + 0.5`, which is below the PCB top (`z = seatZ + 1.0`). Now `translate(..., seatZ + pcb.th)` so the shell sits ON the PCB top face.
- New `pico-standin-only.forge.js` — render-only file for visually auditing the stand-in geometry in isolation.

## v8 (2026-05-19) — refactor

- Moved board specs and assertion helpers to `pi-pico-case-dimensions.js`.
- Added invariant checks (`assertPositive`, `assertGreaterEqual`, `assertNear`) for derived dims.
- `print-layout` now derives lid offset from `boundingBox()` instead of the hardcoded `26.8 + 6` magic number — fixes a 1.5mm overshoot in v7 layout (true gap was 7.5mm, not 6mm).
- Stripped inline version history; behavior unchanged from v7 (same volume, same triangle count).

## v7 (2026-05-18) — bug fixes

- `cylinder()` signature corrected to `(height, radius)`. v1–v6 had the args reversed; pins were silently 1.2mm × 4mm instead of 4.0mm × ~5mm.
- LED viewing hole cutter now spans `z=-0.1..lidTh+0.1` so it cuts through (was only top half in v6).
- Detent snap-fit bumps on plug + grooves in case inner walls — replaces friction-only plug retention.
- Plug height reverted to 2.0mm (from v6's 3.0); retention via detent.

## v6 (2026-05-18) — fit + LED + pin

- Bumped board side clearance 0.4 → 0.55 (v5 print was too tight to slot in).
- Added LED viewing hole on lid at Pi Pico LED position (5.5mm from USB-end short edge).
- Tightened plug clearance 0.2 → 0.1 for firmer friction.
- Increased plug height 2.0 → 3.0 for longer engagement.

## v5 (2026-05-18) — assembly + collision

- Pulled in official Pi Pico STEP for collision detection.
- Increased `airAbove` 2.0 → 5.0 to clear Pi Pico R3 component envelope (2.2mm above PCB top).
- Enabled supports in slicer (lid plug overhang).

## v4 (2026-05-18) — crawd engraving switch

- Switched crawd-kun emblem from raised relief to engraving (recessed body + deeper eyes).

## v3.x (2026-05-15) — crawd iteration

- v3.0: crawd-kun raised relief + engraved eyes.
- v3.1: silhouette size adjust + emphasis.
- v3.2: morphological outline dilation for thicker line widths.

## v2 (2026-05-15) — usability

- Outer vertical edge fillets.
- Reduced wall + floor thickness.
- Added mounting pins.

## v1 (2026-05-15) — initial

- Bottom case + lid + plug, with crawd-kun emblem on lid.
- Board: 51 × 21 × 1mm PCB, micro-USB cutout on +X edge, 4 mounting holes.
