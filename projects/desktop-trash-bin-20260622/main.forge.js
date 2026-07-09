// Desktop sweep box bin: straight, widened body with selectable side decoration.

setActiveBackend("manifold");

const MODEL_NAME = "SWEEP BOX";
const VERSION = "V4";

const output = Param.choice("Output", "body", ["body"]);
const decoration = Param.choice("Decoration", "vertical-ribs", [
  "vertical-ribs",
  "horizontal-rails",
  "diagonal-slashes",
  "dot-grid",
  "window-frames",
  "wave-bars",
  "corner-posts",
]);
const wall = param("Wall thickness", 2.2, { min: 1.6, max: 3.0, step: 0.1, unit: "mm" });
const floor = param("Floor thickness", 3.2, { min: 2.4, max: 5.0, step: 0.1, unit: "mm" });

const BODY_W = 142; // 118mm sweep-box seed x 1.2
const BODY_D = 92;
const BODY_H = 96;
const FRONT_H = 46; // raised slightly from the earlier low front
const CORNER_R = 10;
const EDGE_FILLET_R = 1.4;
const DECOR_PROTRUDE = 0.8;

function rr(width, depth, radius) {
  return roundedRect(width, depth, Math.min(radius, width / 2 - 0.5, depth / 2 - 0.5));
}

function makeRubberPocket(x, y) {
  return rr(24, 12, 4).extrude(0.9).translate(x, y, -0.08);
}

function reliefOnSide(side, y, z, lenY, lenZ) {
  const x = side * (BODY_W / 2 + DECOR_PROTRUDE / 2 - 0.12);
  return box(DECOR_PROTRUDE, lenY, lenZ).translate(x, y, z);
}

function reliefCylinderOnSide(side, y, z, radius) {
  const cyl = cylinder(DECOR_PROTRUDE, radius, radius, 20).pointAlong([side, 0, 0]);
  return cyl.translate(side * (BODY_W / 2 - 0.12), y, z);
}

function addPattern(shape, pattern) {
  const pieces = [];
  for (const side of [-1, 1]) {
    if (pattern === "vertical-ribs") {
      for (const y of [-28, -14, 0, 14, 28]) pieces.push(reliefOnSide(side, y, 18, 2.2, 68));
    }
    if (pattern === "horizontal-rails") {
      for (const z of [28, 48, 68]) pieces.push(reliefOnSide(side, 0, z, 68, 2.4));
    }
    if (pattern === "diagonal-slashes") {
      for (const y of [-24, 0, 24]) {
        const slash = reliefOnSide(side, y, 24, 2.4, 54).rotateX(24, { pivot: [side * (BODY_W / 2 + DECOR_PROTRUDE / 2), y, 51] });
        pieces.push(slash);
      }
    }
    if (pattern === "dot-grid") {
      for (const y of [-27, -9, 9, 27]) {
        for (const z of [30, 48, 66]) pieces.push(reliefCylinderOnSide(side, y, z, 2.3));
      }
    }
    if (pattern === "window-frames") {
      for (const y of [-20, 20]) {
        pieces.push(reliefOnSide(side, y - 11, 50, 2.1, 42));
        pieces.push(reliefOnSide(side, y + 11, 50, 2.1, 42));
        pieces.push(reliefOnSide(side, y, 29, 22, 2.1));
        pieces.push(reliefOnSide(side, y, 71, 22, 2.1));
      }
    }
    if (pattern === "wave-bars") {
      for (let i = 0; i < 6; i++) {
        const y = -31 + i * 12.4;
        const z = 34 + (i % 2) * 10;
        pieces.push(reliefOnSide(side, y, z, 11, 2.2));
        pieces.push(reliefOnSide(side, y + 5.5, z + 10, 11, 2.2));
      }
    }
    if (pattern === "corner-posts") {
      for (const y of [-BODY_D / 2 + 8, BODY_D / 2 - 8]) {
        pieces.push(reliefOnSide(side, y, 12, 4.2, 82));
      }
      pieces.push(reliefOnSide(side, 0, 24, 72, 2.2));
    }
  }
  return pieces.length ? shape.add(...pieces) : shape;
}

function makeLabelEngraving() {
  const cutDepth = 0.42;
  const railN = box(60, 1.1, cutDepth).translate(0, 4.45, 0);
  const railS = box(60, 1.1, cutDepth).translate(0, -4.45, 0);
  const railW = box(1.1, 10, cutDepth).translate(-29.45, 0, 0);
  const railE = box(1.1, 10, cutDepth).translate(29.45, 0, 0);
  const strokes = [];
  const sw = 0.42;
  const chW = 3.2;
  const chH = 4.5;
  const step = 4.2;
  const startX = -21.5;
  const y0 = -2.25;

  function addH(x, y, len) { strokes.push(box(len, sw, cutDepth).translate(x + len / 2, y, 0)); }
  function addV(x, y, len) { strokes.push(box(sw, len, cutDepth).translate(x, y + len / 2, 0)); }
  function draw(ch, x) {
    if (ch === "S") { addH(x, y0 + chH, chW); addH(x, y0 + chH / 2, chW); addH(x, y0, chW); addV(x, y0 + chH * 0.56, chH * 0.34); addV(x + chW, y0 + 0.10, chH * 0.34); return; }
    if (ch === "W") { addV(x, y0 + 0.35, chH - 0.35); addV(x + chW / 2, y0 + 0.35, chH * 0.55); addV(x + chW, y0 + 0.35, chH - 0.35); addH(x + 0.25, y0, chW / 2 - 0.45); addH(x + chW / 2 + 0.25, y0, chW / 2 - 0.45); return; }
    if (ch === "P") { addV(x, y0, chH); addH(x + 0.25, y0 + chH, chW - 0.5); addH(x + 0.25, y0 + chH / 2, chW - 0.5); addV(x + chW, y0 + chH * 0.58, chH * 0.32); return; }
    if (ch === "-") { addH(x + 0.4, y0 + chH / 2, chW - 0.8); return; }
    if (ch === "3") { addH(x + 0.2, y0 + chH, chW - 0.4); addH(x + 0.2, y0 + chH / 2, chW - 0.4); addH(x + 0.2, y0, chW - 0.4); addV(x + chW, y0 + 0.1, chH - 0.2); return; }
    if (ch === "4") { addV(x, y0 + chH / 2, chH / 2); addV(x + chW, y0, chH); addH(x + 0.2, y0 + chH / 2, chW - 0.2); }
  }

  let cursor = startX;
  for (const ch of "SWP-4") {
    draw(ch, cursor);
    cursor += step;
  }

  return union(railN, railS, railW, railE, union(strokes))
    .translate(0, -20, floor - cutDepth * 0.55);
}

function makeBody() {
  const outer = rr(BODY_W, BODY_D, CORNER_R)
    .extrude(BODY_H, { labels: { start: "bottom", end: "top" } });
  const inner = rr(BODY_W - 2 * wall, BODY_D - 2 * wall, Math.max(4, CORNER_R - wall))
    .extrude(BODY_H + 3)
    .translate(0, 0, floor);
  const frontCut = box(BODY_W + 6, wall * 4, BODY_H - FRONT_H + 4)
    .translate(0, -BODY_D / 2, FRONT_H);

  let body = outer.subtract(inner, frontCut);
  body = fillet(body, EDGE_FILLET_R, { convex: true }, 10);
  body = body.subtract(makeLabelEngraving());
  body = addPattern(body, decoration);

  for (const pocket of [
    makeRubberPocket(-44, -28),
    makeRubberPocket(44, -28),
    makeRubberPocket(0, 30),
  ]) {
    body = body.subtract(pocket);
  }

  body = union(body);

  return body
    .color("#9fb8aa")
    .material({ roughness: 0.78 })
    .as("decorated-sweep-box");
}

const body = makeBody().placeReference("bottom", [0, 0, 0]);

function logSize(name, shape) {
  const b = shape.boundingBox();
  const size = [
    (b.max[0] - b.min[0]).toFixed(1),
    (b.max[1] - b.min[1]).toFixed(1),
    (b.max[2] - b.min[2]).toFixed(1),
  ].join(" x ");
  console.log(`${name}: ${size} mm`);
}

const bodySpec = spec("Decorated sweep box seed", (shape) => {
  verify.notEmpty("body has geometry", shape);
  const b = shape.boundingBox();
  verify.lessThan("body width <= 146mm", b.max[0] - b.min[0], 146);
  verify.lessThan("body depth <= 94mm", b.max[1] - b.min[1], 94);
  verify.lessThan("body height <= 97mm", b.max[2] - b.min[2], 97);
  verify.greaterThan("front wall raised above 44mm", FRONT_H, 44);
  verify.greaterThan("corner fillet radius >= 1.2mm", EDGE_FILLET_R, 1.2);
  verify.greaterThan("body volume is printable", shape.volume(), 50000);
});

logSize("body", body);
console.log(`${MODEL_NAME} ${VERSION}: ${decoration}, straight sweep box, ${BODY_W.toFixed(1)}mm wide`);
bodySpec.check(body);

if (output === "body") return body;
return body;
