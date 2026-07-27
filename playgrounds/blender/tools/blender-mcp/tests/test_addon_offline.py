"""Offline smoke test for the Blender add-on.

Run this inside Blender itself, e.g.:

    /Applications/Blender.app/Contents/MacOS/Blender \\
        --background \\
        --python playgrounds/blender/tools/blender-mcp/tests/test_addon_offline.py

The test directly imports the add-on module, dispatches a handful of tool
calls against the current bpy state, and prints a summary. Exits non-zero
on failure so a shell-level harness can surface it.
"""

from __future__ import annotations

import importlib.util
import sys
import traceback
from pathlib import Path

ADDON_PATH = (
    Path(__file__).resolve().parents[1] / "addon" / "blender_mcp_addon.py"
)


def load_addon():
    spec = importlib.util.spec_from_file_location("blender_mcp_addon", ADDON_PATH)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def run_case(tools, name: str, params: dict) -> tuple[bool, str]:
    try:
        out = tools[name](params)
        return True, repr(out)
    except Exception as err:  # noqa: BLE001
        return False, f"{err}\n{traceback.format_exc()}"


def check_extract_scene_graph_structure(tools) -> tuple[bool, str]:
    """Build a minimal semantic scene and verify extract_scene_graph output.

    Creates one Mesh (a bench) + one AFF_TOP_CENTER Empty child, calls
    the tool, and asserts the returned structure contains the expected
    keys + values.
    """
    import bpy
    import mathutils

    # Clean any leftovers from previous runs.
    for name in ("test_bench", "AFF_TOP_CENTER__test_bench"):
        obj = bpy.data.objects.get(name)
        if obj is not None:
            bpy.data.objects.remove(obj, do_unlink=True)

    # Create a 1m cube "bench" at z=0.5 so its top is at z=1.0.
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 0.5))
    bench = bpy.context.active_object
    bench.name = "test_bench"
    bench["semantic_class"] = "bench"
    bench["movable"] = False
    bench["support_surface"] = True

    empty = bpy.data.objects.new("AFF_TOP_CENTER__test_bench", None)
    empty.empty_display_type = "PLAIN_AXES"
    empty["aff_type"] = "AFF_TOP_CENTER"
    bpy.context.scene.collection.objects.link(empty)
    empty.parent = bench
    empty.matrix_parent_inverse.identity()
    empty.matrix_world.translation = mathutils.Vector((0.0, 0.0, 1.0))

    try:
        out = tools["extract_scene_graph"]({})
        # Shape
        assert "scene_meta" in out and "objects" in out, f"top-level keys: {list(out)}"
        assert out["scene_meta"]["bench_top_z_m"] == 1.0, out["scene_meta"]
        # Pick the test bench out of whatever else is in the scene.
        bench_entry = next(o for o in out["objects"] if o["id"] == "test_bench")
        assert bench_entry["class"] == "bench"
        assert bench_entry["movable"] is False
        assert bench_entry["support_surface"] is True
        # anchors contain AFF_TOP_CENTER at the expected world position
        assert "AFF_TOP_CENTER" in bench_entry["anchors"], bench_entry["anchors"]
        pos = bench_entry["anchors"]["AFF_TOP_CENTER"]["pos"]
        assert pos[2] == 1.0, f"anchor pos z mismatch: {pos}"
        return True, f"extract_scene_graph bench_top_z={out['scene_meta']['bench_top_z_m']} anchors={len(bench_entry['anchors'])}"
    finally:
        for name in ("test_bench", "AFF_TOP_CENTER__test_bench"):
            obj = bpy.data.objects.get(name)
            if obj is not None:
                bpy.data.objects.remove(obj, do_unlink=True)


def main() -> int:
    addon = load_addon()
    tools = addon.TOOLS
    cases = [
        ("ping", {}),
        ("get_scene_info", {}),
        ("create_primitive", {"kind": "cube", "name": "blender_cube", "location": [0, 0, 0]}),
        ("transform_object", {"name": "blender_cube", "location": [1, 2, 3]}),
        ("set_material_pbr", {"object": "blender_cube", "base_color": [0.8, 0.1, 0.1], "metallic": 1.0, "roughness": 0.2}),
        ("create_light", {"kind": "SUN", "name": "blender_sun", "location": [5, -5, 10]}),
        ("set_camera", {"location": [7, -7, 5], "look_at": [0, 0, 0], "focal_length": 50}),
        # extract_scene_graph runs without params; an empty scene is fine
        # (no meshes with semantic_class → empty objects list).
        ("extract_scene_graph", {}),
        ("delete_object", {"name": "blender_cube"}),
    ]
    # Ensure execute_bpy path is covered, including the permission toggle.
    extra_cases: list[tuple[str, str, dict]] = [
        ("execute_bpy blocked", "execute_bpy", {"code": "result = 1 + 1"}),
    ]
    addon.SERVER_STATE["allow_execute_bpy"] = True
    extra_cases.append(
        ("execute_bpy allowed", "execute_bpy", {"code": "result = 1 + 1"})
    )
    failures = 0
    for name, params in cases:
        ok, info = run_case(tools, name, params)
        tag = "PASS" if ok else "FAIL"
        print(f"[{tag}] {name} -> {info}")
        if not ok:
            failures += 1
    # execute_bpy: first call must fail (permission), second must succeed
    addon.SERVER_STATE["allow_execute_bpy"] = False
    ok, info = run_case(tools, "execute_bpy", {"code": "result = 1 + 1"})
    label = "execute_bpy blocked (expected fail)"
    if ok:
        print(f"[FAIL] {label} -> did not raise: {info}")
        failures += 1
    else:
        print(f"[PASS] {label} -> raised as expected")
    addon.SERVER_STATE["allow_execute_bpy"] = True
    ok, info = run_case(tools, "execute_bpy", {"code": "result = 1 + 1"})
    label = "execute_bpy allowed"
    print(f"[{'PASS' if ok else 'FAIL'}] {label} -> {info}")
    if not ok:
        failures += 1

    # Structural test for extract_scene_graph (exercises anchor walking +
    # custom-property readback).
    ok, info = check_extract_scene_graph_structure(tools)
    label = "extract_scene_graph structure"
    print(f"[{'PASS' if ok else 'FAIL'}] {label} -> {info}")
    if not ok:
        failures += 1

    total = len(cases) + 3  # +2 execute_bpy + 1 extract_scene_graph structure
    print(f"\nblender-mcp addon smoke: {total - failures}/{total} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
