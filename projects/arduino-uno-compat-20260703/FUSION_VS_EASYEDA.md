# Fusion Electronics vs EasyEDA Pro — 同一 HLD からのエージェント回路設計比較

実施日: 2026-07-03
方法: 同一のハイレベル設計（`DESIGN.md`: Arduino UNO R3 互換機、40 部品 BOM 確定済み）を、それぞれのツールで Fable 5 サブエージェントに回路図設計させた。一次記録は `comparison/fusion-electronics-run.md` と `comparison/easyeda-run.md`。

## 前提条件と非対称性（先に明示）

- Fusion は法人ライセンス。公式 Fusion MCP（`127.0.0.1:27182/mcp`）経由、GUI 自動化はスコープ外
- EasyEDA Pro はオフラインモード。WebSocket ブリッジ + extension API 経由
- スコープは回路図設計まで（PCB レイアウトは含めない）
- **非対称性**: EasyEDA 側には前回ラン（7/2–3、回路図 + PCB 完遂）で蓄積したスキル文書・メモリがあり、BOM の device uuid も確定済み。Fusion 側は greenfield。この差は「ツーリング成熟度・攻略知識の永続化」として比較対象の一部と位置づける

## 結果サマリ

| | Fusion Electronics | EasyEDA Pro |
|---|---|---|
| 到達点 | **部品 0 個配置。回路図設計の入口で停止** | **完遂**: 40/40 部品・162 配線・42 ネット |
| 停止/完了理由 | 部品配置の非対話 API 経路が存在しない | 完了条件全達成 |
| ネットリスト検証 | 到達不能 | 幾何 union-find 162/162 + ネイティブ .enet 独立照合の**二重 PASS** |
| ERC | 到達不能 | エラー 0・警告 0 |
| 実働時間 | 調査含め数時間（壁の特定に投下） | **約 20 分** |
| API 呼び出し | 約 35 回（うち execute 24 回） | execute 28 回（内部 API 延べ 600 超をバッチ化） |
| ハング/障害 | **2 回**（モーダルダイアログで MCP 全体が 2 分ハング、GUI クリックでしか復旧不能） | **0 回**（全 execute 一発成功） |

## 何が差を生んだか

### 1. 書き込み API の有無（決定的）

- **Fusion Electronics**: `adsk.electron` Python API（245 メンバー・80 クラス）は**オブジェクトレベルで完全読み取り専用**。全プロパティに setter が無く、コレクションに `add` が無い。唯一の書き込み経路は `executeTextCommand("Electron.<cmd>")` の EAGLE コマンドブリッジだが、実際に書けるのは図形プリミティブ（矩形・フレーム・テキスト）のみ。核心の `ADD`（部品配置）は「対話式 Place-Component ブラウザを開く」に特別マップされており silent no-op かモーダル表示、`NET`/`WIRE` も silent no-op。`sch_sheet_placeinstance` は既存部品の複製専用で「最初の 1 個」を作れず鶏卵で詰む。全 6582 テキストコマンド中、ライブラリから部品を非対話配置するコマンドは存在しない
- **EasyEDA Pro**: `sch_PrimitiveComponent.create({libraryUuid, uuid}, x, y)` と `sch_PrimitiveWire.create(line, net)` が非対話で確実に動く。40 部品・162 配線とも失敗 0

### 2. 読み取り API は互角（Fusion がやや上）

Fusion の `fusion_mcp_electronics_read` は 50+ エンティティ型・フィルタ・ページング・スキーマリソース完備で、整理度は EasyEDA 以上。**差は書き込みの一点に集中している**。Fusion Electronics は「読んでレビューする」用途（既存基板のネット照会・部品表取得・設計監査）なら今日から使える。

### 3. 障害モードの質

- Fusion: 引数不足・名前解決不能のコマンドが**モーダルダイアログを開き、MCP サーバ全体がハング**。`terminateActiveCommand` も拒否され、AppleScript の GUI クリック以外に復旧手段がない。エージェント単独で回復不能な障害はオーケストレーション上の重大リスク
- EasyEDA: 確認ダイアログは DOM click で突破可能（ウィンドウ内で完結）。今回ランでは障害 0

### 4. 配線の意味論

EasyEDA の「ピン座標にスタブワイヤ + ネット名」というネットラベル意味論は、配線問題を**宣言的な pin→net 表**（175 行、コードレビュー可能・自動検証可能）に還元できる。グラフィカル配線の経路計算を完全に回避でき、エージェント適性が桁違いに高い。Fusion 側は部品が置けないため同等機構の有無は未検証（EAGLE の NET コマンド自体はブリッジで無効化されている）。

### 5. 自己監査能力

EasyEDA はピン/ワイヤ幾何の全量ダンプ → ローカル union-find、ネイティブ .enet(JSON) 照合、構造化 ERC 結果まで**全てヘッドレスで完結**する。「エージェントが自分の作業を自分で監査できる度合い」はエージェント CAD の中核比較軸であり、この軸で EasyEDA は完備、Fusion は（部品が置ければ）読み取り API で可能と推定されるが未達。

### 6. 攻略知識の永続化（交絡因子だが最大の教訓）

EasyEDA の初回ランは回路図 + PCB で丸 1 日超、今回は回路図 20 分・エラー 0。差分はほぼ全てスキル文書 + メモリの蓄積（sha256 プロジェクト作成ハック、スタブ配線モデル、0.01 inch 単位、ERC 呼び出し形、22pF ハング警告）。**エージェント CAD の生産性はツール自体の優劣と同じかそれ以上に「ハーネス側の知識蓄積」に支配される**。今回 Fusion 側で特定した壁とハング復旧手順も同様にメモリ・スキルに永続化した（`fusion-electronics-write-limits.md`）。

## 結論

1. **エージェントによる回路設計の主戦場は現時点で EasyEDA Pro 一択**。Fusion Electronics は書き込み API が公式に存在せず、非公式ブリッジも図形限定で、自動設計の対象として成立しない
2. **Fusion Electronics の使い所は読み取り**: 既存基板の設計監査・ネットリスト照会・部品表抽出は成熟した構造化クエリで可能。「EasyEDA で設計 → Fusion でメカ統合（基板外形/3D）+ 読み取りレビュー」という分業が現実的
3. Fusion MCP 側の運用ガードとして「Electronics 書き込み系テキストコマンドを叩かない」「引数不足の生 EAGLE コマンド禁止（モーダル → MCP 全体ハング）」を fusion360 スキルに反映すべき
4. 機械 CAD（Fusion Design、前ベンチで E2E 合格）と電気 CAD（Fusion Electronics、書き込み不可）で、**同じ公式 MCP でも自動化成立度がドメインごとに全く異なる**。「公式 MCP がある = エージェントで使える」ではない

## 今後

- Autodesk が Electronics 書き込み API / MCP ツールを追加するかのウォッチ（公式 MCP は 2026-04 リリースで発展途上）
- Fusion Design 側での基板外形 + ケースのメカ統合フロー検証（EasyEDA → STEP → Fusion）
- 物理プリント検証（保留中）と合わせた「EasyEDA 基板 + Fusion ケース」の一気通貫ベンチ
