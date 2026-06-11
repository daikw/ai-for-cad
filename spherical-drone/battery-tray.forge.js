// Battery tray: open-top cradle for a 1S 450-650mAh LiPo (60x30x7 envelope),
// hangs under the deck cross-bar on 4 snap prongs that hook over the bar's
// ±Y edges. Squeeze the two prongs on one side outward to release. lld.md §4.4.
// Coordinates: sphere center = origin (deck frame); battery top at z = -8.

const { DRONE } = require("./dims.js");
const D = DRONE;

const innerL = D.batL + 2 * (D.fitClear + 0.25); // 61
const innerW = D.batW + 2 * (D.fitClear + 0.25); // 31
const innerH = D.batH + 1.5; // foam / strap room
const outerL = innerL + 2 * D.trayWall;
const outerW = innerW + 2 * D.trayWall;
const cavityBottom = D.trayTopZ - innerH; // -16.5
const trayBottom = cavityBottom - D.trayFloor;
const wallTop = D.trayTopZ + 1.5; // lip above battery top

let tray = difference(
  box(outerL, outerW, wallTop - trayBottom).translate(0, 0, trayBottom),
  box(innerL, innerW, wallTop - cavityBottom + 1).translate(0, 0, cavityBottom)
);

// velcro-strap slots through the floor
tray = difference(
  tray,
  box(12, 2, D.trayFloor + 2).translate(0, 10, trayBottom - 1),
  box(12, 2, D.trayFloor + 2).translate(0, -10, trayBottom - 1)
);

// snap prongs: blades rise beside the deck cross-bar (half-width 15.5),
// hooks reach inward over the plate top (z 2.0) by ~1.05mm
const prongs = [];
const bladeYIn = D.crossW / 2 + 0.15; // 15.65 — 0.15 running clearance
const bladeT = 1.5;
const hookTop = D.plateTopZ + 1.5;
for (const sx of [1, -1])
  for (const sy of [1, -1]) {
    const blade = box(6, bladeT, D.plateTopZ - wallTop).translate(sx * 8, sy * (bladeYIn + bladeT / 2), wallTop);
    const hook = box(6, 2.7, 1.5).translate(sx * 8, sy * (bladeYIn + bladeT - 2.7 / 2), D.plateTopZ);
    prongs.push(blade, hook);
  }
tray = union(tray, ...prongs);

const vol = tray.volume();
console.log(`battery-tray: volume ${(vol / 1000).toFixed(1)} cm3 -> PETG ${((vol / 1000) * 1.27).toFixed(1)} g`);
console.log(`  cavity ${innerL}x${innerW}x${innerH}, tray z [${trayBottom.toFixed(1)}, ${wallTop.toFixed(1)}]`);

return { shape: tray.color("#5b6470") };
