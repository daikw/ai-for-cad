// One leg (5 DoF: ankle roll/pitch, knee, hip pitch/roll), internally
// X-symmetric so the same geometry serves both sides — main.forge.js
// translates it to x = ±hipX. Local frame: leg centerline at x=0, sole at z=0.
//
// Servo spin conventions (rotation about the joint axis, from the base pose
// "body hangs down"): pitch +90 = body forward (+Y), -90 = body backward (-Y);
// roll servos are pre-rotated with rotateZ(90) so their axis is Y.
const D = require("./dims.js");
const Z = D.z;
const servoShape = require("./servo-xl330.forge.js").shape;

const pitchServoAt = (zAxis, spinDeg) =>
  servoShape.rotate([1, 0, 0], spinDeg || 0).translate(0, 0, zAxis);
const rollServoAt = (yOff, zAxis, spinDeg) =>
  servoShape.rotateZ(90).rotate([0, 1, 0], spinDeg || 0).translate(0, yOff, zAxis);

const white = (s) => s.color(D.colors.shellWhite).material({ metalness: 0.02, roughness: 0.6 });
const dark = (s) => s.color(D.colors.graphite).material({ metalness: 0.05, roughness: 0.65 });

// --- foot & ankle -----------------------------------------------------------
const foot = white(box(D.foot.w, D.foot.len, D.foot.t).translate(0, D.foot.yCenter, 0));
// ankle roll servo: axis Y at z=14, body flipped up, shifted forward (toe side)
const ankleRollServo = rollServoAt(25, Z.ankleRoll, 180); // body y∈[15,35] z∈[6,40]
const ankleRiser = white(box(28, 22, 2).translate(0, 25, D.foot.t)); // under roll body
// ankle pitch servo: axis X at z=24, body swung backward (heel side)
const anklePitchServo = pitchServoAt(Z.anklePitch, -90); // body y∈[-26,8] z∈[10.75,37.25]
// link plate: roll front horn (y=12.5) → shank side plates
const ankleLink = dark(box(26, 2.5, 30).translate(0, 11.25, 8)); // y∈[10,12.5] z∈[8,38]

// --- shank (ankle pitch → knee, axis-to-axis 50) ----------------------------
// shank plates hold the ankle horns and end just below the knee horns; the
// thigh plates take over on the knee horns (2mm z-gap, no same-slot overlap)
const shankPlateL = dark(box(3, 26, 48).translate(14, 0, 18)); // x∈[12.5,15.5] z∈[18,66]
const shankPlateR = dark(box(3, 26, 48).translate(-14, 0, 18));
// back plate reaches up to weld onto the knee servo body (its mount)
const shankBack = dark(box(34, 3, 24).translate(0, -15, 40)); // y∈[-16.5,-13.5] z∈[40,64]
const shinShell = white(box(32, 2, 32).translate(0, 13.9, 42)); // y∈[12.9,14.9] z∈[42,74]

// --- knee & thigh (knee → hip pitch, axis-to-axis 50) -----------------------
const kneeServo = pitchServoAt(Z.knee, -90); // body swung backward (calf bulge)
const thighPlateL = dark(box(3, 26, 62).translate(14, 0, 68)); // z∈[68,130]
const thighPlateR = dark(box(3, 26, 62).translate(-14, 0, 68));
const thighBack = dark(box(34, 3, 33).translate(0, -15, 90)); // z∈[90,123]

// --- hip --------------------------------------------------------------------
const hipPitchServo = pitchServoAt(Z.hipPitch, 90); // body forward y∈[-8,26] z∈[110.75,137.25]
// hip roll servo: axis Y at z=134, body flipped up + shifted backward → sits
// in the pelvis pocket (torso.forge.js cuts the matching pocket)
const hipRollServo = rollServoAt(-24, Z.hipRoll, 180); // body y∈[-34,-14] z∈[126,160]
// hip plate: abuts the roll front horn face (y=-11.5) → thigh side plates
const hipPlate = dark(box(28, 2.5, 20).translate(0, -10.25, 120)); // y∈[-11.5,-9] z∈[120,140]

const servoParts = [
  { name: "Ankle Roll Servo", shape: ankleRollServo },
  { name: "Ankle Pitch Servo", shape: anklePitchServo },
  { name: "Knee Servo", shape: kneeServo },
  { name: "Hip Pitch Servo", shape: hipPitchServo },
  { name: "Hip Roll Servo", shape: hipRollServo },
];
const printedParts = [
  { name: "Foot", shape: foot },
  { name: "Ankle Riser", shape: ankleRiser },
  { name: "Ankle Link", shape: ankleLink },
  { name: "Shank Plate L", shape: shankPlateL },
  { name: "Shank Plate R", shape: shankPlateR },
  { name: "Shank Back", shape: shankBack },
  { name: "Shin Shell", shape: shinShell },
  { name: "Thigh Plate L", shape: thighPlateL },
  { name: "Thigh Plate R", shape: thighPlateR },
  { name: "Thigh Back", shape: thighBack },
  { name: "Hip Plate", shape: hipPlate },
];

const legGroup = group(...servoParts, ...printedParts);

console.log("[leg] ankle pitch body bbox:", JSON.stringify(anklePitchServo.boundingBox()));
console.log("[leg] hip roll body bbox:", JSON.stringify(hipRollServo.boundingBox()));

return {
  group: legGroup,
  solids: () => ({
    printed: printedParts.map((p) => p.shape),
    servos: servoParts.map((p) => p.shape),
  }),
};
