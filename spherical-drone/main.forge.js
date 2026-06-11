// Full system scene: dock station with one drone seated in port A.
// The geodesic cage build is expensive (~5 min); default uses a lightweight
// sphere ghost. Flip "Full drone model" on for the real geometry.

if (getActiveBackend() !== "occt") throw new Error("Run with --backend occt: manifold drops union operands in difference() — see CHANGELOG.md");

const { DRONE, STATION } = require("./dims.js");
const S = STATION;

const fullDrone = Param.bool("Full drone model", false);

const stationParts = require("./station.forge.js", { "Show ghosts": fullDrone ? 0 : 1 });

const parts = [...stationParts];

if (fullDrone) {
  const droneParts = require("./drone.forge.js", { "Show component ghosts": 1 });
  const seatZ = S.portH + S.seatCenterAboveRim; // sphere center over port A
  const portX = S.coreW / 2 + S.portW / 2;
  for (const p of droneParts) {
    parts.push({ name: `Drone/${p.name}`, shape: p.shape.translate(portX, 0, seatZ) });
  }
}

scene({
  background: { top: "#c3ccd7", bottom: "#566474" },
  camera: { position: [520, -620, 380], target: [60, 0, 80], fov: 38 },
  environment: { preset: "studio", intensity: 0.2, background: false },
  lights: [
    { type: "ambient", color: "#efe7dc", intensity: 0.16 },
    { type: "directional", position: [320, -380, 520], color: "#ffe2bf", intensity: 2.8, castShadow: true },
    { type: "directional", position: [-300, 250, 280], color: "#d4e6fb", intensity: 0.8 },
  ],
  ground: { visible: true, color: "#3a4350", height: -1, receiveShadow: true },
  postProcessing: { vignette: { darkness: 0.4, offset: 0.32 }, toneMappingExposure: 1.1 },
});

return parts;
