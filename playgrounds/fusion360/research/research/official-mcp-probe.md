# Fusion 360 公式 MCP サーバ接続検証レポート

検証日: 2026-07-03
対象: ローカル起動中の Autodesk Fusion 360 (PID 12743) が公開する `http://127.0.0.1:27182/mcp`

## 結論サマリ

- 接続: **可能**。原因はハンドシェイクの `MCP-Session-Id` セッションヘッダの取り扱い漏れだった
- ツール数: **4個**（`fusion_mcp_read` / `fusion_mcp_execute` / `fusion_mcp_update` / `fusion_mcp_electronics_read`）
- スモークテスト: **全項目成功**（新規ドキュメント作成、10mm 立方体作成、寸法検証、スクリーンショット、フィレット追加）
- 最重要の注意点3つ:
  1. `initialize` レスポンスヘッダの `MCP-Session-Id` を以後の全リクエストに付けないと `tools/list` が **0 件**を返す（サイレント失敗、エラーにならない）
  2. Fusion API の内部長さ単位は **cm**。ツールの `inputSchema` に単位表記は無く、`fusion_mcp_execute` の Python script 内で自分で mm→cm 変換する必要がある（今回 10mm 立方体で実測検証し、意図通り 10.0mm になることを確認済み）
  3. 専用の「立方体を作る」ツールは存在しない。ジオメトリ操作は事実上すべて `fusion_mcp_execute` の `featureType: "script"` 経由で **Fusion API の Python スクリプトを直接実行する**ことで行う。つまりこの MCP サーバは「CAD 操作の抽象化レイヤ」ではなく「Fusion Python API への薄いリモート実行ゲートウェイ」

---

## 1. 接続手順の完全な再現レシピ

### 1.1 ハンドシェイク（initialize → セッションID取得 → tools/list）

```bash
# Step 1: initialize でセッションIDを取得
curl -s -D - -o /tmp/init_body.txt \
  -X POST http://127.0.0.1:27182/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{
        "protocolVersion":"2025-06-18",
        "capabilities":{},
        "clientInfo":{"name":"probe-client","version":"0.1.0"}
      }}'
# レスポンスヘッダに `MCP-Session-Id: <数値文字列>` が付与される
# 例: MCP-Session-Id: 635610668890201634

# Step 2: notifications/initialized を送る（MCP仕様上の作法。省略しても
#          今回の実測では tools/list 自体は通ったが、仕様準拠のため送ること）
curl -s -X POST http://127.0.0.1:27182/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "MCP-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'
# → 202 Accepted, body 空

# Step 3: セッションヘッダを付けて tools/list
curl -s -X POST http://127.0.0.1:27182/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "MCP-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
# → 4 tools が返る
```

### 1.2 ハマりどころの原因分析

- `initialize` 単体は `MCP-Session-Id` ヘッダなしでも 200 OK で正常応答するため、**セッション未確立に気づきにくい**
- しかし後続の `tools/list` にセッションヘッダを付けないと、エラーにはならず **`{"tools":[]}` を静かに返す**。これが最初に観測された「0 tools」の正体
- ヘッダ名の大文字小文字はサーバのレスポンスでは `MCP-Session-Id` と表記されていた（HTTP ヘッダ名は大文字小文字非依存なので `Mcp-Session-Id` でも動作するはずだが、念のためレスポンスと同じ表記を使うのが無難）
- `Accept: application/json, text/event-stream` を必ず両方含めること。今回は全レスポンスが `Content-Type: application/json`（SSE ではなく通常の JSON レスポンス）で返ってきたため、`data:` 行のパースは不要だった
- GET `/mcp` での SSE ストリームや他パスの探索は、セッションヘッダの欠如が原因と判明した時点で不要になった

### 1.3 tools/call の呼び出し例

```bash
curl -s -X POST http://127.0.0.1:27182/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "MCP-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{
        "name":"fusion_mcp_read",
        "arguments":{"queryType":"document","operation":"open"}
      }}'
```

### 1.4 Claude Code への登録コマンド（判断のみ・未実行）

```bash
claude mcp add --transport http fusion http://127.0.0.1:27182/mcp
```

この形式は**妥当と判断する**。理由:
- Streamable HTTP トランスポートであり、Claude Code の MCP クライアントは MCP 仕様準拠でセッションヘッダの管理を自動で行う想定（curl での手動検証が必要だったのは、こちらが素の HTTP クライアントでヘッダ管理を手動でやっていたため）
- 認証ヘッダやカスタムポートの指定は不要（Fusion 側がローカルの固定ポートで待ち受け、認証なし）
- ただし **実際の登録・接続確認はオーケストレータの判断で行うこと**。特に「script 経由で任意 Python が実行できる」という強力さ（1.5節参照）を踏まえ、常時登録するか都度セッションで有効化するかは運用ポリシーとして別途検討が必要

---

## 2. 全ツール一覧

### 2.1 `fusion_mcp_read`（読み取り専用）

| queryType | 用途 | 主なパラメータ |
|---|---|---|
| `projects` | 現在の hub 内の全プロジェクト一覧 | なし |
| `document` (operation=`search`) | ファイル名の部分一致検索 | `name`（必須、fuzzy）, `project`（任意） |
| `document` (operation=`open`) | 開いているドキュメント一覧 | なし |
| `document` (operation=`recent`) | 最近使ったドキュメント一覧 | なし |
| `apiDocumentation` | Fusion API のクラス/メンバー検索（ドキュメント文字列付き） | `searchPattern`（正規表現、必須）, `apiCategory`(class/member/description/all), `filter`（名前空間絞り込み） |
| `screenshot` | アクティブなグラフィックスビューの PNG スクリーンショット（base64） | `width`, `height`（32-4096, 省略時キャンバスサイズ）, `antiAliasing`, `transparentBackground`, `direction`(current/front/back/top/bottom/left/right/iso-*) |

戻り値: `tools/call` の `content[0]` に `type`, `mimeType`, `data`(base64) がフラットに入る形式（`text` ラップではない点に注意 — 他ツールは `text` フィールドに JSON 文字列が入るのに対し、screenshot だけ image ブロックとして直接返る）。

### 2.2 `fusion_mcp_execute`（実行系・最重要）

| featureType | 用途 | パラメータ |
|---|---|---|
| `script` | **Fusion API の Python スクリプトを実行**。`def run(_context: str):` を定義すること必須。`print()` 出力がツール結果として返る。例外はキャッチせず投げること（デバッグ情報を残すため） | `object.script`（Python コード文字列） |
| `document` (operation=`open`) | ドキュメントを開く | `object.fileId`（read ツールの search で事前取得） |
| `document` (operation=`close`) | アクティブドキュメントを閉じる。未保存変更がある場合は `userConfirmedSaveAndClose` か `userConfirmedCloseWithoutSave` のどちらかが必須（ダイアログ回避のための明示フラグ） | `object.operation="close"`, `object.userConfirmedSaveAndClose` / `userConfirmedCloseWithoutSave` |
| `document` (operation=`save`) | アクティブドキュメントを保存。**ユーザーの明示指示がない限り呼ばないこと**とツール説明文自体に明記あり | `object.operation="save"` |

新規ドキュメント作成専用のツールは存在しない。`script` 経由で以下のように行う:

```python
import adsk.core, adsk.fusion
def run(_context: str):
    app = adsk.core.Application.get()
    doc = app.documents.add(adsk.core.DocumentTypes.FusionDesignDocumentType)
    print("created:", doc.name)
```

### 2.3 `fusion_mcp_update`（undo/redo）

| featureType | 用途 |
|---|---|
| `undo` | 直近の操作を取り消す。プレビュー/インタラクティブ操作中は失敗（`canUndo`/`canRedo` を返す） |
| `redo` | 直近に取り消した操作をやり直す |

### 2.4 `fusion_mcp_electronics_read`（読み取り専用、Fusion Electronics）

Fusion Electronics（schematic / board / library）のデータを構造化クエリで読む。**アクティブな Electronics ドキュメントが必要**（今回は Fusion Design ドキュメントのみで検証したため未テスト）。`electronics.Wire`, `electronics.Net`, `electronics.Part`, `electronics.Board` など50種類以上のエンティティ型を `entity_type` で指定し、`object.fields`/`filters`/`pagination` で絞り込むクエリビルダー形式。詳細スキーマは `resource://mcp.electronics_schema_<class>` リソースで取得可能（今回未検証）。

---

## 3. スモークテスト結果

安全ルール（既存ドキュメント非接触・新規ドキュメントのみ操作・保存しない・Preferences変更なし）を厳守して実施。

| # | 操作 | 結果 | 詳細 |
|---|---|---|---|
| 1 | 現状確認（開いているドキュメント一覧） | 成功 | `document/open` クエリで `0 open document(s)` を確認。まっさらな状態からスタート |
| 2 | 新規ドキュメント作成 | 成功 | `script` 経由 `app.documents.add(FusionDesignDocumentType)`。応答 `"created: Untitled"`。体感応答時間は 1〜2秒程度 |
| 3 | 10mm 立方体作成 | 成功 | スケッチ→4辺の矩形プロファイル→押し出し(NewBodyFeatureOperation)。**side_cm = 1.0（10mm→1cm変換を明示）** で作成。応答 `"body created: Body1"` |
| 4 | 数値検証（バウンディングボックス・体積） | 成功、**単位も正しい** | `dx=dy=dz=1.0cm` = `10.0mm`、`volume=1.0cm3=1000mm3`。10mm のつもりが 10cm になる事故は起きなかった（cm 単位を意識してスクリプトを書いたため） |
| 5 | スクリーンショット取得 | 成功 | `direction=iso-top-right`, 800x600 px で PNG 取得（4696 bytes）。画像を目視確認し、立方体が正しく等角投影で描画されていることを確認済み |
| 6 | 追加操作: エッジフィレット 1mm | 成功 | `radius_cm = 0.1`（1mm→0.1cm変換）で1エッジにフィレット。edges.count が 12→15 に増加（フィレットで新規エッジが追加される想定通りの挙動） |

保存は一切行っていない（`document` の `save` operation は未呼び出し）。ドキュメントは開いたまま検証を終了（`close` を呼ぶと未保存変更の確認フラグ入力が必要になり、誤操作リスクがあるため今回は意図的に close を呼ばなかった）。

---

## 4. ハマりどころ・注意点（まとめ）

1. **セッションヘッダ必須**: `initialize` のレスポンスヘッダ `MCP-Session-Id` を取得し、以後の全リクエスト（`notifications/initialized`, `tools/list`, `tools/call`）に付与しないと `tools/list` が黙って空配列を返す。エラーにならないため気づきにくい
2. **単位は cm 固定**: Fusion API の内部長さ単位は常に cm。mm 指定の要求は呼び出し側スクリプトで `/10` する必要がある。ツールの `inputSchema` にはこの注意書きが一切ないため、事前に `apiDocumentation` クエリや Fusion API 公式ドキュメントで確認するか、今回のように作成後に実測検証する運用が必須
3. **script が唯一の書き込み手段**: ジオメトリ作成・編集系の専用ツールは存在せず、`fusion_mcp_execute` の `script` featureType で Python を直接実行する設計。これは強力な反面、**Fusion 上でできることは基本的に何でもできてしまう**（ファイル操作、ドキュメント削除、他プロジェクトへのアクセス等）。Claude Code に登録する場合はこの点を踏まえたガードレール（例: 既存ドキュメントに触れない旨をシステムプロンプト/ルールで明示）が要る
4. **script のエラーハンドリング方針**: ツール説明文自体が「run 関数内で例外をキャッチするな」と明記している。これはデバッグ性重視の設計であり、呼び出し側（エージェント）も try/except で握りつぶさず、エラーをそのままユーザー/オーケストレータに返すべき
5. **screenshot のレスポンス形式が他と異なる**: 他のツールは `content[0].text` に JSON 文字列が入るが、`screenshot` は `content[0]` に `type: "image"`, `mimeType`, `data`(base64) が直接入る。パース処理を分岐させる必要がある
6. **close 操作のダイアログ回避**: `userConfirmedSaveAndClose` / `userConfirmedCloseWithoutSave` のどちらかを明示しないと、未保存ドキュメントの close で Fusion 側にダイアログが出るリスクがある（今回は close 自体を回避したため実測はしていない）
7. **応答時間**: 今回検証したスクリプト実行・読み取り系はいずれも体感 1〜2 秒以内で応答。大規模ジオメトリ操作でのレイテンシは未検証
8. **fusion_mcp_electronics_read は未検証**: Fusion Design ドキュメントのみで検証したため、Electronics ドキュメントでの動作確認は今回のスコープ外
