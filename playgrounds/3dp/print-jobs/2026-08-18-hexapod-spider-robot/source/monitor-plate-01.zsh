#!/bin/zsh
set -u

script_dir=${0:a:h}
job_dir=${script_dir:h}
playground_dir=${job_dir:h:h}
lab_ops=${LAB_OPS_REPO:-/Users/daikiwatanabe/ghq/gitlab.photosynth.dev/cto/lab-ops}
remote=$lab_ops/scripts/bambu-h2d-remote
printjob=$playground_dir/tools/printjob.mjs
slug=2026-08-18-hexapod-spider-robot
plate_number=${1:-1}
color=${2:-orange}
[[ "$plate_number" == <1-8> ]] || { print -u2 'plate number must be 1 through 8'; exit 64 }
[[ "$color" == orange || "$color" == white ]] || { print -u2 'color must be orange or white'; exit 64 }
plate_tag=$(printf '%02d' "$plate_number")
artifact=hexapod-plate-$plate_tag-$color.gcode.3mf
expected_subtask=hexapod-plate-$plate_tag-$color.gcode
monitor_log=$job_dir/output/hexapod-plate-$plate_tag-$color.monitor.jsonl
transport_log=$job_dir/output/hexapod-plate-$plate_tag-$color.monitor-transport.log
pid_file=$job_dir/output/hexapod-plate-$plate_tag-$color.monitor.pid

for required in "$remote" "$printjob" "$job_dir/output/$artifact"; do
  [[ -e "$required" ]] || { print -u2 "missing required file: $required"; exit 1 }
done

if [[ -r "$pid_file" ]]; then
  existing_pid=$(<"$pid_file")
  if [[ "$existing_pid" == <-> ]] && kill -0 "$existing_pid" 2>/dev/null; then
    print "monitor already running as PID $existing_pid"
    exit 0
  fi
fi

print $$ >"$pid_file"
trap '[[ "$pid_file" == "$job_dir/output/hexapod-plate-$plate_tag-$color.monitor.pid" ]] && rm -f -- "$pid_file"' EXIT

while true; do
  checked_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  if raw_report=$("$remote" raw-status 2>>"$transport_log"); then
    summary=$(printf '%s\n' "$raw_report" | jq -c --arg checked_at "$checked_at" '{
      checked_at: $checked_at,
      gcode_state,
      print_type,
      mc_percent,
      mc_remaining_time,
      print_error,
      fail_reason,
      layer_num,
      total_layer_num,
      subtask_name,
      sdcard
    }')
    print -r -- "$summary" | tee -a "$monitor_log"

    state=$(printf '%s\n' "$raw_report" | jq -r '.gcode_state // "UNKNOWN"')
    progress=$(printf '%s\n' "$raw_report" | jq -r '.mc_percent // 0')
    error=$(printf '%s\n' "$raw_report" | jq -r '.print_error // 0')
    subtask=$(printf '%s\n' "$raw_report" | jq -r '.subtask_name // ""')

    if [[ "$subtask" == "$expected_subtask" && "$state" == FINISH && "$progress" == 100 && "$error" == 0 ]]; then
      node "$printjob" snapshot "$slug" complete-plate-$plate_tag >>"$transport_log" 2>&1 || true
      node "$printjob" record "$slug" completed --artifact "$artifact" \
        --notes "FINISH/100%, print_error 0; completion monitor observed $checked_at" \
        >>"$transport_log" 2>&1
      node "$printjob" index >>"$transport_log" 2>&1
      exit 0
    fi

    if [[ "$subtask" == "$expected_subtask" && ( "$state" == FAILED || "$error" != 0 ) ]]; then
      node "$printjob" snapshot "$slug" failure-plate-$plate_tag >>"$transport_log" 2>&1 || true
      node "$printjob" record "$slug" failed --artifact "$artifact" \
        --notes "state $state, print_error $error, fail_reason $(printf '%s\n' "$raw_report" | jq -r '.fail_reason // "unknown"') at $checked_at" \
        >>"$transport_log" 2>&1
      node "$printjob" index >>"$transport_log" 2>&1
      exit 1
    fi
  else
    jq -cn --arg checked_at "$checked_at" \
      '{checked_at: $checked_at, transport_error: true}' \
      | tee -a "$monitor_log"
  fi

  sleep 90
done
