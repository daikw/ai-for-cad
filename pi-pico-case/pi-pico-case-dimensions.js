// Board specs + shared invariant helpers for Pi Pico case.
// Imported by pi-pico-case.forge.js / -assembly / -print-layout so the
// dimensions cannot drift between authoring, collision check, and slice layout.

const BOARDS = {
  picoRp2040MicroUsb: {
    pcb: { w: 51.0, d: 21.0, th: 1.0 },
    // 4 corners — mirror these in case-centered coords
    holePos: { x: 23.5, y: 5.7, dia: 2.1 },
    // v9 (corrected from official STEP, 2026-05-19):
    // LED (GP25) sits ~3.4mm inboard from the USB-side short edge (not the BOOTSEL side as v9 initially had it).
    // STEP coords (PCB-corner origin): X≈1.6–2.0, Z≈−2.8–−4.0 → our case-centered coords ≈ (+22, -8.5).
    led: { x: 22.0, y: -8.5 },
    // v9: enlarged Y (9→11) so micro-USB connector + cable shroud clears; +Z opening reaches the lid.
    usbCutout: { side: "+x", w: 11.0, h: 4.0 },
    // Tallest component above PCB top (RP2040 + crystal + USB shell envelope)
    components: { topMargin: 2.2, w: 32, d: 16, offsetX: -3 },
    usbConnector: { w: 7.6, d: 5.9, h: 2.7, overhang: 1.0 },
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
