# EasyEDA Extensions Local Setup

This directory contains local clones of the EasyEDA extension/tool repos under `easyeda/`.

## Importable `.eext` Files

Run:

```bash
scripts/list-easyeda-eext.sh
```

Import the listed `.eext` files from EasyEDA Pro / JLCEDA Pro UI.

## Local Services

Some extensions need a local service after importing the `.eext` file:

- EasyEDA local PCB router: `scripts/start-easyeda-pcb-router.sh`
  - URL: `http://127.0.0.1:3579/api/whois`
  - WebSocket: `ws://127.0.0.1:3579/router`
- KiRouting integration: `scripts/start-kirouting-bridge.sh`
  - URL: `http://127.0.0.1:8765/api/test`
  - Uses `easyeda/extensions/eext-kirouting-integration/KiCadRoutingTools`
- FreeRouting integration: `scripts/start-freerouting-api.sh`
  - URL: `http://127.0.0.1:37864`
  - Uses local FreeRouting v2.2.4 from `easyeda/tools/freerouting/app/freerouting.app` when present
  - Falls back to the extension repo's macOS launcher, which searches common install locations

## EasyEDA External Interaction Permission

EasyEDA Pro may warn that an extension called external interaction interfaces such as networking or local file access. This is expected for many of these extensions.

Enable the permission only for extensions you intend to use and trust. At minimum:

- `easyeda-api-agent`: enable when using agent-driven EasyEDA operations.
- `eext-api-debug-tool`: enable when debugging EasyEDA APIs.
- `kirouting-integration`: enable when using KiRouting; also run `scripts/start-kirouting-bridge.sh`.
- `freerouting-intergration`: enable when using FreeRouting; also run `scripts/start-freerouting-api.sh`.
- `run-api-gateway`: enable only when connecting local AI/coding-agent tools to EasyEDA.
- MCAD/Blender integrations: enable only when connecting to Fusion 360, FreeCAD, SolidWorks, or Blender.

For simple import-only or inspection workflows, leave unrelated extensions disabled until needed.

## Build Status

- Node dependencies were installed with `npm ci --ignore-scripts`.
- High-severity runtime `npm audit` checks passed after lockfile fixes in affected repos.
- All extensions with normal build flow were built successfully.
- `eext-knowledge-base` was cloned and dependencies were installed, but full build was intentionally not completed because its vector prebuild starts a long 9,190-chunk embedding generation job.
- `easyeda-pcb-router` was built with `mise x ant@latest -- ant build-client`.
- KiRouting bridge Python dependencies and `KiCadRoutingTools` Rust router prebuilt binary were installed locally.
- FreeRouting v2.2.4 macOS arm64 DMG was downloaded from GitHub Releases, SHA-256 verified, and extracted locally.
