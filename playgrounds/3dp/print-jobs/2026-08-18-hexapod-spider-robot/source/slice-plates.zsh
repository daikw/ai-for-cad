#!/bin/zsh
set -euo pipefail

script_dir=${0:a:h}
job_dir=${script_dir:h}
studio=/Applications/BambuStudio.app/Contents/MacOS/BambuStudio
source_3mf=$job_dir/source/cache/makerworld-2122819-profile.3mf
extract_root=$job_dir/source/cache/plate-export
output_dir=$job_dir/output
machine_profile=$job_dir/source/profiles/h2d-pro-machine.json
process_profile=$job_dir/source/profiles/h2d-pro-process.json
validated_studio_version=02.07.01.62
expected_object_counts=(6 6 12 1 1 36 1 1)

for required in "$studio" "$source_3mf" "$machine_profile" "$process_profile"; do
  [[ -e "$required" ]] || { print -u2 "missing required file: $required"; exit 1 }
done

studio_version=$("$studio" --help 2>&1 | sed -n 's/^BambuStudio-\([^:]*\):$/\1/p' | head -1)
[[ "$studio_version" == "$validated_studio_version" ]] || {
  print -u2 "Bambu Studio $studio_version differs from validated $validated_studio_version"
  exit 1
}

mkdir -p "$extract_root" "$output_dir"

for plate in {1..8}; do
  plate_tag=$(printf '%02d' "$plate")
  extract_dir=$extract_root/plate-$plate_tag
  [[ "$extract_dir" == "$job_dir/source/cache/plate-export/plate-$plate_tag" ]] || exit 1
  rm -rf -- "$extract_dir"
  mkdir -p "$extract_dir"

  "$studio" \
    --debug 2 \
    --slice "$plate" \
    --export-stl \
    --outputdir "$extract_dir" \
    "$source_3mf" \
    >"$output_dir/hexapod-plate-$plate_tag-original-export.slice.log" 2>&1

  stls=("$extract_dir"/stl/*.stl(N))
  (( ${#stls} == expected_object_counts[$plate] )) || {
    print -u2 "plate $plate exported ${#stls} STL files; expected ${expected_object_counts[$plate]}"
    exit 1
  }

  if (( plate <= 3 )); then
    color=orange
    expected_color='#FF6A13'
    filament_profile=$job_dir/source/profiles/pla-basic-orange.json
  else
    color=white
    expected_color='#FFFFFF'
    filament_profile=$job_dir/source/profiles/pla-basic-white.json
  fi

  artifact=$output_dir/hexapod-plate-$plate_tag-$color.gcode.3mf
  log=$output_dir/hexapod-plate-$plate_tag-$color.slice.log
  [[ "$artifact" == "$output_dir/hexapod-plate-$plate_tag-$color.gcode.3mf" ]] || exit 1
  rm -f -- "$artifact" "$output_dir/hexapod-plate-$plate_tag-$color.plate.png" "$output_dir/hexapod-plate-$plate_tag-$color.top.png"

  "$studio" \
    --debug 2 \
    --orient 0 \
    --arrange 1 \
    --ensure-on-bed \
    --curr-bed-type 'Textured PEI Plate' \
    --load-settings "$machine_profile;$process_profile" \
    --load-filaments "$filament_profile" \
    --filament-map-mode Manual \
    --extruder-nozzle-count 1,1 \
    --extruder-nozzle-volume-type Standard,Standard \
    --filament-map 1 \
    --filament-nozzle-map 1 \
    --filament-volume-map 0 \
    --slice 0 \
    --export-3mf "$artifact" \
    "${stls[@]}" \
    >"$log" 2>&1

  [[ -s "$artifact" ]] || { print -u2 "plate $plate did not produce an artifact"; exit 1 }
  unzip -tq "$artifact" >/dev/null
  unzip -p "$artifact" Metadata/project_settings.config \
    | jq -e --arg expected_color "$expected_color" '
        .printer_model == "Bambu Lab H2D Pro"
        and .printer_settings_id == "Bambu Lab H2D Pro 0.4 nozzle"
        and .print_settings_id == "0.20mm Standard @BBL H2DP"
        and .filament_type == ["PLA"]
        and .filament_colour == [$expected_color]
        and .layer_height == "0.2"
        and .wall_loops == "3"
        and .sparse_infill_density == "10%"
        and .enable_support == "1"
        and .support_type == "normal(auto)"
        and .brim_type == "auto_brim"
      ' \
    >/dev/null
  unzip -p "$artifact" Metadata/plate_1.png >"$output_dir/hexapod-plate-$plate_tag-$color.plate.png"
  unzip -p "$artifact" Metadata/top_1.png >"$output_dir/hexapod-plate-$plate_tag-$color.top.png"
done
