---
name: pcb-design-brief
description: >-
  Turns a fuzzy hardware/PCB idea into a five-element one-shot design brief
  (base module, LCSC C-numbers, placement constraints, stock policy, reuse
  directives) ready to hand to an EasyEDA Pro design pass. Verifies every
  named part against live JLCPCB stock via jlcpcb-parts-search before the
  brief is emitted. Use when the user wants to design a new board, shield, or
  device and the request has not yet been reduced to concrete parts and
  constraints. Not for operating EasyEDA itself (use easyeda-api /
  easyeda-pro-claude-skill), not for auditing an existing circuit (use
  design-and-review-circuit), and not for deep requirement analysis of
  safety-critical or power-electronics products — this is the fast lane for
  digital/breakout-class boards.
---

# PCB 設計ブリーフ（ワンショット設計プロンプト生成）

曖昧な「こういう基板が欲しい」を、EasyEDA Pro での設計パスに一発で渡せる
**5要素ブリーフ**に変換する。forgecad-prepare-prompt の PCB 版。
Freedom Level: 中（5要素の網羅は必須。順序・文体・追加要素は文脈で調整してよい）。

ブリーフの品質が設計ワンショット成功率を支配する。設計 AI の能力より
「入力の粒度」がボトルネックであることが実地で確認されている
（[references/brief-examples.md](references/brief-examples.md) の実例を参照）。

## 5要素

| # | 要素 | 効果 |
|---|---|---|
| 1 | **ベースモジュール指名** | XIAO ESP32-S3 等の実装済みモジュールを指名し、MCU 周辺回路（電源・USB・書き込み・充電）の設計を丸ごと省略する |
| 2 | **主要部品の LCSC C 番号** | 部品選定の曖昧さを消し、JLCPCB PCBA 発注可能性を入力時点で担保する |
| 3 | **物理配置の制約** | 「Display は横向き」「コネクタは基板端」等、一言レベルで十分。向き・接点面が問題になる部品（FFC/FPC 等）は明示必須 |
| 4 | **在庫方針** | 手持ち部品を使うものは「自分の在庫を使う = PCBA 実装対象外（DNP）」と明示する |
| 5 | **既存回路の流用指示** | 「充電回路はモジュール内蔵を使う」等、新規設計を避ける箇所を指定する |

## ワークフロー

1. **意図の把握** — 何を作るか、使用シーン、必須機能、あれば基板フォーマット
   （シールド/単体）と数量を確認する。不明点が設計を左右する場合のみユーザーに聞く
2. **部品の確定** — 機能だけ指定されている部品（「マイク」「液晶」等）は
   `jlcpcb-parts-search` で JLCPCB 在庫から候補を出し、**LCSC C 番号まで確定**させる。
   Basic/Preferred 優先。Extended しかない場合は在庫数と代替候補（second source）を
   添える。センサー・ディスプレイ系はカテゴリごと Extended のみが普通 —
   その場合は Basic 探しに固執せず、部品種数 × 段取り費を数量欄の近くに
   見込みとして書く
3. **制約の言語化** — 配置・向き・寸法・電源系統を一言ずつに落とす。
   FFC/FPC コネクタは接点面（上接点/下接点）と実装面を必ず明示する
   （実物到着まで検出できない典型ミスのため。pcb-preorder-checks の
   known-pitfalls 参照）
4. **ブリーフ出力** — [assets/brief-template.md](assets/brief-template.md) の
   形式で出力する。そのまま設計パス（easyeda-api / easyeda-pro-claude-skill を
   使うセッション）の冒頭プロンプトとして使える一段落にまとめる
5. **後続ゲートの予告** — ブリーフ末尾に「設計後は design-and-review-circuit →
   pcb-preorder-checks を通してから発注」と一行添える

## 書かないこと

- 回路の実装詳細（プルアップ値・デカップリング構成など）— 設計パスの仕事
- 要求仕様書級の網羅（動作状態表・電源予算表）— 必要なら設計後の
  design-and-review-circuit が監査で検出する。ただし**単一部品の突出した
  ピーク電流**（例: CO2 センサーの測定時 ~200mA 級）のように設計を左右する
  一点情報は例外で、「人間レビュー必須箇所」欄に 1 行書いて監査へ引き継ぐ
- 電源回路・モータードライバー等の高難度アナログを含む場合は、ブリーフに
  「この部分は人間レビュー必須」とタグを付けて高速レーンから外す
