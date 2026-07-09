// Handy FDM Mini — assembly scene (lld.md §5). Places the six printed parts
// (bright) against translucent frame/rail/motor/bed ghosts for context. This is
// a visual aid; correctness lives in checks.forge.js (occt, ALL PASS). No
// booleans across parts — the scene is a list of {name, shape}.

const { EXT, FRAME, AXIS, COMP, RAIL, REQ } = require("./dims.js");

const showGhosts = Param.bool("Show frame ghosts", true);

const W = EXT.w;
const gz = 150;
const gzc = gz + W / 2; // gantry centerline z
const gantryXc = FRAME.columnX + FRAME.gantryLen / 2;
const parts = [];
const add = (name, shape) => parts.push({ name, shape });
const ghost = (name, shape, color, op = 0.28) =>
  showGhosts && add(name, shape.color(color).material({ opacity: op }));

// ── printed parts (bright, this repo's deliverables) ────────────────────────
const zbase = require("./z-base-bracket.forge.js").shape;
const zcar = require("./z-carriage.forge.js").shape;
const head = require("./head-carriage.forge.js").shape;
const bed = require("./bed-carriage.forge.js").shape;
const corner = require("./corner-bracket.forge.js").shape;
const cable = require("./cable-guide.forge.js").shape;

add("z-base-bracket", zbase.translate(FRAME.columnX, 0, FRAME.baseZTop));
add("z-carriage", zcar.translate(-70, 0, gzc));
add("head-carriage", head.translate(0, -W / 2 - 6, gzc));
add("bed-carriage", bed.translate(0, 0, FRAME.baseZTop + COMP.railH));
[0, 90, 180, 270].forEach((deg) =>
  add(`corner-bracket-${deg}`, corner.rotateZ(deg).translate(
    (deg === 0 || deg === 270 ? 1 : -1) * (FRAME.baseOuter / 2 - 34),
    (deg < 180 ? -1 : 1) * (FRAME.baseOuter / 2 - 10), 0)));
add("cable-guide-bed", cable.translate(38, 20, FRAME.baseZTop + COMP.railH + 11));
add("cable-guide-head", cable.rotateX(180).translate(18, -30, gzc + 20));

// ── frame / rail / motor / bed ghosts (context) ─────────────────────────────
const railC = "#495057";
ghost("Base/front-rail", box(FRAME.railXLen, W, W).translate(0, -(FRAME.baseOuter / 2 - W / 2), 0), railC, 0.5);
ghost("Base/rear-rail", box(FRAME.railXLen, W, W).translate(0, FRAME.baseOuter / 2 - W / 2, 0), railC, 0.5);
ghost("Base/left-rail", box(W, FRAME.railYLen, W).translate(-(FRAME.baseOuter / 2 - W / 2), 0, 0), railC, 0.5);
ghost("Base/right-rail", box(W, FRAME.railYLen, W).translate(FRAME.baseOuter / 2 - W / 2, 0, 0), railC, 0.5);
ghost("Base/center-support", box(W, FRAME.railYLen, W).translate(0, 0, 0), railC, 0.5);
ghost("Z-column", box(W, W, FRAME.columnLen).translate(FRAME.columnX, 0, FRAME.baseZTop), "#343a40", 0.5);
ghost("X-gantry", box(FRAME.gantryLen, W, W).translate(gantryXc, 0, gz), "#5c7cfa", 0.4);
ghost("Y-rail", box(9, RAIL.yLen, COMP.railH).translate(0, 0, FRAME.baseZTop), "#adb5bd", 0.5);
ghost("X-rail", box(RAIL.xLen, 9, COMP.railH).translate(gantryXc, -W / 2 - 4.5, gz - COMP.railH), "#adb5bd", 0.5);
ghost("Z-rail", box(9, COMP.railH, RAIL.zLen).translate(FRAME.columnX + W / 2, 0, FRAME.baseZTop), "#adb5bd", 0.5);
ghost("Bed-plate", box(AXIS.bedPlate, AXIS.bedPlate, AXIS.bedPlateT).translate(0, 0, AXIS.bedTopZ - AXIS.bedPlateT), "#2b8a3e", 0.3);
const m = COMP.nema17;
ghost("Motor/Y", box(m.w, m.h, 24).translate(0, FRAME.baseOuter / 2 - m.h / 2 + 8, 2), "#d9480f", 0.35);
ghost("Motor/Z", box(m.w, m.h, m.len).translate(-110 + m.w / 2, 0, FRAME.baseZTop + FRAME.columnLen - m.len), "#d9480f", 0.35);
ghost("Motor/X", box(COMP.nema14.w, COMP.nema14.h, COMP.nema14.len).translate(FRAME.columnX + 2, 0, gz + W), "#d9480f", 0.35);

scene({
  background: { top: "#c3ccd7", bottom: "#566474" },
  camera: { position: [420, -520, 360], target: [0, 0, 120], fov: 40 },
  environment: { preset: "studio", intensity: 0.2, background: false },
  lights: [
    { type: "ambient", color: "#efe7dc", intensity: 0.18 },
    { type: "directional", position: [320, -380, 520], color: "#ffe2bf", intensity: 2.6, castShadow: true },
    { type: "directional", position: [-300, 250, 280], color: "#d4e6fb", intensity: 0.8 },
  ],
  ground: { visible: true, color: "#3a4350", height: -1, receiveShadow: true },
});

return parts;
