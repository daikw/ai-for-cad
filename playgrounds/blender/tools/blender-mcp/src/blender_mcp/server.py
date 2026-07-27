"""FastMCP server exposing a minimal Blender tool surface.

Design goals:

- Fewer tools than ahujasid/poly-mcp — easier for LLMs to pick the right one.
- First-class USD export tuned for the Isaac Sim pipeline.
- First-class DGX Spark transfer helper (rsync over SSH).
- Explicit escape hatch via ``execute_bpy`` — the security trade-off is
  accepted in this project's threat model.
"""

from __future__ import annotations

import json
import os
import shlex
import subprocess
import tempfile
import urllib.request
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP

from .bridge import BlenderBridge

mcp = FastMCP("ai-for-cad-blender-mcp")
_bridge = BlenderBridge()


# ---------------------------------------------------------------------------
# Scene inspection
# ---------------------------------------------------------------------------


@mcp.tool()
def ping() -> dict[str, Any]:
    """Check whether the Blender add-on is reachable.

    Returns the Blender version string on success.
    """
    return _bridge.call("ping")


@mcp.tool()
def get_scene_info() -> dict[str, Any]:
    """Return the current scene — frame range, active camera, object list."""
    return _bridge.call("get_scene_info")


@mcp.tool()
def get_object_info(name: str) -> dict[str, Any]:
    """Return detailed info (transform, materials, modifiers) for one object."""
    return _bridge.call("get_object_info", {"name": name})


@mcp.tool()
def extract_scene_graph(
    include_empty_anchors: bool = True,
    precision: int = 4,
) -> dict[str, Any]:
    """Return a compact JSON scene graph: semantic objects + AFF_* anchors.

    Only emits meshes tagged with a ``semantic_class`` custom property.
    Child empties whose names start with ``AFF_`` are emitted as anchors.
    Anchor positions and orientations are in world space so the consumer
    (the Phase 1-3 task planner) can pass them straight to an IK solver.

    Args:
        include_empty_anchors: include objects with no AFF_* children.
        precision: decimal places for world-space floats.
    """
    return _bridge.call(
        "extract_scene_graph",
        {"include_empty_anchors": include_empty_anchors, "precision": precision},
    )


# ---------------------------------------------------------------------------
# Object / primitive operations
# ---------------------------------------------------------------------------


@mcp.tool()
def create_primitive(
    kind: str,
    name: str | None = None,
    location: list[float] | None = None,
    rotation: list[float] | None = None,
    scale: list[float] | None = None,
    size: float = 2.0,
) -> dict[str, Any]:
    """Create a primitive mesh.

    Args:
        kind: one of ``cube, plane, sphere, ico_sphere, cylinder, cone, torus, monkey``.
        name: optional rename after creation.
        location: world-space XYZ location.
        rotation: Euler rotation in radians.
        scale: XYZ scale.
        size: base size passed to the primitive operator (radius or edge length).
    """
    params: dict[str, Any] = {"kind": kind, "size": size}
    if name is not None:
        params["name"] = name
    if location is not None:
        params["location"] = location
    if rotation is not None:
        params["rotation"] = rotation
    if scale is not None:
        params["scale"] = scale
    return _bridge.call("create_primitive", params)


@mcp.tool()
def transform_object(
    name: str,
    location: list[float] | None = None,
    rotation: list[float] | None = None,
    scale: list[float] | None = None,
) -> dict[str, Any]:
    """Set absolute transform values on an existing object."""
    params: dict[str, Any] = {"name": name}
    if location is not None:
        params["location"] = location
    if rotation is not None:
        params["rotation"] = rotation
    if scale is not None:
        params["scale"] = scale
    return _bridge.call("transform_object", params)


@mcp.tool()
def delete_object(name: str) -> dict[str, Any]:
    """Delete an object by name. Returns ``{deleted: false}`` if not found."""
    return _bridge.call("delete_object", {"name": name})


# ---------------------------------------------------------------------------
# Shading / lighting / camera
# ---------------------------------------------------------------------------


@mcp.tool()
def set_material_pbr(
    object: str,
    base_color: list[float] | None = None,
    metallic: float = 0.0,
    roughness: float = 0.5,
    emission_color: list[float] | None = None,
    emission_strength: float = 0.0,
    material_name: str | None = None,
) -> dict[str, Any]:
    """Attach or update a Principled-BSDF material on an object.

    ``base_color``/``emission_color`` accept either RGB or RGBA lists.
    """
    params: dict[str, Any] = {
        "object": object,
        "metallic": metallic,
        "roughness": roughness,
        "emission_strength": emission_strength,
    }
    if base_color is not None:
        params["base_color"] = base_color
    if emission_color is not None:
        params["emission_color"] = emission_color
    if material_name is not None:
        params["material_name"] = material_name
    return _bridge.call("set_material_pbr", params)


@mcp.tool()
def create_light(
    kind: str = "SUN",
    name: str | None = None,
    location: list[float] | None = None,
    rotation: list[float] | None = None,
    energy: float | None = None,
    color: list[float] | None = None,
    size: float | None = None,
) -> dict[str, Any]:
    """Create a light.

    ``kind`` must be one of ``SUN, POINT, AREA, SPOT``.
    ``energy`` defaults to a sensible value per light type.
    """
    params: dict[str, Any] = {"kind": kind}
    if name is not None:
        params["name"] = name
    if location is not None:
        params["location"] = location
    if rotation is not None:
        params["rotation"] = rotation
    if energy is not None:
        params["energy"] = energy
    if color is not None:
        params["color"] = color
    if size is not None:
        params["size"] = size
    return _bridge.call("create_light", params)


@mcp.tool()
def set_camera(
    name: str = "Camera",
    location: list[float] | None = None,
    look_at: list[float] | None = None,
    rotation: list[float] | None = None,
    focal_length: float | None = None,
) -> dict[str, Any]:
    """Create or update the active camera.

    Use ``look_at`` to auto-orient the camera toward a world-space point.
    """
    params: dict[str, Any] = {"name": name}
    if location is not None:
        params["location"] = location
    if look_at is not None:
        params["look_at"] = look_at
    if rotation is not None:
        params["rotation"] = rotation
    if focal_length is not None:
        params["focal_length"] = focal_length
    return _bridge.call("set_camera", params)


# ---------------------------------------------------------------------------
# Render + export
# ---------------------------------------------------------------------------


@mcp.tool()
def render_scene(
    output_path: str = "/tmp/blender_mcp_render.png",
    engine: str | None = None,
    samples: int | None = None,
    resolution: list[int] | None = None,
) -> dict[str, Any]:
    """Render a still image to ``output_path``.

    ``engine`` accepts ``CYCLES`` or ``BLENDER_EEVEE_NEXT``.
    """
    params: dict[str, Any] = {"output_path": output_path}
    if engine is not None:
        params["engine"] = engine
    if samples is not None:
        params["samples"] = samples
    if resolution is not None:
        params["resolution"] = resolution
    return _bridge.call("render_scene", params)


@mcp.tool()
def take_viewport_screenshot(
    output_path: str = "/tmp/blender_viewport.png",
    width: int = 960,
    height: int = 540,
) -> dict[str, Any]:
    """Capture the active camera view via OpenGL (fast, no Cycles).

    Much faster than ``render_scene`` — use this for iterating on
    placement and layout before committing to a full render.
    """
    return _bridge.call(
        "take_viewport_screenshot",
        {"output_path": output_path, "width": width, "height": height},
    )


@mcp.tool()
def export_usd(
    filepath: str,
    selected_only: bool = False,
    visible_only: bool = True,
    export_animation: bool = False,
) -> dict[str, Any]:
    """Export the current scene as a ``.usd`` / ``.usdc`` / ``.usda`` file.

    The output is designed to be consumed by Isaac Sim on the DGX Spark box.
    Use :func:`rsync_to_dgx` afterwards to transfer the file.
    """
    return _bridge.call(
        "export_usd",
        {
            "filepath": filepath,
            "selected_only": selected_only,
            "visible_only": visible_only,
            "export_animation": export_animation,
        },
    )


# ---------------------------------------------------------------------------
# PolyHaven asset library (CC0, no auth required)
# ---------------------------------------------------------------------------

_PH_HEADERS = {"User-Agent": "ai-for-cad-blender-mcp/0.1"}
_PH_API = "https://api.polyhaven.com"


def _ph_get(path: str) -> Any:
    req = urllib.request.Request(f"{_PH_API}{path}", headers=_PH_HEADERS)
    return json.loads(urllib.request.urlopen(req, timeout=30).read())


@mcp.tool()
def search_polyhaven(
    asset_type: str = "models",
    query: str | None = None,
) -> dict[str, Any]:
    """Search PolyHaven for CC0 assets.

    ``asset_type`` is one of ``models``, ``hdris``, ``textures``.
    ``query`` filters by substring in the asset id (e.g. "desk", "shelf").
    Returns a list of ``{id, categories}`` dicts (max 40).
    """
    all_assets = _ph_get(f"/assets?type={asset_type}")
    if query:
        q = query.lower()
        all_assets = {k: v for k, v in all_assets.items() if q in k.lower()}
    results = [
        {"id": k, "categories": v.get("categories", [])}
        for k, v in sorted(all_assets.items())
    ][:40]
    return {"count": len(results), "assets": results}


@mcp.tool()
def download_polyhaven_asset(
    asset_id: str,
    asset_type: str = "models",
    resolution: str = "1k",
) -> dict[str, Any]:
    """Download a PolyHaven asset and import it into Blender.

    For ``models``: downloads glTF and calls ``bpy.ops.import_scene.gltf``.
    For ``hdris``: downloads HDR and applies it as the world environment.
    Returns the names of imported/affected objects.

    This is a curated alternative to calling ``execute_bpy`` with download
    boilerplate. CC0 license, no API key required.
    """
    files = _ph_get(f"/files/{asset_id}")
    tmp = Path(tempfile.mkdtemp(prefix="ph_"))

    if asset_type == "models":
        gltf_info = files["gltf"][resolution]["gltf"]
        main_url = gltf_info["url"]
        main_path = tmp / Path(main_url.split("?")[0]).name
        main_path.write_bytes(
            urllib.request.urlopen(
                urllib.request.Request(main_url, headers=_PH_HEADERS), timeout=120
            ).read()
        )
        for rel, inc in gltf_info.get("include", {}).items():
            p = tmp / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(
                urllib.request.urlopen(
                    urllib.request.Request(inc["url"], headers=_PH_HEADERS), timeout=120
                ).read()
            )
        # Tell Blender to import (via the bridge → main thread)
        import_code = f'import bpy; bpy.ops.import_scene.gltf(filepath=r"{main_path}"); result = [o.name for o in bpy.context.selected_objects]'
        return _bridge.call("execute_bpy", {"code": import_code})

    elif asset_type == "hdris":
        hdr_info = files["hdri"][resolution]["hdr"]
        hdr_path = tmp / f"{asset_id}_{resolution}.hdr"
        hdr_path.write_bytes(
            urllib.request.urlopen(
                urllib.request.Request(hdr_info["url"], headers=_PH_HEADERS), timeout=120
            ).read()
        )
        hdri_code = (
            f'import bpy; world = bpy.context.scene.world; world.use_nodes = True; tree = world.node_tree; tree.nodes.clear(); '
            f'bg = tree.nodes.new("ShaderNodeBackground"); bg.inputs["Strength"].default_value = 0.8; '
            f'env = tree.nodes.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(r"{hdr_path}"); '
            f'out = tree.nodes.new("ShaderNodeOutputWorld"); '
            f'tree.links.new(env.outputs["Color"], bg.inputs["Color"]); '
            f'tree.links.new(bg.outputs["Background"], out.inputs["Surface"]); '
            f'result = "HDRI applied: {asset_id}"'
        )
        return _bridge.call("execute_bpy", {"code": hdri_code})

    else:
        raise ValueError(f"unsupported asset_type: {asset_type}. Use 'models' or 'hdris'.")


# ---------------------------------------------------------------------------
# Remote helper (DGX Spark)
# ---------------------------------------------------------------------------


@mcp.tool()
def rsync_to_dgx(
    local_path: str,
    remote_path: str,
    host: str | None = None,
    user: str | None = None,
) -> dict[str, Any]:
    """Copy a file or directory to the DGX Spark box via rsync+ssh.

    Defaults come from environment variables ``BLENDER_MCP_DGX_HOST`` and
    ``BLENDER_MCP_DGX_USER`` so the same tool can be used across sessions
    without repeating credentials in the prompt. The rsync flag set is
    intentionally fixed (``-avz --partial --progress``) to avoid turning
    this helper into an arbitrary-ssh-option injection point.
    """
    host = host or os.environ.get("BLENDER_MCP_DGX_HOST")
    user = user or os.environ.get("BLENDER_MCP_DGX_USER")
    if not host:
        raise ValueError("DGX host not provided (set BLENDER_MCP_DGX_HOST or pass host=)")
    local = Path(local_path).expanduser().resolve()
    if not local.exists():
        raise FileNotFoundError(f"local path does not exist: {local}")
    dest = f"{user}@{host}:{remote_path}" if user else f"{host}:{remote_path}"
    cmd = ["rsync", "-avz", "--partial", "--progress", str(local), dest]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    result = {
        "cmd": " ".join(shlex.quote(c) for c in cmd),
        "returncode": proc.returncode,
        "stdout_tail": proc.stdout[-2000:],
        "stderr_tail": proc.stderr[-2000:],
    }
    if proc.returncode != 0:
        raise RuntimeError(f"rsync failed (exit {proc.returncode}): {proc.stderr[-500:]}")
    return result


# ---------------------------------------------------------------------------
# Escape hatch
# ---------------------------------------------------------------------------


@mcp.tool()
def execute_bpy(code: str) -> dict[str, Any]:
    """Run arbitrary Python inside Blender's main thread.

    SECURITY NOTE: this is an intentional arbitrary-code-execution surface.
    It must be enabled explicitly in the Blender add-on panel ("Allow
    execute_bpy" toggle). Do not connect this server to untrusted clients.
    Set a local variable named ``result`` inside your snippet to see a
    repr of it in the reply.

    Raises :class:`~blender_mcp.bridge.BlenderBridgeError` on
    failure so the MCP client sees a proper tool error instead of a silent
    success.
    """
    return _bridge.call("execute_bpy", {"code": code})


def main() -> None:
    """stdio entry point used by the ``ai-for-cad-blender-mcp`` script."""
    mcp.run()


if __name__ == "__main__":
    main()
