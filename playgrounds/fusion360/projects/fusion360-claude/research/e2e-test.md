# fusion360 スキル E2E テスト記録（2026-07-03）

事前知識なしの状態で `.claude/skills/fusion360/` のドキュメントのみを頼りに、
稼働中の Fusion 360 に対して実際にモデリング操作を行い、スキルの記述精度を検証した。

## テスト対象部品

- 外形 20×20×10 mm の直方体、中央に φ5 mm の貫通穴
- 材料・製造プロセス: FDM/PLA 3D プリント想定（宣言のみ、公差調整は範囲外）

## 実行ステップの時系列

1. **SKILL.md を通読** → §1 の接続ルート判定フローに従い `scripts/probe.sh` を実行。
   `tool_count=4`（`fusion_mcp_read` / `fusion_mcp_execute` / `fusion_mcp_update` /
   `fusion_mcp_electronics_read`）で「接続 OK」を確認。ルート A（公式 MCP）で進行。
2. **setup.md §2.1 の手順を再現**して probe.sh とは別に自前のセッションを確立
   （`initialize` → レスポンスヘッダから `MCP-Session-Id` 取得 →
   `notifications/initialized` → 以後の全リクエストにヘッダ付与）。記述通りに動作した。
3. **SKILL.md §3-1「読み取り専用から始める」**に従い、まず
   `fusion_mcp_read` の `document`(`operation=open`) で開いているドキュメントを確認しようとした。
   → **ここで tools.md 記載の `object.operation="open"` という呼び出し形式がエラーになった**
   （詳細はフィードバック節）。`tools/list` の生 `inputSchema` を取得して正しい形式
   （`operation` はトップレベルのプロパティ）を特定し、修正して再実行。
   既存の「Untitled」ドキュメントが1件開いていることを確認（これには一切触れていない）。
4. **tools.md のスクリプトテンプレート**を元に、新規ドキュメント作成 + 20×20×10mm 直方体の
   `script` を実行（`fusion_mcp_execute`, `featureType=script`）。テンプレートの
   `object.script` 形式はそのまま動作した。
   結果: `bbox_mm=(20.0000,20.0000,10.0000)`, `volume_mm3=4000.0000`（理論値と完全一致）。
5. `fusion_mcp_read` の `document`(`open`) で自分が新規作成したドキュメントが
   `isActive:true` の2件目の「Untitled」であることを確認してから続行（既存ドキュメントとの
   混同を避けるための追加確認。スキルには明記されていないが SKILL.md §2③「既存ドキュメントに
   触れない」の徹底のため自発的に実施）。
6. **SKILL.md §3-5「API が不確かなら apiDocumentation で検索してから書く」**に従い、
   貫通穴を切るための `ExtrudeFeatureInput.setAllExtent` / `ExtentDirections` を
   `apiDocumentation` クエリで検索してからスクリプトを作成。
   中心に φ5mm（半径 0.25cm）の円スケッチを XY 平面に追加し、
   `CutFeatureOperation` + `setAllExtent(PositiveExtentDirection)` で貫通穴を作成。
   結果: `bbox_mm=(20.0000,20.0000,10.0000)`, `volume_mm3=3803.6505`,
   `face_count=7`, `edge_count=14`（直方体6面+穴の内面1つ、直方体12エッジ+上下の円2つで
   物理的に整合）。
7. **SKILL.md §4-1** に従い `fusion_mcp_read` の `screenshot`
   (`direction=iso-top-right`) で目視確認。レスポンス形式は tools.md の記述通り
   `content[0]` に直接 `type:"image"` が入る形式で、パースに問題なし。
8. **verification.md 段階2**に従い STL エクスポートを実施。
   `ExportManager.createSTLExportOptions` のシグネチャを `apiDocumentation` で確認してから
   `design.exportManager.createSTLExportOptions(body, filename)` を実行、
   `meshRefinement = MeshRefinementHigh` を指定してエクスポート成功。
9. trimesh が環境に未導入だったため、`~/.claude/rules/supply-chain-security.md` および
   verification.md の指示（`uv add` はユーザー確認必須）に従い、**新規依存を追加せず**、
   Python 標準ライブラリ（`struct`）でバイナリ STL ヘッダを手動パースしてバウンディング
   ボックスと体積（発散定理によるメッシュ体積計算）を独立に再計算した。
10. verification.md 段階3の物理検証フラグ判定基準（圧入・回転嵌合・0.1mm オーダー公差）に
    照らし、本テスト部品はいずれにも該当しないため「物理プリント検証必須」フラグは
    不要と判断した。
11. 最終確認として `document`(`open`) を再照会し、既存の「Untitled」ドキュメントが
    自分の操作の影響を受けていないこと（`isModified` 状態が変化していないこと）を確認。
    `save` / `close` は一度も呼んでいない。

## 検証結果

| 項目 | 実測値 | 理論値/期待値 | 差分 | 判定 |
|---|---|---|---|---|
| バウンディングボックス（Fusion内 script） | 20.0000×20.0000×10.0000 mm | 20.0×20.0×10.0 mm | 0mm | OK |
| バウンディングボックス（STLパース） | 20.0000×20.0000×10.0000 mm | 同上 | 0mm | OK |
| 体積（Fusion内 `physicalProperties.volume`） | 3803.6505 mm³ | 3803.6504 mm³（20×20×10 − π×2.5²×10） | 0.0001mm³ | OK |
| 体積（STLメッシュを独立再計算） | 3804.1468 mm³ | 3803.6504 mm³ | 0.4964 mm³（メッシュ近似誤差） | OK（±1mm³以内） |
| 面数/エッジ数 | 7面/14エッジ | 直方体6面+穴1面、12エッジ+2エッジ | - | 物理的に整合 |
| スクリーンショット目視 | 直方体中央に貫通穴のある形状を確認 | 同上 | - | OK |

完了条件（外形寸法・体積・目視）はすべて達成。物理検証フラグは該当なしと判定。

## スキルドキュメントへのフィードバック

### 記述どおりで動いた点

- `scripts/probe.sh` は記述通り一発で疎通診断に成功し、`tool_count=4` を確認できた。
- setup.md §2.1 のハンドシェイク手順（`initialize` → `MCP-Session-Id` ヘッダ取得 →
  `notifications/initialized` → `tools/list`）は curl でそのまま再現でき、
  `zsh` の `PATH` 衝突を避けるための変数名注意書きも実際に役立った
  （最初は `path` という変数名を使いかけて気づいた）。
- `fusion_mcp_execute` の `featureType=script` + `object.script` という呼び出し形式は
  tools.md の記述通りで、テンプレートスクリプトもほぼそのまま動いた。
- 単位変換の罠（mm→cm）は pitfalls.md の警告通りで、明示変換していれば問題は起きなかった。
- スクリーンショットのレスポンス形式（`content[0]` に直接 image ブロック）は記述通り。
- `document`(`open`) が既存ドキュメントとの混同防止に有効に機能した
  （SKILL.md §3-1 の「読み取り専用から始める」の効果を実感）。
- verification.md の「新規依存はユーザー確認必須、依存なしでできる検証を優先する」という
  指示のおかげで、trimesh 未導入時に迷わず標準ライブラリでの代替検証に切り替えられた。

### 記述が足りず自力で補った点（＝ドキュメントの欠落）

1. **`fusion_mcp_read` の `document` クエリのパラメータ構造がスキル内で誤って記載されている
   （最重要）**: tools.md §1 の表は「主なパラメータ」として
   `document`（operation=`open`）を挙げているが、実際に `document` オペレーションを叩く際の
   引数の場所を明示していない。ユーザーは `fusion_mcp_execute` の
   `object.operation="open"` という記法（こちらは正しい。tools.md §2 に明記あり）から類推して
   `fusion_mcp_read` 側も同じ `object.operation` 形式だと誤解しやすい。実際には
   **`fusion_mcp_read` には `object` フィールド自体が存在せず、`operation` は
   `arguments` 直下のトップレベルプロパティ**である（`tools/list` の生 `inputSchema` で確認）。
   この不一致（read 側はフラット、execute 側はネスト）はスキル文書のどこにも明記されておらず、
   実際に1回エラーを踏んでから `tools/list` の raw スキーマを見て初めて気づいた。
2. **`fusion_mcp_read` の `document` クエリの返り値キー名が未記載**: 実際のレスポンスは
   `{"results": [...], "message": "...", "success": true}` で、`results` 内の各要素は
   `name`, `isActive`, `isModified`, `isSaved` を持つ。tools.md には触れられておらず、
   `document/search` の `fileId` 取得（`fusion_mcp_execute` の `document open` に必須）を
   行う際にどのキーから `id` を取り出すのか確認できなかった（今回は `search`/`open by fileId`
   のフローは使わなかったため実害はなかったが、次に既存ファイルを開く場面で詰まる可能性が高い）。
3. **貫通穴の作り方（`ExtentDirections`・`setAllExtent`）が pitfalls.md / tools.md に一切ない**:
   pitfalls.md は「穴あけは2D断面で先に円を抜いてから押し出す方が安定する」という方針は書いて
   あるが、具体的な API（`CutFeatureOperation` + `setAllExtent(PositiveExtentDirection)` で
   貫通させる、という組み合わせ）はコード例がなく、`apiDocumentation` クエリを2回（
   `ExtrudeFeatureInput` のメンバー検索、`ExtentDirections` のクラス検索）打って自力で
   組み立てる必要があった。tools.md のテンプレート例は直方体の単純押し出ししか示しておらず、
   「貫通穴」という頻出パターンのテンプレートが無いのはギャップだと感じた。
4. **`ExportManager` / STL エクスポートのスクリプト例が references 内に一切ない**:
   verification.md は「STL/STEP をエクスポートし数値チェックする」と方針だけ書いてあり、
   `design.exportManager.createSTLExportOptions(body, filename)` →
   `export_mgr.execute(options)` という実装は完全に自力で `apiDocumentation` クエリから
   組み立てた。他の script 例と同様にテンプレートがあれば時間を節約できた。
5. **プロファイル選択則が今回のケースでは逆に作用しかねない**: pitfalls.md は
   「プロファイル選択は面積最小のものを選ぶルールが有効」と書いているが、これは
   （文脈から）ux_xu の連載での特定ケース（穴の内側プロファイルを選びたい場面）向けの経験則
   であり、今回のような「四角形から円をくり抜いた大きい方のプロファイルを選びたい」ケースには
   当てはまらない。今回は `sketch.profiles.item(0)` が単一プロファイル（穴を切り取る円だけの
   スケッチだったため）で済んだので実害はなかったが、四角形と穴を1枚のスケッチに同時に描いて
   1回で抜くパターンを取っていたら、この経験則を鵜呑みにして誤ったプロファイルを選んでいた
   可能性がある。この経験則が「常に面積最小」ではなく「文脈依存（穴を選びたいときは最小、
   外形を選びたいときは最大）」であることを明記すべき。

### 誤解を招いた記述

- tools.md §1 の表の「主なパラメータ」列で `object.operation=open` のように execute ツールと
  同じ `object.` プレフィックス表記を read ツールにも流用している点。read/execute で
  パラメータのネスト構造が異なるという最重要情報が、表の書式によってむしろ隠蔽されている。
  execute 側は「フル引用符付きスキーマの一部」として `object:{...}` を明記しているのに対し、
  read 側は表内の短縮表記のみで済ませているため、両者が同じ構造だと誤読しやすい。

### 改善提案（優先度順）

1. **最重要**: tools.md §1 の表に「`fusion_mcp_read` の `document`/`operation` パラメータは
   `arguments` 直下のトップレベルフィールドであり、`fusion_mcp_execute` の
   `object.operation` とはネスト構造が異なる」旨を明記する。可能なら両ツールの実際の
   `curl` コール例（1個ずつ）を追加する。
2. tools.md に「貫通穴を開ける」の完全なスクリプト例（`CutFeatureOperation` +
   `setAllExtent`）を、直方体の押し出し例に続けて追加する。
3. verification.md に STL エクスポートの完全なスクリプト例
   （`ExportManager.createSTLExportOptions` → `execute`）を追加する。
4. pitfalls.md の「プロファイル選択は面積最小」則に、適用条件（内側の穴を選びたい場合限定）を
   明記し、外形を選びたい場合は面積最大則になることを併記する。
5. tools.md に `document`(`open`/`search`/`recent`) の実際のレスポンス構造
   （`results[].name/isActive/isModified/isSaved` および `search` 時の `id` フィールド名）
   を明記する。
