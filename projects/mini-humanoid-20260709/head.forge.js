// Head: neck yaw servo (body inside torso, through the torso-top neck hole),
// neck cylinder, rounded-helmet skull (box + uniform-radius fillet on all
// edges) with a face-panel window, panel, eyes, and side ear pods. v2:
// replaces the v1 ellipsoid per parts-ledger.md §A — ref-3 calls for a
// boxier, heavily-filleted helmet instead of a smooth egg.
const D = require("./dims.js");
const Z = D.z;
const H = D.head;
const servoShape = require("./servo-xl330.forge.js").shape;

// neck servo: axis rotated X→Z, body horizontal inside the torso top
// (body x∈[-26,8], z∈[230,250]; horns z∈[227.5,230] and [250,252.5])
const neckServo = servoShape.rotateY(90).translate(0, 0, Z.neckServo);

const neckCyl = cylinder(13.5, H.neckR)
  .translate(0, 0, 252.5) // z∈[252.5,266], welds onto the top horn
  .color(D.colors.servoDark)
  .material({ metalness: 0.1, roughness: 0.55 });

// Helmet envelope reuses dims.js head.rx/ry/rz verbatim (frozen numeric
// authority) so the overall bbox and headTop=300 anchoring are unchanged
// from v1 — only the primitive family (box+fillet instead of ellipsoid)
// and the fillet radii differ.
const outerW = 2 * H.rx; // 72
const outerD = 2 * H.ry; // 66
const outerH = 2 * H.rz; // 48
const bottomZ = Z.headCenter - H.rz; // 252, tangent to torso top (Z=252)
const topZ = Z.headCenter + H.rz; // 300 === Z.headTop (asserted below)
if (topZ !== Z.headTop) throw new Error(`head top mismatch: ${topZ} !== ${Z.headTop}`);

// Single uniform-radius fillet on all 12 box edges — a rounded-box
// "helmet" blank. Differentiated per-edge-group radii (big dome on top,
// tight sides) needed sequential fillet() calls on the same shape, which
// the render-preview backend rejects ("follow-up partial fillets adjacent
// to existing fillet topology require native tangent-chain propagation,
// not yet supported" — occt tolerates it, but render 3d can't select a
// backend per kernel-pitfalls.md §7, so the geometry must work on both).
// One fillet() call with no edge selector avoids that entirely.
const HELMET_R = 11;

function helmetBlank(w, d, h, z0, r) {
  // {convex:true} is an explicit selector (a box's 12 edges are all
  // convex, so this matches all of them) — avoids the broad no-selector
  // enumeration path, which silently skips the fillet past a budget
  // (observed non-deterministic volumes depending on
  // FORGECAD_BROAD_EDGE_FEATURE_BUDGET otherwise).
  return fillet(box(w, d, h).translate(0, 0, z0), r, { convex: true });
}

const outerHelmet = helmetBlank(outerW, outerD, outerH, bottomZ, HELMET_R);

// Cavity: uniform ~2.3mm wall on the sides/top; a thicker ~3mm solid base
// is kept near the neck (matches v1's bottom margin) for the neck weld.
const WALL = 2.3;
const innerW = outerW - 2 * WALL;
const innerD = outerD - 2 * WALL;
const innerBottomZ = bottomZ + 3;
const innerTopZ = topZ - WALL;
const innerHelmet = helmetBlank(
  innerW,
  innerD,
  innerTopZ - innerBottomZ,
  innerBottomZ,
  HELMET_R - WALL
);

// Flat band on the (uncorniced) faces, bounded by the fillet radius on
// both ends — z∈[bottomZ+HELMET_R, topZ-HELMET_R] = [263,289] — is where
// the face window and the ear pods sit so they land on true flat surface,
// not the curved fillet regions.
// Window bottom is pinned to the flat-band floor (263, see comment above)
// so the visor's intersection with `conform` never dips into the curved
// fillet region — that dip showed up as a visible shading seam across the
// lower part of the window in an earlier draft.
// v3: bigger visor with ROUNDED corners (ref-3: face ≈75% of head width,
// large corner radius, wrapping slightly past the flat band into the front
// corner curvature). The cutter is a roundedRect extruded through the wall
// and rotated to point +Y — the v2 box cutter left sharp window corners.
const faceCutW = 54; // ±27 > flat band's ±25: intentional wrap into the corner curvature
const faceCutH = 26; // fills the [263,289] flat band exactly
const faceBottomZ = 263;
const faceCenterZ = faceBottomZ + faceCutH / 2; // 276
const faceCut = roundedRect(faceCutW, faceCutH, 9)
  .extrude(16)
  .rotateX(-90)
  .translate(0, 18, faceCenterZ); // y∈[18,34] z∈[263,289], spans the wall at every x across the window
const neckPassage = cylinder(16, H.neckR + 1).translate(0, 0, 248); // z∈[248,264]

const skull = difference(outerHelmet, innerHelmet, faceCut, neckPassage)
  .color(D.colors.shellWhite)
  .material({ metalness: 0.02, roughness: 0.55 });

// Face visor: a FRESH, independently-built conform blank (never the skull's
// own outerHelmet/differenced result — see kernel-pitfalls.md §5, don't
// chain difference()+intersection() on the same primitive), shrunk 0.8mm so
// the panel sits recessed and can never poke outside the helmet surface.
const CONFORM_SHRINK = 0.8;
const conform = helmetBlank(
  outerW - 2 * CONFORM_SHRINK,
  outerD - 2 * CONFORM_SHRINK,
  outerH - 2 * CONFORM_SHRINK,
  bottomZ + CONFORM_SHRINK,
  HELMET_R - CONFORM_SHRINK
);
// panel window is 2mm larger than the cut on each side so its rim tucks
// under the shell's lip (~414mm³ overlap with Skull, intentional weld
// within the head group, under the 500mm³ ledger guideline) instead of
// leaving a hairline gap. The window box's Y-span is shallow (29.5-34) and
// capped by conform's outer surface (~32.2) so the intersection is a thin
// ~2.7mm conforming cap, not the solid interior of the (filled) conform
// blank.
const facePanel = intersection(
  roundedRect(faceCutW + 4, faceCutH + 4, 11)
    .extrude(4.5)
    .rotateX(-90)
    .translate(0, 29.5, faceCenterZ), // y∈[29.5,34], capped by conform's outer surface (~32.2)
  conform
)
  .color(D.colors.faceBlack)
  .material({ metalness: 0.2, roughness: 0.25 });

// eyes poke 0.2mm proud of the panel's outer (recessed) surface (~32.2)
// so they're actually visible from outside instead of buried in the panel
const eyeL = cylinder(1.2, 3.0)
  .pointAlong([0, 1, 0])
  .translate(9, 31.2, faceCenterZ + 2)
  .color("#f2f5f7")
  .material({ emissive: "#dfe8ee", emissiveIntensity: 1.2 });
const eyeR = eyeL.translate(-18, 0, 0);

// Ear pods: shallow dark discs on the flat side faces (x=±36, within the
// same flat band as the face window). Each pod overlaps the shell by 0.5mm
// (~226mm³, intentional weld within the head group, well under the 500mm³
// ledger guideline) instead of an exact-tangent contact.
const EAR_R = 13; // Ø26 (ref-3 wants ~Ø30; capped by the [263,289] flat band)
const EAR_T = 2; // shallow "slight convex" bump — keeps x within the ±38 head budget
const EAR_OVERLAP = 0.5; // weld into the shell (documented below)
const EAR_FILLET = 0.5; // 2*0.5=1.0 < EAR_T=2, avoids the two rim fillets colliding
// outward extent = outerW/2 - EAR_OVERLAP + EAR_T = 36-0.5+2 = 37.5, within x<=38
const earPodR = fillet(cylinder(EAR_T, EAR_R), EAR_FILLET, { convex: true })
  .pointAlong([1, 0, 0])
  .translate(outerW / 2 - EAR_OVERLAP, 0, faceCenterZ)
  .color(D.colors.servoDark)
  .material({ metalness: 0.15, roughness: 0.4 });
const earPodL = fillet(cylinder(EAR_T, EAR_R), EAR_FILLET, { convex: true })
  .pointAlong([-1, 0, 0])
  .translate(-(outerW / 2 - EAR_OVERLAP), 0, faceCenterZ)
  .color(D.colors.servoDark)
  .material({ metalness: 0.15, roughness: 0.4 });

const headGroup = group(
  { name: "Neck Servo", shape: neckServo },
  { name: "Neck", shape: neckCyl },
  { name: "Skull", shape: skull },
  { name: "Face Panel", shape: facePanel },
  { name: "Eye L", shape: eyeL },
  { name: "Eye R", shape: eyeR },
  { name: "Ear Pod L", shape: earPodL },
  { name: "Ear Pod R", shape: earPodR }
);

console.log("helmet outer bbox:", outerHelmet.boundingBox());
console.log("skull volume mm3:", skull.volume());
console.log("facePanel volume mm3:", facePanel.volume());
console.log("neckCyl volume mm3:", neckCyl.volume());
console.log("eye volume mm3 (each):", eyeL.volume());
console.log("earPod volume mm3 (each):", earPodL.volume());
const printedVolMm3 =
  skull.volume() + facePanel.volume() + neckCyl.volume() + eyeL.volume() + eyeR.volume() + earPodL.volume() + earPodR.volume();
console.log("head printed total volume mm3:", printedVolMm3, "-> g:", printedVolMm3 * 0.0008);

return {
  group: headGroup,
  solids: () => ({
    printed: [skull, facePanel, neckCyl, eyeL, eyeR, earPodL, earPodR],
    servos: [neckServo],
  }),
};
