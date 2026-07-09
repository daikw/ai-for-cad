// Render the OFFICIAL Pi Pico R3 mesh (converted from STEP via OCCT once),
// placed in our case-centered coord frame.
const pico = importMesh("./reference/pico-r3.stl")
  .rotateX(90)
  .rotateZ(90)
  .translate(25.5, -10.5, 2.1)
  .color("#0e7f4e");
return [pico];
