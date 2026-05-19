# pi-pico-case CHANGELOG

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
