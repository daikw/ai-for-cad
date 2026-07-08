# Fusion 360 × Claude/AIエージェント 英語圏Web調査

調査日: 2026-07-03（Web検索・WebFetchによる一次情報収集、捏造なし）

## 1. ソース一覧（URL / 日付 / 要旨）

### 公式・準公式

| ソース | 日付 | 要旨 |
|---|---|---|
| [Introducing the Fusion MCP: Opening Fusion to AI-Powered Workflows](https://www.autodesk.com/products/fusion-360/blog/introducing-the-fusion-mcp-opening-fusion-to-ai-powered-workflows/) | 2026-04-22頃（本文403で直接読めず、engineering.comの二次情報で補完） | Autodesk公式ブログ。Fusion MCPの発表 |
| [Autodesk announces Fusion MCP servers and more AI updates - Engineering.com](https://www.engineering.com/autodesk-announces-fusion-mcp-servers-and-more-ai-updates/) | 2026-04-22 | Autodeskが2種類の公式MCPサーバーをリリース：**Autodesk Fusion MCP**（ローカル動作、Fusion本体必須、Claude Desktop/Cursor/任意のMCP対応HTTPクライアントと互換）と、**Autodesk Fusion Data MCP**（リモート動作、Fusion不要、クラウドAPI経由で設計データ照会、Claude Desktop/VS Code対応）。Autodesk Assistant も Fusion/Inventor/Moldflow/Vault 横断に拡張、AIレンダリング機能も追加 |
| [Bringing Fusion onto Claude for Creative Work - Autodesk Platform Services blog](https://aps.autodesk.com/blog/bringing-fusion-claude-creative-work) | 2026-04-28 | Fusion Model Context Protocols (MCPs) 経由でClaudeがFusion環境に直接接続。オープン標準としてAIツールとFusion間の安全境界を設計。ワークフロー例：自然言語→デザインアクション変換、繰り返しモデリングの自動化、コンセプト→製造可能出力への迅速な移行。「Manufacturable outcome requires engineering rigor, precision, and domain data」と明記し、実行はFusion内に留まる旨を強調 |
| [Fusion Comes to Claude for Creative Work - Fusion Blog](https://www.autodesk.com/products/fusion-360/blog/fusion-comes-to-claude-for-creative-work-bringing-ai-directly-into-the-design-workflow/) | 2026-04頃 | 上記と対をなす発表記事。Autodesk幹部コメント「デザインツールはあらゆる場所から利用可能になるべき」 |
| [Connect Claude to Fusion to start designing with AI - Autodesk campaign page](https://www.autodesk.com/campaigns/fusion-360/claude-fusion) | 常時更新 | 公式キャンペーンLP。Autodesk×Anthropicパートナーシップ、Claudeのデスクトップ機能（音声・視覚・Web検索・クロスサービス連携）をデザインフローに統合 |
| [Claude for CAD arrives with Blender and Autodesk Fusion connectors - DEVELOP3D](https://develop3d.com/ai/claude-for-cad-blender-autodesk-fusion/) | 2026-04-29 | 業界メディアの分析記事。AnthropicがBlender Development Fundのパトロンに。Text-to-CAD新興企業への競争圧力、大手CADベンダーが「ジオメトリカーネル」的役割に押し出される可能性を指摘 |

### 批判的・分析的視点

| ソース | 日付 | 要旨 |
|---|---|---|
| [Autodesk Fusion MCP: Faster CAD, Same Bottleneck - CoLab Software](https://www.colabsoftware.com/post/autodesk-fusion-mcp-faster-cad-same-bottleneck) | 2026-05-19更新 | CoLab社プロダクトマネージャー（元メカトロニクスエンジニア）による批判的分析。「CADが速くなっても、既に過負荷の設計レビュープロセスに設計を送り込むだけ」。90%の企業が後期設計変更による遅延を経験している統計を引用。製造可能性・公差スタック・サプライヤー要件・企業固有標準への非対応を指摘 |
| [Natural Language Mechanical Design: FusionMCP Demonstrates AI-Driven CAD - Fabbaloo](https://www.fabbaloo.com/news/natural-language-mechanical-design-fusionmcp-demonstrates-ai-driven-cad) | 直接本文取得不可（403） | タイトルからコミュニティ製FusionMCPデモの3Dプリント業界向け報道と推測されるが未検証 |
| [9 MCP Servers for CAD with AI - Snyk](https://snyk.io/articles/9-mcp-servers-for-computer-aided-drafting-cad-with-ai/) | 記事内時期不明 | セキュリティ企業Snykによる横断比較。Fusion 360系MCPはツール数1〜11個と実装により差が大きく、AutoCAD（35+ツール）やOnshape（18ツール）に比べ成熟度で劣ると評価。カスタムコード実装時の脆弱性スキャンを推奨 |

### コミュニティ製OSSプロジェクト（GitHub）

| リポジトリ | 要旨 |
|---|---|
| [ndoo/fusion360-mcp-bridge](https://github.com/ndoo/fusion360-mcp-bridge) | ツールはわずか2つ（`fusion_execute`: 任意Pythonスクリプトを`adsk.*` API全アクセスで実行、`fusion_screenshot`: ビューポートをbase64 PNGでキャプチャ）とミニマル設計。macOS向けクイックスタートスクリプトあり。共有秘密トークンによるBearer認証、127.0.0.1のみバインドなどセキュリティ配慮あり。Fusion Python APIがメインスレッド限定という制約を明記 |
| [rahayesj/ClaudeFusion360MCP](https://github.com/rahayesj/ClaudeFusion360MCP) | 「難しかったのはコードではなく、Claudeに3D空間のどこに何があるかを理解させることだった」と明言。`SPATIAL_AWARENESS.md`という専用skillファイルで、Fusion座標系規約・単位（デフォルトcm）・組立配置のベストプラクティス・**「XZ/YZ平面のZ符号反転ルール」**という空間推論の落とし穴を教える。既知の頻出エラー：単位混同（mm/cm取り違えで10倍サイズ違い）、タイムアウト（Fusion/アドイン未起動）、座標系誤解 |
| [Misterbra/fusion360-claude-ultimate](https://github.com/Misterbra/fusion360-claude-ultimate) | Kanbara Tomonori氏のオリジナル概念をフランス語ローカライズしたアダプテーション。Claude Desktop経由でFusion 360をMCPで自然言語制御 |
| [faust-machines/fusion360-mcp-server](https://github.com/faust-machines/fusion360-mcp-server) | Snyk記事評価で最も完成度が高いとされる実装。11ツール、FastAPI+Uvicornによるオプションのhttpサーバーモード対応。「開発中でAPI/ツール挙動はリリース間で変わりうる」と明記 |
| [AuraFriday/Fusion-360-MCP-Server](https://github.com/AuraFriday/Fusion-360-MCP-Server) | Issue #4「Lack of proper documentation」など、MCP設定方法の実例不足がユーザーから指摘されている。2026年1〜4月に複数Issueがオープン |
| [Joe-Spencer/fusion-mcp-server](https://github.com/Joe-Spencer/fusion-mcp-server) | Claude/Cursor等のAIクライアント向けADSKリソース・ツール提供を謳う |

### 個人ブログ・実践レポート

| ソース | 日付 | 要旨 |
|---|---|---|
| [Connecting Claude to Fusion 360: An Example of Editing STEP Models With AI - knightli.com](https://knightli.com/en/2026/05/14/claude-fusion-360-mcp-step-model-edit/) | 2026-05-14 | 実体験ブログ。惑星歯車インデクサーの改造（ねじ固定→ベアリング回転式）を題材に、Claude+Fusion 360 MCPの実践プロセスを詳細記録。プロンプト例、材料/工程指定の重要性、AI編集結果の視覚検証だけでは不十分という教訓を記載（詳細は3節） |
| [Claude AI And Autodesk Fusion 360: Automating CAD - ASTCAD](https://astcad.com.au/claude-ai-autodesk-fusion-360-cad-automation/) | 記事内時期不明 | オーストラリアのCAD専門メディアによる実践ガイド。構造化仕様の提示例（垂直板150mm×100mm、M16穴2個、AS/NZS 3678 Grade 350等）、反復修正フロー、材料規格の明示による精度向上を具体例付きで解説 |

### Hacker News

| ソース | 日付 | 要旨 |
|---|---|---|
| [Show HN: AI CAD Harness - Hacker News](https://news.ycombinator.com/item?id=47977694) | 2026-05-06頃 | Adam（AI CADコパイロット、Onshape/Fusion対応）のShow HN投稿。創業者Zach曰く「本気のエンジニアはブラックボックスのtext-to-CADツールを拒否し、使い慣れたCADツール内でのフル可視性・制御を伴う支援を求める」。「CAD as code」アプローチ（スクリーンショットではなくPython/FeatureScriptでモデル操作）。コメント欄では懐疑論多数：モデリング自体はエンジニアリング業務の5〜20%に過ぎない、「正確なプロンプトを書く方がスペースマウスで直接操作するより時間がかかることが多い」、ハルシネーションによる誤計算を見逃すリスクへの懸念、トークン課金の不透明性への批判、FreeCAD等OSS対応を求める声とプロ用CADの優位性を主張する反論の応酬 |
| [Show HN: Hestus – AI Copilot for CAD](https://news.ycombinator.com/item?id=41437846) | 時期不明（旧投稿） | Fusion特化ではないが、AI CADコパイロット領域の隣接事例として参照可 |

### X (Twitter) 上の実演事例

| ソース | 日付 | 要旨 |
|---|---|---|
| [David Bar (@observie)](https://x.com/observie/status/2050585184714576123) | 時期不明 | 「Fusion 360 MCPサーバーの有効化方法。Claudeが Fusion APIを検索し、コマンドを実行し、アクティブビューを見られるようになる」という実演ツイート |
| [Scott Ullrich (@sullrich)](https://x.com/sullrich/status/1885827827213177162) | 時期不明（比較的初期） | 「Claude/MCPプラグインをFusion 360と連携させて書いた。1ショット初回試行にしては悪くない結果」という初期実験報告 |

### 隣接製品（比較対象として有用）

| ソース | 要旨 |
|---|---|
| [Adam CAD Copilot](https://adam.new/) / [Onshape App Store掲載](https://www.onshape.com/en/blog/adam-ai-app-store-cad-co-pilot) | Onshape/Fusion両対応のAIコパイロット。フィーチャーツリー整理・リネーム・冗長フィーチャー統合・ハードコード値のパラメータ化を自動化。Onshape App Storeで無料オープンベータ公開 |

---

## 2. 実証済みワークフロー

### (A) 公式 Autodesk Fusion MCP / Fusion Data MCP（2026年4月発表）

- **Fusion MCP**：ローカル動作、Fusion本体が起動している必要あり。Claude Desktop、Cursor、その他任意のMCP対応HTTPクライアントと互換。スケッチ（プリミティブ・拘束・寸法）、3Dモデリング（押し出し・回転・ロフト・スイープ・シェル・フィレット・ブーリアン演算）、アセンブリ管理（コンポーネント作成・ボディ移動・ジョイントタイプ定義）に対応
- **Fusion Data MCP**：リモート動作、Fusion本体不要。Autodeskクラウドサービス経由で設計データを照会・管理。Claude Desktop、VS Codeと互換
- 典型ワークフロー：既存STEPファイルを開く → Claudeが現行モデルを読み取る → 構造的な干渉を解析 → 寸法を計画 → Fusionプラグイン経由でモデリング変更を実行

### (B) コミュニティ製ブリッジ（ndoo/fusion360-mcp-bridge型）

- Fusion側にPythonアドインを常駐させ、ローカルHTTPサーバー（デフォルトポート7654）でClaude Codeからのリクエストを受信
- ツールをミニマルに絞る設計思想：`fusion_execute`（任意Pythonを`adsk.*` APIフルアクセスで実行）+ `fusion_screenshot`（ビューポートをbase64 PNGでキャプチャし視覚検証）の2つだけで、あとはClaude自身にFusion APIの知識でPythonコードを都度生成させる
- Bearer トークン認証 + 127.0.0.1バインドのみでローカル完結、外部通信なし

### (C) STEPモデルの反復編集ループ（knightli.comの実例）

1. 既存STEPモデルをFusionで開く
2. Claudeにスクリーンショットで現状モデルを見せる（視覚理解が機能することを確認済み）
3. 改造目標（穴の拡大、干渉するネジ穴の移動、ベアリングシート追加、エッジのチャンファー）を伝える
4. Claudeが編集スクリプトを生成・実行
5. **視覚検証だけでは不十分** → 実際にFDM印刷してベアリングの回転滑らかさ等、0.1mm単位の公差が影響する要素を物理検証する

### (D) フィーチャーツリー志向のエージェント連携（Adam型）

- スクリーンショットベースの視覚理解ではなく、フィーチャーツリー構造・パラメータ・FeatureScript/Python APIを直接操作する「CAD as code」アプローチ
- 既存ジオメトリを尊重し、目的に応じて再構築要否を判断（無闇に全部作り直さない）

---

## 3. プロンプト・ハーネス設計のコツ

### 単位・座標系の明示

- Fusion 360のPython APIは**内部的に常にcm単位**（表示設定に関わらず）。mm/cm取り違えによる10倍サイズ違いが最頻出エラー（ClaudeFusion360MCP repo）
- XZ平面・YZ平面では**Z軸符号が反転する**という「Z-negation rule」を専用skillファイルで教え込む必要がある（同上）。座標系の誤解は「操作前後の検証」でしか防げないと明記
- Windows環境でもパス区切りは常にフォワードスラッシュを使うこと（同上の必須要件）

### 製造プロセス・材料の事前明示（最重要の教訓）

- knightli.comの実例で強調されている推奨プロンプト文言：
  > "This model is for FDM 3D printing, using PLA. The goal is to install a 6mm bearing, so printing tolerance and press fit should be considered. Do not handle it as CNC metal machining tolerance."
- **これを省略すると、ClaudeはデフォルトでCNC金属加工的な公差設定をしてしまい**、3Dプリント後に組み立て不能になるケースが報告されている
- ASTCADの実例でも同様に、「鋼製ブラケット」のような曖昧な材料指定ではなく「AS/NZS 1734 アルミニウム合金5052-H32、2mm厚」のように規格・厚み・グレードまで明示することで生成精度が向上すると報告

### 反復修正フロー

- 初回生成→問題点を具体的に指摘（例：「ガセットが別ボディになっている」）→改善指示（例：「すべて統合し3mmフィレット追加」）という段階的ループが有効（ASTCAD）
- 用途・組立方法・材料・製造プロセスを**最初に**述べることが、後から気づいて手戻りするより効率的（knightli.com）

### 適したジオメトリの見極め

- プリズマティック形状・板金・パラメトリック形状はスクリプト生成に向く
- 有機曲面・Class-A自動車サーフェスのような高度な曲面はスクリプト生成に不向き（ASTCAD）

### skillファイル／プロジェクト設定によるドメイン知識の注入

- ClaudeFusion360MCPの開発者は「技術的なアーキテクチャは二の次で、本当に難しかったのはClaudeが確実に適用できる空間推論知識をどうエンコードするかだった」と総括
- 具体的には、Claude Projectのカスタム指示（プロジェクトナレッジ）にskillファイル（`SPATIAL_AWARENESS.md`等）の内容を読み込ませ、操作前後の幾何検証手順を必須化する構成

---

## 4. コミュニティが指摘する制約・落とし穴

### 技術的制約

- **メインスレッド制約**：Fusion 360のPython APIはスレッドセーフでなく、すべての操作をメインUIスレッドで実行する必要がある（複数リポジトリで共通して言及）
- **タイムアウトエラー**：Fusion本体やアドインが起動していないと発生。ローカルMCPは常にFusionプロセスへの依存が前提
- **「No bodies」エラー**：ジオメトリが未作成の状態で操作しようとすると発生。スケッチ依存ツールはアクティブなスケッチが必須
- **ドキュメント不足**：AuraFriday/Fusion-360-MCP-ServerのIssue #4など、AIエージェント向けMCP設定の実例が見つからないという苦情が複数プロジェクトで共通
- **実装成熟度のばらつき**：Snykの比較記事によれば、Fusion系MCPサーバーはツール数1〜11個とプロジェクトごとに差が大きく、AutoCAD（35+ツール）やOnshape（18ツール）と比べて未成熟

### ワークフロー・組織的な限界（CoLab Software社の批判）

- 「CADモデリングが速くなっても、既に過負荷状態にある設計レビュー工程に、より多くの設計案を押し込むだけ」というボトルネック移動の指摘
- 90%の企業が後期段階の設計変更による遅延を経験しているという統計を引用し、**AIによるCAD高速化だけでは製品化リードタイム短縮に直結しない**と主張
- 製造可能性（manufacturability）、公差スタックアップ、サプライヤー要件、企業固有の設計標準・過去の教訓の取り込みには非対応。これらへの投資なしにCAD生成だけを加速しても効果は限定的

### コミュニティの懐疑論（Hacker News, Show HN: AI CAD Harness）

- 複数のメカニカルエンジニアが「モデリング自体はエンジニアリング業務の5〜20%に過ぎない」と指摘し、text-to-CADの必要性そのものに疑問を呈している
- 「正確な文章プロンプトを書く方が、スペースマウスで直接操作するより時間がかかることが多い」という実務者の声
- AI生成結果の「ハルシネーションによる誤計算」を見逃すリスクへの強い懸念（「生成されるすべての詳細をふるいにかける」負担）
- トークン課金の不透明性に対する批判（LLM性能への影響力を持てないままトークンを消費させられることへの不満）
- FreeCAD等オープンソースCADへの対応を求める声がある一方、「プロフェッショナルCADはジオメトリ能力でOSSを圧倒する」という反論も存在し、意見は割れている

### 法的・責任面の明確な線引き

- ASTCADの記事は「Claude cannot take engineering responsibility」と明記。生成スクリプト・モデルの構造安全性検証は依然として設計者（人間）の責務であることが強調されている
- Autodesk公式ブログも「Manufacturable outcome requires engineering rigor, precision, and domain data」とし、AIの役割をあくまで設計プロセスの加速に限定している

### 精度検証の限界

- knightli.comの実例では、「AI編集結果は画面表示（視覚）だけでは判断できない」と明言。0.1mm単位の公差が機能（ベアリングの回転滑らかさ等）を左右するケースでは、実物プリント・組立による物理検証が必須とされている

---

## 5. コミュニティの温度感

- **2026年4月にAutodesk公式のFusion MCP／Fusion Data MCPが発表されたことが最大の転換点**。それ以前はコミュニティ製の非公式MCPブリッジ（ndoo, Misterbra, faust-machines, AuraFriday等、GitHub上に少なくとも6〜7の独立実装が乱立）が先行して実験されており、公式化によって「野良実装から標準化された公式ツールへ」の移行期にある
- ただし公式MCPも発表から日が浅く（本調査時点で2〜3ヶ月）、ドキュメント不足・成熟度不足を指摘する声はコミュニティ製実装と同様に残っている
- Hacker Newsのコメント欄に見られるように、**現場のメカニカルエンジニアの反応は「懐疑的だが無視はできない」という温度感**。text-to-CADのような完全ブラックボックス生成には強い拒否感がある一方、「既存のCADツール内でフィーチャーツリー・パラメータを直接操作し、可視性と制御を保つ」アプローチ（Adam、公式Fusion MCP、CAD as code系）への評価は相対的に高い
- CoLab Software社のような設計レビュー領域のベンダーからは、「CAD生成の高速化は真のボトルネック（レビュー・製造可能性検証・サプライヤー調整）を解決しない」という構造的な批判が出ており、**AIエージェント導入だけでは開発リードタイム短縮が保証されないという冷静な見方**も業界内に存在する
- 個人開発者・ブロガーレベルでは、「材料・製造プロセスを最初に明示する」「視覚検証だけで満足せず物理検証まで行う」といった実務的な教訓が蓄積されつつあり、**プロンプトエンジニアリングというよりドメイン知識（製造公差・材料規格）をいかにAIに事前共有するかが成否を分ける**という共通認識が形成されつつある

---

## 未確認・追加調査が必要な点

- Reddit（r/Fusion360, r/ClaudeAI, r/ClaudeCode, r/3Dprinting）は本調査環境から直接アクセス・検索がブロックされており（`reddit.com`はWebSearchのallowed_domainsで拒否、WebFetchも`www.reddit.com`が明示的に利用不可）、実際のスレッド内容は検証できていない。Google検索結果からもRedditスレッドは直接ヒットしなかった。ユーザー側でRedditアプリ/ブラウザから直接検索することを推奨
- Autodesk Forums / Fusion 360 API フォーラムは検索結果としてChatGPTスクリプト関連の古いスレッド（`forums.autodesk.com/t5/fusion-api-and-scripts-forum/chatgpt-script-issue`）が見つかったのみで、Claude特化の議論は本調査では発見できなかった
- YouTube動画（"Claude + Fusion 360 I Tested It On 2 Designs Using MCP Connection"）はWebFetchでコメント欄・説明文の抽出に失敗（YouTubeのSPA構造のため）。タイトルからは実測比較コンテンツと推測されるが未検証
- Fabbaloo記事は403エラーで本文取得不可。タイトルのみ確認
