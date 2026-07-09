# verification.md — 三段検証の手順

`SKILL.md` §4 の三段検証（数値クエリ+スクリーンショット → エクスポート+数値チェック → 物理検証フラグ）の具体的な手順。中核規律を再掲する: **キャンバスの見た目ではなく、エクスポートと数値で検証する。AI の自己申告は検証ではない。**

## 段階1: 数値クエリでの逐次検証

各フィーチャー操作の直後に、Fusion ドキュメントを閉じる前の状態のまま `script` で数値照会する。`tools.md` のテンプレート例のように、`print()` で以下を必ず出力する。

- バウンディングボックス（`body.boundingBox`、cm→mm 変換込み）
- 体積（`body.physicalProperties.volume`、cm³→mm³ 変換）
- エッジ数・面数（`body.edges.count`, `body.faces.count`。フィレット追加前後で増分を確認するなど、期待する変化と照合する）
- パラメータ値（`design.userParameters` を使っている場合はその値そのもの）

スクリーンショット（`fusion_mcp_read` の `screenshot`）は補助的な目視確認として使う。`direction=iso-top-right` 等の等角投影が全体形状の把握に有効。ただし数値照会の代替にはしない。

## 段階2: STL/STEP エクスポート後の数値チェック

Fusion 上のエクスポート機能（`ExportManager`）で STL または STEP を書き出し、Fusion の外側でファイルを検証する。

### エクスポートの script 例（実測済み 2026-07-03）

`fusion_mcp_execute` の `script` から `ExportManager` を使って STL に書き出す。`createSTLExportOptions(body, filename)` の第2引数がフルパス、`meshRefinement` で精度を指定してから `execute()` する。

```python
import adsk.core, adsk.fusion

def run(_context: str):
    app = adsk.core.Application.get()
    design = app.activeProduct
    root = design.rootComponent
    body = root.bRepBodies.item(0)

    export_mgr = design.exportManager
    filename = "/tmp/exported_part.stl"
    stl_options = export_mgr.createSTLExportOptions(body, filename)
    stl_options.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementHigh
    export_mgr.execute(stl_options)
    print(f"exported: {filename}")
```

書き出し先パスは Fusion プロセスから見えるローカルパスであること。エクスポート自体は `document` の `save` とは独立した操作であり、既存ドキュメントを上書きしない。

**新規依存を勝手に追加しない**（`~/.claude/rules/supply-chain-security.md` に従う）。trimesh 等の Python ライブラリを使う場合は、`uv add` の実行前に必ずユーザーへ確認を取ること。ここでは既存環境で完結する検証手段を優先する。

### 依存追加なしでできる検証（stdlib のみ、実測 2026-07-06）

まずファイルの存在とサイズを確認し（`ls -la`）、続いて **stdlib だけの binary STL パーサ**で bbox・体積を数値チェックする。`ExportManager` の STL/STEP 出力単位は **mm**（実測: STEP ヘッダ `SI_UNIT(.MILLI.,.METRE.)` で裏取り済み）。

```python
# check_stl.py — 依存なし binary STL 検証（uv run check_stl.py <path>）
import struct, sys

def run(path):
    with open(path, "rb") as f:
        f.seek(80)
        (n,) = struct.unpack("<I", f.read(4))
        lo = [float("inf")] * 3; hi = [float("-inf")] * 3; vol6 = 0.0
        for _ in range(n):
            d = struct.unpack("<12fH", f.read(50))
            a, b, c = d[3:6], d[6:9], d[9:12]
            for v in (a, b, c):
                for i in range(3):
                    lo[i] = min(lo[i], v[i]); hi[i] = max(hi[i], v[i])
            vol6 += (a[0] * (b[1] * c[2] - b[2] * c[1])
                     - a[1] * (b[0] * c[2] - b[2] * c[0])
                     + a[2] * (b[0] * c[1] - b[1] * c[0]))  # 符号付き四面体法×6
    print("bbox_mm:", [round(hi[i] - lo[i], 4) for i in range(3)])
    print("volume_mm3:", round(vol6 / 6.0, 4))

run(sys.argv[1])
```

- **体積の許容差目安**: `MeshRefinementHigh` で BRep 体積比 **±0.5% 以内**なら整合とみなす。凹面（穴の内壁）では三角形の弦がボディ側に張るため、メッシュ体積は BRep より**わずかに大きく**なる（実測: φ5 穴つきブロックで +0.013%）。凸面では逆に小さくなる。
- **穴径**: 穴近傍の頂点（穴軸からの距離が公称半径±0.5mm の点）を集めて半径の min/mean/max を出し、公差内かを確認する。

### trimesh を使う場合（要ユーザー確認、新規依存として扱う）

```bash
# ユーザー確認後にのみ実行する
uv add trimesh
```

```python
import trimesh

mesh = trimesh.load("exported_part.stl")
bbox = mesh.bounding_box.extents  # [mm] (STLはmm前提が多いが、エクスポート設定に依存するため要確認)
print(f"bbox_mm: {bbox}")
print(f"volume_mm3: {mesh.volume}")
print(f"watertight: {mesh.is_watertight}")  # False なら穴・非多様体エラーの疑い
```

チェック項目:
- **バウンディングボックス**が完了条件の外形寸法と一致するか（mm 単位、`pitfalls.md` の cm 変換ミスが無いか最終確認する場でもある）
- **体積**が意図した設計と桁レベルで整合するか（穴の抜け忘れ・重複ジオメトリの検出に有効）
- **穴径**: 円柱状の穴であれば、穴周辺の頂点から半径を再計算し、指定公差内かを確認する
- **`is_watertight`**（trimesh 使用時）: 非多様体・穴の残存がないかの機械チェック

## 段階3: 物理検証フラグの判定基準

以下のいずれかに該当する部品は、完了条件に「**物理プリント検証が必要**」と明記する。数値検証だけで「完了」と報告してはならない。

- **圧入**（プレスフィット）が発生する部品（ベアリング固定、軸受など）
- **回転嵌合**が発生する部品（歯車の噛み合い、回転軸受け）
- **0.1mm オーダーの公差**が機能に直結する部品

理由: AI 編集結果は画面表示（視覚）だけでは判断できず、数値検証だけでも公差起因の組立不能・回転不良を見逃した実例が複数ソースで報告されている（`pitfalls.md` 製造ドメイン節）。これらの部品では、実際に印刷・組立して物理的に確認するまで「完了」としない。
