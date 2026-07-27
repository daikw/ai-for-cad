# Blender MCP

Minimal Blender MCP server for local CAD automation, rendering, USD export,
and optional transfer to an Isaac Sim host.

- **17 focused tools**, including one explicit Python escape hatch
- First-class **USD export** tuned for Isaac Sim
- First-class **rsync-to-DGX** helper (runs on the MCP host, no Blender roundtrip)
- `execute_bpy` escape hatch is **disabled by default** and must be toggled on
  inside the Blender add-on panel before use
- FastMCP (Python) external process ↔ Blender add-on over JSON/TCP

The package and executable use the `ai-for-cad-blender-mcp` name to avoid
colliding with unrelated packages that publish a `blender-mcp` command.

## Architecture

```
┌────────────────────────┐  stdio   ┌───────────────────────┐  JSON/TCP  ┌──────────────────────┐
│  MCP client            │ ───────▶ │ ai-for-cad-blender-mcp │ ───────▶ │ Blender add-on       │
│  Cursor / Claude Code  │          │ (FastMCP, external)    │            │ (main-thread timer)  │
└────────────────────────┘          └───────────────────────┘            └──────────────────────┘
```

All bpy calls happen on Blender's main thread, fed by a `bpy.app.timers`
callback that drains a queue written by the socket thread. This is the same
concurrency pattern as `ahujasid/blender-mcp` — `bpy` is not thread safe.

## Install (Blender side)

### Automated (recommended for AI agents)

Run the setup script once — it installs, enables, and persists the
add-on so every future Blender launch auto-starts the MCP server:

```bash
/Applications/Blender.app/Contents/MacOS/Blender \
    --background \
    --python scripts/setup_blender_addon.py \
    -- --auto-start
```

Flags (both optional):
- `--auto-start` — register a `load_post` handler that starts the TCP
  server automatically when Blender opens any file (GUI mode only;
  `--background` binds the socket but cannot pump `bpy.app.timers`).
- `--allow-execute-bpy` — pre-enable the `execute_bpy` escape hatch.

After running, just open Blender normally — the server is live on
`127.0.0.1:9876` with no manual clicks.

### Manual

1. Blender 5.1+ → **Edit → Preferences → Add-ons → Install...**
2. Pick `addon/blender_mcp_addon.py`
3. Enable **Blender MCP**
4. Open the 3D Viewport sidebar (**N**) → **Blender MCP** tab → **Start**

Default listen address: `127.0.0.1:9876`.

## Install (MCP server side)

```bash
cd playgrounds/blender/tools/blender-mcp
mise run sync
codex mcp add blender -- "$(pwd)/.venv/bin/ai-for-cad-blender-mcp"
codex mcp list
```

The local bridge defaults to `127.0.0.1:9876`, so no environment variables
are needed for the normal setup. Override `BLENDER_MCP_HOST`,
`BLENDER_MCP_PORT`, or `BLENDER_MCP_TIMEOUT` only for a non-default bridge.
`BLENDER_MCP_DGX_HOST` and `BLENDER_MCP_DGX_USER` configure the optional DGX
transfer helper.

## Tools

| Tool | Purpose |
|------|---------|
| `ping` | Health check; returns Blender version |
| `get_scene_info` | Scene summary + object list |
| `get_object_info` | Transform / materials / modifiers for one object |
| `create_primitive` | cube / plane / sphere / cylinder / cone / torus / monkey |
| `transform_object` | Set absolute loc / rot / scale |
| `delete_object` | Remove an object from the scene |
| `set_material_pbr` | Principled BSDF (base color, metallic, roughness, emission) |
| `create_light` | SUN / POINT / AREA / SPOT lights |
| `set_camera` | Create / move camera, optional look-at, focal length |
| `render_scene` | Render still image (CYCLES or EEVEE_NEXT) |
| `export_usd` | Write scene as USD for Isaac Sim |
| `rsync_to_dgx` | Push a file/dir to DGX Spark via rsync+ssh |
| `execute_bpy` | **Escape hatch** — run arbitrary Python in Blender |

## Security model

`execute_bpy` is an intentional arbitrary-code-execution surface. The
maintainers accept this trade-off because:

1. The add-on listens on `127.0.0.1` by default and defaults the escape
   hatch to **off** — the user has to tick "Allow execute_bpy" in the panel
   before the tool will run anything.
2. Running bpy snippets is fundamentally equivalent to letting the LLM drive
   Blender manually.
3. Curating every possible bpy call is a maintenance trap; the elegant
   escape hatch keeps the curated surface small and LLM-friendly.
4. `rsync_to_dgx` uses a **fixed** rsync flag set (`-avz --partial
   --progress`); no user-supplied `extra_args`, so it cannot be turned into
   an arbitrary rsync/ssh option-injection primitive.

**Do not expose port 9876 to untrusted networks.** If you need to operate
Blender remotely, tunnel over SSH.

## Development

```bash
mise run test
mise run lint
mise run test-blender
```

The first two tasks run through the pinned `uv` toolchain. `test-blender` uses
Blender's bundled Python for the add-on smoke test.
