# Stage 7: CASE_BOTTOM / CASE_LID を STL エクスポート (高精細)。ドキュメントは保存しない。
import adsk.core, adsk.fusion

OUT_DIR = "/private/tmp/claude-502/-Users-daikiwatanabe-tmp-ai-for-cad/fcc75670-30ad-4448-b949-8c4b4a8d1da9/scratchpad"

def run(_context: str):
    app = adsk.core.Application.get()
    design = adsk.fusion.Design.cast(app.activeProduct)
    root = design.rootComponent
    em = design.exportManager
    for name in ("CASE_BOTTOM", "CASE_LID"):
        body = None
        for i in range(root.bRepBodies.count):
            if root.bRepBodies.item(i).name == name:
                body = root.bRepBodies.item(i)
        vol_mm3 = body.physicalProperties.volume * 1000.0
        opts = em.createSTLExportOptions(body, f"{OUT_DIR}/{name}.stl")
        opts.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementHigh
        opts.isBinaryFormat = True
        em.execute(opts)
        print(f"exported {name}.stl fusion_vol_mm3={vol_mm3:.2f}")
