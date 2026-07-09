# Fusion 360 × Claude Code / AI エージェント 日本語圏 Web 調査

調査日: 2026-07-03

## 背景（前提として押さえておくべき事実）

- 2026年4月28日、Anthropic が Claude の新 Connector（9種、Blender・Adobe・Autodesk Fusion 含む）を正式リリースし、**公式の Autodesk Fusion MCP Server**（Fusion 側の設定 UI から有効化する形）が使えるようになった。日本語コミュニティの記事の多くはこの前後で「公式ルート」と「有志の非公式 MCP 実装（2025年〜）」の2系統に分かれる。
- 公式連携には Claude Desktop アプリが必須（ブラウザ版 claude.ai 不可）。個人利用ライセンスでは公式接続に制限があるという指摘もある（note.com/mar810）。

## ソース一覧（URL / 著者 / 日付 / 要旨）

| URL | 著者 | 日付 | 要旨 |
|---|---|---|---|
| https://zenn.dev/optimisuke/articles/ef65833d6630ab | Naosuke | 2026-05-08 | Claude Code + build123d で CAD を開かずに3Dプリント用モデル（測量ノート立て）を作成 |
| https://note.com/kazu_t/n/n0511c0a55e21 | kazu@生成AI×教育／谷一徳 | 2026-06-08 | Claude と Fusion 360 の公式 MCP 接続手順とトークン消費の実測 |
| https://note.com/tomo1230ee/n/naf76a5a76f02 | 神原友徳(tomo1230) | 2023-02-18 | ChatGPT に Fusion 360 のスクリプト（星型生成）を書かせた最初期の試み |
| https://note.com/tomo1230ee/n/n902869cfdf49 | 神原友徳(tomo1230) | 2025-06-20 | 公式MCP登場前、Node.js+Fusionアドインで自前 MCP 連携基盤を構築した記録 |
| https://note.com/tomo1230ee/n/nac359cbe865c | 神原友徳(tomo1230) | 2026-04-30 | 公式 Claude Autodesk Fusion Connector の使い方ガイド（4ステップ） |
| https://idarts.co.jp/3dp/claude-autodesk-fusion/ | 記載なし（3DP id.arts編集部） | 2026-05-01 | Claude×Fusion連携の紹介、AIはあくまで補助であり人間判断が必要という論調 |
| https://www.kazuban.com/blog/fusion-python-api/ | kazuban | 2025-07-09（2026-01-28更新） | Fusion360 Python API を AI（ChatGPT/Gemini）に書かせてsketchライブラリ自作 |
| https://blog.kimizuka.org/entry/2025/07/14/143000 | kimizuka | 2025-07-14 | Blender+Claude(MCP)で歯車を自然言語モデリングし3Dプリント、失敗談あり |
| https://note.com/npaka/n/n7864b38c7432 | npaka | 2026-04-29 | Claude新Connector群（Blender/Autodesk/Adobe）の概要紹介（詳細手順はなし） |
| https://note.com/miyo_ska/n/n9281ddd8c1f4 | miyo_ai_note | 2025-06-22 | Mac で Claude×Blender MCP のセットアップ手順を詳細に解説 |
| https://fusion360.teruemon.com/update/claude-mcp/ | テルえもん | 2026-04-30 | Fusion×Claude公式MCPのインストール〜初期設定を徹底解説。実際に生じた不具合と原因も記載 |
| https://note.com/mar810/n/n14033d9c6fb6 | まー＠健康・3Dプリンタ・生成AI | 2026-05-09 | 公式Fusion MCPの制限（個人ライセンス不可）と、有志実装から見えた5つの落とし穴を整理 |
| https://note.com/mar810/n/n2e5334629e30 | まー＠健康・3Dプリンタ・生成AI | 2026-04-12 | Fusion歴10年以上のベテランが Claude Code + OpenSCAD/CadQuery で画像から3Dプリントデータ生成、所要時間45-75分→25分に短縮 |
| https://note.com/tokyomakers/n/n35aae26aa835 | 東京九段工作ラボ | 2026-05-03 | 公式Claude Fusion連携を4つの実演（ピラミッド／複合フィレット／画像から3D化／キーパッド設計）で検証 |
| https://qiita.com/issey_dotlog/items/19b84d3a38c1c9aa9567 | issey_dotlog（株式会社ドットログ） | 2026-06-13 | Claude Code × OpenSCAD × Bambu Lab P1S で建設3Dプリンティング工程を1/30スケール再現 |
| https://zenn.dev/wmoto_ai/scraps/b6117aaef58e6f | 生ビール(@wmoto_ai) | 2025-03-18〜19 | Script-based CAD 5種（OpenSCAD/CadQuery/build123d/OpenCascade.js/OpenJSCAD）をClaude 3.7 Sonnetと比較検証 |

## セットアップ手順の知見

### 公式 Claude ⇄ Autodesk Fusion Connector（2026年4月〜）

テルえもん記事と note.com/tomo1230ee/n/nac359cbe865c、note.com/kazu_t の記述をまとめると、共通する手順は以下の通り。

1. **Claude Desktop アプリ**（ブラウザ版不可）をインストール
2. Fusion 側：ユーザーアイコン → Preferences → General → API 項目内「Fusion MCP server」を有効化し、「runs locally on this device」にチェック
3. Windows の場合は「開発モード」を有効化する必要があるとの報告あり（テルえもん）
4. Claude Desktop 側：設定 → Customize（コネクタ管理）から「Autodesk Fusion」をインストール
5. ツール権限は「always allow」に設定すると都度確認が省ける（tomo1230ee）
6. Fusion 360 と Claude Desktop を**同時起動**しておく必要がある
7. 動作確認は「立方体を作って」のような単純な指示から

### 非公式 MCP 実装（2025年、公式リリース前の先行事例）

tomo1230ee 氏の2025年6月の記事では、公式連携がまだない時点で以下の構成を自作していた。

- Fusion API は Fusion アプリ内部でしか動作しないため、外部の Node.js から直接叩くことはできず、**Fusion アドインとして常駐させる**必要がある
- Node.js（Express + body-parser）でローカル MCP サーバーを立て、Python の `child_process` 経由で Fusion 側アドインと通信
- アドイン側はコマンドを 0.5 秒間隔でポーリングして応答を書き込む設計（GitHub 上の類似実装 `ndoo/fusion360-mcp-bridge` も同様のポーリング方式）

### コードCAD経由ルート（Fusion を介さない/補完する方法）

個人利用ライセンスで公式Fusion MCPが使えない場合の代替として、複数の記事が「コードCAD + Claude Code」ルートを推奨している。

- **build123d**（Zenn/optimisuke）: `uv init --no-readme && uv add build123d` でセットアップし、Python コードをClaude Codeに生成させ、STLを出力してmacOS Previewで確認するループ
- **OpenSCAD / CadQuery**（note.com/mar810）: Claude Code が自律的にツールを選定・インストールし、STEP非対応と判明した時点でCadQueryに書き換えるといった自己修正も行った事例
- 生成したSTL/STEPをFusion 360に読み込んで微調整、という「コードCAD→Fusionで仕上げ」のハイブリッド運用も報告されている（note.com/mar810/n/n2e5334629e30）

## プロンプト・運用のコツ

複数記事に共通する成功パターンは以下の3点に集約される（特に note.com/tokyomakers/n/n35aae26aa835 が明快に整理）。

1. **単位を必ず明示する**（cm/mm/inch）。単位なしだとブレる、あるいは「mmと指示してもcmで生成される事故」が起きる（note.com/mar810/n/n14033d9c6fb6）
2. **具体的な寸法・数値を提示する**。曖昧な指示は避ける（例：「全てのエッジを丸くして。外側3ミリ、内側1ミリで」）
3. **複雑な案件では、AIに質問させて確定指示を積み重ねる**方式が有効（3×3キーパッド多層構造の例）
4. **読み取り専用の依頼から始める**（デザイン構成のサマリ依頼等）。いきなり編集を任せず、まず現状把握させてから変更依頼に進む（tomo1230ee）
5. **重要な設計ファイルに直接使わず、新規ドキュメントかコピーで試す**（note.com/mar810/n/n14033d9c6fb6）
6. build123d/OpenSCAD 系では「寸法指示はゆるくてよい」「一気に完成形を求めず対話的に微修正する」方が自然文プロンプトとの相性が良い（Zenn/optimisuke）

代表的な有効プロンプト例:
- 「Fusionで原点（0,0）を中心にして、直径50mmの円を描いてください」
- 「底面が10cm × 10cm、高さが10cmのピラミッドを作って」
- 「全てのエッジを丸くして。外側3ミリ、内側1ミリで」
- 「幅を80mmから100mmに変更して」「高さは2倍、フィレット半径は半分にして」
- 「この画像の星の杖を3Dプリント用のCADデータにしてください」（画像添付、ツール指定なしでAIに全判断を委ねた例）

## 制約・失敗談（日本語記事が特に詳しく書いている部分）

- **トークン/コスト消費が大きい**: シンプルな単一パーツ生成で5時間制限プランの約13%、修正1回で約7%を消費（note.com/kazu_t）。複雑な設計を一発で完成させるのは難しく、修正前提での運用が必要
- **単位の取り違え事故**: 「mmと指示してもcmで生成される」（note.com/mar810/n/n14033d9c6fb6）
- **タイムアウト**: 有志実装では30〜45秒でタイムアウトする報告
- **複数操作の一括依頼でクラッシュ**しやすい傾向
- **空間認識の弱さ**: XZ/YZ平面でZ軸方向を取り違えやすい。「コードを書かせる方が、3D空間を理解させるより易しい」という指摘（note.com/mar810）
- **有機的な非幾何学形状は苦手**: 犬のバッジ画像を「同じ形にして」と依頼したケースは完全失敗（note.com/tokyomakers）
- **穴あけ・断面処理の落とし穴**:
  - 3D円柱を後から引き算すると穴がスリット状に歪む → 2D断面で先に円を抜いてからZ方向に押し出すのが正解（qiita.com/issey_dotlog）
  - `fillet` が薄壁付近で失敗し、`chamfer` の方が安定（Zenn/optimisuke）
  - 回転軸と断面スケッチの不一致でコップ底部に穴が空く不具合（テルえもん）
- **歯車のかみ合わせ失敗**: 「本当に回りますか？」と何度確認しても実際にプリントすると回らず、歯数不足が判明。穴あけ指示も繰り返し失敗し課金してもうまくいかず、最終的に手動で開けた（blog.kimizuka.org）— AIの自己申告（「大丈夫です」的な返答）を鵜呑みにできない典型例
- **個人利用ライセンスでは公式Fusion MCP接続に制限**があり、商用サブスクでないと実機検証すらできないという報告（note.com/mar810）
- **キャッシュ問題**: Fusion Python APIでライブラリを編集してもFusion再起動なしには反映されず、AIに相談しても回避策が見つからなかった（kazuban）
- 総括として複数記事が「形ができることと使える部品になることは別問題」「AIは反復作業削減・時短の補助であり設計者の代替ではない」と強調（idarts.co.jp、note.com/tokyomakers）

## MCP実装・ツール名の一覧（言及されたリポジトリ）

- 公式: Autodesk Fusion MCP Server（Fusion側の設定から有効化、Claude Desktop Connector経由）
- `ndoo/fusion360-mcp-bridge`（GitHub, 英語圏、日本語記事からも言及あり）
- `Misterbra/fusion360-claude-ultimate`（tomo1230氏の概念をフランス語圏開発者が翻案）
- tomo1230氏の自作 Node.js + Fusionアドイン構成（2025年、非公開/記事内で解説のみ）
- コードCAD系: build123d, CadQuery, OpenSCAD, OpenCascade.js, OpenJSCAD（zenn.dev/wmoto_ai の比較検証）
- Blender連携（参考）: `blender-mcp`（ahujasid作、uvx経由で起動）— Fusion本体ではないが「Claude×3Dモデリング」の文脈で頻出

## その他の関連記事（本文未精読、URLのみ記録）

- https://katatemablog.com/claude-fusion-connector/ （2026年4月、Claude×Fusion連携の解説）
- https://fabscene.com/new/news/anthropic-claude-creative-connectors/ （8種の創作連携ニュース）
- https://uravation.com/media/claude-connectors-9-creative-tools-2026/ （9コネクタ解説）
- https://note.com/st_model8/n/nafb4479f5c78 （すずめ模型、ChatGPTにFusion360スクリプトを作らせた記録）
- https://note.com/liveon_studio/n/n07120d525528、https://note.com/fit_liger8646/n/n5f33b25ccea9、https://note.com/yaoyoroztech/n/ned8ea85cc7b6、https://saru-blender.com/claude （いずれもBlender×Claude MCP、Fusion本体ではないが隣接事例）
