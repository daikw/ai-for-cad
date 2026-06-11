#!/bin/sh
# Serve spherical-drone/ so the viewer can fetch ../stl/*.stl (stdlib only).
cd "$(dirname "$0")/.." && exec python3 -m http.server "${1:-8642}"
