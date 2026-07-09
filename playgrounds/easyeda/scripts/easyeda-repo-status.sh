#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="${ROOT_DIR}/easyeda-repos.json"

printf "%-12s %-42s %-9s %-10s %s\n" "kind" "name" "revision" "pkg" "build"
python3 - "$MANIFEST" <<'PY' | while IFS=$'\t' read -r kind name; do
import json
import sys

manifest = json.load(open(sys.argv[1]))
for kind in ("extensions", "tools", "skills"):
    if kind not in manifest:
        continue
    for item in manifest[kind]:
        print(f"{kind}\t{item['name']}")
PY
  dir="${ROOT_DIR}/${kind}/${name}"
  if [[ ! -d "$dir/.git" ]]; then
    printf "%-12s %-42s %-9s %-10s %s\n" "$kind" "$name" "missing" "-" "-"
    continue
  fi
  rev="$(git -C "$dir" rev-parse --short HEAD)"
  pkg="-"
  build="-"
  if [[ -f "$dir/package.json" ]]; then
    pkg="yes"
    if node -e "const p=require(process.argv[1]); process.exit(p.scripts && p.scripts.build ? 0 : 1)" "$dir/package.json" 2>/dev/null; then
      build="yes"
    else
      build="no"
    fi
  fi
  printf "%-12s %-42s %-9s %-10s %s\n" "$kind" "$name" "$rev" "$pkg" "$build"
done
