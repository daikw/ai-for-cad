// One arm (3 DoF: shoulder pitch/roll, elbow) + fixed claw hand.
// Side param flips every X offset; geometry itself is X-symmetric per part.
// The shoulder pitch servo lives INSIDE the torso cavity; its horn passes
// through the shoulder hole cut by torso.forge.js.
const D = require("./dims.js");
const Z = D.z;
const side = Param.choice("Side", "left", ["left", "right"]);
const s = side === "left" ? 1 : -1;
const cX = D.arm.centerX; // 51.55

const servoShape = require("./servo-xl330.forge.js").shape;
const dark = (sh) => sh.color(D.colors.graphite).material({ metalness: 0.05, roughness: 0.65 });
const white = (sh) => sh.color(D.colors.shellWhite).material({ metalness: 0.02, roughness: 0.6 });

// Build a rounded-corner box shell by filleting the CLOSED outer box first,
// then subtracting one oversized cavity box (single difference() on a single
// fillet()-derived primitive — safe per kernel-pitfalls #1/#5). Faces named
// open in `open` extend the cavity past the outer surface on that side, so
// no wall is left there; faces left closed keep a `wall`-thick shell.
// (shell({openFaces}) can't be used here: shell() only accepts box/cylinder/
// extrude/loft/sweep primitives, and fillet()'s output no longer qualifies —
// and filletEdges() itself rejects shapes that already have open-face
// boundary edges, so fillet must run before any opening is cut.)
const roundedShell = (w, d, h, wall, radius, open) => {
  const pad = 6;
  const outer = fillet(box(w, d, h), radius, { convex: true, parallel: [0, 0, 1] });
  const xMin = open.xNeg ? -w / 2 - pad : -w / 2 + wall;
  const xMax = open.xPos ? w / 2 + pad : w / 2 - wall;
  const zMin = open.bottom ? -pad : wall;
  const zMax = open.top ? h + pad : h - wall;
  const cavity = box(xMax - xMin, d - 2 * wall, zMax - zMin).translate((xMin + xMax) / 2, 0, zMin);
  return difference(outer, cavity);
};

// shoulder pitch: axis X, body inside torso cavity (x∈[12.8,32.8] for left,
// z∈[196,230] — clears the flat-stacked electronics below z=195)
const shoulderPitchServo = servoShape.translate(s * D.arm.pitchServoX, 0, Z.shoulderPitch);
// bracket plate on the outer horn face, passing through the shoulder hole
const shoulderBracket = dark(box(3, 28, 28).translate(s * D.arm.bracketX, 0, 208)); // x∈[35.3,38.3] z∈[208,236]
// shoulder roll: axis Y, body welded flush to the bracket outer face
const shoulderRollServo = servoShape.rotateZ(90).translate(s * cX, 0, Z.shoulderRoll); // body z∈[184,218]
// elbow: axis Y, body hangs down
const elbowServo = servoShape.rotateZ(90).translate(s * cX, 0, Z.elbow); // body z∈[148,182]

// Inner (torso-facing) side flips with Side: left arm sits at +X of torso so
// its inner face is -X; right arm mirrors to +X.
const innerOpen = s === 1 ? { xNeg: true } : { xPos: true };

// Shoulder pod (white): rounded cover over the shoulder-roll servo top,
// bridging the bracket and the upper-arm shell. Inner face open — the
// bracket passes straight through with no shelled wall in the way.
const shoulderPod = white(
  roundedShell(30, 34, 18, 2.3, 8, { ...innerOpen, bottom: true }).translate(s * cX, 0, 217) // z∈[217,235], sits atop the roll servo
);

// Upper-arm wrap shell (white): boxy shell around the shoulder-roll servo
// body (z∈[184,218]), replacing the v1 twin side plates. Inner face open
// (bracket/servo horn connection), bottom open (elbow joint below), and top
// open (shoulder-pod connection above — measured servo bbox top z=218 is
// only 1mm below the shell's own top at 219, closer than the 2.3mm wall, so
// a closed top wall breached the servo; opening it lets the pod's own
// bottom-open shell seat flush instead). Width 32 (not 30) + a +1mm outward
// center shift: the rotated servo body measures 26.5mm wide (bbox x∈[38.3,
// 64.8]), wider than a 30mm shell's inner clearance (30/2-wall=12.7 < 13.25
// half-width), so it breached the outer wall too. Growing only outward
// keeps the inner-face edge fixed at x=cX-15 (still >36, clear of the x<36
// torso-only budget) while the outer wall gains clearance.
const upperArmShell = white(
  roundedShell(32, 34, 40, 2.3, 6, { ...innerOpen, bottom: true, top: true }).translate(s * (cX + 1), 0, 179) // z∈[179,219]
);
// elbow-top plate: ties the shell to the elbow body (mechanical joint, dark)
const elbowTopPlate = dark(box(22, 31, 3).translate(s * cX, 0, 181)); // z∈[181,184]

// Forearm wrap shell (white, tapered): two rounded-box shells (elbow-side
// wider, wrist-side narrower) unioned together. Upper segment spans
// z∈[148,178] — the elbow servo's full measured bbox height (148-182) minus
// a 4mm mechanical reveal near the elbow-top plate at 181. Width 32 + the
// same +1mm outward shift as upperArmShell (elbow servo bbox is 26.5mm wide,
// x∈[38.3,64.8]). Inner face open too (not just top/bottom): a closed inner
// wall here left only a 0.55mm margin against the servo's -X edge at the
// shifted center — this measured 330mm³ of servo/shell overlap in practice
// (verified via intersection().volume() on the isolated pair), so the inner
// side needs the same open treatment as upperArmShell rather than a nominal
// clearance margin.
// depth 29 + y-center +1.5 → y∈[-13,16]: the leg's hip-roll servo bulges to
// y=-14 / global x=39.25 up to z=160, and a full-depth (y=-16) shell here
// measured 16.9mm³ of Arm-vs-Leg overlap in checks (LLD-8). Elbow servo
// (y∈[-10,10]) stays fully covered.
const forearmUpper = roundedShell(32, 29, 30, 2.3, 5, { ...innerOpen, top: true, bottom: true }).translate(
  s * (cX + 1),
  1.5,
  148
); // z∈[148,178]
const forearmLower = roundedShell(18, 24, 13, 2.2, 4, { top: true, bottom: true }).translate(s * cX, 0, 135); // z∈[135,148], width 18 keeps |x|=cX±9≥42.5 (budget: z<140 needs |x|≥42.5)
const forearmShell = white(union(forearmUpper, forearmLower));

const wristPlate = dark(box(18, 31, 3).translate(s * cX, 0, 132.5)); // z∈[132.5,135.5]

// Hand: thicker, rounded C-claw gripper (dark). Same fixed open-claw
// topology as v1 but with more wall thickness and a filleted wrist-end rim
// so it reads as a molded gripper, not a bare tube. Fillet is scoped to
// that one rim's edges only — an all-convex fillet on this 3-way
// difference (tube minus bore minus C-slot) hits inconsistent-winding
// boundary repair failures on occt, and a second fillet pass on the
// fingertip rim self-intersects on the default (truck) backend that
// `render 3d` uses (kernel-pitfalls #7: render subcommands ignore
// --backend), so only the wrist rim is filleted.
// Outer radius 8.2 (not a round 9): filletEdges() on this C-slot rim doesn't
// just round the corner, it measurably bulges the whole rim outward (r=9
// measured bbox x∈[-9.41,9.74] post-fillet, not ±9) — swept r=8.5/8.2/8.0/7.8
// against the translated bbox and picked 8.2 for a real ~0.5mm margin over
// the z<140 budget's |x|≥42.5 floor (cX-8.2 region measured at x_min=42.98).
const clawBase = difference(
  cylinder(22, 8.2),
  cylinder(26, 5.5).translate(0, 0, -2),
  box(8.2, 12, 26).translate(0, 6, -2)
);
const clawTube = fillet(
  clawBase,
  1.2,
  selectEdges(clawBase, { atZ: 22, tolerance: 1.5 }).filter((e) => !e.boundary)
);
const claw = clawTube
  .translate(s * cX, 0, 114) // z∈[114,136], fingertip at z=114, |x| = cX±9 = [42.55,60.55] (budget: z<140 needs |x|≥42.5)
  .color(D.colors.claw)
  .material({ metalness: 0.05, roughness: 0.6 });

const servoParts = [
  { name: "Shoulder Pitch Servo", shape: shoulderPitchServo },
  { name: "Shoulder Roll Servo", shape: shoulderRollServo },
  { name: "Elbow Servo", shape: elbowServo },
];
const printedParts = [
  { name: "Shoulder Bracket", shape: shoulderBracket },
  { name: "Shoulder Pod", shape: shoulderPod },
  { name: "Upper Arm Shell", shape: upperArmShell },
  { name: "Elbow Top Plate", shape: elbowTopPlate },
  { name: "Forearm Shell", shape: forearmShell },
  { name: "Wrist Plate", shape: wristPlate },
  { name: "Claw", shape: claw },
];

const armGroup = group(...servoParts, ...printedParts);

return {
  group: armGroup,
  solids: () => ({
    printed: printedParts.map((p) => p.shape),
    servos: servoParts.map((p) => p.shape),
  }),
};
