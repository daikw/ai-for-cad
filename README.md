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

The model list lives in [`viewer/projects.json`](./viewer/projects.json) (everything the viewer can show) and the `projects/` directory of each playground. Branch (`b<N>`) = coexisting alternative take on the same concept. Version (`v<N>`) = in-place improvement that supersedes the previous one (history in each project's CHANGELOG). Full rules: [docs/model-versioning.md](./docs/model-versioning.md).

Adding or deriving a model: update `viewer/projects.json`.
