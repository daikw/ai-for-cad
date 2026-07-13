---
name: pcb-preorder-checks
description: >-
  Final pre-order verification gate for a JLCPCB PCB/PCBA order from an
  EasyEDA Pro design: machine checks (raw netlist disconnects, real DRC
  errors, power connectivity, revision consistency across
  schematic/PCB/BOM/CPL), visual checks (connector polarity, FFC contact
  side, pin 1, silkscreen, JLCPCB assembly preview overlap per part), cost
  checks (features that trigger premium processes), and separated approvals
  for placement, final price, and payment. Use right before uploading or
  paying for a JLCPCB order, or after any change to a design that was already
  checked. Not for circuit correctness (use design-and-review-circuit first),
  not for choosing parts (jlcpcb-parts-search), and not a substitute for the
  user's own payment decision.
---

# 発注前チェック（pcb-preorder-checks）

JLCPCB 発注前の最終ゲート。目的は一つ — **「実物が届くまで気づけないミス」を
発注前に潰す**こと。基板の往復は 4〜7 日と数十〜百数十 USD かかる。
ソフトウェアの「コンパイルが通る」に相当する検証をアップロード前に済ませる。
Freedom Level: 低〜中（チェック項目の省略は理由付き WAIVED としてのみ許可。
黙って飛ばさない。項目の追加は自由）。

ゲート方式・承認分離・CPL 照合は
[Keitark/pcba-design-skills](https://github.com/Keitark/pcba-design-skills)
(MIT) の pcb-layout-review / release-pcba-fabrication / operate-jlcpcb-order
のエッセンスを、高速プロトタイピングのテンポを保つ軽量さで翻案したもの。

## 原則

- 「0 open = 製造可能」「アップロード成功 = 実装位置が正しい」とは判断しない。
  各項目を独立した証拠で確認する
- **同一ネット名・zone の重なり・pad open ゼロは導通の証明にならない**
  （ForgeCAD の「boundingBox はエンベロープ検査にならない」と同じ思想）
- 前提ゲート: design-and-review-circuit が PASS していること。
  未実施なら先にそちらを回す
- 開始前に [references/known-pitfalls.md](references/known-pitfalls.md) を読む。
  チェック中に新しい「実物まで潜伏する系のミス」を見つけたら同ファイルに追記する

## ワークフロー

1. **リビジョン一貫性** — 回路図・PCB・BOM・CPL が同一の版から出ているか。
   一つでも古い生成物が混ざっていたら再生成（混在リビジョンでの発注は
   チェック全体を無効にする）
2. **機械検証** — [references/preorder-checklist.md](references/preorder-checklist.md)
   の「機械検証」節。ネットリスト・DRC・電源導通・製造制約
3. **目視検証** — 同「目視検証」節。極性・向き・シルク・裏表。
   EasyEDA Pro の 2D/3D 表示と、JLCPCB アップロード後の実装プレビューの両方で行う。
   実装プレビューの照合手順は
   [references/cpl-placement-review.md](references/cpl-placement-review.md)
4. **コスト検査** — JLCPCB の見積画面で、想定外の追加費用（premium process）が
   発生していないか。原因がジオメトリ（微細ビア等）なら設計に戻す
5. **結果の記録** — `projects/<name>-<ts>/reviews/preorder-checks.md`
   （repo 外では `.pcba-workflow/`）に、項目ごとの PASS / WAIVED(理由) /
   BLOCKED を記録する

## 基板クラス別プリセット

チェックの深さは基板クラスでスケールさせる（省略でなく縮約 — 項目自体は
飛ばさない）:

- **fast lane**（2 層・モジュールベース・デジタルのみ・シールド/breakout 級）:
  ベタ分断確認は電源/GND ネットのハイライト各 1 周に縮約。CPL アンカー校正は
  面ごと 3 点 → 全体で 3 点に縮約。スクリーンショット保存は上下面全景のみ
- **standard**（4 層以上・アナログ混載・FFC/高密度コネクタあり・PCBA 2 枚超）:
  references の全項目をフルで実施
- fast lane でも縮約不可: フットプリント↔実部品整合・FFC 接点面・DNP 確認・
  発注フォーム値照合（実物まで潜伏する系はクラスに関係なく発生する）

## 承認の分離

以下は**別々の承認**であり、一つの承認を他に流用しない:

1. **実装配置** — 実装プレビューの目視確認結果に対する承認
2. **最終価格** — 表示された合計金額（送料・段取り費込み）に対する承認
3. **支払い** — 実際の決済。**必ずユーザー本人が行う**。エージェントは
   決済ボタンを押さない

ブラウザ上での部品位置・回転の手直しは診断としてのみ使い、確定はソース
（EasyEDA Pro 側の CPL/フットプリント）を直して再アップロードする。
ブラウザ編集を残したまま発注しない。

## ゲート

全項目 PASS（または理由付き WAIVED）で発注可。BLOCKED が残る状態での
アップロード・発注は行わない。発注後に設計を変更したら、次の発注では
チェック全体をやり直す（部分的な再利用をしない）。
