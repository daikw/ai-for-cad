// Board specs + shared invariant helpers for Pi Pico case.
// Imported by pi-pico-case.forge.js / -assembly / -print-layout so the
// dimensions cannot drift between authoring, collision check, and slice layout.

const BOARDS = {
  picoRp2040MicroUsb: {
    pcb: { w: 51.0, d: 21.0, th: 1.0 },
    // 4 corners — mirror these in case-centered coords
    holePos: { x: 23.5, y: 5.7, dia: 2.1 },
    // v9.7 (2026-05-26): re-derived from the parts-split STL — part-07 (0.8×1.6×0.6mm 0603 SMD)
    // sits at center (20.70, -5.70) in case-centered coords. The v9 STEP-corner→case-center
    // remapping had a sign/offset slip on Y, putting the hole 2.8mm off (past the 2.5mm hole
    // half-width), so the v9.6 print missed the LED entirely. Use the part-STL value directly.
    led: { x: 20.7, y: -5.7 },
    // v9: enlarged Y (9→11) so micro-USB connector + cable shroud clears; +Z opening reaches the lid.
    usbCutout: { side: "+x", w: 11.0, h: 4.0 },
    // Tallest component above PCB top (per official STEP: micro-USB shell at +2.0mm)
    components: { topMargin: 2.2, w: 32, d: 16, offsetX: -3 },
    // Micro-USB shell per official STEP: 7.5×5.65×2.5mm, centered on PCB long axis (Y=0).
    usbConnector: { w: 7.5, d: 5.65, h: 2.5, overhang: 1.0 },
    // BOOTSEL push-button (~3.5×3.5×1.5mm) on USB-side, ~7mm inboard from USB short edge.
    bootsel: { x: 18.5, y: 0, w: 3.5, d: 3.5, h: 1.5 },
  },
};

function holePositions(spec) {
  const { x, y } = spec.holePos;
  return [[x, y], [x, -y], [-x, y], [-x, -y]];
}

function assertPositive(name, value) {
  if (!(value > 0)) {
    throw new Error(`[dimensions] ${name} must be > 0, got ${value}`);
  }
}

function assertNear(name, actual, expected, tol) {
  const t = tol == null ? 0.01 : tol;
  if (Math.abs(actual - expected) > t) {
    throw new Error(`[dimensions] ${name}: expected ${expected} ±${t}, got ${actual}`);
  }
}

function assertGreaterEqual(name, actual, minimum) {
  if (!(actual >= minimum)) {
    throw new Error(`[dimensions] ${name} must be >= ${minimum}, got ${actual}`);
  }
}

module.exports = {
  BOARDS,
  holePositions,
  assertPositive,
  assertNear,
  assertGreaterEqual,
};
