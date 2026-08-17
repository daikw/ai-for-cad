#!/usr/bin/env node
// Printables の公開 STL を source/cache/ に取得する（2026-08-13 ジョブと同じ手口）。
// 非ログインで getDownloadLink mutation が通るため API 経由で直接落とす。

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CACHE = join(HERE, 'cache')
const API = 'https://api.printables.com/graphql/'

const TARGETS = [
  // ノギス代替。go/no-go スロットで径と長さを判定する。sanitized 版はメッシュ修正済みのもの。
  { printId: '38356', slug: 'metric-screw-measuring-device', wanted: ['metric_screw_measuring_device-sanitized.stl'] },
  // ISTORA 皿頭が本当に 90° か確認する。
  { printId: '1004080', slug: 'countersink-gauge', wanted: ['Countersing Gauge v1.stl'] },
]

async function gql(query, variables) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://www.printables.com', referer: 'https://www.printables.com/' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`graphql ${res.status}`)
  const body = await res.json()
  if (body.errors) throw new Error(JSON.stringify(body.errors))
  return body.data
}

const META = `query($id:ID!){print(id:$id){id name license{name} user{publicUsername} stls{id name fileSize}}}`
const LINK = `mutation($id:ID!,$printId:ID!,$fileType:DownloadFileTypeEnum!,$source:DownloadSourceEnum!){getDownloadLink(id:$id,printId:$printId,fileType:$fileType,source:$source){ok errors{field messages} output{link}}}`

const manifest = []

for (const t of TARGETS) {
  const { print } = await gql(META, { id: t.printId })
  const outDir = join(CACHE, t.slug)
  await mkdir(outDir, { recursive: true })
  const files = print.stls.filter((s) => t.wanted.includes(s.name))
  if (files.length !== t.wanted.length) throw new Error(`${t.slug}: expected ${t.wanted.length}, matched ${files.length}`)
  console.log(`\n# ${print.name} (${print.license?.name}) by ${print.user?.publicUsername}`)
  for (const f of files) {
    const link = await gql(LINK, { id: f.id, printId: t.printId, fileType: 'stl', source: 'model_detail' })
    if (!link.getDownloadLink.ok) throw new Error(`${f.name}: ${JSON.stringify(link.getDownloadLink.errors)}`)
    const url = link.getDownloadLink.output.link
    const res = await fetch(url)
    if (!res.ok) throw new Error(`download ${f.name}: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const sha256 = createHash('sha256').update(buf).digest('hex')
    await writeFile(join(outDir, f.name), buf)
    manifest.push({
      path: `source/cache/${t.slug}/${f.name}`,
      bytes: buf.length,
      sha256,
      origin: `https://www.printables.com/model/${t.printId}`,
      license: print.license?.name ?? null,
      author: print.user?.publicUsername ?? null,
    })
    console.log(`  ${f.name}  ${buf.length}B  ${sha256.slice(0, 16)}`)
  }
}

await writeFile(join(HERE, 'fetch-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`\n${manifest.length} files -> source/fetch-manifest.json`)
