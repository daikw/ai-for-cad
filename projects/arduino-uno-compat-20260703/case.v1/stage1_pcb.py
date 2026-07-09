# Stage 1: 新規ドキュメント作成 + PCB 外形 (68.58 x 53.34 x t1.6mm, 45°カット2箇所) の押し出し
# 座標系: 基板左下 = 原点, +X 右, +Y 上, PCB 底面 z=0, 上面 z=1.6mm
# EasyEDA mil 座標からの変換: mm = mil * 0.0254, y_f = 53.34 + y_easy_mm
import adsk.core, adsk.fusion

MM = 0.1  # mm -> cm (Fusion API 内部単位は cm)

def run(_context: str):
    app = adsk.core.Application.get()
    doc = app.documents.add(adsk.core.DocumentTypes.FusionDesignDocumentType)
    design = adsk.fusion.Design.cast(app.activeProduct)
    root = design.rootComponent

    # 基板外形 (mm): PCB レイヤ11 実測値 (mil * 0.0254)
    pts_mm = [
        (0.0, 0.0),
        (66.04, 0.0),     # 右下 45° カット開始 (2600mil)
        (68.58, 2.54),    # (2700, -2000)
        (68.58, 50.80),   # (2700, -100)
        (66.04, 53.34),   # 右上 45° カット (2600, 0)
        (0.0, 53.34),
    ]
    sketch = root.sketches.add(root.xYConstructionPlane)
    sketch.name = "pcb_outline"
    lines = sketch.sketchCurves.sketchLines
    n = len(pts_mm)
    for i in range(n):
        x1, y1 = pts_mm[i]
        x2, y2 = pts_mm[(i + 1) % n]
        lines.addByTwoPoints(
            adsk.core.Point3D.create(x1 * MM, y1 * MM, 0),
            adsk.core.Point3D.create(x2 * MM, y2 * MM, 0),
        )
    print("profiles:", sketch.profiles.count)
    profile = sketch.profiles.item(0)

    extrudes = root.features.extrudeFeatures
    ext_input = extrudes.createInput(profile, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
    ext_input.setDistanceExtent(False, adsk.core.ValueInput.createByReal(1.6 * MM))
    ext = extrudes.add(ext_input)
    body = ext.bodies.item(0)
    body.name = "PCB"

    bbox = body.boundingBox
    dx = (bbox.maxPoint.x - bbox.minPoint.x) / MM
    dy = (bbox.maxPoint.y - bbox.minPoint.y) / MM
    dz = (bbox.maxPoint.z - bbox.minPoint.z) / MM
    vol_mm3 = body.physicalProperties.volume * 1000.0
    # 期待体積 = (68.58*53.34 - 2*0.5*2.54^2) * 1.6
    print(f"doc={doc.name} body=PCB bbox_mm=({dx:.3f},{dy:.3f},{dz:.3f}) vol_mm3={vol_mm3:.1f}")
