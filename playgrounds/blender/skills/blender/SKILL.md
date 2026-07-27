---
name: blender
description: Build and iteratively refine Blender scenes and assets agent-first — versioned headless bpy scripts (`Blender --background --python`) as the source of truth, reference-image-driven look development, and a two-layer QA loop (mechanical validators + an external visual judge invoked via `claude -p`), scaling to parallel sub-agents through Library-Link module splitting. Use when the user wants to create, refine, photoreal-ify, or review a Blender scene or asset (Blender でシーン制作, 精緻化, レンダリング検証, ルックデヴ), or to parallelize Blender work across sub-agents. Not for developing or setting up the blender-mcp server itself (see tools/blender-mcp/README.md), and not for dimension-critical mechanical parts (use forgecad / fusion360).
---

# blender — headless bpy スクリプト駆動のシーン制作

> **中核規律: `.blend` は成果物であって正本ではない。正本は版管理された bpy スクリプトであり、検証はレンダの数値計測と外部視覚 judge で行う。自分のレンダを自分で「良くなった」と申告するのは検証ではない。**

Freedom level: **中**。フローの骨格（スクリプト正本・2層QA・judge の分離）は守る。シーン構成・マテリアル設計・反復の粒度は文脈に応じて調整してよい。

## 1. 正本はスクリプト

- ジオメトリ・マテリアル・ライト・カメラはすべて bpy スクリプトで構築する。GUI での手編集や MCP 経由のライブ編集を正本にしない
- スクリプトは `build_<scene>.py` → `refine_<scene>_vNN.py` と版ごとにファイルを分け、編集は patch で行う
- 実行前に必ず `python -m py_compile <script>` を通す。実行は headless で行う:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python build_scene.py
# 既存 .blend への追記型 refine はベース blend を指定する
/Applications/Blender.app/Contents/MacOS/Blender -b scene-vN.blend --python refine_vNN.py
```

- スクリプト冒頭で `.blend` 保存パスとレンダ出力パスを定義し、実行のたびに blend + レンダ画像の両方を残す
- レンダーエンジンの enum 識別名は Blender の版で変わる。決め打ちせず、設定に失敗したらエラーメッセージ中の有効値一覧から選び直す（[references/pitfalls.md](references/pitfalls.md)）

## 2. 制作フロー（参考画像 → ブロックアウト → 反復精緻化）

1. **参考画像を先に作る**。画像生成（chatgpt-web 等）でコンセプト案を複数生成し、ユーザーに選ばせる。以後この画像が全レビューの基準になる
2. **ヒーローカメラを固定する**。v0.1 のレンダを確定した時点でカメラ位置・レンズを凍結し、以後動かさない（確定前のビルド内調整は可）。全バージョンのレンダが同条件で比較可能になる。judge がカメラ自体に指摘を出しても凍結は維持し、構図の問題はシーン側の配置で解決する。カメラ変更はユーザー承認がある場合のみ、新バージョンとして行う
3. **ブロックアウト（v0.1）**は空間の主線（奥行き・密集・抜け）だけを外さないラフでよい。細部はレビュー後
4. **バージョンごとに 1 テーマ**で精緻化する（構図 → 実画像テクスチャ → 汚れ・デカール → 人物・生活痕 → 照明バランス → 引き算）。「追加」フェーズの後に必ず「見せ切る・引き算」フェーズを置く
5. 各バージョンで **レンダ → judge レビュー → 指摘反映** を回し、判定・実測値・変更点を版ごとの記録ファイルに残す

## 3. 視覚 judge ループ（外部モデルに審美判定させる）

生成役と判定役を分ける。判定は別モデル・別プロセスの `claude -p` に、参考画像とレンダを**実際に Read で視覚確認させて**行わせる。既存シーンのレビューだけを頼まれた場合も、このループを単発で使う（レンダ → judge → 判定報告）:

```sh
CLAUDECODE="" timeout 180s claude -p 'あなたは<ドメイン>を評価するシニアアートディレクターです。
Read ツールで次の2枚を必ず視覚的に確認してください。
参考: <reference.png> / 最新レンダ: <render-vNN.png>
評価対象: <今回のテーマに限定した対象リスト>
各項目を PASS / PARTIAL / BLOCKING で判定し、BLOCKING には具体的な修正指示を付けてください。'
```

- **判定は 3 値**（PASS / PARTIAL / BLOCKING）。**差し戻すのは BLOCKING だけ**。PARTIAL は記録して次版へ持ち越す。全指摘を毎回反映しようとすると収束しない
- BLOCKING を修正した版は、次版へ進む前に**同じ範囲で judge を再実行**して解消を確認する。再実行できない事情がある場合は暫定合格の規定（下記）を準用し、次のチェックポイントで確認する
- **レビュー範囲を毎回限定する**（「Round N で追加したオブジェクトのみ」等）。全体講評は判定がぼやける
- judge の生回答は `round-NN-judge.md` 等に必ず保存する。**反復回数を指示された作業では、このラウンド証跡ファイルが「回した」ことの唯一の証明**になる。自己申告の回数報告はあてにならない（実測: 「20回」指示に対し実質2回だった例がある）
- タイムアウトは 180 秒以上。空出力や判定本文の欠落（要約 1 行のみ等）は異常出力として扱い、1 回だけリトライする。それでも異常なら「前回指摘の修正済み」を暫定合格として先へ進み、次のチェックポイントで再評価する

## 4. 機械 QA（judge の前段に置く数値ゲート）

視覚 judge は高価なので、機械的に測れるものは先にスクリプトで検証する:

- **レンダ実測値**: 暗部率（輝度しきい値以下の画素割合）・白飛び率をヒストグラムで計測し、版ごとに記録する。目標レンジは**参考画像を同一手法で実測した値を基準に**許容幅を決める（例: 参考画像の暗部率 ±15pt。無根拠に 15–20% 等を仮置きしない）。judge への依頼文にも実測値を添える
- **シーン整合性 validator**: オブジェクト数・マテリアル数・欠損画像 0・カメラの位置とレンズが不変であることを、`.blend` を開き直す新規 Blender プロセスで検証する（同一プロセス内の再確認はキャッシュで嘘をつく）。期待値の初期ベースラインは v0.1 確定時の実測値を凍結して用い、以後の版では意図した変更分だけ更新する
- 完成判定は「judge の全項目 PASS + validator PASS + 実測値レンジ内」の 3 点セット。これは**最終納品の宣言条件**であり、途中版は BLOCKING さえ無ければ PARTIAL を持ち越したまま版完了としてよい

## 5. スケールアウト（並列サブエージェント）

シーンが育って単一ファイルでの反復が重くなったら、Library Link でモジュール分割し、**1 blend = 1 エージェント**の所有権モデルで並列化する。分割設計・編集境界・wave 運用・統合手順は [references/multi-agent-modular.md](references/multi-agent-modular.md) に従う。

## 6. GUI / MCP の使いどころ

- GUI の Blender と MCP（`tools/blender-mcp/`）は**ユーザーに見せるためのビューア**として使う: 完成した `.blend` を開く、ヒーローカメラと同じ視点に合わせる、など。制作の主経路にはしない
- `execute_bpy` は既定で無効（repo 方針）。必要な作業だけ明示的に有効化する
- osascript のキーストローク送信で Blender GUI を操作しない（OS 側ショートカットに横取りされる）。GUI への反映は「ファイルを開き直す」操作に限定する
- headless サーバを常駐させる場合は `nohup` ではなく `launchctl submit` を使う（[references/pitfalls.md](references/pitfalls.md)）

## 7. 落とし穴

実測済みの罠（Eevee 識別名の版差、shadow atlas 上限、judge タイムアウト、常駐化、GUI 自動化）は [references/pitfalls.md](references/pitfalls.md) を参照。ライトを 5 灯以上足す前と、レンダが突然警告を吐いたときに読む。
