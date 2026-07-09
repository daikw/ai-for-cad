// Head: neck yaw servo (body inside torso, through the torso-top neck hole),
// neck cylinder, hollow ellipsoid skull with face-panel pocket, panel + eyes.
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

// skull: ellipsoid (36/33/24) hollowed by an inner ellipsoid (33/30/21),
// with a face-panel pocket and a neck passage — all cuts on the one primitive
const outerSkull = sphere(H.rz).scale([H.rx / H.rz, H.ry / H.rz, 1]).translate(0, 0, Z.headCenter);
const innerSkull = sphere(H.innerRz)
  .scale([H.innerRx / H.innerRz, H.innerRy / H.innerRz, 1])
  .translate(0, 0, Z.headCenter);
const faceCut = box(44, 10, 26).translate(0, 29, 263); // y∈[24,34] z∈[263,289]
const neckPassage = cylinder(16, H.neckR + 1).translate(0, 0, 248); // z∈[248,264]
const skull = difference(outerSkull, innerSkull, faceCut, neckPassage)
  .color(D.colors.shellWhite)
  .material({ metalness: 0.02, roughness: 0.55 });

// face visor conforms to a slightly-recessed ellipsoid so it never pokes
// outside the skull; two round "eyes" double as the dummy camera windows
// (HLD decision 5)
const visorEllipsoid = sphere(23).scale([35 / 23, 32 / 23, 1]).translate(0, 0, Z.headCenter);
const facePanel = intersection(box(44, 9.95, 26).translate(0, 29.025, 263), visorEllipsoid)
  .color(D.colors.faceBlack)
  .material({ metalness: 0.2, roughness: 0.25 });
const eyeL = cylinder(1.2, 2.6)
  .pointAlong([0, 1, 0])
  .translate(8, 30.7, 279)
  .color("#f2f5f7")
  .material({ emissive: "#dfe8ee", emissiveIntensity: 1.2 });
const eyeR = eyeL.translate(-16, 0, 0);

const headGroup = group(
  { name: "Neck Servo", shape: neckServo },
  { name: "Neck", shape: neckCyl },
  { name: "Skull", shape: skull },
  { name: "Face Panel", shape: facePanel },
  { name: "Eye L", shape: eyeL },
  { name: "Eye R", shape: eyeR }
);

return {
  group: headGroup,
  solids: () => ({
    printed: [skull, facePanel, neckCyl, eyeL, eyeR],
    servos: [neckServo],
  }),
};
