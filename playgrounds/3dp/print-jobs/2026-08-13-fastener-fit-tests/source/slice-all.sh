#!/usr/bin/env bash
# 全候補を同一条件(PLA Basic / 0.20 / 15% / 2 walls / no support / no brim)でスライスし、
# 印刷時間を横並び比較できるようにする。条件を揃えるのが目的なので個別最適はしない。
#
# COLOR は AMS の実在庫に合わせる。初回比較は #000000 で回したが、実機に黒が無く
# 印刷対象の実用セット 7 種は #FF6A13(オレンジ, AMS 0-1) で刷り直している。
# FORCE=1 で既存出力を上書きする。
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
JOB="$(dirname "$HERE")"
SKILL_DIR="${SKILL_DIR:-$HOME/.claude/skills/printing-with-bambu-h2d-pro}"
COLOR="${COLOR:-#000000}"
FORCE="${FORCE:-0}"
ONLY="${ONLY:-}"
C="$HERE/cache"

slice() { # out-stem input-path
  local out="$JOB/output/$1.gcode.3mf"
  [ -n "$ONLY" ] && [[ " $ONLY " != *" $1 "* ]] && return
  [ "$FORCE" = 0 ] && [ -f "$out" ] && { echo "skip $1 (exists)"; return; }
  node "$SKILL_DIR/scripts/slice-h2d-pro.mjs" \
    --input "$2" --output "$out" \
    --filament pla-basic --process 0.20-standard --color "$COLOR" \
    --infill 15 --walls 2 --supports off --brim no_brim \
    > "$JOB/output/$1.run.log" 2>&1 \
    && echo "ok   $1" || echo "FAIL $1 (see output/$1.run.log)"
}

slice dia-tol-01 "$C/diameter-tolerance-test/Diameter Tolerance - 01 mm.stl"
slice dia-tol-02 "$C/diameter-tolerance-test/Diameter Tolerance - 02 mm.stl"
slice dia-tol-03 "$C/diameter-tolerance-test/Diameter Tolerance - 03 mm.stl"
slice dia-tol-04 "$C/diameter-tolerance-test/Diameter Tolerance - 04 mm.stl"
slice holeprobes-ins-m3 "$C/holeprobes/holeprobes-ins-m3.stl"
slice holeprobes-mag6   "$C/holeprobes/holeprobes-mag6.stl"
slice holeprobes-mag13  "$C/holeprobes/holeprobes-mag13.stl"
slice md3d-heatset-m3-5 "$C/md3d-heatset-test/test_heatset-insert_M3-5.stl"
slice insert-tester-m3  "$C/insert-diameter-test-m3/Insert tester M3 v1.stl"
slice cnck-holetest-m2     "$C/cnckitchen-hole-size-test/HoleTest_M2.stl"
slice cnck-holetest-m2p5m3 "$C/cnckitchen-hole-size-test/HoleTest_M2p5+M3.stl"
slice cnck-holetest-m4     "$C/cnckitchen-hole-size-test/HoleTest_M4.stl"
slice cnck-holetest-m5     "$C/cnckitchen-hole-size-test/HoleTest_M5.stl"
slice cnck-holetest-m6     "$C/cnckitchen-hole-size-test/HoleTest_M6.stl"
