"""Unit tests for the TCP bridge client.

These tests spin up a fake ``addon.py`` style server in a background thread
and assert that the bridge serializes requests and parses replies the same
way the real Blender add-on does. Does not require Blender.
"""

from __future__ import annotations

import json
import socket
import threading
from collections.abc import Callable

import pytest

from blender_mcp.bridge import BlenderBridge, BlenderBridgeError


def _run_fake_server(handler: Callable[[dict], dict]) -> tuple[int, threading.Event, threading.Thread]:
    stop = threading.Event()
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("127.0.0.1", 0))
    srv.listen(4)
    srv.settimeout(0.2)
    port = srv.getsockname()[1]

    def loop() -> None:
        with srv:
            while not stop.is_set():
                try:
                    conn, _ = srv.accept()
                except socket.timeout:
                    continue
                with conn:
                    data = b""
                    while b"\n" not in data:
                        chunk = conn.recv(4096)
                        if not chunk:
                            break
                        data += chunk
                    if not data:
                        continue
                    req = json.loads(data.split(b"\n", 1)[0].decode("utf-8"))
                    reply = handler(req)
                    conn.sendall((json.dumps(reply) + "\n").encode("utf-8"))

    t = threading.Thread(target=loop, daemon=True)
    t.start()
    return port, stop, t


def test_bridge_roundtrip():
    def handler(req):
        assert req["tool"] == "ping"
        return {"ok": True, "result": {"pong": True, "blender": "5.1.0"}}

    port, stop, _ = _run_fake_server(handler)
    try:
        bridge = BlenderBridge(host="127.0.0.1", port=port, timeout=2)
        result = bridge.call("ping")
        assert result == {"pong": True, "blender": "5.1.0"}
    finally:
        stop.set()


def test_bridge_error_propagates():
    def handler(req):
        return {"ok": False, "error": "boom", "trace": "Traceback..."}

    port, stop, _ = _run_fake_server(handler)
    try:
        bridge = BlenderBridge(host="127.0.0.1", port=port, timeout=2)
        with pytest.raises(BlenderBridgeError, match="boom"):
            bridge.call("ping")
    finally:
        stop.set()


def test_bridge_connection_refused():
    bridge = BlenderBridge(host="127.0.0.1", port=1, timeout=0.5)
    with pytest.raises(BlenderBridgeError, match="cannot reach Blender"):
        bridge.call("ping")


def test_bridge_sends_params():
    captured = {}

    def handler(req):
        captured.update(req)
        return {"ok": True, "result": {"received": req.get("params")}}

    port, stop, _ = _run_fake_server(handler)
    try:
        bridge = BlenderBridge(host="127.0.0.1", port=port, timeout=2)
        out = bridge.call("create_primitive", {"kind": "cube", "size": 2.0})
        assert captured["tool"] == "create_primitive"
        assert captured["params"] == {"kind": "cube", "size": 2.0}
        assert out == {"received": {"kind": "cube", "size": 2.0}}
    finally:
        stop.set()
