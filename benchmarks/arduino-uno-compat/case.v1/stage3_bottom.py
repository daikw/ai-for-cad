# Stage 3: 下ケース (CASE_BOTTOM)
# 座標系はブロックアウトと共通 (基板左下原点, PCB 底面 z=0)。
# 壁厚 2.0 / 基板クリアランス 0.25 / 床厚 2.0 / スタンドオフ 3.0 (半田テール逃げ)
# 壁上端 z=13.1 = PCB1.6 + DCジャック11.0 + 0.5 クリアランス
# 開口: USB-C 12.5x7.0 (オーバーモールド対応), DC ノッチ 10.0 幅 (外形+0.5/片側)
import adsk.core, adsk.fusion

MM = 0.1

OUTER = (-2.25, -2.25, 70.83, 55.59)
CAVITY = (-0.25, -0.25, 68.83, 53.59)
Z_BOT, Z_FLOOR_TOP, Z_TOP = -5.0, -3.0, 13.1
EARS = [(-3.85, -3.85), (72.43, -3.85), (72.43, 59.19), (-3.85, 59.19)]
EAR_R, PILOT_R = 4.5, 1.25
# スタンドオフ: EasyEDA 実測 TH ホール位置 (ヘッダ列/USBシェル/DCピン/ICSP) を全て回避済み
PADS = [
    (2.0, 49.5, 8.0, 53.0), (42.7, 49.5, 44.7, 53.0), (66.3, 40.0, 68.3, 46.0),
    (66.3, 8.0, 68.3, 14.0), (10.0, 0.3, 15.0, 3.5), (0.3, 15.0, 5.0, 20.0),
    (63.5, 0.3, 66.0, 3.0),
]
USB_OPEN = (35.66, 48.16, -0.27, 6.73)   # y0,y1,z0,z1  (中心 y41.91, z3.23)
DC_NOTCH = (3.89, 13.89, 1.1, 13.5)      # 上端は壁上端を貫通するノッチ

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

    # 1. 外殻
    sk = rect_sketch(root, OUTER)
    ext = extrude(root, sk.profiles.item(0), Z_BOT, Z_TOP, NEW)
    case = ext.bodies.item(0)
    case.name = "CASE_BOTTOM"

    # 2. 耳タブボス (4隅, 壁とマージ)
    sk = root.sketches.add(root.xYConstructionPlane)
    for cx, cy in EARS:
        sk.sketchCurves.sketchCircles.addByCenterRadius(
            adsk.core.Point3D.create(cx * MM, cy * MM, 0), EAR_R * MM)
    for i in range(sk.profiles.count):
        extrude(root, sk.profiles.item(i), Z_BOT, Z_TOP, JOIN, [case])

    # 3. キャビティ掘り込み (床厚 2.0 を残す)
    sk = rect_sketch(root, CAVITY)
    extrude(root, sk.profiles.item(0), Z_FLOOR_TOP, Z_TOP + 1.0, CUT, [case])

    # 4. スタンドオフパッド
    sk = root.sketches.add(root.xYConstructionPlane)
    for x0, y0, x1, y1 in PADS:
        sk.sketchCurves.sketchLines.addTwoPointRectangle(
            adsk.core.Point3D.create(x0 * MM, y0 * MM, 0),
            adsk.core.Point3D.create(x1 * MM, y1 * MM, 0))
    for i in range(sk.profiles.count):
        extrude(root, sk.profiles.item(i), Z_FLOOR_TOP - 0.1, 0.0, JOIN, [case])

    # 5. M3 セルフタップ下穴 φ2.5, 深さ 8
    sk = root.sketches.add(root.xYConstructionPlane)
    for cx, cy in EARS:
        sk.sketchCurves.sketchCircles.addByCenterRadius(
            adsk.core.Point3D.create(cx * MM, cy * MM, 0), PILOT_R * MM)
    for i in range(sk.profiles.count):
        extrude(root, sk.profiles.item(i), Z_TOP - 8.0, Z_TOP + 0.5, CUT, [case])

    # 6. USB-C 開口 / 7. DC ノッチ (左壁を貫通)
    for y0, y1, z0, z1 in (USB_OPEN, DC_NOTCH):
        sk = rect_sketch(root, (-2.6, y0, -0.15, y1))
        extrude(root, sk.profiles.item(0), z0, z1, CUT, [case])

    bb = case.boundingBox
    vol = case.physicalProperties.volume * 1000.0
    print(f"CASE_BOTTOM bbox_mm=x[{bb.minPoint.x/MM:.3f},{bb.maxPoint.x/MM:.3f}] "
          f"y[{bb.minPoint.y/MM:.3f},{bb.maxPoint.y/MM:.3f}] "
          f"z[{bb.minPoint.z/MM:.3f},{bb.maxPoint.z/MM:.3f}] vol_mm3={vol:.1f} "
          f"faces={case.faces.count} total_bodies={root.bRepBodies.count}")
