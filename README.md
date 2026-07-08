# ai-for-cad

AI-for-CAD experiments: per-toolchain playgrounds plus a shared artifact viewer.
Merged from `forgecad-experiments` (history preserved) and an un-versioned
multi-tool workspace.

## Directory Layout

- `playgrounds/<toolchain>/` — one experiment area per agent-skill family:
  - [`forgecad/`](./playgrounds/forgecad/) — ForgeCAD (code-CAD DSL). `projects/` holds the models, `lib/forge-verify/` the numeric verification library.
  - [`fusion360/`](./playgrounds/fusion360/) — Autodesk Fusion 360 driven via MCP + `adsk` Python scripts, and the research behind the fusion360 agent skill.
  - [`easyeda/`](./playgrounds/easyeda/) — EasyEDA Pro (EDA). Vendored extensions/tools are gitignored; see its [README](./playgrounds/easyeda/README.md).
  - [`qcad/`](./playgrounds/qcad/) — QCAD 2D drawings (DXF).
- `benchmarks/` — cross-toolchain comparisons on a shared brief (e.g. [arduino-uno-compat](./benchmarks/arduino-uno-compat/): EasyEDA vs Fusion Electronics).
- `viewer/` — shared cross-project STL viewer (three.js, static). Run `viewer/serve.sh` and open <http://localhost:8642/viewer/>. Shows provenance (AI model / skills / DSL), part descriptions on hover, and assembly motions where defined.
- `docs/` — repo-wide policies ([model versioning](./docs/model-versioning.md)).

## Models

Branch (`b<N>`) = coexisting alternative take on the same concept. Version (`v<N>`) = in-place improvement that supersedes the previous one (history in each project's CHANGELOG). Full rules: [docs/model-versioning.md](./docs/model-versioning.md).

| Model | Toolchain | Branch | Version | Notes |
|---|---|---|---|---|
| [spherical-drone](./playgrounds/forgecad/projects/spherical-drone/) | forgecad | — | v1 | geodesic-cage drone + dock station; checks ALL PASS |
| [handy-fdm-mini](./playgrounds/forgecad/projects/handy-fdm-mini/) | forgecad | — | v1 | one-hand-carry FDM printer structure; checks ALL PASS |
| [pi-pico-case](./playgrounds/forgecad/projects/pi-pico-case/) | forgecad | — | v9.7 | reference example of version history (CHANGELOG + per-version print STLs) |
| [desktop-trash-bin](./playgrounds/forgecad/projects/desktop-trash-bin/) | forgecad | — | v1 | 7 decoration patterns as parametric variants |
| [parts-tray](./playgrounds/forgecad/projects/parts-tray/) | forgecad | [b1-uniform-cells](./playgrounds/forgecad/projects/parts-tray/b1-uniform-cells/) | v1 | standalone trays, uniform cells |
| [parts-tray](./playgrounds/forgecad/projects/parts-tray/) | forgecad | [b2-edge-joinery](./playgrounds/forgecad/projects/parts-tray/b2-edge-joinery/) | v1 | varied cells + edge connectors |
| [palm-uav](./playgrounds/forgecad/projects/palm-uav/) | forgecad | — | — | palm-sized 1S micro quadcopter; HLD drafted, model not started |
| [palm-agv](./playgrounds/forgecad/projects/palm-agv/) | forgecad | — | — | palm-sized differential-drive indoor AGV; HLD drafted, model not started |
| [spacer](./playgrounds/forgecad/projects/spacer/) | forgecad | — | v4 | parametric cylindrical spacer; v1–v4 history in CHANGELOG |
| [oldham-coupling](./playgrounds/fusion360/projects/oldham-coupling/) | fusion360 | — | v1 | 3-piece flexible coupling (adsk scripts via Fusion MCP); viewer motion demo |
| [desk-hook](./playgrounds/qcad/projects/desk-hook/) | qcad | — | v1 | desk headphone hook, 2D profile for 15mm extrusion |
| [fdm-printer-2d](./playgrounds/qcad/projects/fdm-printer-2d/) | qcad | — | v1 | 2D concept drawing |

Adding or deriving a model: update this table and `viewer/projects.json`.
