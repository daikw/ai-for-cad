---
name: fusion360
description: Model, edit, and verify parts in Autodesk Fusion 360 (Fusion) via the official local Fusion MCP server (`http://127.0.0.1:27182/mcp`, verified live 2026-07-03), or via a code-CAD route (forgecad / build123d → STEP) when Fusion is unavailable or headless. Use when the user wants Fusion 360 modeling, パラメトリックモデリング, スケッチ・フィーチャー操作, STEP/STL の Fusion での編集・仕上げ, フュージョン360 での作図, Fusion API スクリプトの実行, or connecting Claude Code to Fusion via MCP. Encodes the cm-unit trap, session-header connection recipe, script-only write path, undo/mode discipline, and the export-and-measure verification discipline (screenshots and self-reports are not verification).
---

# fusion360 — Fusion 360 を公式 MCP 経由で操作する

> **中核規律: キャンバスの見た目ではなく、エクスポート（STEP/STL）と数値クエリで検証する。AI の自己申告（「できました」）は検証ではない。**

Fusion 360 は公式 Fusion MCP サーバ（ローカル HTTP、`http://127.0.0.1:27182/mcp`）を通じて操作する。このサーバのツールは4つしかなく、**ジオメトリの生成・編集は事実上すべて `fusion_mcp_execute` の `featureType: "script"` で Fusion Python API を直接実行すること**で行う。専用の「立方体を作る」「フィレットを付ける」ツールは存在しない。つまりこのスキルの実体は「Fusion Python スクリプトを安全かつ正しく書いて実行させるための規律」である。

本スキルは主に **Fusion Design**（機械 CAD）を対象とする。**Fusion Electronics は読み取り専用**（設計監査・ネット照会・BOM抽出）であり、部品配置・配線の書き込み API が存在しないため回路設計の自動化には使えない（実測済み 2026-07-03、`references/tools.md` §4・`references/pitfalls.md` 参照）。

## 1. 接続ルート判定

```
Fusion 360 起動中？
  ├─ No  → ルート D（下記）
  └─ Yes → scripts/probe.sh を実行
       ├─ 接続 OK（tools 4件） → ルート A（本スキルの主経路）
       └─ 接続 NG              → references/setup.md のトラブルシュートへ
```

- **ルート A（標準）**: 公式 Fusion MCP。本スキルはこれを前提に書かれている。接続レシピは `references/setup.md`。
- **ルート D（Fusion 不要/不可）**: ヘッドレス・CI・新規形状生成が主な場合はコードから生成し STEP を書き出す。**第一候補は forgecad**（CLI 導入済みで新規依存追加が不要。`forgecad` / `forgecad-make-a-model` / `forgecad-verify` スキル群を使う）。build123d は forgecad が使えない環境でのフォールバックであり、新規 Python 依存の追加になるため supply-chain ルールに従いユーザー確認を取ってから使う。Fusion は最終仕上げのみに使う。外部 STEP/STL の Fusion への取り込みは `app.importManager` 系 API を `script` で使う（本スキルに実測済みレシピは未収載。書く前に §3 の原則通り `apiDocumentation` でシグネチャを確認すること）。パラメトリック履歴を Fusion 側に残す必要がある作業（既存 Fusion 資産の編集）はルート D では代替できない。§4 の三段検証はルート D でも同様に適用する（読み替え: 数値クエリ→`forgecad run` の verify、スクリーンショット→render、ExportManager→`forgecad export`。エクスポート後の stdlib 数値チェックは `references/verification.md` の手順をそのまま流用できる）。

## 2. セッション冒頭の定型4確認

モデリングを始める前に、以下4点が不明なら **AskUserQuestion で必ず確認する**。省略すると高確率で手戻りする（3・4は実例あり、`references/pitfalls.md` 参照）。

適用条件と例外:
- 4確認は接続ルート（A/D）に依らず適用する。ルート D（code-CAD）でも材料・公差・完了条件は同様に必要。
- ユーザーへ質問できない環境（subagent 実行・非対話バッチ等）では、依頼文から読み取れる情報で4項目を埋め、埋めきれない項目は **自分が置いた仮定を成果物と併せて明示報告する**（黙って補完しない）。
- 依頼自体が実行不能なケース（例: Fusion Electronics への部品配置・配線の書き込み）は、4確認より先に不可判定と代替提案に進んでよい（early-exit）。このとき結論が接続状態に依存しないなら、probe.sh・§3①の読み取りクエリも省略してよい（ツールに一切触れず回答して構わない）。

1. **単位系**: 既定は mm。ただし Fusion Python API への受け渡しは常に **cm**（`references/tools.md` 実測済み）。ユーザー指示の単位と API 渡し単位を混同しない。
2. **材料・製造プロセス**: FDM/PLA か CNC 金属かで公差方針がまったく変わる。省略すると AI はデフォルトで CNC 金属公差を切り、3D プリント後に組立不能になる実例が報告されている。推奨確認文例: 「これは FDM/PLA プリント用です。6mm ベアリングを圧入するので印刷公差を考慮してください」のように用途・公差要求まで確定させる。
3. **対象ドキュメント**: **新規ドキュメントまたはコピーのみを操作する。既存の重要ドキュメントを直接開いて編集することは禁止**。
4. **完了条件**: 数値で検証可能な形で定義する（例: 「外形 20×20×10mm、中心に φ5mm 穴、公差 ±0.1mm」）。プロジェクト直下の CLAUDE.md が定める「モデリングのコンセプトと完了条件を最初に定める」方針と接続する。

## 3. ワークフロー原則

1. **読み取り専用から始める**: いきなり編集せず、まず `fusion_mcp_read`（`document` operation=`open` 等）で現状（開いているドキュメント、既存フィーチャー）を把握する。
2. **段階分解**: 「スケッチだけ作る」→ 数値検証 → 「フィーチャーを1つ追加」→ 検証、と刻む。一括で全部作らせる依頼は失敗・クラッシュの要因になる（コミュニティ報告多数）。
3. **各操作後に数値検証**: スクリーンショットは補助であって主たる検証手段ではない。バウンディングボックス・体積・エッジ数などを `script` で照会し、意図通りかを数値で確認する。
4. **失敗時の undo は粒度に注意**: パラメトリック/ダイレクトモードで undo の挙動が変わる。詳細は `references/pitfalls.md` の「モード・状態管理」節。
5. スクリプトを書く前に API の存在・シグネチャが不確かな場合は、まず `fusion_mcp_read` の `apiDocumentation` クエリで検索してから書く。当て推量で書かない。
6. スクリプトを書く前に **`references/pitfalls.md` を読むこと**。cm 単位変換、revolve の軸またぎ、`profiles.count == 0` のチェックリストなど、生 Python を書く際に直接効いてくる罠が列挙されている。
7. `document` の `save` operation は **ユーザーの明示指示がない限り呼ばない**（ツール説明文自体の明記）。

## 4. 三段検証

完了条件を満たしたと主張する前に、以下を順に行う。

1. **数値クエリ + スクリーンショット**: `script` でバウンディングボックス・体積・パラメータを照会し、`fusion_mcp_read` の `screenshot` で目視確認する。screenshot は他ツールと異なりレスポンス形式が `content[0]` に直接 `type: "image"` が入る点に注意（`references/tools.md`）。
2. **エクスポート + 数値チェック**: STL/STEP をエクスポートし、寸法・体積・穴径をチェックする（手順は `references/verification.md`）。①だけで完了とみなさない。
3. **物理検証フラグ**: 圧入・回転嵌合・0.1mm オーダーの公差が効く部品（ベアリング、歯車の噛み合いなど）は、「物理プリント検証が必要」であることを完了条件に明記する。AI の「大丈夫です」という自己申告だけで組立可否を判断してはならない（歯車が実際には回らなかった実例が複数ソースで報告されている）。

## 5. モデル・エージェント分担ポリシー（要約）

Fusion MCP を握るモデリングループは、**セッションを開始した主ループが自分で直接実行する**。「設計は強いモデル・実装は弱いモデルに委譲」という分業はこのドメインでは採用しない。理由:

- ボトルネックは実装の手数ではなく空間推論と API の罠回避（能力律速）。弱いモデルに投げるとリトライが増える。
- CAD 操作は共有可変状態（ドキュメント）を汚す。失敗時のコストがテキストコードの書き直しより非対称に高い。
- オーケストレータが委譲先の Fusion 状態を検証するには結局スクリーンショット/エクスポートを自分で読む必要があり、委譲の利得が薄い。
- 単一ドキュメント + メインスレッド制約で本質的に直列。並列化の利得が出ない。

一方、**委譲が正しい場面**（ステートレスで検証が安価）: 読み取り専用の API ドキュメント調査（並列可）、ルート D（code-CAD）でのコード生成、主ループで実証済みのスクリプトによる量産バリアント生成、レポート・ドキュメント整備。

## 6. references への参照表

| いつ読むか | ファイル |
|---|---|
| 接続できない/セッションが張れない時、ツール一覧が0件になる時 | `references/setup.md` |
| スクリプトを書く前（毎回）、`profiles.count == 0` 等のエラー時 | `references/pitfalls.md` |
| 4ツールの引数・単位の扱い・応答形式を確認したい時 | `references/tools.md` |
| STL/STEP エクスポート後の数値検証、物理検証フラグの判定基準を確認したい時 | `references/verification.md` |
| 接続診断をやり直したい時 | `scripts/probe.sh` |

出典注記の凡例: 「実測済み 2026-07-03」= `official-mcp-probe.md` での実機検証。それ以外はコミュニティ報告（出典を個別に注記）。
