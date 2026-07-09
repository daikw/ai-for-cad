#!/usr/bin/env bash
# 公式 Fusion MCP (http://127.0.0.1:27182/mcp) への疎通診断。
# 読み取り専用・冪等（ドキュメント作成やスクリプト実行は一切行わない）。
# 依存: curl, python3, lsof
#
# 変数名に `path` を使わない（zsh の PATH と衝突するため）。
set -euo pipefail

MCP_URL="${FUSION_MCP_URL:-http://127.0.0.1:27182/mcp}"
MCP_PORT="${FUSION_MCP_PORT:-27182}"

init_headers_file="$(mktemp)"
init_body_file="$(mktemp)"
tools_body_file="$(mktemp)"
cleanup() { rm -f "$init_headers_file" "$init_body_file" "$tools_body_file"; }
trap cleanup EXIT

echo "== 1. Autodesk/Fusion 関連プロセスのリッスン状況 (lsof) =="
if lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | grep -i -E "autodesk|fusion|adsk"; then
  echo "-> Autodesk/Fusion 関連プロセスがリッスン中"
else
  echo "-> lsof にプロセス名でのヒットなし（プロセス名不一致の可能性もあるため :$MCP_PORT の直接疎通で判断する）"
fi
echo

echo "== 2. ポート :$MCP_PORT の LISTEN 確認 =="
if lsof -nP -iTCP:"$MCP_PORT" -sTCP:LISTEN 2>/dev/null | grep -q LISTEN; then
  echo "-> :$MCP_PORT は LISTEN 中"
else
  echo "-> :$MCP_PORT が LISTEN していない。"
  echo "   Fusion 360 が起動しているか、Preferences > General > API > Fusion MCP server が有効か確認してください。"
  echo "   詳細は references/setup.md を参照。"
  exit 1
fi
echo

echo "== 3. initialize でセッションIDを取得 =="
curl -s -D "$init_headers_file" -o "$init_body_file" \
  -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{
        "protocolVersion":"2025-06-18",
        "capabilities":{},
        "clientInfo":{"name":"fusion360-skill-probe","version":"0.1.0"}
      }}'

session_id="$(grep -i '^mcp-session-id:' "$init_headers_file" | tr -d '\r' | awk -F': ' '{print $2}')"

if [ -z "$session_id" ]; then
  echo "-> MCP-Session-Id ヘッダが取得できませんでした。initialize のレスポンス本文:"
  cat "$init_body_file"
  echo
  echo "   references/setup.md のトラブルシュート表を参照してください。"
  exit 1
fi
echo "-> セッションID取得: $session_id"
echo

echo "== 4. notifications/initialized =="
init_status="$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "MCP-Session-Id: $session_id" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}')"
echo "-> HTTP ${init_status} (202 が期待値)"
echo

echo "== 5. tools/list（MCP-Session-Id を付与） =="
curl -s -o "$tools_body_file" \
  -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "MCP-Session-Id: $session_id" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

python3 - "$tools_body_file" <<'PYEOF'
import json
import sys

body_file = sys.argv[1]
try:
    data = json.load(open(body_file))
except Exception as exc:
    print(f"PARSE_ERROR: {exc}")
    sys.exit(1)

tools = data.get("result", {}).get("tools", [])
print(f"tool_count={len(tools)}")
for tool in tools:
    print(f"  - {tool.get('name')}")

if len(tools) == 0:
    print("!! ツール数が 0 件。MCP-Session-Id が後続リクエストに渡っていない典型パターン。")
    print("   references/setup.md のトラブルシュート表を参照してください。")
    sys.exit(1)
PYEOF
# set -e により、上の python3 が非0終了した時点（tools=0件やパースエラー）で
# ここより下は実行されずスクリプトはその終了コードのまま止まる。
echo
echo "== 診断完了: 接続 OK =="
