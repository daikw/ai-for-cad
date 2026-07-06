# ForgeCAD Experiments

CAD experiments and print artifacts.

## Directory Layout

- `projects/<model>/` — printable artifacts and model projects, including ForgeCAD source, STL/G-code, renders, and print snapshots. A model with multiple design branches nests them as `projects/<model>/b<N>-<slug>/` — see [docs/model-versioning.md](./docs/model-versioning.md).
- `printers/<slug>/` — material about the physical printer devices themselves (e.g. security audits), as opposed to what they printed.
- `viewer/` — shared cross-project STL viewer (three.js, static). Run `viewer/serve.sh` and open <http://localhost:8642/viewer/>, then pick a project from the PROJECT dropdown.
- `lib/forge-verify/` — numeric verification library used by each project's `checks.forge.js`.
- `docs/` — repo-wide policies ([model versioning](./docs/model-versioning.md)).

## Models

Branch (`b<N>`) = coexisting alternative take on the same concept. Version (`v<N>`) = in-place improvement that supersedes the previous one (history in each project's CHANGELOG). Full rules: [docs/model-versioning.md](./docs/model-versioning.md).

| Model | Branch | Version | Notes |
|---|---|---|---|
| [spherical-drone](./projects/spherical-drone/) | — | v1 | geodesic-cage drone + dock station; checks ALL PASS |
| [handy-fdm-mini](./projects/handy-fdm-mini/) | — | v1 | one-hand-carry FDM printer structure; checks ALL PASS |
| [pi-pico-case](./projects/pi-pico-case/) | — | v9.7 | reference example of version history (CHANGELOG + per-version print STLs) |
| [desktop-trash-bin](./projects/desktop-trash-bin/) | — | v1 | 7 decoration patterns as parametric variants |
| [parts-tray](./projects/parts-tray/) | [b1-uniform-cells](./projects/parts-tray/b1-uniform-cells/) | v1 | standalone trays, uniform cells (ex-`parts-trays`) |
| [parts-tray](./projects/parts-tray/) | [b2-edge-joinery](./projects/parts-tray/b2-edge-joinery/) | v1 | varied cells + edge connectors (ex-`parts-tray-v2`) |
| [palm-uav](./projects/palm-uav/) | — | — | palm-sized 1S micro quadcopter; HLD drafted, model not started |
