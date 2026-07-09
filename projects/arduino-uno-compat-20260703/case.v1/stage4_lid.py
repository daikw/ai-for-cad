# Stage 4: 上蓋 (CASE_LID)。組立位置 (in-place) でモデリング。
# 天板 z13.1..15.1 / スカート嵌合 0.25 クリアランス / 押さえリブ (基板上 0.15 ギャップ)
# 開口: ピンソケット連続スロット x2 (+0.5/片側), リセット φ6, DC プラグ通過部のスカート切除
import adsk.core, adsk.fusion

MM = 0.1
OUTER = (-2.25, -2.25, 70.83, 55.59)
Z_PLATE0, Z_PLATE1 = 13.1, 15.1
EARS = [(-3.85, -3.85), (72.43, -3.85), (72.43, 59.19), (-3.85, 59.19)]
EAR_R, LID_HOLE_R = 4.5, 1.7  # M3 通し穴 φ3.4
SKIRT_OUT = (0.0, 0.0, 68.58, 53.34)   # キャビティ内壁から 0.25 内側
SKIRT_IN = (1.5, 1.5, 67.08, 51.84)    # スカート幅 1.5
Z_SKIRT0 = 10.6
# 押さえリブ: 基板端 1mm 以内の部品レス帯 (TH ホール/コネクタ実測回避済み)
RIBS = [
    (66.5, 40.0, 68.3, 46.0), (66.5, 8.0, 68.3, 14.0),
    (2.0, 52.5, 8.0, 53.3), (10.0, 0.1, 15.0, 0.9),
]
Z_RIB0 = 1.75  # 基板上面 1.6 + 0.15 ギャップ
SLOT_TOP = (17.026, 49.03, 65.27, 52.57)   # J3+J4 連続 (+0.5/片側)
SLOT_BOT = (27.186, 0.77, 63.746, 4.31)    # J5+J6 連続
RESET_C, RESET_R = (10.16, 30.988), 3.0    # φ6
DC_PASS = (-0.5, 3.89, 1.7, 13.89)         # DC プラグ通過部 (x0,y0,x1,y1)

def rect_sketch(root, pts):
    sk = root.sketches.add(root.xYConstructionPlane)
    x0, y0, x1, y1 = pts
    sk.sketchCurves.sketchLines.addTwoPointRectangle(
        adsk.core.Point3D.create(x0 * MM, y0 * MM, 0),
        adsk.core.Point3D.create(x1 * MM, y1 * MM, 0))
    return sk

def extrude(root, profile, z0, z1, op, participants=None):
    exts = root.features.extrudeFeatures
    inp = exts.createInput(profile, op)
    inp.startExtent = adsk.fusion.OffsetStartDefinition.create(
        adsk.core.ValueInput.createByReal(z0 * MM))
    inp.setDistanceExtent(False, adsk.core.ValueInput.createByReal((z1 - z0) * MM))
    if participants:
        inp.participantBodies = participants
    return exts.add(inp)

def run(_context: str):
    app = adsk.core.Application.get()
    design = adsk.fusion.Design.cast(app.activeProduct)
    root = design.rootComponent
    NEW = adsk.fusion.FeatureOperations.NewBodyFeatureOperation
    JOIN = adsk.fusion.FeatureOperations.JoinFeatureOperation
    CUT = adsk.fusion.FeatureOperations.CutFeatureOperation

    # 1. 天板
    sk = rect_sketch(root, OUTER)
    ext = extrude(root, sk.profiles.item(0), Z_PLATE0, Z_PLATE1, NEW)
    lid = ext.bodies.item(0)
    lid.name = "CASE_LID"

    # 2. 耳タブ
    sk = root.sketches.add(root.xYConstructionPlane)
    for cx, cy in EARS:
        sk.sketchCurves.sketchCircles.addByCenterRadius(
            adsk.core.Point3D.create(cx * MM, cy * MM, 0), EAR_R * MM)
    for i in range(sk.profiles.count):
        extrude(root, sk.profiles.item(i), Z_PLATE0, Z_PLATE1, JOIN, [lid])

    # 3. スカート (リングプロファイル = ループ2本のもの)
    sk = root.sketches.add(root.xYConstructionPlane)
    for pts in (SKIRT_OUT, SKIRT_IN):
        x0, y0, x1, y1 = pts
        sk.sketchCurves.sketchLines.addTwoPointRectangle(
            adsk.core.Point3D.create(x0 * MM, y0 * MM, 0),
            adsk.core.Point3D.create(x1 * MM, y1 * MM, 0))
    ring = None
    for i in range(sk.profiles.count):
        if sk.profiles.item(i).profileLoops.count == 2:
            ring = sk.profiles.item(i)
    assert ring is not None, "ring profile not found"
    extrude(root, ring, Z_SKIRT0, Z_PLATE0 + 0.2, JOIN, [lid])

    # 4. 押さえリブ
    sk = root.sketches.add(root.xYConstructionPlane)
    for x0, y0, x1, y1 in RIBS:
        sk.sketchCurves.sketchLines.addTwoPointRectangle(
            adsk.core.Point3D.create(x0 * MM, y0 * MM, 0),
            adsk.core.Point3D.create(x1 * MM, y1 * MM, 0))
    for i in range(sk.profiles.count):
        extrude(root, sk.profiles.item(i), Z_RIB0, Z_PLATE0 + 0.2, JOIN, [lid])

    # 5. スロット2本 (天板+スカート貫通)
    for pts in (SLOT_TOP, SLOT_BOT):
        sk = rect_sketch(root, pts)
        extrude(root, sk.profiles.item(0), Z_SKIRT0 - 0.2, Z_PLATE1 + 0.2, CUT, [lid])

    # 6. リセット穴 φ6
    sk = root.sketches.add(root.xYConstructionPlane)
    sk.sketchCurves.sketchCircles.addByCenterRadius(
        adsk.core.Point3D.create(RESET_C[0] * MM, RESET_C[1] * MM, 0), RESET_R * MM)
    extrude(root, sk.profiles.item(0), Z_PLATE0 - 0.2, Z_PLATE1 + 0.2, CUT, [lid])

    # 7. DC プラグ通過部のスカート切除 (バレル φ9.3 が z12.8 付近まで通る)
    sk = rect_sketch(root, DC_PASS)
    extrude(root, sk.profiles.item(0), 1.0, Z_PLATE0 - 0.001, CUT, [lid])

    # 8. M3 通し穴 φ3.4 (耳タブ)
    sk = root.sketches.add(root.xYConstructionPlane)
    for cx, cy in EARS:
        sk.sketchCurves.sketchCircles.addByCenterRadius(
            adsk.core.Point3D.create(cx * MM, cy * MM, 0), LID_HOLE_R * MM)
    for i in range(sk.profiles.count):
        extrude(root, sk.profiles.item(i), Z_PLATE0 - 0.2, Z_PLATE1 + 0.2, CUT, [lid])

    bb = lid.boundingBox
    vol = lid.physicalProperties.volume * 1000.0
    print(f"CASE_LID bbox_mm=x[{bb.minPoint.x/MM:.3f},{bb.maxPoint.x/MM:.3f}] "
          f"y[{bb.minPoint.y/MM:.3f},{bb.maxPoint.y/MM:.3f}] "
          f"z[{bb.minPoint.z/MM:.3f},{bb.maxPoint.z/MM:.3f}] vol_mm3={vol:.1f} "
          f"faces={lid.faces.count} total_bodies={root.bRepBodies.count}")
