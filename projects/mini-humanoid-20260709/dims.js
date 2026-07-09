// mini-humanoid shared dimensions. lld.md is the source of truth; this file
// is the single numeric authority consumed by all .forge.js files and checks.
// Plain CommonJS helper — no forge globals here.

// XL330-M288-T placeholder (datasheet-derived, UNMEASURED — waived in checks).
// Local frame of servo-xl330.forge.js: output axis = X through the origin,
// body top 8mm above axis, horn discs on both ±X faces (real unit has a
// single-sided horn + idler; symmetric twin discs are a blockout simplification).
const servo = {
  w: 20,
  d: 26.5,
  h: 34,
  axisFromTop: 8,
  hornR: 8,
  hornT: 2.5,
  massG: 18,
};
servo.axisFromBottom = servo.h - servo.axisFromTop; // 26

// Vertical joint stack (mm, Z-up, ground = 0). Sums to headTop = 300.
const z = {
  footTop: 4,
  ankleRoll: 14,
  anklePitch: 24,
  knee: 74, // shank axis-to-axis 50
  hipPitch: 124, // thigh axis-to-axis 50
  hipRoll: 134,
  pelvisBottom: 142,
  pelvisTop: 166,
  torsoBottom: 166,
  torsoTop: 252,
  shoulderPitch: 222, // raised +4 from LLD draft to clear the flat-stacked electronics
  shoulderRoll: 210,
  elbow: 174,
  neckServo: 240,
  headCenter: 276,
  headTop: 300,
};

const hipX = 26; // hip/leg centerline offset from robot center
const foot = { w: 45, len: 65, t: 4, yCenter: 7.5 }; // toe +40 / heel -25
const pelvis = { w: 70, d: 40, h: 24 };
const torso = { w: 72, d: 46, h: 86, wall: 3 }; // cavity 66 x 40 x 80
const arm = {
  pitchServoX: 22.8, // shoulder pitch servo body center (inside torso cavity)
  bracketX: 36.8, // shoulder bracket plate center → plate x ∈ [35.3, 38.3]
  centerX: 51.55, // arm centerline = bracket outer face 38.3 + servo d/2
};
const head = {
  rx: 36,
  ry: 33,
  rz: 24,
  innerRx: 33,
  innerRy: 30,
  innerRz: 21,
  neckR: 11,
};

// Electronics placeholders (datasheet-derived, UNMEASURED — waived in checks)
const board = { w: 47, t: 10, h: 39, massG: 20 }; // OpenRB-150, upright at torso back
const battery = { w: 50, t: 15, h: 30, massG: 45 }; // 2S LiPo 800mAh, torso front

const mass = {
  totalMaxG: 800,
  printedDensityGcm3: 0.8, // PETG @ ~30% infill effective density
  wiringFastenersG: 50, // unmodeled fixed adder
};

const colors = {
  shellWhite: "#e6e2da",
  servoDark: "#23262b",
  graphite: "#4b5158",
  faceBlack: "#17181a",
  pcbGreen: "#276b47",
  lipoBlue: "#2b4c7e",
  claw: "#3a3f46",
};

module.exports = { servo, z, hipX, foot, pelvis, torso, arm, head, board, battery, mass, colors };

if (require.main === module) {
  console.log("=== mini-humanoid dims ===");
  console.log("servo body:", servo.w, "x", servo.d, "x", servo.h, "axis@top-", servo.axisFromTop);
  console.log("shank axis-to-axis:", z.knee - z.anklePitch, "(want 50)");
  console.log("thigh axis-to-axis:", z.hipPitch - z.knee, "(want 50)");
  console.log("total height:", z.headTop, "(want 300)");
  console.log("foot inner gap:", 2 * (hipX - foot.w / 2), "(want >= 5)");
  console.log("arm centerline:", arm.centerX, "= bracket outer 38.3 + d/2", 38.3 + servo.d / 2);
  const segOk = z.knee - z.anklePitch === 50 && z.hipPitch - z.knee === 50 && z.headTop === 300;
  console.log(segOk ? "OK: stack consistent" : "NG: stack broken");
}
