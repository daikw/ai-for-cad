// Dynamixel XL330-M288-T placeholder. Local frame: output axis = X axis
// through the origin, body hangs 26mm below / 8mm above the axis, horn discs
// on both ±X faces (symmetric idler simplification — see dims.js).
const D = require("./dims.js");
const S = D.servo;

const body = box(S.w, S.d, S.h).translate(0, 0, -S.axisFromBottom); // z ∈ [-26, 8]
const hornPos = cylinder(S.hornT, S.hornR).pointAlong([1, 0, 0]).translate(S.w / 2, 0, 0);
const hornNeg = cylinder(S.hornT, S.hornR).pointAlong([-1, 0, 0]).translate(-S.w / 2, 0, 0);

const servoShape = union(body, hornPos, hornNeg)
  .color(D.colors.servoDark)
  .material({ metalness: 0.1, roughness: 0.55 });

return { shape: servoShape, dims: S };
