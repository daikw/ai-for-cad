#!/usr/bin/env node
// Printables の公開 STL を source/cache/ に取得する。
// 非ログインで getDownloadLink mutation が通るため API 経由で直接落とす。
// 出力: cache/<slug>/<filename> と fetch-manifest.json（URL + sha256、job.json 転記用）

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CACHE = join(HERE, 'cache')
const API = 'https://api.printables.com/graphql/'

// wanted: null = 全 STL、配列 = そのファイル名だけ
const TARGETS = [
  { printId: '1648510', slug: 'cnckitchen-hole-size-test', wanted: ['HoleTest_M2.stl', 'HoleTest_M2p5+M3.stl', 'HoleTest_M4.stl', 'HoleTest_M5.stl', 'HoleTest_M6.stl'] },
  { printId: '1444127', slug: 'graduated-hole-test-block', wanted: null },
  { printId: '469872', slug: 'insert-diameter-test-m3', wanted: null },
  { printId: '380635', slug: 'md3d-heatset-test', wanted: null },
  { printId: '716940', slug: 'diameter-tolerance-test', wanted: null },
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

const META = `query($id:ID!){print(id:$id){id name slug license{name} user{publicUsername} stls{id name fileSize}}}`
const LINK = `mutation($id:ID!,$printId:ID!,$fileType:DownloadFileTypeEnum!,$source:DownloadSourceEnum!){getDownloadLink(id:$id,printId:$printId,fileType:$fileType,source:$source){ok errors{field messages} output{link}}}`

const manifest = []

for (const t of TARGETS) {
  const { print } = await gql(META, { id: t.printId })
  const outDir = join(CACHE, t.slug)
  await mkdir(outDir, { recursive: true })
  const files = print.stls.filter((s) => !t.wanted || t.wanted.includes(s.name))
  if (t.wanted && files.length !== t.wanted.length) {
    throw new Error(`${t.slug}: expected ${t.wanted.length} files, matched ${files.length}`)
  }
  console.log(`\n# ${print.name} (${print.license?.name ?? 'license unknown'}) by ${print.user?.publicUsername ?? '?'}`)
  for (const f of files) {
    const link = await gql(LINK, { id: f.id, printId: t.printId, fileType: 'stl', source: 'model_detail' })
    if (!link.getDownloadLink.ok) throw new Error(`${f.name}: ${JSON.stringify(link.getDownloadLink.errors)}`)
    const url = link.getDownloadLink.output.link
    const res = await fetch(url)
    if (!res.ok) throw new Error(`download ${f.name}: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const sha256 = createHash('sha256').update(buf).digest('hex')
    const path = join(outDir, f.name)
    await writeFile(path, buf)
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
