// AprilTag carrier: 82x82x3 plate with a 0.6 recess for a 60x60 printed
// 36h11 sticker. The bottom strip is a coplanar tongue, 3.3 thick, that
// slides down into the 3.4-wide port-module wall slot (friction fit).
// Built flat for printing; the station assembly stands it upright.

if (getActiveBackend() !== "occt") throw new Error("Run with --backend occt: manifold drops union operands in difference() — see CHANGELOG.md");

const { STATION } = require("./dims.js");
const S = STATION;

let plate = union(
  box(S.tagPlate, S.tagPlate, S.tagPlateT).translate(0, 5, 0), // face area
  box(80, 10, 3.3) // slot tongue (slot is 3.4 x 12)
);
plate = difference(plate, box(S.tagRecess, S.tagRecess, 1).translate(0, 5, S.tagPlateT - 0.99));

const vol = plate.volume();
console.log(`apriltag-plate: ${(vol / 1000).toFixed(1)} cm3 -> PETG ${((vol / 1000) * 1.27).toFixed(1)} g`);

return { shape: plate.color("#e8e4da") };
