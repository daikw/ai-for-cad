// Parts sorting tray v2: varied cell sizes plus repeatable edge joinery.

const MODEL_NAME = "PARTS TRAY";
const VERSION = "V2";

const wall = param("Wall thickness", 1.8, { min: 1.4, max: 3.0, unit: "mm" });
const rib = param("Divider rib thickness", 1.8, { min: 1.2, max: 3.0, unit: "mm" });
const rimDrop = param("Divider below rim", 1.0, { min: 0.0, max: 2.5, unit: "mm" });
const engravingDepth = param("Engraving depth", 0.45, { min: 0.25, max: 0.8, unit: "mm" });
const connectorClearance = param("Connector clearance", 0.35, { min: 0.15, max: 0.6, unit: "mm" });

const OUTER_W = 200;
const OUTER_D = 150;
const OUTER_H = 10;
const CONNECTOR_DEPTH = 3.0;
const CORE_W = OUTER_W - 2 * CONNECTOR_DEPTH;
const CORE_D = OUTER_D - 2 * CONNECTOR_DEPTH;
const CORNER_R = 9.0;

const floor = wall;
const innerW = CORE_W - 2 * wall;
const innerD = CORE_D - 2 * wall;
const dividerH = OUTER_H - floor - rimDrop;
const connectorH = 5.2;
const sideWallH = OUTER_H - floor;
const connectorTopH = connectorH - floor;
const parts = [];

function addPart(name, shape) {
  parts.push({ name, shape: shape.color("#d9d2c3").material({ roughness: 0.74 }) });
}

function addRib(name, x, y, w, d, h = dividerH) {
  addPart(name, box(w, d, h).translate(x, y, floor));
}

function addMaleTab(side, center, neck, head) {
  const tabW = head;
  if (side === "east") {
    const x = CORE_W / 2 + CONNECTOR_DEPTH / 2;
    addPart(`male-east-foot-${center}`, box(CONNECTOR_DEPTH, tabW, floor).translate(x, center, 0));
    addPart(`male-east-key-${center}`, box(CONNECTOR_DEPTH, tabW, connectorTopH).translate(x, center, floor));
    return;
  }
  const y = CORE_D / 2 + CONNECTOR_DEPTH / 2;
  addPart(`male-north-foot-${center}`, box(tabW, CONNECTOR_DEPTH, floor).translate(center, y, 0));
  addPart(`male-north-key-${center}`, box(tabW, CONNECTOR_DEPTH, connectorTopH).translate(center, y, floor));
}

function addFemaleSocket(side, center, neck, head) {
  const c = connectorClearance;
  const gap = head + c;
  const cheek = 4.0;
  if (side === "west") {
    const x = -CORE_W / 2 - CONNECTOR_DEPTH / 2;
    for (const [label, y] of [["a", center - gap / 2 - cheek / 2], ["b", center + gap / 2 + cheek / 2]]) {
      addPart(`female-west-${center}-${label}-foot`, box(CONNECTOR_DEPTH, cheek, floor).translate(x, y, 0));
      addPart(`female-west-${center}-${label}-cheek`, box(CONNECTOR_DEPTH, cheek, connectorTopH).translate(x, y, floor));
    }
    return;
  }
  const y = -CORE_D / 2 - CONNECTOR_DEPTH / 2;
  for (const [label, x] of [["a", center - gap / 2 - cheek / 2], ["b", center + gap / 2 + cheek / 2]]) {
    addPart(`female-south-${center}-${label}-foot`, box(cheek, CONNECTOR_DEPTH, floor).translate(x, y, 0));
    addPart(`female-south-${center}-${label}-cheek`, box(cheek, CONNECTOR_DEPTH, connectorTopH).translate(x, y, floor));
  }
}

function subtractStrokeLabel(base, text, x, y) {
  const h = 5.2;
  const w = 3.8;
  const s = 0.58;
  const gap = 1.15;
  const cutH = engravingDepth + 0.2;
  let shape = base;

  function cutBox(cx, cy, bw, bd, angle = 0) {
    let cutter = box(bw, bd, cutH);
    if (angle !== 0) cutter = cutter.rotateZ(angle);
    shape = shape.subtract(cutter.translate(cx, cy, floor - engravingDepth));
  }

  function hseg(x0, y0, len = w) { cutBox(x0 + w / 2, y0, len, s); }
  function vseg(x0, y0, len = h) { cutBox(x0, y0 + h / 2, s, len); }
  function diag(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    cutBox((x1 + x2) / 2, (y1 + y2) / 2, Math.hypot(dx, dy), s, Math.atan2(dy, dx) * 180 / Math.PI);
  }

  function drawChar(ch, x0) {
    if (ch === " ") return;
    if (ch === "-") { hseg(x0, y + h * 0.5); return; }
    if (ch === "A") { vseg(x0, y); vseg(x0 + w, y); hseg(x0, y + h); hseg(x0, y + h * 0.52); return; }
    if (ch === "P") { vseg(x0, y); hseg(x0, y + h); hseg(x0, y + h * 0.55); vseg(x0 + w, y + h * 0.55, h * 0.45); return; }
    if (ch === "R") { vseg(x0, y); hseg(x0, y + h); hseg(x0, y + h * 0.55); vseg(x0 + w, y + h * 0.55, h * 0.45); diag(x0 + w * 0.25, y + h * 0.5, x0 + w, y); return; }
    if (ch === "T") { hseg(x0, y + h); vseg(x0 + w / 2, y); return; }
    if (ch === "S") { hseg(x0, y + h); hseg(x0, y + h * 0.5); hseg(x0, y); vseg(x0, y + h * 0.5, h * 0.5); vseg(x0 + w, y, h * 0.5); return; }
    if (ch === "Y") { diag(x0, y + h, x0 + w / 2, y + h * 0.5); diag(x0 + w, y + h, x0 + w / 2, y + h * 0.5); vseg(x0 + w / 2, y, h * 0.5); return; }
    if (ch === "V") { diag(x0, y + h, x0 + w / 2, y); diag(x0 + w, y + h, x0 + w / 2, y); return; }
    if (ch === "2") { hseg(x0, y + h); vseg(x0 + w, y + h * 0.5, h * 0.5); hseg(x0, y + h * 0.5); vseg(x0, y, h * 0.5); hseg(x0, y); }
  }

  let cursor = x;
  for (const ch of text) {
    drawChar(ch, cursor);
    cursor += ch === " " ? w * 0.8 : w + gap;
  }
  return shape;
}

let floorPlate = roundedRect(CORE_W, CORE_D, CORNER_R)
  .extrude(floor, { labels: { start: "bottom", end: "floor" } });

// Required print identity engraving: shallow recessed, block-stroke text in a low-use cell.
floorPlate = subtractStrokeLabel(floorPlate, `TRAY-${VERSION}`, -18, 55);

addPart("engraved-floor", floorPlate);
addPart("north-wall", box(CORE_W, wall, sideWallH).translate(0, CORE_D / 2 - wall / 2, floor));
addPart("south-wall", box(CORE_W, wall, sideWallH).translate(0, -CORE_D / 2 + wall / 2, floor));
addPart("east-wall", box(wall, CORE_D, sideWallH).translate(CORE_W / 2 - wall / 2, 0, floor));
addPart("west-wall", box(wall, CORE_D, sideWallH).translate(-CORE_W / 2 + wall / 2, 0, floor));

// Main irregular cell structure: several large zones, medium bins, and small screw pockets.
addRib("divider-x-left", -50, 0, rib, innerD);
addRib("divider-x-right", 35, 0, rib, innerD);
addRib("divider-y-bottom", 0, -22, innerW, rib);
addRib("divider-y-top", 0, 32, innerW, rib);
addRib("small-bottom-split", -7, -46.2, rib, 48.0);
addRib("wide-middle-split", -7, 5, 83.2, rib);
addRib("top-right-split", 68, 51.9, rib, 37.0);
addRib("lower-right-strip", 66.5, -49, 61.5, rib);

// Shallow local rails inside larger cells keep tiny washers from migrating.
addRib("top-left-low-rail", -73, 51, 24, rib, 3.2);
addRib("right-mid-low-rail", 74, 4, rib, 24, 3.2);

// Repeating tray joinery. East/North are male; West/South are matching loose sockets.
for (const y of [-42, 42]) {
  addMaleTab("east", y, 13.0, 19.0);
  addFemaleSocket("west", y, 13.0, 19.0);
}
for (const x of [-58, 58]) {
  addMaleTab("north", x, 13.0, 19.0);
  addFemaleSocket("south", x, 13.0, 19.0);
}

const tray = group(...parts);
const bb = tray.boundingBox();
console.log(`${MODEL_NAME} ${VERSION}`);
console.log(`bbox: ${(bb.max[0] - bb.min[0]).toFixed(1)} x ${(bb.max[1] - bb.min[1]).toFixed(1)} x ${(bb.max[2] - bb.min[2]).toFixed(1)} mm`);
console.log(`connector clearance: ${connectorClearance.toFixed(2)} mm`);

const floorSpec = spec("FDM v2 tray floor", (shape) => {
  verify.notEmpty("has geometry", shape);
});

const envelopeSpec = spec("FDM v2 tray envelope", (shape) => {
  const b = shape.boundingBox();
  verify.lessThan("width <= 201mm", b.max[0] - b.min[0], 201);
  verify.lessThan("depth <= 151mm", b.max[1] - b.min[1], 151);
  verify.lessThan("height <= 10.2mm", b.max[2] - b.min[2], 10.2);
});

floorSpec.check(floorPlate);
envelopeSpec.check(tray);
return tray;
