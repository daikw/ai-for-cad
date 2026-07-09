# X (Twitter) 調査: Fusion 360 × Claude Code / AI コーディングエージェント

調査日: 2026-07-03
手法: xAI x-search CLI（13クエリ）+ 発見した一次情報源（Zenn/note.com記事）へのWebFetch

---

## 1. 最重要事実: Autodesk公式パートナーシップ

**@adskFusion（Autodesk Fusion公式）が2026-04-29に発表**（1737 likes / 168 reposts / 32 replies、調査対象の中で圧倒的に反響が大きい投稿）:

> "We have partnered with @AnthropicAI to launch the Claude connector for Fusion. With the Fusion MCP, you can now tap into Claude's desktop capabilities—speech, vision, web search, and cross-service workflows—right inside your design flow. Combined with #AutodeskAssistant, this opens up more flexible, customizable agentic workflows for how you build with Fusion + Claude."

これはAutodesk公式のMCPサーバーで、Claude Desktop（PC版必須、ブラウザ版不可）から直接Fusion 360を操作できる。以降のほぼ全ての投稿はこの公式MCPを指している。**それ以前（4月22日以前）は「Aura Friday MCP server」という第三者製MCPサーバーが使われていた形跡がある**（後述）。

---

## 2. ソース一覧（ハンドル・日付・要旨）

| ハンドル | 日付 | 要旨 |
|---|---|---|
| @adskFusion (Autodesk Fusion公式) | 2026-04-29 | Anthropicとの提携でFusion MCP connectorをローンチ |
| @dsp_ (David Soria Parra, Anthropic所属と思われる) | 2026-06-11 | Fusion 360 MCP経由でFramework 13メインボード用3段トレイラックを設計させた。寸法調査から実施、STLファイルまで自動生成。「これは本当に印象的、自分一人ではここまで到達できなかった」 |
| @gclue_akira (Akira Sasaki) | 2026-06-29〜07-01 | Claude Code + Fusion360 + EasyEDA Pro + XCode MCP + ESP-IDF を組み合わせた「一人ハードウェアFDE」ワークフローを継続的に発信。最も濃い実践者アカウント |
| @ajinori3939（あじのり） | 2026-04-29 | Fusion360側の設定手順とセットアップ時のハマりどころを報告 |
| @ux_xu（のぶ, Zenn） | 2026-05-25頃 | 「Fusion360のClaude MCPサーバーの限界を追究する -第1報-」という検証記事。技術的に最も深い一次情報 |
| moldtech（note.com） | 2026-05-31頃 | 「AIが直接3Dを動かす時代へ Fusion360とClaudeのMCP連携を試してみた」現場設計者視点のレビュー記事 |
| gata_labo（Zenn, @kyouhei_craft経由で拡散） | 2026-06-01 | ClaudeとFusion360でサイクロイド減速機を設計した実践記事。プロンプト技法が具体的 |
| @TheYieldPoint (TheYieldPoint_yt) | 2026-04-22 | 公式MCP登場前、「Aura Friday MCP server」というサードパーティ製MCPサーバーでClaude Code/Codexから Fusion 360 を操作 |
| @skynetislov3 | 2026-05-08 | Fusion 360クローン（ブラウザ動作、スケッチ・パラメトリック設計・タイムライン・拘束対応）をvibe codingで自作し、MCPサーバー経由でClaude操作可能にした。マーケットには出さない方針 |
| @kaylyn_shibata | 2026-04-27 | ロボティクス文脈でFusion 360 MCP ServerをCodex/GPT-5.5と組み合わせてCADコパイロットとして利用 |
| @OguraBike（小倉自転車） | 2026-06-18 | 「FusionのMCPはLLMで形状を操作する道具というより、LLMに形状を伝える道具」という考察 |
| @DanKornas | 2026-06-28 | Fusion 360ではなくFreeCAD MCP（neka-nat/freecad-mcp、MIT）の紹介。比較対象として有用 |
| @godsonde | 2026-05-25 | CATIA V5 MCP Server（daiemon12/catia-v5-mcp-server）の紹介。win32com.client + MCP for CATIA |
| @https_memi | 2026-05-03 | スペイン語話者。Claude DesktopでのFusion 360 MCP有効化手順を投稿（65 likes と比較的反響あり） |
| @dunik_7 | 2026-05-12 | 「$20 Claudeサブスク + 無料MCPサーバーがジュニア製図者の仕事を代替する」という煽り気味の経済論（AutoCAD MCP文脈、Fusion 360固有ではない） |

---

## 3. 発見したツール・リポジトリ

- **Autodesk公式 Fusion MCP**（Claude connector for Fusion） — Autodesk × Anthropic 公式提携、2026-04-29ローンチ。Fusion360の設定画面 General > API > MCP Server で有効化 + Claude Desktop側にAutodesk Fusion拡張機能をインストールする構成。
- **Aura Friday MCP server** — 公式MCP登場前に使われていたサードパーティ製Fusion 360向けMCPサーバー。証明書関連の設定で手間取ったという報告あり。運営元・リポジトリURLは投稿内では特定できず（**未確認**）。
- **neka-nat/freecad-mcp**（GitHub、MITライセンス） — Fusion 360ではなくFreeCAD向けだが、比較対象として言及多数。uvx/uv経由でセットアップ、FreeCAD側にMCPワークベンチを追加してRPCサーバーを起動する構成。
- **daiemon12/catia-v5-mcp-server**（GitHub、MITライセンス） — CATIA V5向け。Python win32com.client経由でCOM操作、50以上のツールを実装（スケッチ、押し出し、穴あけ、アセンブリ拘束、STEP/IGES/STL出力等）。
- **skynetislov3による自作Fusion 360クローン + MCP** — vibe codingで作られたブラウザ動作のパラメトリックCADクローン。非公開。リポジトリ名は不明（**未確認**）。
- **cadprompt.com** — 「CAD Prompt」向けドメインとして紹介されていたが、ドメイン販売目的の投稿で実体サービスは確認できず（**未確認、実在するプロダクトかは不明**）。

---

## 4. 実践テクニック

### セットアップ手順（moldtech記事 / @ajinori3939 / @https_memi の投稿を統合）

1. Claude Desktopアプリをインストール（**ブラウザ版不可、PC版必須**）。Windowsでは開発者モードの有効化が必要という報告あり。
2. Fusion 360側: 基本設定 → General → API → 「Fusion MCP Server」のチェックボックスを有効化。
3. Claude Desktop側: カスタマイズ画面（+ボタン）からAutodesk Fusion拡張機能／コネクタをインストール。
4. **有効化後にPCの再起動が必要になるケースが複数報告されている**（あじのり氏: 再起動しないとTCP接続はできるがレスポンスボディが空になる現象）。

### プロンプト技法（Zennのサイクロイド減速機記事より、最も具体的な知見）

- 「3Dモデルまで全部作って」と一括依頼すると失敗する。**タスクを段階的に分解**し、まず「スケッチのみ作成」に範囲を絞ると成功率が上がる。
- 具体的なパラメータを明示する: 「ギヤ比は１：２０、各ピンは６mm想定でお願いします。また部品ごとにコンポーネントを分けてスケッチを描くようにお願いします」という指示が有効だった。
- 成功後は「色々なパターンを試せるようにプラグイン化できますか？」と段階的に要求を広げ、最終的にUIダイアログ付きツールまで到達できた。

### 技術的Tips（Zenn「限界を追究する」記事より）

- スケッチ平面には直接B-Repではなく**コンストラクション平面**を使う方が安定する。
- 拘束は「中点拘束」より「**点-点間距離寸法**」の方がAIにとって堅牢に扱える。
- プロファイル選択時は**面積最小のもの**を選ばせるルールが有効。
- エラーからの回復には**undoの粒度管理**が重要（大きすぎる/小さすぎるundo単位は事故につながる）。
- Claude自体はFusion 360 APIの知識が乏しく、想定外の挙動が頻発するため、著者は独自の詳細なルール体系を構築して単純作業の自動化に落とし込んだ。

### ワークフロー統合（@gclue_akira）

日本語圏で最も実践的な発信をしていたアカウント。ハードウェア開発を「一人FDE（Full Design Engineering）」として完結させる構成:
- Claude Code + XCode MCP → Gadget用管理アプリ開発
- Claude Code + ESP-IDF → Gadget用Firmware開発
- Claude Code + EasyEDA Pro（Gateway API拡張機能経由） → 基板開発
- Claude Code + Fusion360 → ケース開発

所感として「基板向けだと、Codex-5.5の仕事は荒削りで、Claude Code Opus4.8は丁寧」「Fusion360もいい感じにいじれるので、Claude Code + EasyEDA + Fusion360の組み合わせがベスト」とモデル比較のコメントあり。

---

## 5. 制約・落とし穴

- **APIナレッジ不足**: Claude自体がFusion 360 APIに関する知識が乏しく、スケッチの完全拘束や高度な形状（断面へのスナップフィット作成等）は自動化が難しい（Zenn記事、事実として明記）。
- **実務投入にはまだ遠い**: moldtech記事では「一発で完璧な工業製品データが出来上がるわけではなく、実務活用は難しい」と明言。初期モデリングや定型形状の迅速化には有効という評価にとどまる。
- **セットアップの不安定さ**: MCPサーバー有効化後にPC再起動が必要になったり、TCP接続はできてもレスポンスボディが空になる現象が報告されている（あじのり氏）。
- **Fusion 360自体の一般的な不安定さ**: AI連携とは無関係だが、メッシュボディ処理でのクラッシュ・動作の重さに関する強い不満の投稿もあった（2025-11、@Ekaeoq、317 likes）。AI自動化がFusion 360本体の重さ・クラッシュ問題を解決するわけではない点は留意点として記載しておく。
- **サードパーティMCPの過渡期**: 公式MCP登場（2026-04-29）以前は「Aura Friday MCP server」のような非公式ツールが使われており、証明書関連のトラブルが報告されている。公式版でこの種の問題が解消されたかは投稿からは確認できない（**未確認**）。
- **「LLMに形状を操作させる」のではなく「LLMに形状を伝える」道具という捉え方**（@OguraBike）: MCP自体はモデリングの自動化というより、既存モデルの形状的特徴を自然言語でLLMに渡すためのインターフェースとして評価する声もある。用途の捉え方に幅がある。

見つからなかったもの: Aura Friday MCP serverの開発元・リポジトリURL、skynetislov3のFusion 360クローンのリポジトリ名、cadprompt.comの実体サービスの有無。これらは投稿本文だけでは特定できず、深追いするには追加のクエリ（今回の15クエリ予算では未実施）が必要。
