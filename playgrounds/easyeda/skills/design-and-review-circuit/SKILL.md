---
name: design-and-review-circuit
description: >-
  Audits the electrical correctness of an EasyEDA Pro schematic — power tree,
  ratings and logic-level margins, reset/boot sequencing, unused pins,
  decoupling, connector semantics, partial-power and firmware-not-running
  states — netlist-first, and gates the result as PASS / BLOCKED /
  USER_REVIEW. Use after a design pass produces or modifies a schematic and
  before PCB layout freeze or ordering, or when the user asks whether a
  circuit is correct. Not for schematic readability or EasyEDA operation
  mechanics (use easyeda-pro-claude-skill), not for part sourcing
  (jlcpcb-parts-search), and not for layout/manufacturing checks
  (pcb-preorder-checks).
---

# 回路監査（design-and-review-circuit）

EasyEDA Pro 回路図の**電気的正しさ**を監査する。見やすい回路図・ERC が通る
回路図・レンダが綺麗な回路図は、正しい回路の証明ではない。判定は独立した
証拠（ネットリスト・データシート・数値）で行う。
Freedom Level: 中（チェック順序と深さは基板の複雑さで調整。ゲート3値と
ネットリスト第一主義からは逸脱しない）。

命名・ゲート方式は
[Keitark/pcba-design-skills](https://github.com/Keitark/pcba-design-skills)
(MIT) のコンセプトを EasyEDA Pro + 高速プロトタイピング向けに翻案したもの。

## 原則

- **ネットリスト第一**: 判定はキャンバスの見た目でなくエクスポートした
  ネットリストで行う。エクスポートと検証の実手順（Allegro .tel + grep/diff）は
  easyeda-pro-claude-skill に従う
- **レビューと修正は別**: 既定はレビューのみ。回路の修正はユーザーが明示的に
  許可した場合だけ行い、修正後は同じ監査を再実行する
- **不明は不明と書く**: データシート未確認・実測未了の項目は `UNKNOWN` として
  残す。根拠なく PASS にしない

## ワークフロー

1. **正の把握** — 回路図・ネットリスト・BOM・設計ブリーフ（あれば）を読み、
   基板の動作原理と電源系統を平文で 1 段落に要約する。要約できない場合、
   理解が足りていない（BLOCKED）
2. **監査** — [references/circuit-audit-checklist.md](references/circuit-audit-checklist.md)
   に沿って確認する。正確な型番のデータシートを一次情報として使う
   （記憶で定格を断言しない）
3. **所見の記録** — 各所見を `critical / major / minor / info` に分類し、
   「証明された欠陥」「設計リスク」「証拠不足 (UNKNOWN)」を区別する
4. **レイアウト向け制約の引き継ぎ** — 配置・配線に影響する電気的制約は
   `[SPEC]`（データシート由来の必須値）/ `[TARGET]`（設計目標）/
   `[TBD-MEASURE]`（実測待ち）のタグ付きで列挙し、pcb-preorder-checks が
   読める形にする

## 出力とゲート

結果は `projects/<name>-<ts>/reviews/circuit-review.md` に書く
（このリポジトリ外での作業では作業ディレクトリの `.pcba-workflow/` に置く）。
構成: 動作要約 / 電源ツリー / 所見表（severity・根拠・推奨対応）/
レイアウト制約 / ゲート判定。

ゲートは 3 値のみ:

- `PASS` — critical / major の所見と安全性に関わる UNKNOWN が残っていない
- `USER_REVIEW` — 技術的証拠は揃ったが、設計判断（トレードオフの選択）が
  ユーザーに残っている
- `BLOCKED` — 証拠不足・検証失敗・理解不能な箇所がある

回路図・ネットリストが変更されたら判定は失効する。古い PASS を引き継がない。
