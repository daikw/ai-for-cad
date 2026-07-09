# check_stl.py — 依存なし binary STL 検証（uv run check_stl.py <path> [expected_hole_dia_mm]）
# bbox / 体積 / 中心穴(Z軸)半径の実測を出力する
import math
import struct
import sys


def run(path, hole_dia=None):
    with open(path, "rb") as f:
        f.seek(80)
        (n,) = struct.unpack("<I", f.read(4))
        lo = [float("inf")] * 3
        hi = [float("-inf")] * 3
        vol6 = 0.0
        verts = []
        for _ in range(n):
            d = struct.unpack("<12fH", f.read(50))
            a, b, c = d[3:6], d[6:9], d[9:12]
            for v in (a, b, c):
                verts.append(v)
                for i in range(3):
                    lo[i] = min(lo[i], v[i])
                    hi[i] = max(hi[i], v[i])
            vol6 += (a[0] * (b[1] * c[2] - b[2] * c[1])
                     - a[1] * (b[0] * c[2] - b[2] * c[0])
                     + a[2] * (b[0] * c[1] - b[1] * c[0]))
    print(f"{path}:")
    print("  triangles:", n)
    print("  bbox_mm:", [round(hi[i] - lo[i], 4) for i in range(3)])
    print("  volume_mm3:", round(vol6 / 6.0, 2))
    if hole_dia:
        r_nom = hole_dia / 2.0
        rs = [math.hypot(v[0], v[1]) for v in verts
              if abs(math.hypot(v[0], v[1]) - r_nom) < 0.5]
        if rs:
            print(f"  hole(r~{r_nom}): n={len(rs)} min={min(rs):.4f} "
                  f"mean={sum(rs)/len(rs):.4f} max={max(rs):.4f} mm")
        else:
            print(f"  hole(r~{r_nom}): no vertices found")


run(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else None)
