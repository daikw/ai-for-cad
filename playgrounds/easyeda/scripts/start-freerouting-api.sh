#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_EXE="$ROOT/tools/freerouting/app/freerouting.app/Contents/MacOS/freerouting"
SCRIPT="$ROOT/extensions/eext-freerouting-intergration/scripts/start-freerouting-mac.sh"

if [ -x "$LOCAL_EXE" ]; then
  exec "$LOCAL_EXE" \
    --gui.enabled=false \
    --api_server.enabled=true \
    --api_server.endpoints=http://127.0.0.1:37864 \
    --api_server.authentication.enabled=false \
    --api_server.cors_origins=* \
    --logging.console.level=ERROR
fi

if [ ! -f "$SCRIPT" ]; then
  echo "FreeRouting launcher not found: $SCRIPT" >&2
  exit 1
fi

exec bash "$SCRIPT"
