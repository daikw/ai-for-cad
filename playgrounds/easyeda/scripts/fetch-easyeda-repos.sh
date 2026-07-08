#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="${ROOT_DIR}/easyeda-repos.json"

clone_or_update() {
  local kind="$1"
  local name="$2"
  local repo="$3"
  local dest="${ROOT_DIR}/${kind}/${name}"

  mkdir -p "$(dirname "$dest")"
  if [[ -d "$dest/.git" ]]; then
    echo "Updating ${kind}/${name}"
    git -C "$dest" fetch --depth=1 origin HEAD
    git -C "$dest" checkout --detach FETCH_HEAD
  else
    echo "Cloning ${kind}/${name}"
    git clone --depth=1 "$repo" "$dest"
  fi
}

python3 - "$MANIFEST" <<'PY' | while IFS=$'\t' read -r kind name repo; do
import json
import sys

manifest = json.load(open(sys.argv[1]))
for kind in ("extensions", "tools"):
    for item in manifest[kind]:
        print(f"{kind}\t{item['name']}\t{item['repo']}")
PY
  clone_or_update "$kind" "$name" "$repo"
done
