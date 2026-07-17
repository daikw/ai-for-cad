#!/usr/bin/env bash
# Fetch the community Raspberry Pi 4B STEP model and regenerate the derived
# meshes used by the fit-check assembly and the viewer.
# The STEP/STL files in this directory are NOT committed (third-party model,
# license unclear) — run this script after a fresh clone.
set -euo pipefail
cd "$(dirname "$0")"

STEP_URL="https://raw.githubusercontent.com/multigamesystem/MGS-CAD-Files/main/STEP%20files%20with%20images/Raspberry%20Pi%204%20Model%20B%20v4.step"

if [ ! -f rpi4b.step ]; then
  echo "downloading rpi4b.step ..."
  curl -fsSL -o rpi4b.step "$STEP_URL"
fi

cd ..
echo "tessellating STEP -> reference/rpi4b-mesh.stl (occt) ..."
forgecad export stl rpi4-bbox.forge.js --backend occt --output reference/rpi4b-mesh.stl

echo "exporting placed Pi mesh for the viewer ..."
forgecad export stl viewer-pi-placed.forge.js --backend manifold --output reference/rpi4b-placed.stl

echo "done. verify with: forgecad run checks.forge.js --backend manifold"
