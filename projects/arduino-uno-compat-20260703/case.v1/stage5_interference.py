# Stage 5: 全 11 ボディの干渉解析。完了条件 = 干渉 0 件。
import adsk.core, adsk.fusion

def run(_context: str):
    app = adsk.core.Application.get()
    design = adsk.fusion.Design.cast(app.activeProduct)
    root = design.rootComponent

    entities = adsk.core.ObjectCollection.create()
    names = []
    for i in range(root.bRepBodies.count):
        b = root.bRepBodies.item(i)
        entities.add(b)
        names.append(b.name)
    print("bodies:", ", ".join(names))

    inp = design.createInterferenceInput(entities)
    results = design.analyzeInterference(inp)
    print(f"interference_count={results.count}")
    for i in range(results.count):
        r = results.item(i)
        vol_mm3 = r.interferenceBody.volume * 1000.0 if r.interferenceBody else -1
        print(f"  [{i}] {r.entityOne.name} x {r.entityTwo.name} vol_mm3={vol_mm3:.4f}")
