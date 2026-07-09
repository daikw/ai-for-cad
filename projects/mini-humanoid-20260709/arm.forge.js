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

// shoulder pitch: axis X, body inside torso cavity (x∈[12.8,32.8] for left,
// z∈[196,230] — clears the flat-stacked electronics below z=195)
const shoulderPitchServo = servoShape.translate(s * D.arm.pitchServoX, 0, Z.shoulderPitch);
// bracket plate on the outer horn face, passing through the shoulder hole
const shoulderBracket = dark(box(3, 28, 28).translate(s * D.arm.bracketX, 0, 208)); // x∈[35.3,38.3] z∈[208,236]
// shoulder roll: axis Y, body welded flush to the bracket outer face
const shoulderRollServo = servoShape.rotateZ(90).translate(s * cX, 0, Z.shoulderRoll); // body z∈[184,218]
// upper arm side plates on the roll horns (y=±12.5 faces)
const upperPlateF = white(box(22, 3, 38).translate(s * cX, 14, 180)); // y∈[12.5,15.5] z∈[180,218]
const upperPlateB = white(box(22, 3, 38).translate(s * cX, -14, 180));
// elbow-top plate: ties the upper plates together and welds onto the elbow body
const elbowTopPlate = dark(box(22, 31, 3).translate(s * cX, 0, 181)); // z∈[181,184]
// elbow: axis Y, body hangs down
const elbowServo = servoShape.rotateZ(90).translate(s * cX, 0, Z.elbow); // body z∈[148,182]
// forearm plates on the elbow horns, kept above z=135 to clear the thigh plates
const forearmPlateF = white(box(22, 3, 39).translate(s * cX, 14, 135)); // z∈[135,174]
const forearmPlateB = white(box(22, 3, 39).translate(s * cX, -14, 135));
const wristPlate = dark(box(18, 31, 3).translate(s * cX, 0, 132.5)); // z∈[132.5,135.5]
// open C-claw (fixed, non-actuated), opening forward (+Y)
const clawTube = difference(
  cylinder(20, 9),
  cylinder(24, 6.5).translate(0, 0, -2),
  box(9, 12, 24).translate(0, 6, -2)
);
const claw = clawTube
  .translate(s * cX, 0, 115) // z∈[115,135], fingertip at z=115
  .color(D.colors.claw)
  .material({ metalness: 0.05, roughness: 0.6 });

const servoParts = [
  { name: "Shoulder Pitch Servo", shape: shoulderPitchServo },
  { name: "Shoulder Roll Servo", shape: shoulderRollServo },
  { name: "Elbow Servo", shape: elbowServo },
];
const printedParts = [
  { name: "Shoulder Bracket", shape: shoulderBracket },
  { name: "Upper Plate F", shape: upperPlateF },
  { name: "Upper Plate B", shape: upperPlateB },
  { name: "Elbow Top Plate", shape: elbowTopPlate },
  { name: "Forearm Plate F", shape: forearmPlateF },
  { name: "Forearm Plate B", shape: forearmPlateB },
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
