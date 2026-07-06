// Collision check using the OFFICIAL Pi Pico R3 geometry.
//
// Pipeline (already done once):
//   reference/Pico-R3.step (official, corner-origin frame)
//     -> pico-step-only.forge.js applied rotateX(90).rotateZ(90).translate(25.5,-10.5,2.1)
//     -> `forgecad export stl` baked the transform into vertex coords
//   reference/pico-r3.stl  (already in our case-centered frame)
//     -> trimesh split + per-component merge
//   reference/pi-pico-pcb.stl + reference/pico-parts/part-00..15.stl
//
// All meshes are therefore already positioned correctly; we just importMesh them.

const main = require("./pi-pico-case.forge.js", {
  "Lift lid above case for visualization": 0,
});
const [caseBody, lid] = main;

const pcb = importMesh("./reference/pi-pico-pcb.stl")
  .color("#0e7f4e").as("pcb");

const parts = [];
for (let i = 0; i < 16; i++) {
  const num = String(i).padStart(2, "0");
  parts.push(
    importMesh(`./reference/pico-parts/part-${num}.stl`)
      .color("#1c1c1c").as(`comp_${num}`)
  );
}

return [caseBody, lid, pcb, ...parts];
