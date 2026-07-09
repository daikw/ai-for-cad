# ai-for-cad

AI-for-CAD experiments: dated project directories, per-toolchain playgrounds and
a shared artifact viewer. Merged from `forgecad-experiments` (history preserved)
and an un-versioned multi-tool workspace.

## Directory Layout

- `projects/<name>-<YYYYMMDD>/` — every CAD project (any toolchain), suffixed
  with its start date. Cross-toolchain comparisons live here too (e.g.
  [arduino-uno-compat-20260703](./projects/arduino-uno-compat-20260703/):
  EasyEDA vs Fusion Electronics).
- `playgrounds/<toolchain>/` — per-agent-skill-family workspaces holding skills,
  tools, libraries and research (not project artifacts). Each `skills/` dir is
  the committed source of truth — run `scripts/sync-skills.sh` after cloning to
  copy them into the gitignored `.claude/` / `.codex/` / `.agents/` harness dirs:
  - [`forgecad/`](./playgrounds/forgecad/) — ForgeCAD (code-CAD DSL): 13 skills + `lib/forge-verify/` numeric verification library.
  - [`fusion360/`](./playgrounds/fusion360/) — Fusion 360 via MCP + `adsk` Python: skill + the research behind it.
  - [`easyeda/`](./playgrounds/easyeda/) — EasyEDA Pro (EDA): vendored third-party skills/extensions/tools (gitignored, re-fetchable); see its [README](./playgrounds/easyeda/README.md).
- `viewer/` — shared cross-project viewer (three.js, static). Run
  `viewer/serve.sh` and open <http://localhost:8642/viewer/>. Shows STL
  assemblies, 2D DXF drawings and images, provenance (AI model / skills / DSL),
  part descriptions on hover, and assembly motions where defined.
- `docs/` — repo-wide policies ([model versioning](./docs/model-versioning.md)).

## Models

The model list lives in [`viewer/projects.json`](./viewer/projects.json) (everything the viewer can show) and `projects/`. Branch (`b<N>`) = coexisting alternative take on the same concept. Version (`v<N>`) = in-place improvement that supersedes the previous one (history in each project's CHANGELOG). Full rules: [docs/model-versioning.md](./docs/model-versioning.md).

Adding or deriving a model: create `projects/<name>-<YYYYMMDD>/` (date = project start) and update `viewer/projects.json`.
