# setup.md — 公式 Fusion MCP への接続

> **既存ドキュメントへの操作を禁止する。作業は必ず新規ドキュメントまたはコピーに対して行う。** `document` の `save` operation は既存ドキュメントを上書きし得るため、ユーザーの明示指示なしに呼ばない。

出典の凡例: 「実測済み 2026-07-03」= `research/official-mcp-probe.md` での実機検証（PID 12743 の Fusion に対する接続）。それ以外はコミュニティ報告として出典名を付す。

## 1. Fusion 側の有効化手順

1. Fusion 360 のユーザーアイコン → **Preferences → General → API** の項目内「**Fusion MCP server**」を有効化し、「**runs locally on this device**」にチェックする（テルえもん記事、tomo1230ee 記事、複数ソースで一致）。
2. **Windows** では「開発者モード」の有効化が必要という報告あり（テルえもん）。
3. 有効化後、**Fusion の再起動が必要**な事例が報告されている。有効化直後に接続できない場合はまず Fusion を再起動する。
4. Fusion と MCP クライアント（Claude Code / Claude Desktop）を**同時起動**しておく必要がある。
5. 個人ライセンスでは公式 MCP に接続できない/制限があるという報告が複数ある（note.com/mar810 ほか）。接続できない場合はライセンス種別も疑う。

## 2. 接続レシピ（実測済み 2026-07-03）

公式 MCP のエンドポイントはローカル固定ポート・認証なし。

```
http://127.0.0.1:27182/mcp
```

### 2.1 ハンドシェイクの完全な再現手順

**最重要の罠**: `initialize` レスポンスヘッダの `MCP-Session-Id` を以後の全リクエストに付与しないと、`tools/list` は **エラーにならず `{"tools":[]}` を静かに返す**。これが最初に「0 tools」に見える原因であり、最優先のトラブルシュート項目である。

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
# レスポンスヘッダに MCP-Session-Id: <数値文字列> が付与される

# Step 2: notifications/initialized（MCP仕様上の作法。省略しても
#          tools/list 自体は通ったが、仕様準拠のため送ること）
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

補足:
- `initialize` 単体は `MCP-Session-Id` ヘッダなしでも 200 OK で正常応答するため、セッション未確立に気づきにくい。
- ヘッダ名の大文字小文字は非依存（HTTP 仕様上）だが、レスポンスと同じ `MCP-Session-Id` 表記を使うのが無難。
- `Accept: application/json, text/event-stream` は両方必須。実測ではすべてのレスポンスが通常の JSON（`Content-Type: application/json`）で返り、SSE の `data:` 行パースは不要だった。

### 2.2 Claude Code への登録

```bash
claude mcp add --transport http fusion http://127.0.0.1:27182/mcp
```

この形式は妥当（実測に基づく判断）。理由:
- Streamable HTTP トランスポートであり、Claude Code の MCP クライアントはセッションヘッダ管理を仕様準拠で自動的に行う想定。curl での手動検証が必要だったのは素の HTTP クライアントでヘッダ管理を手動で行っていたため。
- 認証ヘッダやカスタムポート指定は不要（ローカル固定ポート、認証なし）。

ただし、`fusion_mcp_execute` の `script` featureType は Fusion 上でできることを何でも実行できてしまう強力さを持つ（ファイル操作・ドキュメント削除・他プロジェクトへのアクセス等）。常時登録するか都度セッションで有効化するかは運用判断として別途検討すること。

## 3. 代替ルート（公式 MCP が使えない場合）

公式ルート A が使えない場合の非公式代替。要点のみ（詳細は各リポジトリを参照）。

### ルート B: faust-machines/fusion360-mcp-server
```bash
claude mcp add fusion360 -- uvx fusion360-mcp-server --mode socket
```
Fusion アドイン（TCP `:9876`、CustomEvent でメインスレッド実行を保証）+ 独立 Python MCP サーバ（stdio、PyPI 配布）。discrete tool 84種。パラメトリック/ダイレクトモードの明示チェックと、undo の設計モード安全ガードを実装している点が他実装より堅牢（コミュニティ報告）。

### ルート C: ndoo/fusion360-mcp-bridge
Fusion アドイン（HTTP、Bearer トークン認証、`~/.fusion-mcp-secret`）+ Python サーバ。ツールは `fusion_execute`（任意 Python 実行）と `fusion_screenshot` の2つのみ。Fusion API 知識は `CLAUDE.md` に集約し起動時に自動読込させる設計（コミュニティ報告）。

## 4. トラブルシュート表

| 症状 | 原因 | 対処 |
|---|---|---|
| `tools/list` が `{"tools":[]}`（エラーにならない） | `MCP-Session-Id` ヘッダが後続リクエストに付いていない | 2.1 の手順で `initialize` のレスポンスヘッダからセッションIDを取得し、全リクエストに付与する（実測済み 2026-07-03、最頻出） |
| TCP 接続はできるが応答が空/タイムアウトする | Fusion 側がビジー、または MCP server が無効化されている | Fusion の Preferences → General → API を再確認。Fusion を再起動 |
| 30–45秒応答が返らない | 大規模ジオメトリ操作や複雑なスクリプトの実行に時間がかかっている（コミュニティ報告。実測では単純操作は1〜2秒） | タイムアウト値を伸ばして再試行。処理を分割する |
| ポート自体が見つからない | Fusion MCP server が有効化されていない、または Fusion が起動していない | `lsof -nP -iTCP -sTCP:LISTEN \| grep -i autodesk` でリッスン中プロセスを確認。`scripts/probe.sh` を実行 |
| 個人ライセンスで接続できない | 公式 MCP のライセンス制限（商用サブスクのみという報告あり、範囲未確定） | ルート B/C またはルート D（code-CAD）に切り替える |
