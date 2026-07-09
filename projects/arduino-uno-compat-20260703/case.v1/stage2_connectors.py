# Stage 2: コネクタ類ブロックアウト。PCB 上面 (z=1.6mm) に直方体を配置。
# 位置は EasyEDA PCB 実測パッド/原点座標由来 (mil*0.0254, y_f=53.34+y_easy)。
# 寸法出典: USB-C TYPE-C-31-M-12 / DC-005 / TS-1187A データシート公称値。
#   DC ジャック高さ 11.0mm とリセット SW 高さ 2.0mm は要実測確認。
import adsk.core, adsk.fusion

MM = 0.1
PCB_TOP = 1.6

# name, xmin, xmax, ymin, ymax, height(mm)
BLOCKS = [
    # USB-C: 原点(145,-450)rot-90, 前面は基板左端から 0.635mm 内側(25mil), 奥行 7.35, 幅 8.94, 高 3.26
    ("USB_C",   0.635, 7.985, 37.44, 46.38, 3.26),
    # DC-005: 原点(210,-1750)rot90, 前面 2.286mm 内側(90mil), 奥行 14.4, 幅 9.0, 高 11.0 (要確認)
    ("DC_JACK", 2.286, 16.686, 4.39, 13.39, 11.0),
    # TS-1187A: 中心(400,-880)=(10.16,30.988), 5.2x5.2, 高 2.0 (要確認)
    ("RESET_SW", 7.56, 12.76, 28.388, 33.588, 2.0),
    # メスソケット: パッド実測範囲 ±1.27mm(半ピッチ), 高 8.5
    ("HDR_J3", 17.526, 42.926, 49.53, 52.07, 8.5),   # 1x10 @740..1640mil, y=-100
    ("HDR_J4", 44.45, 64.77, 49.53, 52.07, 8.5),     # 1x8 @1800..2500mil, y=-100
    ("HDR_J5", 27.686, 48.006, 1.27, 3.81, 8.5),     # 1x8 @1140..1840mil, y=-2000
    ("HDR_J6", 48.006, 63.246, 1.27, 3.81, 8.5),     # 1x6 @1940..2440mil, y=-2000
    # ICSP 2x3 ピンヘッダ: パッド 2455..2555 x -1000..-1200mil, 高 8.5 (ピン先端)
    ("ICSP",   61.087, 66.167, 21.59, 29.21, 8.5),
]

def run(_context: str):
    app = adsk.core.Application.get()
    design = adsk.fusion.Design.cast(app.activeProduct)
    root = design.rootComponent

    planes = root.constructionPlanes
    plane_in = planes.createInput()
    plane_in.setByOffset(root.xYConstructionPlane, adsk.core.ValueInput.createByReal(PCB_TOP * MM))
    top_plane = planes.add(plane_in)
    top_plane.name = "pcb_top"

    results = []
    for name, x0, x1, y0, y1, h in BLOCKS:
        sk = root.sketches.add(top_plane)
        sk.name = f"sk_{name}"
        sk.sketchCurves.sketchLines.addTwoPointRectangle(
            adsk.core.Point3D.create(x0 * MM, y0 * MM, 0),
            adsk.core.Point3D.create(x1 * MM, y1 * MM, 0),
        )
        prof = sk.profiles.item(0)
        ext_in = root.features.extrudeFeatures.createInput(
            prof, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
        ext_in.setDistanceExtent(False, adsk.core.ValueInput.createByReal(h * MM))
        ext = root.features.extrudeFeatures.add(ext_in)
        body = ext.bodies.item(0)
        body.name = name
        bb = body.boundingBox
        results.append(
            f"{name}: x[{bb.minPoint.x/MM:.3f},{bb.maxPoint.x/MM:.3f}] "
            f"y[{bb.minPoint.y/MM:.3f},{bb.maxPoint.y/MM:.3f}] "
            f"z[{bb.minPoint.z/MM:.3f},{bb.maxPoint.z/MM:.3f}]"
        )
    print("\n".join(results))
    print(f"total_bodies={root.bRepBodies.count}")
