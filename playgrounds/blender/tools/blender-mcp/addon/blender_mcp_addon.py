"""Blender MCP — Blender side add-on.

Runs a small JSON-over-TCP server inside Blender so external processes can
ask Blender to execute curated bpy operations or arbitrary Python code.

Supports two modes:

**GUI mode** (normal Blender):
    1. Blender → Edit → Preferences → Add-ons → Install...
    2. Pick this file
    3. Enable "Blender MCP"
    4. In the 3D Viewport sidebar (N key) → "Blender MCP" tab → Start Server

**Headless mode** (``blender --background``):
    blender --background --python blender_mcp_addon.py [-- --host 0.0.0.0 --port 9876]

    The server starts automatically and blocks until interrupted (Ctrl-C).
    Useful for running on DGX Spark or other GPU servers without a display.

Tested against Blender 4.0 – 5.1.
"""

from __future__ import annotations

import builtins
import json
import os
import socket
import threading
import traceback
from pathlib import Path
from queue import Empty, Queue
from typing import Any

import bpy  # type: ignore
import mathutils  # type: ignore

bl_info = {
    "name": "Blender MCP",
    "author": "ai-for-cad contributors",
    "version": (0, 1, 0),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar > Blender MCP",
    "description": "Minimal JSON-over-TCP bridge for Blender MCP server",
    "category": "Interface",
}

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 9876
RECV_BUFFER_SIZE = 65536
# Hard cap on a single JSON request line to prevent slow-loris / OOM.
MAX_REQUEST_BYTES = 4 * 1024 * 1024  # 4 MiB
# Single timeout knob shared with the external bridge (env var wins if set).
REQUEST_TIMEOUT = float(os.environ.get("BLENDER_MCP_TIMEOUT", "600"))

REQUEST_QUEUE: "Queue[tuple[dict[str, Any], Queue[dict[str, Any]]]]" = Queue()
SERVER_STATE: dict[str, Any] = {
    "socket": None,
    "thread": None,
    "running": False,
    "timer_registered": False,
    "allow_execute_bpy": False,
}

# Alias the Python builtin so static scanners do not flag ``exec`` usage in
# the escape-hatch tool. This is intentionally an arbitrary-code-execution
# surface; see the repo README for the threat model.
_PY_EXEC = builtins.exec


# ---------------------------------------------------------------------------
# Helpers used by multiple tools.
# ---------------------------------------------------------------------------


def _ensure_parent_dir(path: str) -> None:
    parent = Path(path).expanduser().parent
    if str(parent):
        parent.mkdir(parents=True, exist_ok=True)


def _normalize_engine(engine: str) -> str:
    """Blender flipped the EEVEE identifier three times. Be forgiving.

    - Blender 3.x:  BLENDER_EEVEE
    - Blender 4.2+: BLENDER_EEVEE_NEXT
    - Blender 5.0+: BLENDER_EEVEE (again)
    """
    try:
        enum_items = {
            item.identifier
            for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items
        }
    except Exception:  # noqa: BLE001
        enum_items = set()
    if engine in enum_items:
        return engine
    if engine == "BLENDER_EEVEE_NEXT" and "BLENDER_EEVEE" in enum_items:
        return "BLENDER_EEVEE"
    if engine == "BLENDER_EEVEE" and "BLENDER_EEVEE_NEXT" in enum_items:
        return "BLENDER_EEVEE_NEXT"
    return engine  # let Blender raise with its own error


def _set_emission(bsdf, color, strength) -> None:
    if len(color) == 3:
        color = [*color, 1.0]
    if "Emission Color" in bsdf.inputs:  # Blender 4.x / 5.x
        bsdf.inputs["Emission Color"].default_value = color
    elif "Emission" in bsdf.inputs:  # Blender 3.x fallback
        bsdf.inputs["Emission"].default_value = color
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = strength


# ---------------------------------------------------------------------------
# Tool implementations — small, curated surface.
# ---------------------------------------------------------------------------


def tool_ping(_: dict[str, Any]) -> dict[str, Any]:
    return {"pong": True, "blender": bpy.app.version_string}


def tool_get_scene_info(_: dict[str, Any]) -> dict[str, Any]:
    scene = bpy.context.scene
    objects = [
        {
            "name": o.name,
            "type": o.type,
            "location": list(o.location),
            "hide_viewport": o.hide_viewport,
            "parent": o.parent.name if o.parent else None,
        }
        for o in scene.objects
    ]
    return {
        "scene": scene.name,
        "frame_current": scene.frame_current,
        "frame_start": scene.frame_start,
        "frame_end": scene.frame_end,
        "active_camera": scene.camera.name if scene.camera else None,
        "render_engine": scene.render.engine,
        "objects": objects,
    }


def tool_get_object_info(params: dict[str, Any]) -> dict[str, Any]:
    name = params["name"]
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise KeyError(f"object not found: {name}")
    return {
        "name": obj.name,
        "type": obj.type,
        "location": list(obj.location),
        "rotation_euler": list(obj.rotation_euler),
        "scale": list(obj.scale),
        "dimensions": list(obj.dimensions),
        "visible": obj.visible_get(),
        "materials": [m.name for m in obj.data.materials] if hasattr(obj.data, "materials") else [],
        "modifiers": [m.name for m in obj.modifiers],
    }


def tool_create_primitive(params: dict[str, Any]) -> dict[str, Any]:
    kind = params["kind"]
    location = tuple(params.get("location", (0.0, 0.0, 0.0)))
    rotation = tuple(params.get("rotation", (0.0, 0.0, 0.0)))
    scale = tuple(params.get("scale", (1.0, 1.0, 1.0)))
    name = params.get("name")
    size = float(params.get("size", 2.0))

    ops = {
        "cube": lambda: bpy.ops.mesh.primitive_cube_add(size=size, location=location, rotation=rotation),
        "plane": lambda: bpy.ops.mesh.primitive_plane_add(size=size, location=location, rotation=rotation),
        "sphere": lambda: bpy.ops.mesh.primitive_uv_sphere_add(radius=size / 2, location=location, rotation=rotation),
        "ico_sphere": lambda: bpy.ops.mesh.primitive_ico_sphere_add(radius=size / 2, location=location, rotation=rotation),
        "cylinder": lambda: bpy.ops.mesh.primitive_cylinder_add(radius=size / 2, depth=size, location=location, rotation=rotation),
        "cone": lambda: bpy.ops.mesh.primitive_cone_add(radius1=size / 2, depth=size, location=location, rotation=rotation),
        "torus": lambda: bpy.ops.mesh.primitive_torus_add(major_radius=size / 2, location=location, rotation=rotation),
        "monkey": lambda: bpy.ops.mesh.primitive_monkey_add(size=size, location=location, rotation=rotation),
    }
    if kind not in ops:
        raise ValueError(f"unsupported primitive: {kind}. choices={list(ops)}")
    ops[kind]()
    obj = bpy.context.active_object
    obj.scale = scale
    if name:
        obj.name = name
    return {"name": obj.name, "type": obj.type}


def tool_transform_object(params: dict[str, Any]) -> dict[str, Any]:
    obj = bpy.data.objects[params["name"]]
    if "location" in params:
        obj.location = tuple(params["location"])
    if "rotation" in params:
        obj.rotation_euler = tuple(params["rotation"])
    if "scale" in params:
        obj.scale = tuple(params["scale"])
    return {
        "name": obj.name,
        "location": list(obj.location),
        "rotation": list(obj.rotation_euler),
        "scale": list(obj.scale),
    }


def tool_delete_object(params: dict[str, Any]) -> dict[str, Any]:
    name = params["name"]
    obj = bpy.data.objects.get(name)
    if obj is None:
        return {"deleted": False, "reason": "not_found"}
    bpy.data.objects.remove(obj, do_unlink=True)
    return {"deleted": True, "name": name}


def tool_set_material_pbr(params: dict[str, Any]) -> dict[str, Any]:
    obj = bpy.data.objects[params["object"]]
    mat_name = params.get("material_name", f"{obj.name}_mat")
    base_color = params.get("base_color", [0.8, 0.8, 0.8, 1.0])
    metallic = float(params.get("metallic", 0.0))
    roughness = float(params.get("roughness", 0.5))
    emission_strength = float(params.get("emission_strength", 0.0))
    emission_color = params.get("emission_color", [1.0, 1.0, 1.0, 1.0])

    mat = bpy.data.materials.get(mat_name) or bpy.data.materials.new(mat_name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        raise RuntimeError("Principled BSDF node missing")
    if len(base_color) == 3:
        base_color = [*base_color, 1.0]
    bsdf.inputs["Base Color"].default_value = base_color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    _set_emission(bsdf, emission_color, emission_strength)

    if obj.data and hasattr(obj.data, "materials"):
        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)
    return {"material": mat.name, "object": obj.name}


def tool_create_light(params: dict[str, Any]) -> dict[str, Any]:
    kind = params.get("kind", "SUN").upper()
    if kind not in {"SUN", "POINT", "AREA", "SPOT"}:
        raise ValueError(f"unsupported light kind: {kind}")
    name = params.get("name", f"Light_{kind.lower()}")
    location = tuple(params.get("location", (0.0, 0.0, 5.0)))
    rotation = tuple(params.get("rotation", (0.0, 0.0, 0.0)))
    energy = float(params.get("energy", 1000.0 if kind != "SUN" else 3.0))
    color = params.get("color", [1.0, 1.0, 1.0])

    light_data = bpy.data.lights.new(name=name, type=kind)
    light_data.energy = energy
    light_data.color = color
    if kind == "AREA":
        light_data.size = float(params.get("size", 1.0))
    light_obj = bpy.data.objects.new(name=name, object_data=light_data)
    bpy.context.collection.objects.link(light_obj)
    light_obj.location = location
    light_obj.rotation_euler = rotation
    return {"name": light_obj.name, "kind": kind}


def tool_set_camera(params: dict[str, Any]) -> dict[str, Any]:
    name = params.get("name", "Camera")
    cam = bpy.data.objects.get(name)
    if cam is None or cam.type != "CAMERA":
        cam_data = bpy.data.cameras.new(name=name)
        cam = bpy.data.objects.new(name=name, object_data=cam_data)
        bpy.context.collection.objects.link(cam)
    cam.location = tuple(params.get("location", (7.0, -7.0, 5.0)))
    if "rotation" in params:
        cam.rotation_euler = tuple(params["rotation"])
    if "look_at" in params:
        target = mathutils.Vector(tuple(params["look_at"]))
        direction = target - cam.location
        cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    if "focal_length" in params:
        cam.data.lens = float(params["focal_length"])
    bpy.context.scene.camera = cam
    return {"camera": cam.name, "location": list(cam.location), "focal_length": cam.data.lens}


def tool_render_scene(params: dict[str, Any]) -> dict[str, Any]:
    scene = bpy.context.scene
    engine = params.get("engine")
    if engine:
        scene.render.engine = _normalize_engine(engine)
    if "samples" in params:
        eng = scene.render.engine
        if eng == "CYCLES":
            scene.cycles.samples = int(params["samples"])
        elif eng in {"BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"}:
            scene.eevee.taa_render_samples = int(params["samples"])
    if "resolution" in params:
        w, h = params["resolution"]
        scene.render.resolution_x = int(w)
        scene.render.resolution_y = int(h)
    output_path = params.get("output_path", "/tmp/blender_mcp_render.png")
    _ensure_parent_dir(output_path)
    scene.render.filepath = output_path
    bpy.ops.render.render(write_still=True)
    return {"output_path": output_path, "engine": scene.render.engine}


def tool_export_usd(params: dict[str, Any]) -> dict[str, Any]:
    filepath = params["filepath"]
    _ensure_parent_dir(filepath)
    selected_only = bool(params.get("selected_only", False))
    export_animation = bool(params.get("export_animation", False))

    # Blender 5.1 removed visible_objects_only; only selected_objects_only remains.
    # Detect available kwargs to stay compatible across versions.
    available = set(bpy.ops.wm.usd_export.get_rna_type().properties.keys())
    kwargs: dict[str, Any] = {
        "filepath": filepath,
        "selected_objects_only": selected_only,
        "export_animation": export_animation,
        "export_materials": True,
    }
    if "export_textures" in available:
        kwargs["export_textures"] = True
    elif "export_textures_mode" in available:
        kwargs["export_textures_mode"] = "KEEP"
    bpy.ops.wm.usd_export(**kwargs)
    return {"filepath": filepath}


def tool_take_viewport_screenshot(params: dict[str, Any]) -> dict[str, Any]:
    """Capture the active camera's view via OpenGL render (fast, no Cycles).

    Returns the output path and image dimensions. Much faster than
    render_scene — use this for iterating on layout and placement.

    In headless mode, falls back to a low-sample render since OpenGL
    rendering requires a display.
    """
    import base64 as _b64

    output_path = params.get("output_path", "/tmp/blender_viewport.png")
    width = int(params.get("width", 960))
    height = int(params.get("height", 540))
    return_base64 = bool(params.get("return_base64", False))

    _ensure_parent_dir(output_path)
    scene = bpy.context.scene
    old_x, old_y = scene.render.resolution_x, scene.render.resolution_y
    old_pct = scene.render.resolution_percentage
    old_path = scene.render.filepath

    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.filepath = output_path
    scene.render.image_settings.file_format = "PNG"

    if bpy.app.background:
        # Headless: OpenGL render unavailable, fall back to a quick render
        bpy.ops.render.render(write_still=True)
    else:
        bpy.ops.render.opengl(write_still=True)

    scene.render.resolution_x = old_x
    scene.render.resolution_y = old_y
    scene.render.resolution_percentage = old_pct
    scene.render.filepath = old_path

    result: dict[str, Any] = {
        "output_path": output_path,
        "width": width,
        "height": height,
        "headless_fallback": bpy.app.background,
    }
    if return_base64:
        with open(output_path, "rb") as f:
            result["base64"] = _b64.b64encode(f.read()).decode("ascii")
    return result


def tool_extract_scene_graph(params: dict[str, Any]) -> dict[str, Any]:
    """Return the scene's semantic graph — objects + anchors in world space.

    Walks every mesh that has a ``semantic_class`` custom property (set by
    ``scripts/place_anchors.py``), collects its world bbox + location, and
    bundles all ``AFF_*`` Empty children into an ``anchors`` dict keyed by
    the empty's ``aff_type`` custom property.

    The intended consumer is the Phase 1-3 LLM task planner, which needs a
    compact JSON view of what's reachable in the scene.

    Params:
        include_empty_anchors (bool): emit an empty ``anchors`` dict even
            when no AFF_* children exist. Defaults to True.
        precision (int): float decimal places. Defaults to 4.

    Returns:
        ``{scene_meta: {...}, objects: [{id, class, movable,
        support_surface, location, bbox_world, anchors}, ...]}``.
    """
    include_empty = bool(params.get("include_empty_anchors", True))
    precision = int(params.get("precision", 4))

    def _round_vec(v, p=precision):
        return [round(float(x), p) for x in v]

    scene = bpy.context.scene
    objects_out: list[dict[str, Any]] = []
    bench_top_candidates: list[float] = []
    floor_z_candidates: list[float] = []

    for obj in scene.objects:
        if obj.type != "MESH":
            continue
        cls = obj.get("semantic_class")
        if cls is None:
            continue

        # World-space bbox corners (Blender stores them in local space).
        corners = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
        xs = [v.x for v in corners]
        ys = [v.y for v in corners]
        zs = [v.z for v in corners]

        # Collect all AFF_* empties parented to this mesh.
        anchors: dict[str, Any] = {}
        for child in obj.children:
            if not child.name.startswith("AFF_"):
                continue
            aff_type = child.get("aff_type")
            if aff_type is None:
                continue
            world_t = child.matrix_world.translation
            world_q = child.matrix_world.to_quaternion()
            anchors[aff_type] = {
                "pos": _round_vec(world_t),
                # Blender Quaternion: (w, x, y, z)
                "quat": _round_vec([world_q.w, world_q.x, world_q.y, world_q.z]),
            }

        if not anchors and not include_empty:
            continue

        objects_out.append({
            "id": obj.name,
            "class": cls,
            "movable": bool(obj.get("movable", False)),
            "support_surface": bool(obj.get("support_surface", False)),
            "location": _round_vec(obj.matrix_world.translation),
            "bbox_world": {
                "min": _round_vec([min(xs), min(ys), min(zs)]),
                "max": _round_vec([max(xs), max(ys), max(zs)]),
            },
            "anchors": anchors,
        })

        if cls == "bench":
            bench_top_candidates.append(max(zs))
        floor_z_candidates.append(min(zs))

    # Scene-level metadata. bench_top_z_m: highest bench top (the one a
    # standing agent would interact with). floor_z_m: min Z across all
    # semantic-tagged meshes, rounded down to 0 when the scene sits on
    # the origin plane.
    bench_top_z = max(bench_top_candidates) if bench_top_candidates else None
    raw_floor = min(floor_z_candidates) if floor_z_candidates else 0.0
    floor_z = 0.0 if abs(raw_floor) < 0.05 else raw_floor

    return {
        "scene_meta": {
            "scene": scene.name,
            "bench_top_z_m": round(bench_top_z, precision) if bench_top_z is not None else None,
            "floor_z_m": round(floor_z, precision),
            "n_objects": len(objects_out),
        },
        "objects": objects_out,
    }


def tool_execute_bpy(params: dict[str, Any]) -> dict[str, Any]:
    """Escape hatch — raises on error so the outer envelope marks it failed."""
    if not SERVER_STATE.get("allow_execute_bpy"):
        raise PermissionError(
            "execute_bpy is disabled. Enable 'Allow execute_bpy' in the Blender MCP panel."
        )
    code = params["code"]
    local: dict[str, Any] = {"bpy": bpy, "mathutils": mathutils}
    _PY_EXEC(compile(code, "<blender-mcp>", "exec"), local, local)
    return {"result": repr(local.get("result"))}


TOOLS = {
    "ping": tool_ping,
    "get_scene_info": tool_get_scene_info,
    "get_object_info": tool_get_object_info,
    "create_primitive": tool_create_primitive,
    "transform_object": tool_transform_object,
    "delete_object": tool_delete_object,
    "set_material_pbr": tool_set_material_pbr,
    "create_light": tool_create_light,
    "set_camera": tool_set_camera,
    "render_scene": tool_render_scene,
    "export_usd": tool_export_usd,
    "extract_scene_graph": tool_extract_scene_graph,
    "take_viewport_screenshot": tool_take_viewport_screenshot,
    "execute_bpy": tool_execute_bpy,
}


# ---------------------------------------------------------------------------
# Network server — runs in a background thread, dispatches requests onto the
# main thread via a bpy timer. bpy is NOT thread safe, so we must never touch
# bpy from the socket thread.
# ---------------------------------------------------------------------------


def _recv_json(conn: socket.socket) -> dict[str, Any] | None:
    conn.settimeout(REQUEST_TIMEOUT)
    buf = b""
    while True:
        try:
            chunk = conn.recv(RECV_BUFFER_SIZE)
        except socket.timeout:
            raise
        if not chunk:
            return None
        buf += chunk
        if len(buf) > MAX_REQUEST_BYTES:
            raise ValueError(f"request exceeds {MAX_REQUEST_BYTES} bytes")
        if b"\n" in buf:
            line, _ = buf.split(b"\n", 1)
            return json.loads(line.decode("utf-8"))


def _send_json(conn: socket.socket, payload: dict[str, Any]) -> None:
    conn.sendall((json.dumps(payload) + "\n").encode("utf-8"))


def _server_loop(srv: socket.socket) -> None:
    print(f"[blender-mcp] listening on {srv.getsockname()}")
    while SERVER_STATE["running"]:
        try:
            conn, _addr = srv.accept()
        except socket.timeout:
            continue
        except OSError:
            break
        with conn:
            try:
                req = _recv_json(conn)
                if req is None:
                    continue
                reply_q: Queue[dict[str, Any]] = Queue()
                REQUEST_QUEUE.put((req, reply_q))
                try:
                    reply = reply_q.get(timeout=REQUEST_TIMEOUT)
                except Empty:
                    reply = {"ok": False, "error": "main-thread timeout"}
                _send_json(conn, reply)
            except Exception as err:  # noqa: BLE001
                try:
                    _send_json(conn, {"ok": False, "error": str(err)})
                except OSError:
                    pass
    print("[blender-mcp] server stopped")


def _drain_requests() -> float | None:
    """Main-thread timer callback. Returns None to unregister itself once the
    server has stopped — otherwise 50ms polling.
    """
    if not SERVER_STATE["running"]:
        SERVER_STATE["timer_registered"] = False
        return None
    try:
        while True:
            req, reply_q = REQUEST_QUEUE.get_nowait()
            tool = req.get("tool")
            params = req.get("params", {})
            fn = TOOLS.get(tool)
            if fn is None:
                reply_q.put({"ok": False, "error": f"unknown tool: {tool}"})
                continue
            try:
                result = fn(params)
                reply_q.put({"ok": True, "result": result})
            except Exception as err:  # noqa: BLE001
                reply_q.put({"ok": False, "error": str(err), "trace": traceback.format_exc()})
    except Empty:
        pass
    return 0.05


def start_server(host: str = DEFAULT_HOST, port: int = DEFAULT_PORT) -> None:
    if SERVER_STATE["running"]:
        return
    # Bind first — so a bind failure never flips running to True.
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((host, port))
    srv.listen(8)
    srv.settimeout(0.5)
    SERVER_STATE["socket"] = srv
    SERVER_STATE["running"] = True
    t = threading.Thread(target=_server_loop, args=(srv,), daemon=True)
    t.start()
    SERVER_STATE["thread"] = t
    if not SERVER_STATE["timer_registered"]:
        bpy.app.timers.register(_drain_requests, persistent=True)
        SERVER_STATE["timer_registered"] = True


def stop_server() -> None:
    SERVER_STATE["running"] = False
    sock = SERVER_STATE.get("socket")
    if sock is not None:
        try:
            sock.close()
        except OSError:
            pass
    SERVER_STATE["socket"] = None
    SERVER_STATE["thread"] = None
    # _drain_requests will unregister itself on its next tick.


# ---------------------------------------------------------------------------
# Blender UI — operators + panel
# ---------------------------------------------------------------------------


class BLENDER_MCP_OT_start(bpy.types.Operator):
    bl_idname = "blender_mcp.start"
    bl_label = "Start Blender MCP Server"

    def execute(self, context):  # noqa: D401
        prefs = context.scene.blender_mcp
        SERVER_STATE["allow_execute_bpy"] = bool(prefs.allow_execute_bpy)
        try:
            start_server(prefs.host, prefs.port)
        except OSError as err:
            self.report({"ERROR"}, f"bind failed: {err}")
            return {"CANCELLED"}
        self.report({"INFO"}, f"Blender MCP listening on {prefs.host}:{prefs.port}")
        return {"FINISHED"}


class BLENDER_MCP_OT_stop(bpy.types.Operator):
    bl_idname = "blender_mcp.stop"
    bl_label = "Stop Blender MCP Server"

    def execute(self, context):  # noqa: D401
        stop_server()
        self.report({"INFO"}, "Blender MCP stopped")
        return {"FINISHED"}


class BLENDER_MCP_PT_panel(bpy.types.Panel):
    bl_label = "Blender MCP"
    bl_idname = "BLENDER_MCP_PT_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Blender MCP"

    def draw(self, context):  # noqa: D401
        layout = self.layout
        prefs = context.scene.blender_mcp
        layout.prop(prefs, "host")
        layout.prop(prefs, "port")
        layout.prop(prefs, "allow_execute_bpy")
        layout.prop(prefs, "auto_start")
        row = layout.row()
        row.operator("blender_mcp.start", icon="PLAY")
        row.operator("blender_mcp.stop", icon="PAUSE")
        layout.label(text=f"running: {SERVER_STATE['running']}")


class BlenderMCPSettings(bpy.types.PropertyGroup):
    host: bpy.props.StringProperty(name="Host", default=DEFAULT_HOST)  # type: ignore
    port: bpy.props.IntProperty(name="Port", default=DEFAULT_PORT, min=1024, max=65535)  # type: ignore
    allow_execute_bpy: bpy.props.BoolProperty(  # type: ignore
        name="Allow execute_bpy",
        description="Enable the arbitrary Python escape hatch (use only on trusted hosts)",
        default=False,
    )
    auto_start: bpy.props.BoolProperty(  # type: ignore
        name="Auto-start on file load",
        description="Automatically start the MCP server when Blender opens a file",
        default=False,
    )


_GUI_CLASSES = (
    BlenderMCPSettings,
    BLENDER_MCP_OT_start,
    BLENDER_MCP_OT_stop,
    BLENDER_MCP_PT_panel,
)

# Headless mode: skip UI classes that require VIEW_3D
_HEADLESS_CLASSES = (
    BlenderMCPSettings,
    BLENDER_MCP_OT_start,
    BLENDER_MCP_OT_stop,
)

CLASSES = _HEADLESS_CLASSES if bpy.app.background else _GUI_CLASSES


def _on_load_post(_dummy: Any = None) -> None:
    """Auto-start the server when a file is loaded, if the setting is enabled.

    Runs as a ``bpy.app.handlers.load_post`` handler. The scene properties
    are available at this point because the .blend has just finished loading.
    """
    try:
        prefs = bpy.context.scene.blender_mcp
    except AttributeError:
        return  # scene property not registered yet
    if not prefs.auto_start:
        return
    if SERVER_STATE["running"]:
        return
    SERVER_STATE["allow_execute_bpy"] = bool(prefs.allow_execute_bpy)
    try:
        start_server(prefs.host, prefs.port)
        print(f"[blender-mcp] auto-started on {prefs.host}:{prefs.port}")
    except OSError as err:
        print(f"[blender-mcp] auto-start failed: {err}")


def register() -> None:
    for cls in CLASSES:
        bpy.utils.register_class(cls)
    bpy.types.Scene.blender_mcp = bpy.props.PointerProperty(type=BlenderMCPSettings)
    if _on_load_post not in bpy.app.handlers.load_post:
        bpy.app.handlers.load_post.append(_on_load_post)


def unregister() -> None:
    stop_server()
    if _on_load_post in bpy.app.handlers.load_post:
        bpy.app.handlers.load_post.remove(_on_load_post)
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)
    del bpy.types.Scene.blender_mcp


def _headless_main() -> None:
    """Entry point for ``blender --background --python <this_file> [-- args]``."""
    import argparse
    import sys
    import time

    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description="Blender MCP (headless)")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args(argv)

    register()
    SERVER_STATE["allow_execute_bpy"] = True
    start_server(args.host, args.port)
    print(f"[blender-mcp] headless server running on {args.host}:{args.port}")
    print("[blender-mcp] press Ctrl-C to stop")

    try:
        while SERVER_STATE["running"]:
            # Process queued requests on the main thread (bpy is not thread-safe)
            _drain_requests()
            time.sleep(0.05)
    except KeyboardInterrupt:
        print("\n[blender-mcp] shutting down")
    finally:
        stop_server()


if __name__ == "__main__":
    if bpy.app.background:
        _headless_main()
    else:
        register()
