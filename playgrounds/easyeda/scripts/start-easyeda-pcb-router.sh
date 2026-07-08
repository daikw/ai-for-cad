#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/tools/easyeda-pcb-router/.build/EasyEDA Router v0.8.11"

if [ ! -f "$DIST/bin/bootstrap.jar" ]; then
  echo "EasyEDA PCB Router is not built. Run: mise x ant@latest -- ant build-client" >&2
  exit 1
fi

cd "$DIST"
mkdir -p log
exec java -XX:+UseG1GC -Dcom.easyeda.env=local -jar bin/bootstrap.jar

