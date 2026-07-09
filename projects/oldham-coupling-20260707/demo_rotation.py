# demo_rotation.py — オルダムカップリング回転デモ（Fusion MCP の script で実行）
# 駆動ハブを回すと Motion Link 経由で従動ハブが連動し、
# 中央ディスクは運動学解 slide = misalign*cosθ − E_REF で首振り追従する。
# ミスアライメント量はユーザーパラメータ misalign を変えるだけで反映される
# （従動軸・従動シャフトはジョイント式で自動追従）。
import adsk.core, adsk.fusion, math

# Slide_Disc_on_DriveSlot 作成時のディスク位置（駆動ハブローカル X、cm）。
# slider の slide=0 がこの位置に対応するため、一般式は slide = e*cosθ − E_REF_CM
E_REF_CM = 0.1


def run(_context: str):
    app = adsk.core.Application.get()
    design = adsk.fusion.Design.cast(app.activeProduct)
    root = design.rootComponent
    app.activeViewport.fit()

    j1 = root.joints.itemByName('Rev_HubDrive')
    ab1 = root.asBuiltJoints.itemByName('Slide_Disc_on_DriveSlot')
    e_cm = design.userParameters.itemByName('misalign').value

    revolutions = 2
    step_deg = 5
    for k in range(int(revolutions * 360 / step_deg) + 1):
        th = math.radians(k * step_deg)
        j1.jointMotion.rotationValue = th
        ab1.jointMotion.slideValue = e_cm * math.cos(th) - E_REF_CM
        adsk.doEvents()

    # 基準姿勢（θ=0）に戻す
    j1.jointMotion.rotationValue = 0.0
    ab1.jointMotion.slideValue = e_cm - E_REF_CM
    adsk.doEvents()
    print(f'demo finished: {revolutions} revolutions, e={e_cm*10:.2f}mm')
