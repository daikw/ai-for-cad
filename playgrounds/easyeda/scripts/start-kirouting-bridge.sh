#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT="$ROOT/extensions/eext-kirouting-integration"
BRIDGE="$EXT/bridge_server"
VENV="$BRIDGE/.venv"
TOOLS="$EXT/KiCadRoutingTools"

if [ ! -x "$VENV/bin/python" ]; then
  echo "KiRouting bridge venv is missing. Run:" >&2
  echo "  mise x uv@latest -- uv venv $VENV" >&2
  echo "  mise x uv@latest -- uv pip install --python $VENV/bin/python -r $BRIDGE/requirements.txt" >&2
  exit 1
fi

if [ ! -f "$TOOLS/route.py" ]; then
  echo "KiCadRoutingTools is missing. Clone it into: $TOOLS" >&2
  exit 1
fi

if [ ! -f "$TOOLS/rust_router/grid_router.so" ]; then
  echo "KiCadRoutingTools Rust router is missing. Run:" >&2
  echo "  (cd $TOOLS && $VENV/bin/python build_router.py)" >&2
  exit 1
fi

cd "$BRIDGE"
exec "$VENV/bin/python" server.py

