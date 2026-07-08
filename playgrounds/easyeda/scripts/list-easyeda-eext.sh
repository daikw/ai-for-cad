#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

find "$ROOT/extensions" \
  -type d \( -name node_modules -o -name .git \) -prune -o \
  -path '*/build/dist/*.eext' -type f -print | sort
