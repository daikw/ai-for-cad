"""TCP bridge client used by the MCP server to talk to the Blender add-on."""

from __future__ import annotations

import json
import os
import socket
from dataclasses import dataclass
from typing import Any

DEFAULT_HOST = os.environ.get("BLENDER_MCP_HOST", "127.0.0.1")
DEFAULT_PORT = int(os.environ.get("BLENDER_MCP_PORT", "9876"))
DEFAULT_TIMEOUT = float(os.environ.get("BLENDER_MCP_TIMEOUT", "180"))


class BlenderBridgeError(RuntimeError):
    """Raised when the Blender add-on returns an error or the socket fails."""


@dataclass
class BlenderBridge:
    host: str = DEFAULT_HOST
    port: int = DEFAULT_PORT
    timeout: float = DEFAULT_TIMEOUT

    def call(self, tool: str, params: dict[str, Any] | None = None) -> Any:
        payload = json.dumps({"tool": tool, "params": params or {}}) + "\n"
        try:
            with socket.create_connection((self.host, self.port), timeout=self.timeout) as s:
                s.settimeout(self.timeout)
                s.sendall(payload.encode("utf-8"))
                buf = b""
                while True:
                    chunk = s.recv(65536)
                    if not chunk:
                        break
                    buf += chunk
                    if b"\n" in buf:
                        break
        except OSError as err:
            raise BlenderBridgeError(
                f"cannot reach Blender add-on at {self.host}:{self.port}: {err}"
            ) from err
        if not buf:
            raise BlenderBridgeError("Blender add-on closed the connection with no reply")
        line = buf.split(b"\n", 1)[0]
        try:
            reply = json.loads(line.decode("utf-8"))
        except json.JSONDecodeError as err:
            raise BlenderBridgeError(f"invalid JSON from Blender: {line!r}") from err
        if not reply.get("ok"):
            raise BlenderBridgeError(
                f"Blender tool '{tool}' failed: {reply.get('error')}\n{reply.get('trace', '')}"
            )
        return reply.get("result")
