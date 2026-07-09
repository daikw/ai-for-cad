// Print bbox of each transformed Pi Pico mesh
const transform = (s) => s.rotateX(90).rotateZ(90).translate(25.5, -10.5, 2.1);
const pcb = transform(importMesh("./reference/pi-pico-pcb.stl"));
return [pcb];
