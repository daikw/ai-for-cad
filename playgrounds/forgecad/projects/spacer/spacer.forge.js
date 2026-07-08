// Parametric cylindrical spacer — OD 12mm / ID 6mm / H 5mm (defaults)
// Deliverable: STEP (exact geometry). Route D (code-CAD) per fusion360 skill.

const outerDia = param("Outer Diameter", 12, { min: 4, max: 60, unit: "mm" });
const innerDia = param("Inner Diameter", 6, { min: 1, max: 50, unit: "mm" });
const height = param("Height", 5, { min: 0.5, max: 100, unit: "mm" });

// Sanity checks printed at run time (verification discipline: numbers, not looks)
const wall = (outerDia - innerDia) / 2;
console.log("wall thickness (mm):", wall.toFixed(3)); // must be > 0
console.log(
  "expected volume (mm^3):",
  ((Math.PI / 4) * (outerDia ** 2 - innerDia ** 2) * height).toFixed(3)
);

const outer = cylinder(height, outerDia / 2);
// Cutter overshoots both faces so the boolean cannot leave coplanar skins
const bore = cylinder(height + 2, innerDia / 2).translate(0, 0, -1);
const spacer = difference(outer, bore);

scene({
  background: { top: "#c3ccd7", bottom: "#566474" },
  camera: { position: [28, -34, 22], target: [0, 0, 2.5], fov: 38 },
  environment: { preset: "studio", intensity: 0.2, background: false },
  lights: [
    { type: "ambient", color: "#efe7dc", intensity: 0.15 },
    { type: "directional", position: [40, -50, 60], color: "#ffe2bf", intensity: 2.8, castShadow: true },
    { type: "directional", position: [-40, 30, 35], color: "#d4e6fb", intensity: 0.8 },
  ],
  ground: { visible: true, color: "#111118", height: 0, receiveShadow: true },
});

return [
  {
    name: "Spacer",
    shape: spacer.color("#8b97a4").material({ metalness: 0.1, roughness: 0.7 }),
  },
];
