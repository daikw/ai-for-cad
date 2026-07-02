# Handy FDM Mini — Low-Level Design

The construction document for the Handy FDM Mini frame and its printed
structural parts. It implements the decisions locked in [`hld.md`](./hld.md)
(Prusa Mini cantilever, Klipper on SKR Pico + Pi Zero 2 W, lightweight direct
extruder, 24 V AC adapter) and turns them into exact geometry, constraints, and
numeric acceptance criteria.

CAD scope here is the **structure only**: the 2020 frame layout and the
3D-printed brackets, carriages, bed support, and cable guides. Electronics and
`printer.cfg` are documented elsewhere and are out of scope.

Single source of truth for every number: [`dims.js`](./dims.js). This document
explains the *why*; `dims.js` holds the *value*; `checks.forge.js` proves the
geometry meets it.

---

## 1. What it is

A shoebox-sized cantilever FDM printer you can pick up with one hand. Picture a
200 mm square aluminium base — a flat 2020 extrusion frame like a small picture
frame lying on the desk. From its left edge a single 2020 post rises straight up
to 260 mm, the full height of the machine. Bolted to a carriage that slides up
and down that post, an X-axis beam reaches out to the right across the base like
a diving board — this is the cantilever, and it is the design's defining risk
and its defining simplicity. The print head hangs off that beam over the middle
of the base. Below it, a 100 mm build plate slides forward and back on a rail
mounted to the base — the bedslinger Y axis.

Nothing about it is enclosed in v1. It is an open frame you can see through,
which is why the brackets that join the post to the base and the beam to the
carriage carry all the visual and mechanical weight: they are the parts that
make an open cantilever stiff enough to print cleanly.

The blockout ([`blockout.forge.js`](./blockout.forge.js), rendered in
`blockout-iso.png`) confirmed the concept fits: the cantilever topology sits
entirely inside the 220 × 220 × 260 mm body envelope, the 100 mm bed's
front-back sweep stays within the 200 mm base footprint, and the loaded mass
lands near 2 kg — comfortably under the 4 kg one-hand-carry ceiling.

---

## 2. Coordinate system & global datums

| Datum | Definition |
|---|---|
| Origin | Center of the base footprint, on the table plane |
| +X | Right — X gantry / head travel axis |
| +Y | Rear — Y bedslinger travel axis |
| +Z | Up — Z gantry lift axis |
| z = 0 | Bottom face of the base frame (machine feet plane) |
| Build volume | Centered on x=0, y=0; bed home = mid-Y-travel |

Primitive convention (matches `spherical-drone`): `box()`/`cylinder()` are
centered in X/Y and grow **+Z from the translate Z** (translate Z is the bottom
face). Every Z coordinate in the model files is a bottom-face height.

---

## 3. Global constraints (requirement → geometry)

| # | Constraint | Value | Rationale |
|---|---|---|---|
| G1 | Build volume | 80 × 80 × 80 mm | hld.md requirement |
| G2 | Body envelope | 220 × 220 × 260 mm | hld.md requirement; nothing may protrude past ±110 (X/Y) or 260 (Z) |
| G3 | Base footprint | 200 × 200 mm | 10 mm belt/motor margin per side inside G2 |
| G4 | Bed plate | 100 mm square | hld.md 80–100; 100 chosen for part-size headroom |
| G5 | Bed top at home | z = 41 mm | base top (20) + Y carriage stack (~15) + plate (6) |
| G6 | Y sweep containment | bed edge \|y\| ≤ 90 at travel extremes | 100/2 + 80/2; must stay ≤ base 100 (Concern 5) |
| G7 | Column top = envelope top | z = 260 mm | 2020 column z [20, 260], length 240 |
| G8 | Carry mass ceiling | ≤ 4000 g (PSU + spool detached) | hld.md 2.5–4.0 kg one-hand carry |
| G9 | Printer bed for these parts | Creality K1 Max 300³ (self-printed) | every printed part must fit |

**Concern 5 resolution (from blockout):** with a 100 mm plate and 80 mm Y
stroke the bed's rear/front edge reaches y = ±90, inside the 200 mm base (±100).
The 200 mm base is sufficient; the 220 envelope absorbs the belt, the low rear Y
motor, and the leadscrew. No base enlargement needed.

**Envelope tightness (flagged):** the Y stepper does not fit within the base at
bed level (only 10 mm clear each end vs a 42 mm NEMA17). It is mounted **low at
the rear** (z [2, 26], below the bed carriage's z ≥ 26.5 underside) and reaches
y = 108, using the 200→220 rear margin. Vertical clearance to the bed carriage
at full rear travel is ~0.5 mm — a real constraint the bed-carriage height
budget (§7.4) must not erode.

---

## 4. The printed parts (CAD scope)

Six printed part families. Each builds at origin in its own local frame; the
assembly/checks place them. PLA @ 1.24 g/cm³ for mass. All hole diameters are
clearance (M3 = 3.2, M5 = 5.2) unless noted.

### 4.1 z-base-bracket — column-to-base right-angle gusset

The single most important stiffness part (hld.md Key Interfaces, Concern 2). It
wraps the foot of the 2020 column and bolts down to the base rail, turning a
bolted butt joint into a braced right angle. An L of a 60 × 40 × 6 base flange
and a 55 mm tall, 6 mm wall that hugs the column, tied by a 5 mm triangular rib.
A **20.4 mm square pocket** (2020 + 0.4 clearance) in the wall is the datum face
that sets the column square to the base — this is the "突き当て基準面" that
removes the column-squareness from user guesswork (Concern 2).

Constraints: pocket 20.4 mm (loose enough to seat, tight enough to locate);
walls ≥ 5 mm around it; M5 clearance (5.2) for the base T-nut and the column
T-nut. Print flat on the flange, rib self-supporting.

### 4.2 z-carriage — Z MGN9H carriage → X gantry clamp

Carries the entire cantilever moment (hld.md Concern 1). A 44 × 40 × 6 plate
bolts to the Z MGN9H carriage; from it a 2020 clamp grips the X gantry beam
through a 20.4 mm pocket, stiffened by three 5 mm ribs. Design intent: head
self-weight (~250 g at the X extreme) produces ≤ 0.1 mm tip deflection — the
rib count and 6 mm plate are the levers (validated as a mass/stiffness budget
line, not FEA, in v1).

Constraints: plate flatness against the carriage; MGN9H hole pitch 20 mm
(**PLACEHOLDER** until carriage SKU fixed — §11); clamp wall ≥ 5 mm.

### 4.3 head-carriage — X MGN9H → extruder/hotend mount

Rides the X rail, carries the Orbiter-2-class extruder + V6 hotend + fans
(~250 g). A 40 × 46 × 5 rail plate and a 36 × 50 × 5 vertical extruder-mount
face at right angles. Extruder mount pattern follows the chosen extruder
(**PLACEHOLDER** — Orbiter 2 vs Sherpa Mini undecided, hld.md Decision #6).

### 4.4 bed-carriage — Y MGN9H → 3-point leveling support

A 90 × 60 × 5 spider that rides the Y rail and supports the plate on three M3
leveling screws on a 40 mm radius triangle (hld.md Key Interfaces: 3-point
support + transport lock). Height is budgeted so its underside clears the low
rear Y motor (§3, G6).

### 4.5 corner-bracket — 2020 inner corner gusset (×4)

Generic 90° gusset that squares the base frame: two 34 mm legs, 5 mm wall, 4 mm
rib, M5 clearance.

### 4.6 cable-guide — drag-chain anchor / cable clip

Small clip on the moving bed and head to manage the 3 runs of moving cable
(hld.md Concern 3). A 30 × 16 base with a 10 × 12 throat and a 2.5 mm wall,
M3 mount.

---

## 5. Assembly (main.forge.js)

`main.forge.js` places every printed part at its world pose against the frame
(from `dims.js`), plus 2020/rail/motor ghosts for context, in one scene. It is a
visual aid; correctness lives in `checks.forge.js`. No booleans across parts —
parts are composed as a list of `{name, shape}`.

---

## 6. Interfaces

| Interface | Mating | Constraint |
|---|---|---|
| z-base-bracket ⇔ column | 20.4 pocket over 2020 | ≤ 0.4 clearance, square datum |
| z-base-bracket ⇔ base rail | M5 T-nut | flange flush on rail top (z=20) |
| z-carriage ⇔ Z MGN9H | M3 ×4, 20 mm pitch (PLACEHOLDER) | plate flush on carriage |
| z-carriage ⇔ X gantry | 20.4 clamp | beam parallel to base X |
| head-carriage ⇔ X MGN9H | M3 ×4 (PLACEHOLDER) | plate flush |
| bed-carriage ⇔ Y MGN9H | M3 ×4 (PLACEHOLDER) | plate flush; clears rear Y motor ≥ 0.3 mm |
| bed-carriage ⇔ plate | 3× M3 leveling | 40 mm radius triangle |

---

## 7. Verification criteria (→ checks.forge.js, one check each)

Each line maps 1:1 to a named check. Interference = intersection volume ≤ tol
(mm³). Envelope = intersection with an outside-shell solid = 0. All numbers on
`--backend occt`.

### 7.1 Layout / envelope
- **C1** every printed part + every frame member fits inside the 220×220×260
  body envelope (outside-shell intersection ≈ 0, tol 1 mm³).
- **C2** build volume 80³ sits at z [41, 121], within envelope Z (≤ 260).
- **C3** bed Y-sweep envelope (100 × 180 plate sweep) stays within base
  footprint: no overlap with an "outside \|y\|>100 or \|x\|>100" shell (tol 1).
- **C4** bed carriage at full rear travel clears the low rear Y motor
  (intersection = 0, tol 0.1).

### 7.2 Printed-part fit
- **C5** z-base-bracket 20.4 pocket seats the 20 mm column with 0.2 mm/side
  clearance (expectNear on pocket − column = 0.4, tol 0.1).
- **C6** z-carriage clamp likewise seats the 20 mm gantry (expectNear 0.4).
- **C7** each printed part fits the K1 Max 300³ bed (expectFitsBed).
- **C8** no two co-located printed parts interpenetrate at assembly poses
  (z-base vs column ghost tangent; z-carriage vs gantry ghost tangent; tol 2).

### 7.3 Mass budget (physics — a check, not a note)
- **C9** total carry mass ≤ 4000 g (G8). Items: frame 2020 (length × 0.45),
  motors (Y+Z NEMA17 200 g, X NEMA14 110 g), rails+carriages, T8+nut, head
  cluster 245 g, electronics 56 g, bed plate 120 g, fasteners 60 g, wiring 90 g,
  **plus the six printed parts by measured volume × 1.24 g/cm³**. PSU (350 g) and
  spool (250 g) are detached for carry and excluded. Typical-mass line 2500 g is
  reported as a waived informational sub-budget (expected, not a failure).

### 7.4 Placeholders (waived until measured — §11)
- MGN9H mounting-hole pitch (z-carriage / head-carriage / bed-carriage): 20 mm
  placeholder until carriage SKU is fixed.
- extruder mount pattern (head-carriage): placeholder until Orbiter 2 vs Sherpa
  Mini decided (hld.md Decision #6).

---

## 8. Printability

| Part | Bed fit | Min wall | Print orientation intent |
|---|---|---|---|
| z-base-bracket | ✓ 300³ | 5 mm | flat on flange; rib self-supports |
| z-carriage | ✓ | 5 mm | plate down; ribs vertical, no support |
| head-carriage | ✓ | 5 mm | rail plate down; mount face needs light support |
| bed-carriage | ✓ | 5 mm | flat; arms in-plane |
| corner-bracket | ✓ | 4 mm | on the L corner, self-supporting |
| cable-guide | ✓ | 2.5 mm | throat opening up |

Material: PLA for v1 form/fit (PETG for load parts in v2 with the heated bed).
Wall thickness is verified out-of-band with `forgecad render inspect
--channels thickness`, not inside `checks.forge.js`.

---

## 9. Mass budget summary (from dims.js self-check)

| Group | Mass |
|---|---|
| Frame 2020 (1310 mm × 0.45) | 590 g |
| Motors (Y+Z NEMA17, X NEMA14) | 510 g |
| Rails + carriages | 95 g |
| Z drive (T8 + nut) | 68 g |
| Head cluster (extruder+hotend+fans) | 245 g |
| Electronics (SKR Pico+Pi+buck) | 56 g |
| Bed plate + fasteners + wiring | 270 g |
| **Subtotal (non-printed)** | **1834 g** |
| Printed parts (6 families) | ~200 g (measured in checks) |
| **Carry total** | **~2.0 kg** (ceiling 4.0 kg) |
| Detached: PSU 350 g + spool 250 g | not counted |

Concern 4 resolved: comfortably one-hand-carryable, near the low end of the
2.5–4.0 kg range.

---

## 10. Open items / placeholders (§11)

| Item | Status |
|---|---|
| MGN9H mounting-hole pitch | placeholder 20 mm — waived until carriage SKU fixed |
| Extruder mount pattern | placeholder — waived until Orbiter 2 / Sherpa Mini decided (Decision #6) |
| Transport lock geometry | not modeled in v1 (Decision #7) — future |
| Carry handle | not modeled in v1 (Decision #7) — future |
| Cantilever tip deflection ≤ 0.1 mm | budgeted via rib design; FEA/measurement deferred to v1 build |
