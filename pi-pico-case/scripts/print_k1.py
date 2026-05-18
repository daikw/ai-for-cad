#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["websocket-client>=1.6", "requests>=2.32"]
# ///
"""Upload a G-code file to a Creality K1 (stock firmware) and start the print.

Stock K1 / K1 Max firmware exposes:
  - HTTP POST /upload (multipart, field name "file") on port 80 — lands in
    /usr/data/printer_data/gcodes/<filename>
  - WebSocket on port 9999 — JSON-RPC ish with {"method":"set"|"get","params":{...}}

This script wraps both: upload, list files, start, pause, stop, status.
"""

from __future__ import annotations

import argparse
import json
import sys
import threading
import time
from pathlib import Path
from typing import Any

import requests
import websocket

GCODE_DIR = "/usr/data/printer_data/gcodes"

# Subset of the printer state keys we surface in `status`
STATUS_KEYS = (
    "deviceState",
    "state",
    "printProgress",
    "printJobTime",
    "printLeftTime",
    "printStartTime",
    "printFileName",
    "nozzleTemp",
    "targetNozzleTemp",
    "bedTemp0",
    "targetBedTemp0",
    "curPosition",
    "layer",
    "TotalLayer",
    "err",
)


def upload(host: str, local_path: Path, remote_name: str | None = None) -> str:
    """POST the file to /upload. Returns the on-printer absolute path."""
    name = remote_name or local_path.name
    url = f"http://{host}/upload"
    with local_path.open("rb") as fh:
        r = requests.post(url, files={"file": (name, fh)}, timeout=60)
    r.raise_for_status()
    body = r.json()
    if body.get("code") != 200:
        sys.exit(f"upload rejected: {body}")
    return f"{GCODE_DIR}/{name}"


def _ws_request(host: str, send: dict[str, Any], settle: float = 4.0) -> list[dict]:
    """Open WS, send one message, collect responses for `settle` seconds."""
    captured: list[dict] = []

    def on_message(_ws, message: str) -> None:
        try:
            captured.append(json.loads(message))
        except json.JSONDecodeError:
            pass

    def on_open(ws):
        ws.send(json.dumps(send))

    ws = websocket.WebSocketApp(
        f"ws://{host}:9999/", on_message=on_message, on_open=on_open
    )
    threading.Thread(target=ws.run_forever, daemon=True).start()
    time.sleep(settle)
    ws.close()
    return captured


def list_files(host: str) -> list[dict]:
    """Get the on-printer G-code file list (newest first)."""
    msgs = _ws_request(host, {"method": "get", "params": {"reqGcodeFile": 1}})
    for m in msgs:
        if "retGcodeFileInfo2" in m:
            return m["retGcodeFileInfo2"]
    return []


def start_print(host: str, remote_path: str) -> dict:
    """Send opGcodeFile to begin printing the named file."""
    cmd = {"method": "set", "params": {"opGcodeFile": f"printprt:{remote_path}"}}
    msgs = _ws_request(host, cmd, settle=4.0)
    # Find the first message that reflects the change
    for m in msgs:
        if m.get("printFileName", "").endswith(Path(remote_path).name):
            return m
    return msgs[-1] if msgs else {}


def status(host: str) -> dict:
    """One-shot snapshot — collect state for ~3 seconds and merge."""
    msgs = _ws_request(host, {"method": "get", "params": {"reqPrinter": 1}}, settle=3.0)
    out: dict = {}
    for m in msgs:
        for k in STATUS_KEYS:
            if k in m:
                out[k] = m[k]
    return out


def pause(host: str) -> None:
    _ws_request(host, {"method": "set", "params": {"pause": 1}}, settle=1.5)


def stop(host: str) -> None:
    _ws_request(host, {"method": "set", "params": {"stop": 1}}, settle=1.5)


def _print_table(d: dict) -> None:
    for k in STATUS_KEYS:
        if k in d:
            print(f"  {k:22s} {d[k]}")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--host", default="192.168.9.252")
    sub = p.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("upload"); sp.add_argument("file", type=Path); sp.add_argument("--as", dest="rename", default=None)
    sub.add_parser("list")
    sp = sub.add_parser("start"); sp.add_argument("name")
    sub.add_parser("status")
    sub.add_parser("pause")
    sub.add_parser("stop")
    sp = sub.add_parser("submit", help="upload + start in one shot")
    sp.add_argument("file", type=Path); sp.add_argument("--as", dest="rename", default=None)

    args = p.parse_args()

    if args.cmd == "upload":
        path = upload(args.host, args.file, args.rename)
        print(f"✓ Uploaded → {path}")
    elif args.cmd == "list":
        for f in list_files(args.host):
            print(f"  {f['name']:60s} {f['file_size']:>10}b  {f['path']}")
    elif args.cmd == "start":
        path = args.name if args.name.startswith("/") else f"{GCODE_DIR}/{args.name}"
        result = start_print(args.host, path)
        print("✓ Sent start. Latest reflection:")
        _print_table(result)
    elif args.cmd == "status":
        _print_table(status(args.host))
    elif args.cmd == "pause":
        pause(args.host); print("✓ pause sent")
    elif args.cmd == "stop":
        stop(args.host); print("✓ stop sent")
    elif args.cmd == "submit":
        path = upload(args.host, args.file, args.rename)
        print(f"✓ Uploaded → {path}")
        result = start_print(args.host, path)
        print("✓ Print started. Latest reflection:")
        _print_table(result)


if __name__ == "__main__":
    main()
