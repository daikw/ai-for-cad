# Fusion 360 × Claude Code — コミュニティ知見の統合とハーネス設計への応用

調査日: 2026-07-03
ソース: `research/` 配下の 4 レポート（X / GitHub / 英語圏 Web / 日本語圏 Web、いずれも Sonnet 5 による一次調査）

---

## 1. エコシステムの現状（3 行で）

1. **2026-04 末に Autodesk × Anthropic 公式の Fusion MCP がリリース**され、コミュニティは「野良 MCP 乱立期（2025〜2026-04）」から「公式標準化期」への移行中。
2. 公式 MCP は Claude Desktop 前提だが、ローカル HTTP で「任意の MCP 対応クライアント」互換を謳っており、Claude Code からの接続余地がある（要検証）。個人ライセンスでは接続制限の報告あり。
3. Fusion を経由しない **code-CAD ハイブリッド**（build123d / OpenSCAD で生成 → STL/STEP を Fusion で仕上げ）が実務では確立しており、エコシステム規模（FreeCAD MCP 1225★ vs Fusion 系最大 107★）でも code-CAD 側が優勢。

## 2. 接続ルートの選択肢

| ルート | 構成 | 向き | 留意点 |
|---|---|---|---|
| A. 公式 Fusion MCP | Fusion Preferences → General → API で有効化 + Claude Desktop コネクタ | 標準。公式サポートと安定性 | Desktop アプリ必須 / 個人ライセンス制限報告 / Win は開発者モード / 有効化後 PC 再起動が必要な事例 |
| B. faust-machines/fusion360-mcp-server | `claude mcp add fusion360 -- uvx fusion360-mcp-server --mode socket` + Fusion アドイン (TCP:9876) | Claude Code から discrete tool 84 種で安全に操作 | PyPI 配布で再現性最良。パラメトリック/ダイレクトモード判定・undo 安全ガードあり |
| C. ndoo/fusion360-mcp-bridge | `fusion_execute`（任意 Python）+ `fusion_screenshot` の 2 ツールのみ + CLAUDE.md に知識集約 | エッジケース対応・自由度最大 | Bearer 認証あり。生成コード品質に依存 → ドメイン知識注入が生命線 |
| D. code-CAD ハイブリッド | Claude Code + build123d/OpenSCAD → STEP/STL → Fusion で仕上げ | ヘッドレス・CI 可能・ライセンス非依存 | Fusion のパラメトリック履歴には乗らない。本リポジトリの forgecad 資産とも整合 |

**推奨**: B（土台）+ C の思想（ドメイン知識をプロンプト層へ）+ D（Fusion 不要な部分の迂回路）の併用。A は Desktop 側の対話用途。

## 3. 罠カタログ（全チャネルで裏取りできた技術知見）

スキルに転記すべきコア。複数ソースで独立に報告されたものだけを採録。

### 単位・座標系
- **Fusion Python API の内部単位は常に cm**（表示設定と無関係）。mm のつもりの 10 倍事故が最頻出エラー。50mm → API には `5.0` を渡す。
- **XZ/YZ 平面では Z 軸の符号が反転する**（rahayesj の SPATIAL_AWARENESS.md、日本語記事でも同事故報告）。平面選択後は必ず操作前後で座標検証。
- 単位・寸法はプロンプトで必ず明示。「mm と指示しても cm で生成される」事故が公式 MCP でも報告されている。

### スケッチ・フィーチャー操作
- スケッチ平面には B-Rep 面より**コンストラクション平面**が安定（Zenn 限界検証）。
- 拘束は「中点拘束」より「**点-点間距離寸法**」が AI には堅牢（同上）。
- プロファイル選択は「**面積最小のものを選ぶ**」ルールが有効（同上）。
- **revolve はプロファイルが回転軸をまたぐと失敗**する（端点が原点上でも）。円弧は `addByCenterStartSweep` でなく `addByThreePoints` が安全（ndoo CLAUDE.md）。
- **profiles.count == 0 のときのチェックリスト**: ①開いた輪郭 ②重複エッジ（面積ゼロ領域）③回転軸上に両端点 ④間違ったスケッチ平面（ndoo）。
- 穴あけは「3D 円柱を後から引き算」だと歪む → **2D 断面で先に円を抜いてから押し出す**（Qiita/issey_dotlog）。
- 薄壁付近の `fillet` は失敗しやすく `chamfer` が安定（Zenn/optimisuke）。

### モード・スレッド・状態管理
- **パラメトリック/ダイレクトモードを操作前に明示確認**。`TemporaryBRepManager` のボディはパラメトリックでは `BaseFeature` ラップ必須。undo の挙動もモード依存。
- **Fusion API はメインスレッド限定**。アドイン実装は CustomEvent/Work Queue でディスパッチ（クラッシュの主因）。
- **undo の粒度管理**が事故防止の要。大きすぎ/小さすぎる undo 単位はどちらも危険。
- 重要ファイルには直接触らせず、**新規ドキュメントかコピーで作業**。

### 製造ドメイン
- **材料・製造プロセスを最初に宣言**しないと、Claude はデフォルトで金属 CNC 的公差を切り、3D プリント後に組立不能になる（knightli.com 実例）。推奨文例: "This model is for FDM 3D printing, using PLA. The goal is to install a 6mm bearing, so printing tolerance and press fit should be considered."
- 材料は規格レベルまで明示（「鋼」でなく「AS/NZS 1734 Al 5052-H32, 2mm 厚」）で精度向上。
- 適性の見極め: プリズマティック形状・板金・パラメトリック形状は得意、有機曲面は不向き（「犬のバッジ画像を同じ形に」は完全失敗）。

## 4. ワークフロー原則（プロンプト・運用）

1. **読み取り専用から始める**: まずデザイン構成のサマリを取らせ、現状把握 → 変更依頼の順。
2. **段階分解**: 「3D モデルまで全部作って」は失敗する。「スケッチのみ」→ 確認 → フィーチャー、と刻む。一括依頼はクラッシュ要因でもある。
3. **AI に質問させてから確定指示を積む**: 複雑案件では要件を Claude 側から質問させ、確定パラメータを積み上げる。
4. **検証は三段**: ① `fusion_screenshot` 等の視覚検証 → ② エクスポート（STL/STEP）+ 数値検証 → ③ 公差が効く部品は**物理プリントまで**。AI の「大丈夫です」という自己申告は信用しない（歯車が回らなかった実例）。
5. **トークン予算**: 単一パーツ生成で 5h 制限の約 13%、修正 1 回 約 7% の実測。一発完成ではなく修正前提で設計する。
6. code-CAD ルートでは逆に「寸法ゆるめ + 対話的微修正」が相性良い。

## 5. ハーネス・スキル設計への応用提案

コミュニティで最も成功している設計思想は ndoo/rahayesj 型の「**ツールは絞り、ドメイン知識をプロンプト層（CLAUDE.md / SKILL.md）に寄せる**」パターン。これは本ハーネスの既存資産（easyeda-pro-claude-skill の netlist-first 検証規律、forgecad の LLD→実装→verify 分離）と同型であり、そのまま踏襲できる。

### 提案 1: `fusion360-claude-skill` の新設（easyeda-pro-claude-skill の姉妹スキル）

構成案:

```
skills/fusion360/
├── SKILL.md            # 発動条件 + 接続ルート判定 (公式/B/C/D) + ワークフロー原則
├── references/
│   ├── pitfalls.md     # §3 罠カタログ（cm 単位, Z 反転, revolve, profiles.count==0 ...）
│   ├── setup.md        # ルート別セットアップ（公式/faust-machines/ndoo）+ 再起動等のハマりどころ
│   └── verification.md # 三段検証（screenshot → export+数値 → 物理）の手順
```

SKILL.md に埋めるべき規律（easyeda の「netlist-first」に相当する一文）:
> **「キャンバスの見た目ではなくエクスポート（STEP/STL）と数値で検証する。AI の自己申告は検証ではない。」**

### 提案 2: モデリングセッションの定型プリアンブル

スキルがセッション冒頭で必ず確定させる 4 項目（AskUserQuestion で埋める）:
1. 単位系（mm 前提を明示、API 渡し値は cm 換算）
2. 材料・製造プロセス（FDM/PLA? CNC? → 公差方針が変わる）
3. 対象ドキュメント（新規 or コピー。既存ファイル直編集は禁止）
4. 完了条件（プロジェクト CLAUDE.md の「コンセプトと完了条件を最初に定める」と接続）

### 提案 3: ハイブリッド分岐ルール

- パラメトリック履歴・既存 Fusion 資産への介入が必要 → ルート B/C（Fusion MCP）
- 新規形状の生成が主で Fusion は仕上げ → ルート D（build123d/forgecad → STEP 取り込み）
- Fusion が起動できない / ライセンス制限 → D 一択
- この分岐判定自体を SKILL.md の冒頭フローチャートにする

### 提案 4: 検証ハーネス（forgecad-verify の類推）

- スクリーンショット比較だけでなく、エクスポートした STL/STEP に対する数値チェック（バウンディングボックス、体積、穴径）をスクリプト化して「見た目 OK ≠ 完了」を強制する
- 歯車等の噛み合い部品は「物理検証が必要」フラグを完了条件に含める

## 6. 未解決事項（次の調査候補）

- ~~公式 Fusion MCP に Claude Code（Desktop でなく CLI）から接続できるかの実機検証~~ → **解決（2026-07-03 実機検証）**: `http://127.0.0.1:27182/mcp` に Streamable HTTP で接続可能。ツールは 4 つのみで実体は「Fusion Python API へのリモート実行ゲートウェイ」（ndoo 型アーキテクチャ）。詳細は `research/official-mcp-probe.md`、E2E 実証は `research/e2e-test.md`、成果物は `.claude/skills/fusion360/`
- 個人ライセンス制限の正確な範囲（商用サブスクのみ？）
- faust-machines 版と公式 MCP のツールカバレッジ差分
- Aura Friday MCP server の実体（X 調査では URL 特定できず。GitHub 調査の AuraFriday/Fusion-360-MCP-Server と同一と思われるが未確認）
- Reddit（調査環境からアクセス不可だった）のスレッド精読

## 7. 注目アカウント・継続ウォッチ先

- **@gclue_akira** — Claude Code + Fusion360 + EasyEDA + ESP-IDF の「一人ハードウェア FDE」。本ハーネスの方向性と最も近い実践者
- **@ux_xu (Zenn)** — 「Fusion360 の Claude MCP サーバーの限界を追究する」連載。技術的に最深
- **テルえもん** (fusion360.teruemon.com) — 公式 MCP セットアップの最詳細ガイド
- **tomo1230 (神原友徳)** — 日本語圏 Fusion×MCP の草分け。Autodesk Expert Elite
