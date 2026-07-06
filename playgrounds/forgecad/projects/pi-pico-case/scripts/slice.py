#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.10"
# ///
"""Slice an STL for the Creality K1 Max using OrcaSlicer's bundled profile."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ORCA_CLI = Path("/Applications/OrcaSlicer.app/Contents/MacOS/OrcaSlicer")
PROFILES = Path("/Applications/OrcaSlicer.app/Contents/Resources/profiles/Creality")

REPO_PROFILES = Path(__file__).parent / "profiles"

PRESETS = {
    "k1max-0.20-pla": {
        "process": "process/0.20mm Standard @Creality K1Max (0.4 nozzle).json",
        "machine": "machine/Creality K1 Max (0.4 nozzle).json",
        "filament": "filament/Creality Generic PLA @K1-all.json",
    },
    "k1max-0.16-pla": {
        "process": "process/0.16mm Optimal @Creality K1Max (0.4 nozzle).json",
        "machine": "machine/Creality K1 Max (0.4 nozzle).json",
        "filament": "filament/Creality Generic PLA @K1-all.json",
    },
    "k1max-0.12-pla": {
        "process": "process/0.12mm Fine @Creality K1Max (0.4 nozzle).json",
        "machine": "machine/Creality K1 Max (0.4 nozzle).json",
        "filament": "filament/Creality Generic PLA @K1-all.json",
    },
    "k1max-0.20-pla-supports": {
        # 0.20mm Standard with auto-supports enabled (45° threshold, normal-auto).
        # Pre-merged in scripts/profiles/ to sidestep OrcaSlicer's "duplicate process" rejection.
        "process": None,
        "process_local": "k1max-0.20-pla-supports.json",
        "machine": "machine/Creality K1 Max (0.4 nozzle).json",
        "filament": "filament/Creality Generic PLA @K1-all.json",
    },
    "k1max-0.16-pla-supports": {
        # 0.16mm Optimal with the same auto-support tuning, for finer top-surface detail.
        "process": None,
        "process_local": "k1max-0.16-pla-supports.json",
        "machine": "machine/Creality K1 Max (0.4 nozzle).json",
        "filament": "filament/Creality Generic PLA @K1-all.json",
    },
}


def slice_stl(stl: Path, outdir: Path, preset: str) -> Path:
    if not ORCA_CLI.exists():
        sys.exit(f"OrcaSlicer not found at {ORCA_CLI}. Install via: brew install --cask orcaslicer")
    cfg = PRESETS[preset]
    # Process profile can come from OrcaSlicer's bundle or our local override copy
    if cfg.get("process_local"):
        process = REPO_PROFILES / cfg["process_local"]
    else:
        process = PROFILES / cfg["process"]
    machine = PROFILES / cfg["machine"]
    filament = PROFILES / cfg["filament"]
    for p in (process, machine, filament):
        if not p.exists():
            sys.exit(f"Profile missing: {p}")

    outdir.mkdir(parents=True, exist_ok=True)
    # Clear any prior plate output so we know which file is fresh
    for f in outdir.glob("plate_*.gcode"):
        f.unlink()

    settings_chain = f"{process};{machine}"

    cmd = [
        str(ORCA_CLI),
        "--slice", "0",
        "--outputdir", str(outdir),
        "--load-settings", settings_chain,
        "--load-filaments", str(filament),
        str(stl),
    ]
    print(">>>", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)

    plates = sorted(outdir.glob("plate_*.gcode"))
    if not plates:
        sys.exit("OrcaSlicer produced no gcode")
    return plates[0]


def summarize(gcode: Path) -> dict:
    """Pull headline metadata out of a sliced gcode."""
    keys = (
        "total layer number",
        "max_z_height",
        "filament used [mm]",
        "filament used [cm3]",
        "estimated printing time (normal mode)",
    )
    summary = {}
    with gcode.open() as fh:
        for line in fh:
            if not line.startswith(";"):
                continue
            for k in keys:
                if k in line:
                    summary[k] = line.split("=", 1)[1].strip() if "=" in line else line.split(":", 1)[1].strip()
    return summary


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("stl", type=Path)
    p.add_argument("--outdir", type=Path, default=Path("gcode"))
    p.add_argument("--preset", default="k1max-0.20-pla", choices=PRESETS.keys())
    p.add_argument("--rename", default=None, help="Rename the produced gcode (e.g. final.gcode)")
    args = p.parse_args()

    gcode = slice_stl(args.stl, args.outdir, args.preset)
    if args.rename:
        target = args.outdir / args.rename
        shutil.move(gcode, target)
        gcode = target
    print(f"\n✓ Sliced → {gcode}")
    for k, v in summarize(gcode).items():
        print(f"  {k:42s} {v}")


if __name__ == "__main__":
    main()
