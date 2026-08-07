#!/usr/bin/env node
// Merge a ball STL with a raised-text settings tag placed beside it.
// Usage: node gen-ball-with-tag.mjs <ball.stl> "<TEXT>" <out.stl>
import fs from "node:fs";

const [ballPath, text, outPath] = process.argv.slice(2);
if (!ballPath || !text || !outPath) {
  console.error('usage: gen-ball-with-tag.mjs <ball.stl> "<TEXT>" <out.stl>');
  process.exit(64);
}

const FONT = {
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  0: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  1: ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", "#####"],
  2: [".###.", "#...#", "....#", "..##.", ".#...", "#....", "#####"],
  3: ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  4: ["#..#.", "#..#.", "#..#.", "#####", "...#.", "...#.", "...#."],
  5: ["#####", "#....", "#....", "####.", "....#", "....#", "####."],
  6: [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  7: ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
  8: [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  9: [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};

function cuboidTris(x0, y0, z0, x1, y1, z1) {
  const v = [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ];
  const f = [
    [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7],
    [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5],
    [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7],
  ];
  return f.map((t) => t.map((i) => v[i]));
}

// --- read ball STL (binary) ---
const buf = fs.readFileSync(ballPath);
const n = buf.readUInt32LE(80);
const ballTris = [];
let min = [1e9, 1e9, 1e9];
for (let i = 0; i < n; i++) {
  const base = 84 + i * 50 + 12;
  const tri = [];
  for (let v = 0; v < 3; v++) {
    const p = [
      buf.readFloatLE(base + v * 12),
      buf.readFloatLE(base + v * 12 + 4),
      buf.readFloatLE(base + v * 12 + 8),
    ];
    for (let a = 0; a < 3; a++) if (p[a] < min[a]) min[a] = p[a];
    tri.push(p);
  }
  ballTris.push(tri);
}

// --- build tag: base plate + raised 5x7 pixel text ---
const PX = 1.0;      // pixel pitch (mm)
const MARGIN = 2.0;  // plate margin around text
const BASE_H = 1.6;  // plate thickness
const TEXT_H = 0.8;  // raised text height
const chars = text.toUpperCase().split("");
for (const c of chars) if (!FONT[c]) { console.error(`no glyph: ${c}`); process.exit(65); }
const textW = chars.length * 6 * PX - PX;
const textD = 7 * PX;
const tagW = textW + MARGIN * 2;
const tagD = textD + MARGIN * 2;

const tagTris = [...cuboidTris(0, 0, 0, tagW, tagD, BASE_H)];
chars.forEach((c, ci) => {
  const glyph = FONT[c];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (glyph[row][col] !== "#") continue;
      const x = MARGIN + ci * 6 * PX + col * PX;
      const y = MARGIN + (6 - row) * PX;
      tagTris.push(...cuboidTris(x, y, BASE_H, x + PX, y + PX, BASE_H + TEXT_H));
    }
  }
});

// place tag beside the ball (12mm gap, aligned to ball's min corner in y, on plate z)
const off = [min[0] - tagW - 12, min[1], min[2] < 0 ? min[2] : 0];
// tags sit on the same z floor as the ball's lowest point so both rest on the plate
const placed = tagTris.map((t) => t.map((p) => [p[0] + off[0], p[1] + off[1], p[2] + off[2]]));

// --- write merged binary STL ---
const all = [...ballTris, ...placed];
const out = Buffer.alloc(84 + all.length * 50);
out.write(`ball with tag ${text}`, 0);
out.writeUInt32LE(all.length, 80);
let o = 84;
for (const [p, q, r] of all) {
  const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
  const w = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
  let nx = u[1] * w[2] - u[2] * w[1];
  let ny = u[2] * w[0] - u[0] * w[2];
  let nz = u[0] * w[1] - u[1] * w[0];
  const L = Math.hypot(nx, ny, nz) || 1;
  out.writeFloatLE(nx / L, o); out.writeFloatLE(ny / L, o + 4); out.writeFloatLE(nz / L, o + 8);
  let vo = o + 12;
  for (const pt of [p, q, r]) {
    out.writeFloatLE(pt[0], vo); out.writeFloatLE(pt[1], vo + 4); out.writeFloatLE(pt[2], vo + 8);
    vo += 12;
  }
  out.writeUInt16LE(0, o + 48);
  o += 50;
}
fs.writeFileSync(outPath, out);
console.log(`wrote ${outPath}: ball ${ballTris.length} tris + tag ${placed.length} tris, tag ${tagW.toFixed(1)}x${tagD.toFixed(1)}mm text="${text}"`);
