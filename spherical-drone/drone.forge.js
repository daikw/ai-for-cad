// Spherical drone assembly: deck + cage halves + battery tray, with ghost
// stand-ins for every purchased component (Pico W, ESC, motors, props,
// battery, camera, contact disc) so collision/fit inspection is meaningful.
// All parts share the sphere-center origin — they are designed in place.

const { DRONE } = require("./dims.js");
const D = DRONE;

const showGhosts = Param.bool("Show component ghosts", true);

const deck = require("./center-deck.forge.js");
const cageTop = require("./cage.forge.js", { Half: "top" });
const cageBottom = require("./cage.forge.js", { Half: "bottom" });
const tray = require("./battery-tray.forge.js");

const parts = [
  { name: "CenterDeck", shape: deck.shape },
  { name: "CageTop", shape: cageTop.shape },
  { name: "CageBottom", shape: cageBottom.shape },
  { name: "BatteryTray", shape: tray.shape },
];

if (showGhosts) {
  const ghost = (s, c, o) => s.color(c).material({ opacity: o == null ? 0.45 : o });

  // Pico W on its bosses (board bottom at z=4)
  const pico = union(
    box(51, 21, 1).translate(0, 0, 4),
    box(32, 16, 2.2).translate(-3, 0, 5) // component envelope
  );
  parts.push({ name: "PicoW Ghost", shape: ghost(pico, "#0e7f4e") });

  // 4-in-1 ESC: board hangs under the boss bottoms (z -6.7..-5.5), components
  // point up into the 4mm air gap between the bosses (clear of their Ø4.5)
  parts.push({ name: "ESC Ghost", shape: ghost(union(
    box(30, 30, 1.2).translate(0, 0, -6.7),
    box(20, 20, 4).translate(0, 0, -5.5)
  ), "#22262b") });

  // battery in the tray
  parts.push({ name: "Battery Ghost", shape: ghost(box(D.batL, D.batW, D.batH).translate(0, 0, D.trayTopZ - D.batH), "#8a8f3c") });

  // motors + prop discs (the swept annulus that must clear the cage)
  for (const ang of D.armAngles) {
    const rad = (ang * Math.PI) / 180;
    const cx = D.motorPitchR * Math.cos(rad);
    const cy = D.motorPitchR * Math.sin(rad);
    parts.push({ name: `Motor${ang} Ghost`, shape: ghost(cylinder(12, 7).translate(cx, cy, D.plateTopZ), "#7d848c") });
    parts.push({ name: `Prop${ang} Ghost`, shape: ghost(cylinder(2.5, D.propD / 2).translate(cx, cy, D.propZ - 1.25), "#cc4444", 0.3) });
  }

  // contact disc under the foot (FR4 + copper rings)
  const disc = cylinder(D.pcbT, D.footD / 2, D.footD / 2, 64).translate(0, 0, -77 - D.pcbT);
  parts.push({ name: "ContactDisc Ghost", shape: ghost(disc, "#b87333", 0.7) });

  // camera board + lens, fully below the prop plane
  const cam = union(
    box(2.5, 26, 25).translate(D.plateL / 2 + D.camTabT + 1.25, 0, -14.5),
    cylinder(6, 5).pointAlong([1, 0, 0]).translate(D.plateL / 2 + D.camTabT + 2.5, 0, -2)
  );
  parts.push({ name: "Camera Ghost", shape: ghost(cam, "#1c3f5e") });
}

console.log("drone AUW check: printed parts volumes logged by each part file");

scene({
  background: { top: "#c3ccd7", bottom: "#566474" },
  camera: { position: [260, -300, 170], target: [0, 0, 0], fov: 38 },
  environment: { preset: "studio", intensity: 0.2, background: false },
  lights: [
    { type: "ambient", color: "#efe7dc", intensity: 0.16 },
    { type: "directional", position: [260, -320, 420], color: "#ffe2bf", intensity: 2.8, castShadow: true },
    { type: "directional", position: [-260, 210, 220], color: "#d4e6fb", intensity: 0.8 },
    { type: "hemisphere", skyColor: "#c7d3df", groundColor: "#495463", intensity: 0.15 },
  ],
  ground: { visible: true, color: "#3a4350", height: -82, receiveShadow: true },
  postProcessing: { vignette: { darkness: 0.4, offset: 0.32 }, toneMappingExposure: 1.1 },
  views: {
    hero: { camera: { position: [260, -300, 170], target: [0, 0, 0], up: [0, 0, 1], fov: 38 } },
    front: { camera: { position: [320, 0, 10], target: [0, 0, 0], up: [0, 0, 1], fov: 35 } },
    bottom: { camera: { position: [120, -160, -240], target: [0, 0, -30], up: [0, 0, 1], fov: 40 } },
  },
});

return parts;
