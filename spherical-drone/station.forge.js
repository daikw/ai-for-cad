// Dock station assembly: [port A][Jetson core][port B] bolted in a line,
// pogo bases seated in the pedestals, AprilTag plates in their slots, plus
// ghosts (Jetson dev kit, pogo pins, seated drone sphere) for fit checks.
// World coords: core box center at origin XY, floor z=0, +X toward port A.

if (getActiveBackend() !== "occt") throw new Error("Run with --backend occt: manifold drops union operands in difference() — see CHANGELOG.md");

const { DRONE, STATION } = require("./dims.js");
const S = STATION;

const showGhosts = Param.bool("Show ghosts", true);

const portA = require("./port-module.forge.js");
const portB = require("./port-module.forge.js");
const core = require("./core-module.forge.js");
const pogo = require("./pogo-base.forge.js");
const tag = require("./apriltag-plate.forge.js");

const portOffset = S.coreW / 2 + S.portW / 2; // 175

const parts = [
  { name: "PortA", shape: portA.shape.translate(portOffset, 0, 0) },
  { name: "PortB", shape: portB.shape.rotateZ(180).translate(-portOffset, 0, 0) },
  { name: "CoreBody", shape: core.body },
  { name: "CoreLid", shape: core.lid },
];

// pogo bases seated in the pedestal pockets (pocket floor z=27)
for (const sx of [1, -1]) {
  parts.push({ name: `PogoBase${sx > 0 ? "A" : "B"}`, shape: pogo.shape.translate(sx * portOffset, 0, 27) });
}

// AprilTag plates standing in the ±Y wall slots of each port
// (built flat, tongue toward -Y of its local frame; stand up against the wall
//  inner boss face so the tag faces into the funnel area... display outward)
for (const sx of [1, -1])
  for (const sy of [1, -1]) {
    const up = tag.shape.rotateX(-90 * sy); // tongue down
    const yWall = sy * (S.portL / 2 - S.wallT) - sy * 3;
    parts.push({
      name: `Tag${sx > 0 ? "A" : "B"}${sy > 0 ? "N" : "S"}`,
      shape: up.translate(sx * portOffset, yWall, S.portH - 10 + 46),
    });
  }

if (showGhosts) {
  const ghost = (s, c, o) => s.color(c).material({ opacity: o == null ? 0.4 : o });

  // Jetson dev kit on its standoffs
  parts.push({
    name: "Jetson Ghost",
    shape: ghost(box(S.jetsonW, S.jetsonL, S.jetsonH).translate(0, 0, S.floorT + 6), "#2f6e3f"),
  });

  // pogo pins at free length (tips z = 95 - 57.9 = 37.1)
  for (const sx of [1, -1])
    for (const { x, y } of [{ x: 0, y: 0 }, ...circularLayout(3, S.pinCircleR, { startDeg: 90 })]) {
      parts.push({
        name: `Pin Ghost`,
        shape: ghost(cylinder(S.pinFreeLen + 2.1, S.pinBodyD / 2).translate(sx * portOffset + x, y, 27), "#c9a23a", 0.8),
      });
    }

  // seated drone: sphere shell + landing foot + contact disc at the resting pose
  const cz = S.portH + S.seatCenterAboveRim; // sphere center z = 113.1
  const droneGhost = union(
    difference(sphere(80, 48), sphere(78, 48)),
    cylinder(3, 18).translate(0, 0, -77), // foot
    cylinder(DRONE.pcbT, 18).translate(0, 0, -78.6) // contact disc
  ).translate(portOffset, 0, cz);
  parts.push({ name: "SeatedDrone Ghost", shape: ghost(droneGhost, "#7a8a99", 0.25) });
}

console.log(`station: overall ${S.coreW + 2 * S.portW} x ${S.portL} x ${S.portH} mm, ports at ±${portOffset}`);

scene({
  background: { top: "#c3ccd7", bottom: "#566474" },
  camera: { position: [420, -560, 330], target: [0, 0, 60], fov: 38 },
  environment: { preset: "studio", intensity: 0.2, background: false },
  lights: [
    { type: "ambient", color: "#efe7dc", intensity: 0.16 },
    { type: "directional", position: [300, -360, 480], color: "#ffe2bf", intensity: 2.8, castShadow: true },
    { type: "directional", position: [-280, 230, 260], color: "#d4e6fb", intensity: 0.8 },
  ],
  ground: { visible: true, color: "#3a4350", height: -1, receiveShadow: true },
  postProcessing: { vignette: { darkness: 0.4, offset: 0.32 }, toneMappingExposure: 1.1 },
  views: {
    hero: { camera: { position: [420, -560, 330], target: [0, 0, 60], up: [0, 0, 1], fov: 38 } },
    section: { camera: { position: [0, -650, 140], target: [0, 0, 55], up: [0, 0, 1], fov: 34 } },
    port: { camera: { position: [330, -180, 260], target: [175, 0, 40], up: [0, 0, 1], fov: 36 } },
  },
});

return parts;
