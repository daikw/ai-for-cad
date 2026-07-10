# jlcparts 静的データ層の構造

jlcparts（https://yaqwsx.github.io/jlcparts/）はサーバ API を持たない完全静的
SPA で、データは GitHub Pages 上の gzip ファイル群として毎日再生成される
（JLCPCB とのデータ提供合意に基づく。フロントエンド実装は
`yaqwsx/jlcparts` の `web/src/db.js`）。以下は実測でリバースエンジニアした
現行フォーマット（manifest `version: 4`）。

## エンドポイント

すべて `https://yaqwsx.github.io/jlcparts/data/` 配下。CORS は開放されている。

| ファイル | 内容 | サイズ目安 |
|---|---|---|
| `manifest.json` | 全体索引。`created` に生成日時 | 4.3MB |
| `components-<slug>-NNN.jsonl.gz` | サブカテゴリ単位の部品データ（全フィールド） | 数十 KB/個 |
| `browse-components-<slug>-NNN.jsonl.gz` | UI ブラウズ用の軽量版 | 〃 |
| `lookup-NNNNN.json.gz` | C 番号 → シャードファイル名の逆引き | 〃 |
| `attributes-lut.json.gz` | 属性値のルックアップテーブル（24 万エントリ） | 33MB 展開後 |
| `search-index.tsv.gz` + `search-trigram-group-*` | 全文検索インデックス | 大きい |

## manifest.json

主要キー:

- `created`: ISO 8601 生成日時（鮮度判定に使う）
- `totalComponents`: 総部品数（実測 586,369）
- `categories`: サブカテゴリの索引（737 件）。各エントリは
  `{category, subcategory, componentCount, shards[], browseShards[], rawCategories[]}`
- `files`: 全 4,072 ファイルの `{kind, sha256, componentCount}`
- `lookupBucketSize`: 100000
- `lookupBuckets`: `{"<floor(lcsc番号/bucketSize)>": "lookup-NNNNN.json.gz"}`

## シャード形式（components-*.jsonl.gz）

JSONL。**1 行目が列名 → 配列添字のヘッダオブジェクト**、2 行目以降がデータ行（配列）。
複数シャードを連結処理する場合はヘッダ行の再出現を検出すること。

```
{"lcsc":0,"mfr":1,"joints":2,"description":3,"datasheet":4,"price":5,"img":6,"url":7,"attributes":8,"stock":9,"subcategory":10}
["C266130","TIOS1013DMWR",10,"...説明...","https://...",[{"qFrom":1,"qTo":9,"price":3.1871},...],...,[5,6,7,...],27,1]
```

- `price`: 数量ティアの配列 `{qFrom, qTo, price}`（USD）
- `stock`: 在庫数（実測でシャード内 92% が >0。信頼できるが日次スナップショット）
- `attributes`: **attributes-lut への添字の配列**

## C 番号の直接ルックアップ

1. `C266130` → 数値部 266130 / 100000 = バケット `2`
2. `manifest.lookupBuckets["2"]` → `lookup-00002.json.gz`
3. その中の `{"C266130": "components-....jsonl.gz"}` でシャードを特定
4. シャードを取得して `lcsc == "C266130"` の行を探す

## attributes-lut（Basic/Extended の所在）

LUT は `[属性名, {format, primary, values}]` の配列。部品レコードの
`attributes` 添字がこの配列を指す。**Basic/Extended 区分は属性名
`"Basic/Extended"` のエントリ**で、値は `Basic` / `Extended` / `Preferred` の
3 種。同梱スクリプトは「添字 → クラス名」の対応表を
`class-index.json` としてキャッシュ時に前計算している:

```sh
gunzip -c attributes-lut.json.gz | jq -c '
  [to_entries[] | select(.value[0] == "Basic/Extended")
   | {(.key|tostring): .value[1].values["catalog class 1"][0]}] | add'
```

耐圧・パッケージ等の構造化属性フィルタが必要な場合も同じ LUT を引けば
デコードできる（未実装。description の grep で大半は足りる）。

## 全文検索インデックス

`search-index.tsv.gz` + トリグラムファイル群はフロントエンドの全文検索用。
カテゴリを跨ぐ横断検索が必要な場合の最後の手段で、通常は
`categories` でサブカテゴリを絞ってからシャード grep する方が軽い。

## 運用ノート（2026-07 時点の実測）

- manifest は毎日再生成されている（`created` が当日）
- 類似プロジェクトの状況: tscircuit/jlcsearch は API が重くなる報告あり、
  CDFER/jlcpcb-parts-database は配布物の更新が停止（メンテナ無反応）。
  静的 Pages 配信の jlcparts が可用性・鮮度の両面で現状最良
