#!/bin/sh
# Serve desktop-trash-bin/ so the viewer can fetch ../*.stl and render PNGs.
cd "$(dirname "$0")/.." && exec python3 -m http.server "${1:-8643}"
