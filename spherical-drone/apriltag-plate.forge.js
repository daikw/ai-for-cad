// AprilTag carrier: 82x82x3 plate with a 0.6 recess for a 60x60 printed
// 36h11 sticker. The bottom strip is a coplanar tongue, 3.3 thick, that
// slides down into the 3.4-wide port-module wall slot (friction fit).
// Built flat for printing; the station assembly stands it upright.

const { STATION } = require("./dims.js");
const S = STATION;

// recess is cut into the face plate BEFORE the union (manifold-safe, CHANGELOG.md)
const face = difference(
  box(S.tagPlate, S.tagPlate, S.tagPlateT).translate(0, 5, 0),
  box(S.tagRecess, S.tagRecess, 1).translate(0, 5, S.tagPlateT - 0.99)
);
// tongue protrudes BELOW the face bottom edge (y -46..-36), 3.3 thick for a
// friction fit in the 3.4 slot
const plate = union(face, box(80, 10, 3.3).translate(0, -41, 0));

const vol = plate.volume();
console.log(`apriltag-plate: ${(vol / 1000).toFixed(1)} cm3 -> PETG ${((vol / 1000) * 1.27).toFixed(1)} g`);

return { shape: plate.color("#e8e4da") };
