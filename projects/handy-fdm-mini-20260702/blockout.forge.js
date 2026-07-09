// Handy FDM Mini — frame layout blockout. hld.md Decision #5:
// "ブロックアウトモデルを作って寸法・質量を検証してから確定".
//
// Spatial-planning artifact, not print geometry. It answers the two open
// layout risks:
//   Concern 5 — does the bedslinger Y-sweep fit the 200 mm base / 220 envelope?
//   Concern 4 — does the mass land inside the one-hand-carry budget?
// Red = motion/keep-out envelopes, cyan = body envelope, green = build volume.
//
// Convention (matches spherical-drone): box()/cylinder() are centered in X/Y,
// and their base face sits at the translate Z (they grow +Z). Every Z below is
// therefore a bottom-face height. Numbers come from dims.js; checks.forge.js
// proves the clearances numerically.

const { EXT, FRAME, AXIS, COMP, RAIL, REQ } = require("./dims.js");

const showEnvelopes = Param.bool("Show envelopes (build/sweep/body)", true);
const showGhosts = Param.bool("Show component ghosts", true);

const EW = FRAME.baseOuter; // 200
const W = EXT.w; // 20
const gz = 150; // representative X-gantry bottom-face height (mid lift)
const parts = [];
const add = (name, shape) => parts.push({ name, shape });

// ── frame: 2020 base square + center support (z [0, 20]) ────────────────────
const railColor = "#495057";
add("Base/front-rail", box(FRAME.railXLen, W, W).translate(0, -(EW / 2 - W / 2), 0).color(railColor));
add("Base/rear-rail", box(FRAME.railXLen, W, W).translate(0, EW / 2 - W / 2, 0).color(railColor));
add("Base/left-rail", box(W, FRAME.railYLen, W).translate(-(EW / 2 - W / 2), 0, 0).color(railColor));
add("Base/right-rail", box(W, FRAME.railYLen, W).translate(EW / 2 - W / 2, 0, 0).color(railColor));
add("Base/center-support", box(W, FRAME.railYLen, W).translate(0, 0, 0).color("#3b4148"));

// ── Z column (left, vertical, z [20, 260]) ──────────────────────────────────
add("Z-column", box(W, W, FRAME.columnLen).translate(FRAME.columnX, 0, FRAME.baseZTop).color("#343a40"));

// ── X gantry cantilever (shown at mid-Z, beam z [150, 170]) ─────────────────
const gantryXc = FRAME.columnX + FRAME.gantryLen / 2; // +5
const railY = FRAME.gantryY - W / 2 - 4.5; // gantry front face
add("X-gantry", box(FRAME.gantryLen, W, W).translate(gantryXc, FRAME.gantryY, gz).color("#5c7cfa"));
add("Z-carriage-ghost", box(24, 22, 40).translate(FRAME.columnX + W / 2 + 12, 0, gz - 10).color("#748ffc"));

// ── linear rails ────────────────────────────────────────────────────────────
const railGray = "#adb5bd";
add("X-rail", box(RAIL.xLen, 9, COMP.railH).translate(gantryXc, railY, gz - COMP.railH).color(railGray));
add("Y-rail", box(9, RAIL.yLen, COMP.railH).translate(0, 0, FRAME.baseZTop).color(railGray));
add("Z-rail", box(9, COMP.railH, RAIL.zLen).translate(FRAME.columnX + W / 2, 0, FRAME.baseZTop).color(railGray));

// ── bed + carriage at home (mid Y); plate top = bedTopZ (41) ─────────────────
add("Bed-plate", box(AXIS.bedPlate, AXIS.bedPlate, AXIS.bedPlateT).translate(0, 0, AXIS.bedTopZ - AXIS.bedPlateT).color("#2b8a3e"));
add("Bed-carriage-ghost", box(70, 50, AXIS.bedTopZ - AXIS.bedPlateT - (FRAME.baseZTop + COMP.railH)).translate(0, 0, FRAME.baseZTop + COMP.railH).color("#37b24d"));

// ── print head cluster at home (x=0), hanging below the gantry ──────────────
if (showGhosts) {
  const headX = 0;
  add("Head/carriage-ghost", box(COMP.mgn9CarL, 8, COMP.mgn9CarW).translate(headX, railY - 4, gz - 20).color("#e8590c"));
  add("Head/extruder-ghost", box(COMP.extruder.w, COMP.extruder.len, COMP.extruder.h).translate(headX, railY - 4 - COMP.extruder.len / 2, gz - COMP.extruder.h - 10).color("#f76707"));
  add("Head/hotend-ghost", cylinder(COMP.hotend.len, COMP.hotend.d / 2).translate(headX, railY - 10, gz - COMP.extruder.h - 10 - COMP.hotend.len).color("#e8590c"));

  // ── steppers (all kept inside the 220×220×260 envelope) ────────────────────
  // Y: mounted low at the rear, below the bed carriage (z<34.5) and just past
  // the bed's rear sweep (y>90) — uses the 200→220 rear margin, no feet needed.
  const m = COMP.nema17;
  add("Motor/Y", box(m.w, m.h, 24).translate(0, EW / 2 - m.h / 2 + 8, 2).color("#d9480f"));
  // Z: atop the column, nudged +X so the 42 mm body stays within x≥−110.
  add("Motor/Z", box(m.w, m.h, m.len).translate(-110 + m.w / 2, 0, FRAME.baseZTop + FRAME.columnLen - m.len).color("#d9480f"));
  // X: on the gantry left end, body extending inward (+X) & up so x≥−110.
  add("Motor/X", box(COMP.nema14.w, COMP.nema14.h, COMP.nema14.len).translate(FRAME.columnX + 2, 0, gz + W).color("#d9480f"));

  // ── electronics bay on the base rear ───────────────────────────────────────
  add("Elec/SKR-Pico", box(COMP.skrPico.w, COMP.skrPico.h, COMP.skrPico.t).translate(45, 55, FRAME.baseZTop).color("#862e9c"));
  add("Elec/Pi-Zero", box(COMP.piZero.w, COMP.piZero.h, COMP.piZero.t).translate(-45, 60, FRAME.baseZTop).color("#9c36b5"));
}

// ── envelopes (translucent, non-material) ───────────────────────────────────
if (showEnvelopes) {
  add("Env/build-volume", box(REQ.buildX, REQ.buildY, REQ.buildZ)
    .translate(0, 0, AXIS.bedTopZ)
    .color("#2f9e44").material({ opacity: 0.16 }));
  add("Env/bed-Y-sweep", box(AXIS.bedPlate, AXIS.bedPlate + AXIS.yTravel, AXIS.bedPlateT)
    .translate(0, 0, AXIS.bedTopZ - AXIS.bedPlateT)
    .color("#e03131").material({ opacity: 0.14 }));
  add("Env/body", box(REQ.envX, REQ.envY, REQ.envZ)
    .translate(0, 0, 0)
    .color("#15aabf").material({ opacity: 0.06 }));
  add("Env/spool-external", cylinder(50, 50).pointAlong([0, 1, 0])
    .translate(0, REQ.envY / 2 + 45, 120)
    .color("#868e96").material({ opacity: 0.25 }));
}

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
