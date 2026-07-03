#!/bin/sh
# Serve the repo root so the viewer can fetch ../projects/<name>/stl/*.stl
# and ../projects/<name>/viewer.json (stdlib only).
cd "$(dirname "$0")/.." && exec python3 -m http.server "${1:-8642}"
