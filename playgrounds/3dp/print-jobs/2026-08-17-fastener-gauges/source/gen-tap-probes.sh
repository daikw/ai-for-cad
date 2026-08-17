#!/usr/bin/env bash
# TAP(ISTORA タッピングねじ)の下穴クーポンを HoleProbes.scad から生成する。
# 一般則の下穴 = 呼び径 x 0.8〜0.85 を中心に、公称をまたぐレンジで振る
# (MAG-13 で片側レンジにして最適値を外した反省)。
#
# 面取り(beveled corner)がある側が最小径。3 枚は板の長さで見分ける(M2 が最短)。
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SCAD="$(dirname "$HERE")/../2026-08-13-fastener-fit-tests/source/cache/graduated-hole-test-block/HoleProbes.scad"
OUT="$HERE/cache/tapprobes"
mkdir -p "$OUT"

gen() { # name start end step
  openscad -o "$OUT/$1.stl" \
    -D "inner_d_start=$2" -D "inner_d_end=$3" -D "inner_d_step=$4" \
    "$SCAD" 2>&1 | grep -E 'Status' || true
  echo "  $1.stl  ($2..$3 step $4)"
}

gen tapprobes-m2   1.5 1.9 0.1   # 0.8d=1.60 / 0.85d=1.70
gen tapprobes-m2p5 1.9 2.3 0.1   # 0.8d=2.00 / 0.85d=2.13
gen tapprobes-m3   2.2 2.6 0.1   # 0.8d=2.40 / 0.85d=2.55
