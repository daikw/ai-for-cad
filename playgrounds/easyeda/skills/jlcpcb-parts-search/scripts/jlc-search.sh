#!/usr/bin/env bash
# jlcparts (yaqwsx.github.io/jlcparts) の静的データ層を叩く JLCPCB 在庫部品検索 CLI。
# DB 全体はダウンロードせず、manifest + サブカテゴリ単位のシャードだけを取得する。
#
# Usage:
#   jlc-search.sh categories [pattern]
#   jlc-search.sh search <category-pattern> [--grep <regex>] [--min-stock N]
#                        [--class basic|preferred|extended] [--limit N] [--json]
#   jlc-search.sh part <C-number>
set -euo pipefail

BASE_URL="https://yaqwsx.github.io/jlcparts/data"
CACHE_DIR="${JLCPARTS_CACHE_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/jlcparts-skill}"
CACHE_TTL_HOURS=24
mkdir -p "$CACHE_DIR"

die() { echo "error: $*" >&2; exit 1; }

# 24h キャッシュ付き fetch。gz はそのまま保存し、呼び出し側で gunzip -c する
fetch() { # $1 = filename (relative to BASE_URL)
  local f="$CACHE_DIR/$1"
  if [[ ! -f "$f" ]] || [[ -n "$(find "$f" -mmin +$((CACHE_TTL_HOURS * 60)) 2>/dev/null)" ]]; then
    curl -fsS --retry 2 -m 120 "$BASE_URL/$1" -o "$f.tmp" || die "fetch failed: $1"
    mv "$f.tmp" "$f"
  fi
  echo "$f"
}

manifest() { fetch manifest.json; }

# stdin のファイル名一覧を 8 並列で先読みキャッシュする
prefetch() {
  export -f fetch die
  export BASE_URL CACHE_DIR CACHE_TTL_HOURS
  xargs -n1 -P8 bash -c 'fetch "$1" >/dev/null' _
}

# attributes-lut から Basic/Extended 属性の LUT index → クラス名 の対応表を作る。
# LUT は 33MB あるので、manifest より新しい class-index が既にあれば再計算しない
class_index() {
  local m idx="$CACHE_DIR/class-index.json"
  m=$(manifest)
  if [[ ! -f "$idx" || "$idx" -ot "$m" ]]; then
    local lut
    lut=$(fetch attributes-lut.json.gz)
    gunzip -c "$lut" | jq -c '
      [to_entries[]
       | select(.value[0] == "Basic/Extended")
       | {(.key | tostring): .value[1].values["catalog class 1"][0]}]
      | add' >"$idx"
  fi
  echo "$idx"
}

# サブカテゴリ一覧。pattern は category/subcategory 名への大文字小文字無視の正規表現
cmd_categories() {
  local pattern="${1:-.}"
  jq -r --arg p "$pattern" '
    .categories | to_entries[] | .value
    | select((.category + " / " + .subcategory) | test($p; "i"))
    | [.componentCount, .category, .subcategory] | @tsv' "$(manifest)" |
    sort -rn | awk -F'\t' 'BEGIN{printf "%8s  %s\n", "COUNT", "CATEGORY / SUBCATEGORY"}
                           {printf "%8d  %s / %s\n", $1, $2, $3}'
}

# シャード群を stream に展開して jq でフィルタする共通部
filter_shards() { # stdin: shard filenames (one per line)
  local grep_re="$1" min_stock="$2" class="$3" limit="$4" as_json="$5"
  local cidx
  cidx=$(class_index)
  local shards
  shards=$(cat)
  prefetch <<<"$shards"
  local shard f
  while IFS= read -r shard; do
    f=$(fetch "$shard")
    gunzip -c "$f"
  done <<<"$shards" | jq -rs \
    --arg re "$grep_re" --argjson min "$min_stock" --arg cls "$class" \
    --argjson limit "$limit" --argjson raw "$([[ $as_json == 1 ]] && echo true || echo false)" \
    --slurpfile cmap "$cidx" '
    # 入力は「ヘッダ行(列名→添字) + データ行(配列)」の繰り返し。ヘッダを都度検出する
    reduce .[] as $row ({h: null, out: []};
      if ($row | type) == "object" then .h = $row
      else . as $s | .out += [
        {lcsc: $row[$s.h.lcsc], mfr: $row[$s.h.mfr], description: $row[$s.h.description],
         datasheet: $row[$s.h.datasheet], stock: $row[$s.h.stock],
         price1: (($row[$s.h.price] // []) | .[0].price // null),
         class: ((($row[$s.h.attributes] // []) | if type == "array" then . else [] end
                  | map($cmap[0][tostring] // empty) | .[0]) // "?")}]
      end)
    | .out
    | map(select(.stock >= $min))
    | map(select((.description + " " + .mfr) | test($re; "i")))
    | (if $cls == "basic" then map(select(.class == "Basic" or .class == "Preferred"))
       elif $cls == "preferred" then map(select(.class == "Preferred"))
       elif $cls == "extended" then map(select(.class == "Extended"))
       else . end)
    | sort_by(-.stock)
    | .[0:$limit]
    | if $raw then .[] | tojson
      else .[] | [.lcsc, .class, .stock, (.price1 | tostring), .mfr, .description[0:110]] | @tsv
      end'
}

cmd_search() {
  local cat_pattern="" grep_re="." min_stock=1 class="" limit=20 as_json=0
  cat_pattern="${1:-}"; [[ -n "$cat_pattern" ]] || die "usage: search <category-pattern> [options]"
  shift
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --grep) grep_re="$2"; shift 2 ;;
      --min-stock) min_stock="$2"; shift 2 ;;
      --class) class="$2"; shift 2 ;;
      --limit) limit="$2"; shift 2 ;;
      --json) as_json=1; shift ;;
      *) die "unknown option: $1" ;;
    esac
  done

  local shards
  shards=$(jq -r --arg p "$cat_pattern" '
    .categories | to_entries[] | .value
    | select((.category + " / " + .subcategory) | test($p; "i"))
    | .shards[]' "$(manifest)")
  [[ -n "$shards" ]] || die "no subcategory matches: $cat_pattern (try: categories)"

  local n
  n=$(wc -l <<<"$shards" | tr -d ' ')
  if ((n > 120)); then
    die "$n shards matched — category pattern too broad; narrow it (see: categories '$cat_pattern')"
  elif ((n > 20)); then
    echo "note: fetching $n shards (~$((n / 20 + 1))MB, cached 24h) ..." >&2
  fi

  if [[ $as_json == 0 ]]; then
    printf '%s\t%s\t%s\t%s\t%s\t%s\n' LCSC CLASS STOCK PRICE@1 MFR DESCRIPTION
  fi
  filter_shards "$grep_re" "$min_stock" "$class" "$limit" "$as_json" <<<"$shards"
}

cmd_part() {
  local c="${1:-}"
  [[ "$c" =~ ^C?([0-9]+)$ ]] || die "usage: part <C-number>  (e.g. part C25804)"
  local num="${BASH_REMATCH[1]}" key="C${BASH_REMATCH[1]}"
  local bucket_size bucket lookup_file shard
  bucket_size=$(jq -r '.lookupBucketSize' "$(manifest)")
  bucket=$((num / bucket_size))
  lookup_file=$(jq -r --arg b "$bucket" '.lookupBuckets[$b] // empty' "$(manifest)")
  [[ -n "$lookup_file" ]] || die "no lookup bucket for $key"
  shard=$(gunzip -c "$(fetch "$lookup_file")" | jq -r --arg k "$key" '.[$k] // empty')
  [[ -n "$shard" ]] || die "part not found: $key"
  filter_shards "." 0 "" 1000000 1 <<<"$shard" | jq -c --arg k "$key" 'select(.lcsc == $k)'
}

case "${1:-}" in
  categories) shift; cmd_categories "$@" ;;
  search) shift; cmd_search "$@" ;;
  part) shift; cmd_part "$@" ;;
  *) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
