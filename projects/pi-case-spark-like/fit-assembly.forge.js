// Fit-check assembly: DGX-Spark-like Pi4 case (body + tray, downloaded STLs)
// with a Raspberry Pi 4 Model B model (community STEP, see reference/).
//
// Backend constraint (forgecad 0.9.4): importMesh is unsupported on occt and
// importStep requires occt, so a mixed assembly cannot run on one backend.
// The Pi is therefore included as reference/rpi4b-mesh.stl, tessellated from
// reference/rpi4b.step via `forgecad export stl rpi4-bbox.forge.js --backend
// occt`. Run this assembly on the default (manifold) backend; checks.forge.js
// keeps to pairwise intersection() only, which avoids manifold's documented
// failure modes (difference-on-union-base, safeCut double-count).
//
// Placement derivation (from mesh/STEP measurement, 2026-07-17):
//   - Tray posts (⌀6, tops at z=9.5): x∈{-8.50, 40.53}, y∈{-21.50, 36.50}
//     → matches the Pi4 mounting-hole grid 49×58 exactly.
//   - Pi4 STEP frame: holes at x∈{-39.0, 19.0}, y∈{-26.53, 22.47};
//     PCB bottom z=-1.15; USB/Ethernet overhang on +X; side ports on -Y edge.
//   - Only rigid placement that fits the body interior: rotateZ(-90), then
//     translate(18.03, -2.5, 10.65). PCB bottom lands on post tops (z=9.5),
//     USB/Ethernet exits the big -Y notch of the body. Side ports (USB-C /
//     micro-HDMI / AV) end up at x≈-12 facing -X — buried inside the case.
//   - Tray and body assemble in their as-exported frames (no transform):
//     body screw bosses (-40.1, 39.6) / (-16.5, -34.0) line up with tray
//     screw holes; boss bottoms z=6.5 sit on the tray deck (z=6.5).
//
// Run: forgecad run fit-assembly.forge.js   (auto pairwise collision check)
const lift = Param.number("Explode lift", 0, { min: 0, max: 80 });

const PI_PLACE = { rz: -90, tx: 18.03, ty: -2.5, tz: 10.65 };

const tray = importMesh("./dgx-pi4-tray.stl").as("tray").color("#8a8a8a");

const pi = importMesh("./reference/rpi4b-mesh.stl")
  .rotateZ(PI_PLACE.rz)
  .translate(PI_PLACE.tx, PI_PLACE.ty, PI_PLACE.tz)
  .translate(0, 0, lift)
  .as("rpi4b")
  .color("#0e7f4e");

const body = importMesh("./dgx-pi4-body.stl")
  .translate(0, 0, 2 * lift)
  .as("body")
  .color("#c9a227");

return [tray, pi, body];
