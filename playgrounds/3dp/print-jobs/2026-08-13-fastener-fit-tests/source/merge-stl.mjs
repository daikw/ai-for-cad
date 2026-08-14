#!/usr/bin/env node
// 複数 STL を X 方向に並べて 1 つのバイナリ STL にまとめる。
// slice-h2d-pro.mjs は単一 STL 入力なので、1 プレートに複数部品を載せるにはこの前段が要る。
// 各部品は bbox を原点合わせしてから配置し、Z 下端をプレート面(0)に揃える。
//
//   node merge-stl.mjs out.stl gap_mm in1.stl in2.stl ...

import { readFileSync, writeFileSync } from 'node:fs'

function parseStl(path) {
  const buf = readFileSync(path)
  const n = buf.readUInt32LE(80)
  // ヘッダの三角形数とファイル長が一致すればバイナリ。ASCII は "solid" で始まるが
  // バイナリでも先頭が "solid" になっている実装があるため、長さで判定する。
  if (84 + n * 50 === buf.length) {
    const tris = []
    for (let i = 0; i < n; i++) {
      const o = 84 + i * 50
      const v = []
      for (let k = 0; k < 12; k++) v.push(buf.readFloatLE(o + k * 4))
      tris.push(v) // [nx,ny,nz, v1..v3]
    }
    return tris
  }
  const text = buf.toString('utf8')
  const tris = []
  const re = /facet\s+normal\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)[\s\S]*?outer\s+loop([\s\S]*?)endloop/g
  const vre = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g
  let m
  while ((m = re.exec(text))) {
    const v = [Number(m[1]), Number(m[2]), Number(m[3])]
    const verts = [...m[4].matchAll(vre)]
    if (verts.length !== 3) throw new Error(`${path}: facet with ${verts.length} vertices`)
    for (const q of verts) v.push(Number(q[1]), Number(q[2]), Number(q[3]))
    tris.push(v)
  }
  if (!tris.length) throw new Error(`${path}: no facets parsed`)
  return tris
}

const bbox = (tris) => {
  const mn = [Infinity, Infinity, Infinity]
  const mx = [-Infinity, -Infinity, -Infinity]
  for (const t of tris) {
    for (let v = 0; v < 3; v++) {
      for (let a = 0; a < 3; a++) {
        const x = t[3 + v * 3 + a]
        if (x < mn[a]) mn[a] = x
        if (x > mx[a]) mx[a] = x
      }
    }
  }
  return { mn, mx, size: mx.map((v, i) => v - mn[i]) }
}

const [out, gapArg, ...inputs] = process.argv.slice(2)
if (!out || !inputs.length) {
  console.error('usage: merge-stl.mjs out.stl gap_mm in1.stl [in2.stl ...]')
  process.exit(2)
}
const gap = Number(gapArg)

const parts = inputs.map((p) => {
  const tris = parseStl(p)
  return { path: p, tris, box: bbox(tris) }
})

const totalW = parts.reduce((a, p) => a + p.box.size[0], 0) + gap * (parts.length - 1)
const maxD = Math.max(...parts.map((p) => p.box.size[1]))

const merged = []
let cursorX = -totalW / 2
for (const p of parts) {
  // X は左から詰める。Y は中央揃え。Z はプレート面に接地。
  const dx = cursorX - p.box.mn[0]
  const dy = -p.box.mn[1] - p.box.size[1] / 2
  const dz = -p.box.mn[2]
  for (const t of p.tris) {
    const c = t.slice()
    for (let v = 0; v < 3; v++) {
      c[3 + v * 3 + 0] += dx
      c[3 + v * 3 + 1] += dy
      c[3 + v * 3 + 2] += dz
    }
    merged.push(c)
  }
  console.log(`  ${p.box.size.map((s) => s.toFixed(1)).join(' x ')} mm  x=[${cursorX.toFixed(1)}, ${(cursorX + p.box.size[0]).toFixed(1)}]  ${p.path.split('/').pop()}`)
  cursorX += p.box.size[0] + gap
}

const buf = Buffer.alloc(84 + merged.length * 50)
buf.write('merged by merge-stl.mjs', 0)
buf.writeUInt32LE(merged.length, 80)
merged.forEach((t, i) => {
  const o = 84 + i * 50
  for (let k = 0; k < 12; k++) buf.writeFloatLE(t[k], o + k * 4)
})
writeFileSync(out, buf)
console.log(`\nfootprint ${totalW.toFixed(1)} x ${maxD.toFixed(1)} mm, ${merged.length} tris -> ${out}`)
