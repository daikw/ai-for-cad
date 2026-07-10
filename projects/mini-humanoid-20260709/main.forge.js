// mini-humanoid — 300mm / 17-DoF hobby humanoid (XL330-M288-T x17).
// Assembly entry point. Design docs: hld.md / lld.md. Checks: checks.forge.js.
const D = require("./dims.js");

const legMod = require("./leg.forge.js");
const armLMod = require("./arm.forge.js", { Side: "left" });
const armRMod = require("./arm.forge.js", { Side: "right" });
const torsoMod = require("./torso.forge.js");
const headMod = require("./head.forge.js");

scene({
  background: { top: "#c3ccd7", bottom: "#566474" },
  camera: { position: [340, 420, 260], target: [0, 0, 140], fov: 38 },
  environment: { preset: "studio", intensity: 0.2, background: false },
  lights: [
    { type: "ambient", color: "#efe7dc", intensity: 0.16 },
    { type: "directional", position: [260, 320, 420], target: [0, 0, 140], color: "#ffe2bf", intensity: 2.8, castShadow: true },
    { type: "directional", position: [-260, -210, 220], target: [0, 0, 140], color: "#d4e6fb", intensity: 0.85 },
    { type: "hemisphere", skyColor: "#c7d3df", groundColor: "#495463", intensity: 0.15 },
  ],
  ground: { visible: true, color: "#8b97a4", height: 0, receiveShadow: true },
  postProcessing: {
    bloom: { intensity: 0.05, threshold: 0.94, radius: 0.28 },
    vignette: { darkness: 0.4, offset: 0.32 },
    toneMappingExposure: 1.1,
  },
  views: {
    hero: { camera: { position: [340, 420, 260], target: [0, 0, 140], up: [0, 0, 1], fov: 38 } },
    front: { camera: { position: [0, 560, 150], target: [0, 0, 150], up: [0, 0, 1], fov: 32 } },
    side: { camera: { position: [560, 0, 150], target: [0, 0, 150], up: [0, 0, 1], fov: 32 } },
    back: { camera: { position: [-340, -420, 260], target: [0, 0, 140], up: [0, 0, 1], fov: 38 } },
    // ref-1-ortho-front-side.png match: telephoto front, low fov flattens
    // perspective toward the reference's near-orthographic front elevation.
    refFront: { camera: { position: [0, 820, 150], target: [0, 0, 150], up: [0, 0, 1], fov: 26 } },
    // ref-3-appearance.png match: front-right 3/4, slightly overhead —
    // biased more toward front (smaller X, larger Y) than `hero` and a touch
    // closer, while still keeping the full body inside frame with margin.
    refHero: { camera: { position: [170, 520, 250], target: [0, 0, 150], up: [0, 0, 1], fov: 34 } },
  },
});

return [
  { name: "Leg L", group: legMod.group.translate(D.hipX, 0, 0) },
  { name: "Leg R", group: legMod.group.translate(-D.hipX, 0, 0) },
  { name: "Arm L", group: armLMod.group },
  { name: "Arm R", group: armRMod.group },
  { name: "Torso", group: torsoMod.group },
  { name: "Head", group: headMod.group },
];
