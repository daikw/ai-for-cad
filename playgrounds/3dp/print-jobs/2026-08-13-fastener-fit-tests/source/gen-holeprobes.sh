#!/usr/bin/env bash
# HoleProbes.scad (CC0, Vladimir Gamalyan) を在庫部品の径レンジに合わせて 3 種生成する。
# INS M3 は公称下穴 4.1 前後、MAG-6/MAG-13 は磁石実径 +0.0〜+0.4 のクリアランス探索。
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SCAD="$HERE/cache/graduated-hole-test-block/HoleProbes.scad"
OUT="$HERE/cache/holeprobes"
mkdir -p "$OUT"

gen() { # name start end step
  openscad -o "$OUT/$1.stl" \
    -D "inner_d_start=$2" -D "inner_d_end=$3" -D "inner_d_step=$4" \
    "$SCAD" 2>&1 | grep -Ev '^(ECHO|Compiling|Parsing|Saved)' || true
  echo "  $1.stl  ($2..$3 step $4)"
}

gen holeprobes-ins-m3 3.9 4.4 0.1
gen holeprobes-mag6   6.0 6.4 0.1
gen holeprobes-mag13 13.0 13.4 0.1
