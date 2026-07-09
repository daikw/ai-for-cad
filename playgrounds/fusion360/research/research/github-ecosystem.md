# Fusion 360 × AI エージェント(MCP)エコシステム調査

調査日: 2026-07-03。`gh search repos` / `gh api` によるスター数・push日時・README取得に基づく。実際の動作確認は行っていない(README記載ベース)。

## 1. リポジトリ比較表

### Fusion 360 専用 MCP サーバー

| 名前 | URL | Stars | Forks | 最終Push | アーキテクチャ | 主な提供機能 |
|---|---|---|---|---|---|---|
| AuraFriday/Fusion-360-MCP-Server | https://github.com/AuraFriday/Fusion-360-MCP-Server | 107 | 23 | 2026-01-28 | Fusion Add-in → 外部 "MCP-Link" サーバ(別リポジトリ, 依存)。任意Python実行 + generic API call方式 | Python任意実行(adsk.core/fusion/cam全アクセス)、SQLite、ブラウザ自動化、10+ビルトインMCPツール、Autodeskオンラインドキュメント取得、自動更新 |
| ArchimedesCrypto/fusion360-mcp-server | https://github.com/ArchimedesCrypto/fusion360-mcp-server | 77 | 17 | 2026-06-19 | FastAPIサーバ、**スクリプト生成のみ**(Fusion内では実行しない)。元々Cline向け | CreateSketch/DrawRectangle/DrawCircle/Extrude/Revolve/Fillet/Chamfer/Shell/Combine/ExportBody。tool_registry.jsonで拡張可能 |
| JustusBraitinger/Autodesk-Fusion-360-MCP-Server | https://github.com/JustusBraitinger/Autodesk-Fusion-360-MCP-Server | 52 | 16 | 2026-07-01(直近) | Fusion Add-in + Python MCPサーバ(uv経由、`mcp install`でClaude Desktop自動登録)、VS Code Copilot(HTTP/SSE)にも対応 | スケッチ(円/楕円/ポリライン/スプライン/3点円弧)、Box/Cylinder、Extrude/Revolve/Sweep/Loft/薄肉押し出し |
| faust-machines/fusion360-mcp-server | https://github.com/faust-machines/fusion360-mcp-server | 47 | 8 | 2026-04-27 | Add-in(TCP :9876, CustomEventでメインスレッド実行) + stdio MCPサーバ(PyPI配布 `uvx fusion360-mcp-server`) | **84ツール**。パラメトリック/ダイレクトモード判定、シートメタル(フランジ/ベンド/展開)、サーフェス操作、ジョイント/アセンブリ、undo(設計モード安全ガード付き) |
| Misterbra/fusion360-claude-ultimate | https://github.com/Misterbra/fusion360-claude-ultimate | 48 | 14 | 2026-04-20 | Node.js MCPサーバ ⇄ ファイルベース通信(`fusion_command.txt`/`fusion_response.txt`)⇄ Fusion Add-in(0.5秒ポーリング)。Kanbara Tomonori氏の概念のフランス語ローカライズ版 | 84+ツール。形状生成(cube/cylinder/sphere/torus/pipe/多角柱)、スケッチ系、シェル/穴(皿穴/座ぐり)、ねじ、マテリアル、STL/STEP/F3Dエクスポート、ビューポートスクリーンショット、マクロ一括実行 |
| Joe-Spencer/fusion-mcp-server | https://github.com/Joe-Spencer/fusion-mcp-server | 46 | 8 | 2025-04-22(**約14ヶ月停滞**) | Fusion Add-in内蔵MCPサーバ(HTTP SSE `:3000` + ファイルベースのフォールバック) | resources(design-structure/parameters)、tools(message_box/create_new_sketch/create_parameter)、prompts(sketch/parameter設定ガイド)。機能は薄い |
| Joelalbon/Fusion-MCP-Server | https://github.com/Joelalbon/Fusion-MCP-Server | 32 | 7 | 2025-06-12(**約13ヶ月停滞**) | 独自TCP JSONソケットプロトコル(サーバ/クライアント/Add-in三層) | create_circle等の基本コマンド、LLM統合(OpenAI経由、任意) |
| ndoo/fusion360-mcp-bridge | https://github.com/ndoo/fusion360-mcp-bridge | 14 | 10 | 2026-03-27 | Add-in(HTTP, Bearerトークン認証) + Pythonサーバ。ツールは**2つのみ**に極小化 | `fusion_execute`(任意Python実行、adsk.*フルアクセス) + `fusion_screenshot`(PNG取得)。Fusion API知識は`CLAUDE.md`に集約しClaudeが起動時に自動読込 |
| rahayesj/ClaudeFusion360MCP | https://github.com/rahayesj/ClaudeFusion360MCP | 10 | 11 | 2025-12-17 | ファイルベース通信(`~/fusion_mcp_comm/`ポーリング) | スケッチ/3D操作/パターン/コンポーネント/エクスポート一式。単位はcm固定(mm換算の注意書きあり)。`SKILL.md`と`SPATIAL_AWARENESS.md`をClaude Project Instructionsに貼る運用を推奨 |

### 周辺・派生 / 個人翻案(小規模, 参考程度)

- jaskirat1616/fusion360-mcp (8★), mycelia1/fusion360-mcp-server (4★), fozzfut/FusionMCP (4★), ncmlabs/fusion360_mcp (3★), 3DCreationsByChad/fusion360-cam-assistant (3★, AuraFriday派生のCAM特化) — いずれも小規模、更新頻度低、UNKNOWN多数。
- tomo1230 (Kanbara Tomonori氏、Autodesk Certified Fusion 360 Expert Elite) — 複数のMCP実装(`fusion_mcp_server`, `claude_fusion_mcp_server`, `codex_fusion_mcp_server`, `gemini_fusion_mcp_server`, `Antigravity_fusion_mcp_server`)を持つが、いずれもスター数は1〜4と低く非公開度が高い。ただしMisterbra版の「原典」として言及されており、日本語圏でのFusion360×MCPの草分け的存在と推測される(note記事で概念を公開)。**UNKNOWN**: これらのリポジトリ自体は非常に薄い可能性があり、実質的な実装はMisterbra版で肉付けされている。

### 代替アプローチ: Code-CAD 系 MCP(比較対象)

| 名前 | URL | Stars | 特徴 |
|---|---|---|---|
| neka-nat/freecad-mcp | https://github.com/neka-nat/freecad-mcp | **1225** | Fusion系を圧倒する規模。Forks 183, Open issues 20, 直近push 2026-06-28。FreeCAD(無償OSS)をClaude/Cursor等から操作。CAD MCPエコシステム全体で最大勢力 |
| bonninr/freecad_mcp | https://github.com/bonninr/freecad_mcp | 199 | 同系統の別実装 |
| contextform/freecad-mcp | https://github.com/contextform/freecad-mcp | 89 | OSS版 |
| jhacksman/OpenSCAD-MCP-Server | https://github.com/jhacksman/OpenSCAD-MCP-Server | 163 | プロンプト→OpenSCADコード生成→プレビュー画像+3Dファイル出力(Devin製) |
| quellant/openscad-mcp | https://github.com/quellant/openscad-mcp | 108 | OpenSCADモデリング&レンダリングMCP |
| Svetlana-DAO-LLC/cad-agent | https://github.com/Svetlana-DAO-LLC/cad-agent | 26 | build123d + MCP、3Dプリント向けAI駆動CADモデリング |
| rishigundakaram/cadquery-mcp-server | https://github.com/rishigundakaram/cadquery-mcp-server | 14 | CadQueryでのCAD生成・検証ツール |
| pzfreo/cadgenbench-build123d | https://github.com/pzfreo/cadgenbench-build123d | 1 | Claude Code + build123d-mcp によるCADGenBench再現パイプライン(ベンチマーク文脈で有用) |

**観察**: FreeCAD MCP(neka-nat, 1225★)はFusion 360系トップ(AuraFriday, 107★)の**11倍以上**のスター数を持つ。これは(a) FreeCADが無償OSSでライセンス障壁がない、(b) Fusion 360はクラウド専有ソフトでAPI公開範囲・アドイン配布に制約がある、(c) OpenSCAD/build123d/CadQueryのようなcode-first CADはそもそもテキスト生成と相性が良く、AIエージェントとの親和性が構造的に高い、という3点に起因すると推測される(UNKNOWN: 定量的な要因分解は未実施)。

### Claude Code スキル / CADプラグイン

- `awesome-claude-code`系の主要キュレーションリスト(hesreallyhim/awesome-claude-code 47.8k★等)を検索したが、CAD専用エントリは確認できなかった(UNKNOWN: 見落としの可能性あり)。
- `gh search code` で `SKILL.md` 内の "CAD"+"fusion" を検索した結果:
  - `majiayu000/claude-skill-registry-data/data/cad-engineering/SKILL.md` — CADエンジニアリング全般の汎用スキル(Fusion 360はSaaS CAD例の一つとして言及される程度)
  - `peytoncasper/modeling/skills/fusion-camera/SKILL.md` — Fusion360からのSTL/STEP/IGESエクスポート・カメラ制御に特化した小規模スキル(リポジトリ自体は1★、更新は2026-03-02が最後)
  - `ffsshhttiikk/opencode-agents-skills/cad/SKILL.md` — OpenCode向けの汎用CADスキル(Fusion 360を選択肢の一つとして記載)
  - いずれも小規模で、Fusion 360専用の成熟したClaude Code Skillとしては**未確立**という評価が妥当。

## 2. 有望トップ3の詳細評価

### 1位: faust-machines/fusion360-mcp-server(47★、直近更新 2026-04-27)

- **アーキテクチャ**: Fusion Add-in(TCP `:9876`でメインスレッド実行を保証、CustomEventで安全にAPIコール) ⇄ 独立したPython MCPサーバ(stdio、PyPI配布済み `uvx fusion360-mcp-server --mode socket`)。Claude Code / OpenCode / Codex / Cursor等どのMCPクライアントからも `claude mcp add` 一発で導入可能。
- **提供ツール**: 全MCPサーバ中で最多かつ最も体系的な**84ツール**。シート単価的な特徴として、`get_design_type`/`set_design_type`でパラメトリック/ダイレクトモードを明示チェックし、`undo`にも設計モード安全ガードを実装している点は他実装に見られない堅牢さ。サーフェス操作(patch/stitch/thicken/ruled/trim)、シートメタル、ジョイント/アセンブリまでカバーし、単なる基本形状生成に留まらない。
- **成熟度**: MITライセンス、Open issues 2件(devcontainer対応要望、機能追加要望)といずれも前向きな内容で炎上系issueなし。READMEの構成・ドキュメント品質が高い。ただし2025年2月開始と比較的新しく、コミュニティ規模はまだ小さい。
- **推奨理由**: パッケージ配布(PyPI)されており「リポジトリをcloneしてパスを手打ち」という他実装特有のセットアップの脆さがない。ツール粒度が細かく型安全(discrete tool呼び出し)なため、AIが誤った引数で壊れたジオメトリを作るリスクを他実装より抑えられる設計思想が読み取れる。

### 2位: AuraFriday/Fusion-360-MCP-Server(107★、直近更新 2026-01-28、スター数最大)

- **アーキテクチャ**: 他とは一線を画す。Fusion Add-inは「MCP-Link Server」という別プロダクト(同Author, 13★, 別リポジトリ)に接続するリモートツールとして動作。単体のFusion専用MCPというより、汎用MCPプラットフォームのFusion向けコネクタという位置付け。Autodesk公式アプリストアにも掲載(店舗リンクあり)されている点は他候補にない公式流通チャネル。
- **提供ツール**: discrete toolセットではなく「**任意Pythonをメインスレッドで実行**」+「generic API call」が中核。SQLite、ブラウザ自動化、500+モデルへのOpenRouter接続、Windowsデスクトップ自動化などFusion外のツールまで統合された野心的な設計。Autodesk公式ドキュメント(cloudhelp)からのサンプルコード取得や「ベストプラクティス」取得ツールもあり、AIの自己修正ループを支援する設計思想が見える。
- **成熟度**: スター数は最大だが、Open issues 5件には「公式プラグインが存在しない」「Windows SSL証明書問題」「Broken pipe」「ドキュメント不足」「DNS Rebindingでローカルhttps MCP接続がサイレントにブロックされる重大インストール問題」など、**セットアップ・接続層の未解決issueが目立つ**。任意Python実行という強力さゆえに、セキュリティ境界(ローカルとはいえ任意コード実行)にも留意が必要。
- **推奨理由**: 「Fusionのどんな操作でもPythonで叩ける」自由度の高さと、公式ストア掲載という信頼性で選ぶ価値はあるが、セットアップの安定性はfaust-machines版に劣る。ツール実装ではなく汎用プラットフォームとしての採用を検討する場合向き。

### 3位: ndoo/fusion360-mcp-bridge(14★、2026-03-27作成/更新、スター数は少ないが設計思想が際立つ)

- **アーキテクチャ**: 「ツールは2つだけ(`fusion_execute`, `fusion_screenshot`)、知識は全部CLAUDE.mdに置く」という明確に対極の設計思想。HTTP + 共有シークレット(Bearerトークン、`~/.fusion-mcp-secret`、`chmod 600`)による最低限のローカル認証を実装している点は、他の多くの実装(認証なしのローカルソケット/ファイルポーリング)より丁寧。
- **提供ツール**: 意図的に最小。その代わり `CLAUDE.md` に「Fusionは全ジオメトリをcm単位で保持する」「revolve時のプロファイルが回転軸をまたぐと失敗する」「`addByThreePoints`を使えばsphereの向き取り違いを回避できる」等、**実際にハマった経験由来の運用知見が非常に濃い**(後述の運用知見参照)。
- **成熟度**: スター数・実績は小さいが、macOS向け `quickstart-mac.sh` ワンショットセットアップスクリプトがあり、`~/.claude/settings.json` へのパッチも自動化されている。Open issues 5件は主に機能要望レベル。
- **推奨理由**: 星の数では劣るが、「AIエージェントに何を渡すべきか(discrete toolの数を絞り、ドメイン知識をプロンプト側/CLAUDE.md側に寄せる)」という設計思想はこのプロジェクト(ai-for-cad、CLAUDE.mdでコンセプト先行のモデリングを掲げる方針)と最も相性が良い。faust-machines版のツール群と組み合わせて、「discrete toolで安全に土台を作りつつ、edge caseはfusion_execute的な任意実行で逃がす」ハイブリッド設計の参考にできる。

## 3. アーキテクチャパターンの分類

Fusion 360専用MCP実装は、通信方式とツール粒度の2軸でおおむね次のように分類できる。

**通信方式**
1. **HTTP/TCPソケット(常駐サーバ)**: faust-machines(TCP:9876)、ndoo(HTTP+Bearer認証)、JustusBraitinger(SSE)、Joelalbon(独自TCP JSON) — レイテンシが低く安定。認証まで実装しているのはndooのみ。
2. **ファイルベースポーリング**: Misterbra(0.5秒ポーリング)、rahayesj(`~/fusion_mcp_comm/`) — 実装が単純な反面、レイテンシとファイルI/O競合のリスクを抱える。
3. **外部プラットフォーム接続**: AuraFriday(MCP-Linkという別プロダクトのリモートツールとして接続) — 汎用性は高いが依存コンポーネントが増える。

**ツール粒度**
1. **Discrete tool方式(型付き個別ツール)**: faust-machines(84)、Misterbra(84+)、rahayesj、JustusBraitinger — `create_sketch`/`extrude`/`fillet`のようにAPI呼び出しを1機能=1ツールにマッピング。AIが誤操作しにくく検証しやすいが、実装側がカバーしていない操作はできない。
2. **任意コード実行方式**: AuraFriday(`execute_python`)、ndoo(`fusion_execute`) — Fusion APIの全機能に到達できる代わり、AIが書いたコードの正しさに強く依存する。ドキュメント・ベストプラクティスの外部注入(AuraFridayのオンラインdocs取得、ndooのCLAUDE.md)で失敗率を下げる工夫がある。
3. **スクリプト生成方式(非実行)**: ArchimedesCrypto — MCPサーバーはFusion Python scriptを**生成するだけ**で、ユーザーが手動でFusionのスクリプトエディタに貼り付けて実行する。ライブ接続を持たないため、Fusionとの双方向フィードバック(現在の設計状態の参照、スクリーンショット取得等)ができない点が構造的な制約。

Fusion 360系はいずれもDesktop添付ソフト(添付Add-in必須)である制約上、**ヘッドレス実行不可**・**メインスレッド制約**(UIスレッド外からのAPI呼び出しはクラッシュ要因になるためAuraFridayやfaust-machinesはCustomEvent/Work Queueで明示的にメインスレッドディスパッチしている)という共通の技術的制約に対処する必要がある。これに対し、FreeCAD・OpenSCAD・build123d/CadQueryのようなcode-CAD系はコマンドラインでヘッドレスレンダリング可能なため、MCP実装がシンプルになりやすく、エコシステム規模(スター数)でFusion系を大きく上回っている。

## 4. READMEから得た運用知見

- **単位はcm固定という罠**: rahayesj、他複数実装で「Fusion内部は常にcm単位、mmで指定したい場合は`/10`する」という注意書きが繰り返し登場する。50mmのつもりで`50`と入力すると500mm(50cm)になる誤りが「最も一般的なエラー」と明記されている(rahayesj README)。
- **revolveプロファイルが回転軸をまたぐと失敗する**(ndoo CLAUDE.md): Fusionのカーネルは、プロファイルの一部でもx≥0とx≤0の両側にまたがると、たとえ端点が原点上でもrevolveを拒否する。`addByCenterStartSweep`は回転方向の向きが不定になりがちで、`addByThreePoints`を常用する方が安全、という具体的知見が記録されている。
- **profiles.count == 0 のチェックリスト**(ndoo CLAUDE.md): 「開いた輪郭(端点未接続)」「重複エッジ(面積ゼロ領域)」「回転軸上に両端点がある」「間違ったスケッチ平面」の4点を機械的にチェックする運用が推奨されている。
- **パラメトリック/ダイレクトモードの明示的な確認が必須**(faust-machines, ndoo): `TemporaryBRepManager`で作ったボディはパラメトリックモードでは`BaseFeature`でラップしないとタイムラインに乗らない。undo操作もモードによって挙動が変わるため、faust-machinesは`undo`ツールに「設計モード安全ガード」を実装している。
- **メインスレッド制約とクラッシュ回避**: AuraFridayは「Work queueシステムによりすべてのFusion API呼び出しをメインスレッドで実行、ゼロクラッシュ」を2025年11月のアップデートの目玉として明記。逆に言えば、それ以前(または他実装)はマルチスレッド起因のクラッシュが実運用上の課題だったことが示唆される。
- **セットアップの脆さが最大のボトルネック**: AuraFridayのissueに見られる「DNS Rebindingでローカルhttps接続がサイレントに失敗」「Windows SSL証明書」「Broken pipe」は、いずれもコード品質ではなくローカルネットワーク/証明書まわりの接続確立の問題。Fusion Add-inとMCPサーバー間のローカル通信確立は、どの実装でも軽視できない失敗ポイントであることがうかがえる。
- **exportとscreenshotがAIの自己検証ループの要**: Misterbra/faust-machines/rahayesj/ndooいずれもSTL/STEPエクスポートやビューポートスクリーンショット取得ツールを持つ。ndooは「エージェントがジオメトリを目視確認できる」ことを2ツールのうち1つに割く設計判断をしており、視覚フィードバックの重要性が複数実装で共通して意識されている。
- **ドキュメントをコード外(CLAUDE.md/SKILL.md)に切り出す運用**: ndoo(`CLAUDE.md`、セッション開始時に自動読込)、rahayesj(`SKILL.md`をClaude Projectのinstructionsに貼る運用を明示的に推奨)は、Fusion API特有の落とし穴をツール実装ではなくプロンプト層に持たせる設計。ツール数を絞り込む代わりにドメイン知識を言語化して注入する、というこのプロジェクトのCLAUDE.md運用方針(コンセプト先行、完了条件の明文化)と直接参考になるパターン。

## UNKNOWN(未確認事項)

- 各実装の実際の動作安定性(READMEの主張のみで、動作検証は未実施)
- tomo1230氏の各リポジトリの実装内容の詳細(非公開/情報薄いためスター数以外の実態は未確認)
- awesome-claude-code系リストにFusion 360専用エントリが本当に存在しないか(検索網羅性に限界あり)
- AuraFridayのAutodesk公式ストア掲載が実際にAutodeskによる審査・承認を経たものか、単なるサードパーティ登録枠か
