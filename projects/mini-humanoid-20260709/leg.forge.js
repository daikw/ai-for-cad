// One leg (5 DoF: ankle roll/pitch, knee, hip pitch/roll), internally
// X-symmetric so the same geometry serves both sides — main.forge.js
// translates it to x = ±hipX. Local frame: leg centerline at x=0, sole at z=0.
//
// Servo spin conventions (rotation about the joint axis, from the base pose
// "body hangs down"): pitch +90 = body forward (+Y), -90 = body backward (-Y);
// roll servos are pre-rotated with rotateZ(90) so their axis is Y.
//
// v2 shell pass (ref-1 side view): the flat v1 plates are replaced by (1) a
// two-layer foot, (2) U-shaped brackets that cup the ankle-pitch and knee
// horn discs on both sides, and (3) hollow wrap-shell tubes that cover the
// servo-free gaps between joints. Pitch-servo horn discs always sit at
// local x=±10 (radius 8, thickness 2.5) regardless of pitch spin, because
// rotation about the pitch axis (X) never moves points already on that axis
// — confirmed against `servoShape.boundingBox()` via a throwaway probe
// script before writing this file. That invariant is what lets the same
// U-link cross-section serve both the ankle and the knee.
const D = require("./dims.js");
const Z = D.z;
const servoShape = require("./servo-xl330.forge.js").shape;

const pitchServoAt = (zAxis, spinDeg) =>
  servoShape.rotate([1, 0, 0], spinDeg || 0).translate(0, 0, zAxis);
const rollServoAt = (yOff, zAxis, spinDeg) =>
  servoShape.rotateZ(90).rotate([0, 1, 0], spinDeg || 0).translate(0, yOff, zAxis);

const white = (s) => s.color(D.colors.shellWhite).material({ metalness: 0.02, roughness: 0.6 });
const dark = (s) => s.color(D.colors.graphite).material({ metalness: 0.05, roughness: 0.65 });
const sole = (s) => s.color(D.colors.faceBlack).material({ metalness: 0.05, roughness: 0.5 });

// box() is base-at-Z=0 / centered-XY; this helper takes explicit [min,max]
// spans per axis so every part below can be defined by its envelope instead
// of hand-computed center+size pairs.
const boxSpan = (xr, yr, zr) =>
  box(xr[1] - xr[0], yr[1] - yr[0], zr[1] - zr[0]).translate(
    (xr[0] + xr[1]) / 2,
    (yr[0] + yr[1]) / 2,
    zr[0],
  );

// --- foot & ankle -----------------------------------------------------------
// Two-layer foot: black sole (thin, rounded footprint) + white upper that
// steps down toward the toe (wedge look). Total stack still tops out at
// D.foot.t so ankleRiser (below) keeps landing at the same Z.
const soleT = 1.5;
const footSole = sole(
  fillet(
    boxSpan([-22, 22], [D.foot.yCenter - 32, D.foot.yCenter + 32], [0, soleT]),
    0.6,
    { parallel: [0, 0, 1] },
  ),
);
// Fillet each pad *before* unioning — filleting after the union would also
// round the internal step seam (mid-pad top 4.0 vs toe-pad top 3.0), and
// that seam's edge is too short (~1mm) for manifold's fillet trimming.
// v2.1: 3-tier taper (was 2) — each tier steps down in both height and width
// toward the toe, so the union silhouette reads as a rounded, narrowing nose
// instead of a stepped block (ref-1's foot is noticeably rounder here).
// Fillet radius per tier is set to the largest value that still clears half
// its own thickness (thickness = tier top Z - soleT).
const footMidPad = fillet(
  boxSpan([-20, 20], [D.foot.yCenter - 30, 26], [soleT, D.foot.t]), // thickness 2.5 -> r<=1.25
  1.0,
  { parallel: [0, 0, 1] },
);
const footToePad = fillet(
  boxSpan([-19, 19], [22, 32], [soleT, D.foot.t - 1.2]), // thickness 1.3 -> r<=0.65
  0.55,
  { parallel: [0, 0, 1] },
);
const footTipPad = fillet(
  boxSpan([-15, 15], [28, 38.5], [soleT, D.foot.t - 1.8]), // thickness 0.7 -> r<=0.35
  0.3,
  { parallel: [0, 0, 1] },
);
const footUpper = white(union(footMidPad, footToePad, footTipPad));
// ankle roll servo: axis Y at z=14, body flipped up, shifted forward (toe side)
const ankleRollServo = rollServoAt(25, Z.ankleRoll, 180); // body y∈[15,35] z∈[6,40]
const ankleRiser = white(box(28, 22, 2).translate(0, 25, D.foot.t)); // under roll body
// ankle pitch servo: axis X at z=24, body swung backward (heel side)
const anklePitchServo = pitchServoAt(Z.anklePitch, -90); // body y∈[-26,8] z∈[10.75,37.25]
// link plate: roll front horn (y=12.5) → ankle U-link / shin shell
const ankleLink = dark(box(26, 2.5, 30).translate(0, 11.25, 8)); // y∈[10,12.5] z∈[8,38]

// Ankle U-link: two white cheeks flanking the ankle-pitch horn discs
// (x=±[8.75,11.25], y∈[-8,8] at z=24 axis). Cheeks start at x=11 — a 0.25mm
// reach into the horn face, the "flush touch to small weld" contact the
// ledger calls for; they never reach the servo BODY box (|x|<=10) at all,
// so the only overlap is that thin horn sliver (~64mm³/side, comment below).
const ankleCheekX = [11.0, 15.0];
const ankleULinkZ = [14, 39]; // cups the horn (16-32) and hands off flush to the shin shell at 39
const ankleULinkRaw = union(
  boxSpan(ankleCheekX, [-16, 10], ankleULinkZ),
  boxSpan([-ankleCheekX[1], -ankleCheekX[0]], [-16, 10], ankleULinkZ),
);
const ankleULink = white(fillet(ankleULinkRaw, 1.8, { parallel: [0, 0, 1] })); // cheek is 4mm thick, r<=2.0
// pivot-cap detail: small dark boss proud of each cheek's outer face, over
// the horn axis — reads as the bolt head visible in ref-1's ankle bracket.
const ankleBossL = dark(
  cylinder(1.2, 3.5).pointAlong([1, 0, 0]).translate(ankleCheekX[1] - 0.5, 0, Z.anklePitch),
);
const ankleBossR = dark(
  cylinder(1.2, 3.5).pointAlong([-1, 0, 0]).translate(-(ankleCheekX[1] - 0.5), 0, Z.anklePitch),
);

// --- shank (ankle pitch → knee, axis-to-axis 50) ----------------------------
// The pitch-servo bodies (26.5mm tall after the -90 rotation) leave a
// 23.5mm servo-free gap between joints (50 - 26.5). The shin shell wraps
// exactly that gap as a hollow tube — closed on all 4 sides since nothing
// needs to show through here; the black servo itself is the visible "back
// of the leg" at the joints (via the U-links' open backs), not this shell.
const shinShellZ = [39, 59]; // clears ankle-pitch top (37.25) and knee bottom (60.75) by >=1.25mm
const shinWallT = 2.5;
// Bounded by two constraints: footprint (32x32, safe up to <16) and the
// tube's own Z height (20mm) — manifold's fillet rejects a vertical edge
// whose length is less than 2x the radius, so r=11 (2r=22>20) errors under
// the manifold backend `render 3d` uses even though occt tolerates it. r=9
// (2r=18<20) clears both kernels with margin, leaving a ~7mm flat band per
// side — a clear stadium/oval read vs. v2.0's boxier r=4 corners.
const shellCornerR = 9;
// v3: tapered roundedRect extrude instead of a straight filleted box — the
// calf widens toward the knee (32x32 -> 36x32), matching ref-1's organic
// taper. scaleTop keeps this on the exact/extrude primitive path, so the
// single cavity difference below stays kernel-safe on every backend
// (fillet is illegal on tapered extrudes, so the roundness comes entirely
// from the profile's corner radius).
const shinOuter = roundedRect(32, 32, shellCornerR)
  .extrude(shinShellZ[1] - shinShellZ[0], { scaleTop: [36 / 32, 1] })
  .translate(0, -1, shinShellZ[0]);
const shinCavity = roundedRect(32 - 2 * shinWallT, 32 - 2 * shinWallT, shellCornerR - 2)
  .extrude(shinShellZ[1] - shinShellZ[0] + 4, { scaleTop: [36 / 32, 1] })
  .translate(0, -1, shinShellZ[0] - 2); // open top & bottom
const shinShell = white(difference(shinOuter, shinCavity));

// --- knee & thigh (knee → hip pitch, axis-to-axis 50) -----------------------
const kneeServo = pitchServoAt(Z.knee, -90); // body swung backward (calf bulge)
const kneeCheekX = ankleCheekX; // same cross-section as the ankle bracket
const kneeULinkZ = [64, 89]; // cups the knee horn (66-82); knee servo top (87.25) peeks through the 87-89 sliver
const kneeULinkRaw = union(
  boxSpan(kneeCheekX, [-16, 10], kneeULinkZ),
  boxSpan([-kneeCheekX[1], -kneeCheekX[0]], [-16, 10], kneeULinkZ),
);
const kneeULink = white(fillet(kneeULinkRaw, 1.8, { parallel: [0, 0, 1] })); // same cross-section as the ankle bracket
// front tie plate, mirrors ankleLink's role (there is no roll servo at the
// knee to link to — this is a purely aesthetic bracket closing the U front).
const kneeLink = dark(box(22, 2.5, 20).translate(0, 9.25, 64)); // y∈[8,10.5] z∈[64,84]
const kneeBossL = dark(
  cylinder(1.2, 3.5).pointAlong([1, 0, 0]).translate(kneeCheekX[1] - 0.5, 0, Z.knee),
);
const kneeBossR = dark(
  cylinder(1.2, 3.5).pointAlong([-1, 0, 0]).translate(-(kneeCheekX[1] - 0.5), 0, Z.knee),
);

const thighShellZ = [89, 109]; // clears knee top (87.25) and hip-pitch bottom (110.75)
// v3: same tapered-extrude treatment, stronger flare toward the hip
// (32x32 -> 38x32, x=±19 within the ±23 leg budget).
const thighOuter = roundedRect(32, 32, shellCornerR)
  .extrude(thighShellZ[1] - thighShellZ[0], { scaleTop: [38 / 32, 1] })
  .translate(0, -1, thighShellZ[0]);
const thighCavity = roundedRect(32 - 2 * shinWallT, 32 - 2 * shinWallT, shellCornerR - 2)
  .extrude(thighShellZ[1] - thighShellZ[0] + 4, { scaleTop: [38 / 32, 1] })
  .translate(0, -1, thighShellZ[0] - 2);
const thighShell = white(difference(thighOuter, thighCavity));

// --- hip --------------------------------------------------------------------
const hipPitchServo = pitchServoAt(Z.hipPitch, 90); // body forward y∈[-8,26] z∈[110.75,137.25]
// hip roll servo: axis Y at z=134, body flipped up + shifted backward → sits
// in the pelvis pocket (torso.forge.js cuts the matching pocket)
const hipRollServo = rollServoAt(-24, Z.hipRoll, 180); // body y∈[-34,-14] z∈[126,160]
// hip plate: abuts the roll front horn face (y=-11.5) → thigh side plates
// (kept as v1 — not in this pass's scope; thighShell above hands off to it
// with a 1.75mm reveal at z=109→110.75, same reveal pattern as the other joints)
const hipPlate = dark(box(28, 2.5, 20).translate(0, -10.25, 120)); // y∈[-11.5,-9] z∈[120,140]

const servoParts = [
  { name: "Ankle Roll Servo", shape: ankleRollServo },
  { name: "Ankle Pitch Servo", shape: anklePitchServo },
  { name: "Knee Servo", shape: kneeServo },
  { name: "Hip Pitch Servo", shape: hipPitchServo },
  { name: "Hip Roll Servo", shape: hipRollServo },
];
const printedParts = [
  { name: "Foot Sole", shape: footSole },
  { name: "Foot Upper", shape: footUpper },
  { name: "Ankle Riser", shape: ankleRiser },
  { name: "Ankle Link", shape: ankleLink },
  { name: "Ankle U-Link", shape: ankleULink },
  { name: "Ankle Boss L", shape: ankleBossL },
  { name: "Ankle Boss R", shape: ankleBossR },
  { name: "Shin Shell", shape: shinShell },
  { name: "Knee U-Link", shape: kneeULink },
  { name: "Knee Link", shape: kneeLink },
  { name: "Knee Boss L", shape: kneeBossL },
  { name: "Knee Boss R", shape: kneeBossR },
  { name: "Thigh Shell", shape: thighShell },
  { name: "Hip Plate", shape: hipPlate },
];

const legGroup = group(...servoParts, ...printedParts);

console.log("[leg] ankle pitch body bbox:", JSON.stringify(anklePitchServo.boundingBox()));
console.log("[leg] hip roll body bbox:", JSON.stringify(hipRollServo.boundingBox()));
console.log("[leg] foot sole bbox:", JSON.stringify(footSole.boundingBox()));
console.log("[leg] foot upper bbox:", JSON.stringify(footUpper.boundingBox()));
console.log("[leg] shell corner fillet radius:", shellCornerR);
console.log("[leg] ankle U-link bbox:", JSON.stringify(ankleULink.boundingBox()));
console.log("[leg] shin shell bbox:", JSON.stringify(shinShell.boundingBox()));
console.log("[leg] knee U-link bbox:", JSON.stringify(kneeULink.boundingBox()));
console.log("[leg] thigh shell bbox:", JSON.stringify(thighShell.boundingBox()));
console.log(
  "[leg] whole-leg bbox:",
  JSON.stringify(group(...printedParts.map((p) => p.shape)).boundingBox()),
);

return {
  group: legGroup,
  solids: () => ({
    printed: printedParts.map((p) => p.shape),
    servos: servoParts.map((p) => p.shape),
  }),
};
