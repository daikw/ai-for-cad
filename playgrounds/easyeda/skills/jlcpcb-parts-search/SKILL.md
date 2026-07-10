---
name: jlcpcb-parts-search
description: >-
  Searches JLCPCB assembly parts (stock, price, Basic/Extended/Preferred
  class, LCSC C-numbers) via the jlcparts static data layer
  (yaqwsx.github.io/jlcparts) with a bundled curl+jq CLI, fetching only
  per-subcategory shards instead of the full database. Use when selecting
  in-stock JLCPCB components for a PCB design, checking stock/price/class of
  an LCSC part number, or drafting a BOM constrained to JLCPCB Basic parts.
  Not for placing orders or the final pre-order stock check (re-verify in
  EasyEDA Pro or jlcpcb.com right before ordering), and not for sourcing
  outside JLCPCB assembly (Digi-Key/Mouser etc.).
---

# JLCPCB 在庫部品検索（jlcparts 静的データ層）

JLCPCB アセンブリ対象部品（約 58 万点）を、jlcparts の GitHub Pages 静的データから
カテゴリ単位のオンデマンド取得で検索する。DB 全体のダウンロードは不要。
Freedom Level: 中（スクリプトのサブコマンドは実績のある形。grep パターンや
絞り込み条件は文脈で調整してよい。データ層を直接叩く応用は references 参照）。

## 前提

- `curl` / `jq` / `gunzip`（macOS 標準 + jq のみ要インストール）
- ネットワーク到達性: `https://yaqwsx.github.io/jlcparts/data/`
- キャッシュ: `~/.cache/jlcparts-skill/`（24h TTL、`JLCPARTS_CACHE_DIR` で変更可）

スクリプトはこのスキルの `scripts/jlc-search.sh`（起動時に注入される
`Base directory for this skill:` のパス配下）を使う。

## 使い方

```sh
SK="<skill-base-dir>/scripts/jlc-search.sh"

# 1) サブカテゴリを探す（名前の正規表現、大文字小文字無視）
$SK categories "resistor"
$SK categories "LDO|Linear"

# 2) カテゴリ内を検索（在庫降順、TSV: LCSC/CLASS/STOCK/PRICE@1/MFR/DESCRIPTION）
$SK search "Chip Resistor - Surface Mount" --grep "0402.*10kΩ" --class basic --limit 5
$SK search "Voltage Regulators - Linear|LDO" --grep "3.3V" --class basic --min-stock 10000
$SK search "MCU|Microcontroller" --grep "STM32G0" --json   # JSON 行で全フィールド

# 3) C 番号の直接ルックアップ（在庫・価格・Basic/Extended 区分の確認）
$SK part C25744
```

オプション: `--grep <regex>`（description+型番、大文字小文字無視）/
`--min-stock N`（既定 1）/ `--class basic|preferred|extended`（basic は
Preferred を含む）/ `--limit N`（既定 20）/ `--json`

## 部品選定フロー

1. **Basic/Preferred 優先**で回路ブロックを固める（Extended は 1 部品種ごとに
   段取り費がかかり、在庫変動も激しい）
2. `categories` → `search --class basic` で候補を出し、**LCSC C 番号を BOM の正**とする
3. Extended しかない部品は在庫数に余裕があるか確認し、代替品（second source）の
   C 番号も併記する
4. 必要数は「基板枚数 × 個数 + アトリション（チップ部品は数個多め）」で見る
5. **発注直前に EasyEDA Pro / jlcpcb.com で在庫と区分を再確認**する
   （このスキルのデータは最大 24h + データ生成ラグの遅れがある）

## 注意点

- 在庫は変動する。Basic の定番でも欠品はある（例: C25804 が stock 0 の実績）。
  `part` で最新キャッシュを確認し、代替を常に持つ
- `--grep` は説明文と型番への正規表現で、電気特性の構造化フィルタではない。
  単位表記は JLCPCB 由来（`10kΩ` `±1%` `0402` など）に合わせる
- PRICE@1 は最小数量ティアの単価（USD）。実発注価格は数量ティアで下がる
- 巨大サブカテゴリ（チップ抵抗 = 87 シャード ≒ 5MB）は初回 20 秒程度、以降は
  キャッシュで数秒
- データ層の構造（manifest / シャード / lookup バケット / 属性 LUT）を直接
  叩きたい場合は [references/jlcparts-data-layer.md](references/jlcparts-data-layer.md)
