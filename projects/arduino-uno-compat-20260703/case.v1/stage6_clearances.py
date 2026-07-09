# Stage 6: 主要クリアランスの数値検証 (measureManager.measureMinimumDistance)
# 期待値: PCB-下ケース 0 (スタンドオフ接触), PCB-上蓋 0.15 (リブギャップ),
#         ヘッダ-上蓋 0.5 (スロット), DC/USB-下ケース >0
import adsk.core, adsk.fusion

PAIRS = [
    ("PCB", "CASE_BOTTOM"), ("PCB", "CASE_LID"),
    ("USB_C", "CASE_BOTTOM"), ("USB_C", "CASE_LID"),
    ("DC_JACK", "CASE_BOTTOM"), ("DC_JACK", "CASE_LID"),
    ("HDR_J3", "CASE_LID"), ("HDR_J4", "CASE_LID"),
    ("HDR_J5", "CASE_LID"), ("HDR_J6", "CASE_LID"),
    ("ICSP", "CASE_LID"), ("RESET_SW", "CASE_LID"),
    ("CASE_BOTTOM", "CASE_LID"),
]

def run(_context: str):
    app = adsk.core.Application.get()
    design = adsk.fusion.Design.cast(app.activeProduct)
    root = design.rootComponent
    bodies = {root.bRepBodies.item(i).name: root.bRepBodies.item(i)
              for i in range(root.bRepBodies.count)}
    mm = app.measureManager
    for a, b in PAIRS:
        r = mm.measureMinimumDistance(bodies[a], bodies[b])
        print(f"{a} - {b}: {r.value * 10.0:.4f} mm")
