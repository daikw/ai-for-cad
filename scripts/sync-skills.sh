#!/usr/bin/env bash
# Copy skill sources (playgrounds/*/skills/*) into the harness dirs
# (.claude/skills/, .codex/skills/, .agents/skills/), which are gitignored.
# Run after clone and after editing any skill under playgrounds/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

synced=0
for src in "$ROOT"/playgrounds/*/skills/*/; do
  [[ -d "$src" ]] || continue
  name="$(basename "$src")"
  for harness in .claude .codex .agents; do
    mkdir -p "$ROOT/$harness/skills"
    rm -rf "$ROOT/$harness/skills/$name"
    cp -R "$src" "$ROOT/$harness/skills/$name"
  done
  synced=$((synced + 1))
done
echo "synced $synced skill(s) into .claude/ .codex/ .agents/"
