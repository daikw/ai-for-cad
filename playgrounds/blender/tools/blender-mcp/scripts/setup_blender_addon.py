"""One-shot setup script for the Blender MCP add-on.

Run via Blender's CLI to install, enable, and configure auto-start
without touching the GUI:

    /Applications/Blender.app/Contents/MacOS/Blender \\
        --background --python scripts/setup_blender_addon.py

Or pass options:

    ... --python scripts/setup_blender_addon.py -- --auto-start --allow-execute-bpy

After running this once, every subsequent Blender launch will
automatically start the MCP server on 127.0.0.1:9876.
"""

from __future__ import annotations

import sys
from pathlib import Path

import bpy  # type: ignore

ADDON_FILENAME = "blender_mcp_addon.py"
ADDON_MODULE = "blender_mcp_addon"


def _find_addon_file() -> Path:
    here = Path(__file__).resolve().parent.parent / "addon" / ADDON_FILENAME
    if here.exists():
        return here
    raise FileNotFoundError(
        f"cannot find {ADDON_FILENAME} relative to this script; expected at {here}"
    )


def main() -> int:
    # Parse args after the "--" separator that Blender passes to scripts.
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    auto_start = "--auto-start" in argv
    allow_execute = "--allow-execute-bpy" in argv

    addon_path = _find_addon_file()
    print(f"[setup] addon file: {addon_path}")

    # 1. Install
    bpy.ops.preferences.addon_install(filepath=str(addon_path), overwrite=True)
    print("[setup] addon installed")

    # 2. Enable
    bpy.ops.preferences.addon_enable(module=ADDON_MODULE)
    print("[setup] addon enabled")

    # 3. Configure scene-level defaults via the startup file.
    #    We need to write the defaults into the startup .blend so they
    #    persist across Blender launches. The approach:
    #      a. Set the properties on the current scene.
    #      b. Save the startup file (Ctrl-U equivalent).
    prefs = bpy.context.scene.blender_mcp
    if auto_start:
        prefs.auto_start = True
        print("[setup] auto_start = True")
    if allow_execute:
        prefs.allow_execute_bpy = True
        print("[setup] allow_execute_bpy = True")

    # 4. Persist — save user preferences (addon list) and startup file
    #    (scene properties including auto_start).
    bpy.ops.wm.save_userpref()
    bpy.ops.wm.save_homefile()
    print("[setup] userpref + startup file saved")

    # 5. Verify
    enabled = ADDON_MODULE in [a.module for a in bpy.context.preferences.addons]
    print(f"[setup] verified addon enabled: {enabled}")
    print(f"[setup] auto_start: {prefs.auto_start}")
    print(f"[setup] allow_execute_bpy: {prefs.allow_execute_bpy}")
    print("[setup] done — next Blender launch will auto-start the MCP server" if auto_start else "[setup] done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
