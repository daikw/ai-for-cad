// FDM-printable sorting trays for small disassembly parts.
// Default output places both variants on the bed as one print job.

const output = Param.choice("Output", "print-set", ["print-set", "square-100", "rect-100x50"]);

const wall = param("Wall thickness", 1.8, { min: 1.4, max: 3.0, unit: "mm" });
const rib = param("Divider rib thickness", 1.8, { min: 1.2, max: 3.0, unit: "mm" });
const cornerR = param("Outer corner radius", 8.0, { min: 2.0, max: 14.0, unit: "mm" });
const ribTopDrop = param("Divider below rim", 1.0, { min: 0.0, max: 3.0, unit: "mm" });
const layoutGap = param("Print layout gap", 8.0, { min: 4.0, max: 20.0, unit: "mm" });

function trayBody({ name, outerW, outerD, outerH, columns, rows, color }) {
  const floor = wall;
  const innerW = outerW - 2 * wall;
  const innerD = outerD - 2 * wall;
  const dividerH = Math.max(outerH - floor - ribTopDrop, 2.0);

  let tray = roundedRect(outerW, outerD, Math.min(cornerR, outerW / 2 - 0.5, outerD / 2 - 0.5))
    .extrude(outerH, { labels: { start: "bottom", end: "top" } })
    .shell(wall, { openFaces: ["top"] });

  for (let i = 1; i < columns; i++) {
    const x = -innerW / 2 + (innerW * i) / columns;
    const divider = box(rib, innerD, dividerH).translate(x, 0, floor);
    tray = tray.add(divider);
  }

  for (let i = 1; i < rows; i++) {
    const y = -innerD / 2 + (innerD * i) / rows;
    const divider = box(innerW, rib, dividerH).translate(0, y, floor);
    tray = tray.add(divider);
  }

  // Short low rails split two cells into tiny screw/washer parking spots without adding support needs.
  const railH = Math.min(outerH - floor - 1.2, 4.0);
  const railZ = floor;
  const railLen = Math.max(12, Math.min(innerW / columns, innerD / rows) - 8);
  const railA = box(railLen, rib, railH).translate(-innerW * 0.26, innerD * 0.26, railZ);
  const railB = box(rib, railLen, railH).translate(innerW * 0.26, -innerD * 0.26, railZ);
  tray = tray.add(railA).add(railB);

  const bb = tray.boundingBox();
  const size = [
    (bb.max[0] - bb.min[0]).toFixed(1),
    (bb.max[1] - bb.min[1]).toFixed(1),
    (bb.max[2] - bb.min[2]).toFixed(1),
  ].join(" x ");
  console.log(`${name}: ${size} mm, ${columns} x ${rows} primary pockets`);

  return tray.color(color).material({ roughness: 0.72 });
}

const square = trayBody({
  name: "square-100",
  outerW: 100,
  outerD: 100,
  outerH: 10,
  columns: 3,
  rows: 3,
  color: "#d7d1c2",
});

const rectTray = trayBody({
  name: "rect-100x50",
  outerW: 100,
  outerD: 50,
  outerH: 20,
  columns: 3,
  rows: 2,
  color: "#8d9a9e",
});

const printable = spec("FDM tray envelope", (shape) => {
  verify.notEmpty("has printable geometry", shape);
  const bb = shape.boundingBox();
  verify.lessThan("fits K1 Max X", bb.max[0] - bb.min[0], 300);
  verify.lessThan("fits K1 Max Y", bb.max[1] - bb.min[1], 300);
  verify.lessThan("fits K1 Max Z", bb.max[2] - bb.min[2], 300);
});

const bedEnvelope = spec("Print set bed envelope", (assembly) => {
  const bb = assembly.boundingBox();
  verify.lessThan("layout fits K1 Max X", bb.max[0] - bb.min[0], 300);
  verify.lessThan("layout fits K1 Max Y", bb.max[1] - bb.min[1], 300);
  verify.lessThan("layout fits K1 Max Z", bb.max[2] - bb.min[2], 300);
});

if (output === "square-100") {
  printable.check(square);
  return square;
}

if (output === "rect-100x50") {
  printable.check(rectTray);
  return rectTray;
}

const squareOnBed = square.placeReference("bottom", [0, 0, 0]);
const rectOnBed = rectTray.placeReference("bottom", [0, 0, 0]).translate(0, 75 + layoutGap, 0);
const printSet = group(
  { name: "square-100-tray", shape: squareOnBed },
  { name: "rect-100x50-tray", shape: rectOnBed },
);

printable.check(squareOnBed);
printable.check(rectOnBed);
bedEnvelope.check(printSet);
return printSet;
