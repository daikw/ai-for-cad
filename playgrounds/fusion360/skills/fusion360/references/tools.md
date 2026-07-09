# tools.md — 公式 Fusion MCP の4ツール詳細

出典: 全項目 `research/official-mcp-probe.md`（実測済み 2026-07-03、Fusion PID 12743 に対する実機検証）。

公式 Fusion MCP は **4ツールのみ**を公開する。ジオメトリの生成・編集専用のツールは無く、実質的なモデリングインターフェースは `fusion_mcp_execute` の `featureType: "script"` で **Fusion Python API を直接実行すること**である。この MCP サーバは「CAD 操作の抽象化レイヤ」ではなく「Fusion Python API への薄いリモート実行ゲートウェイ」と理解する。

## 1. `fusion_mcp_read`（読み取り専用）

| queryType | 用途 | 主なパラメータ（すべて `arguments` 直下のトップレベルフィールド） |
|---|---|---|
| `projects` | 現在の hub 内の全プロジェクト一覧 | なし |
| `document`（operation=`search`） | ファイル名の部分一致検索 | `operation="search"`, `name`（必須、fuzzy）, `project`（任意） |
| `document`（operation=`open`） | 開いているドキュメント一覧 | `operation="open"` |
| `document`（operation=`recent`） | 最近使ったドキュメント一覧 | `operation="recent"` |
| `apiDocumentation` | Fusion API のクラス/メンバー検索（ドキュメント文字列付き） | `searchPattern`（正規表現、必須）, `apiCategory`(class/member/description/all), `filter`（名前空間絞り込み） |
| `screenshot` | アクティブなグラフィックスビューの PNG スクリーンショット（base64） | `width`, `height`（32–4096, 省略時キャンバスサイズ）, `antiAliasing`, `transparentBackground`, `direction`(current/front/back/top/bottom/left/right/iso-*) |

**戻り値の形式に注意**: 他のツールは `content[0].text` に JSON 文字列が入るが、`screenshot` だけは `content[0]` に `type: "image"`, `mimeType`, `data`(base64) が直接入る image ブロック形式。パース処理を分岐させる必要がある。

**⚠️ read/execute でパラメータのネスト構造が非対称（E2Eテストで実際に踏んだ罠、最重要）**: `fusion_mcp_read` には `object` フィールド自体が存在せず、`operation` などの引数は **`arguments` 直下のトップレベルプロパティ**である。一方 `fusion_mcp_execute`（§2）は `object.operation` のように **`object` の下にネスト**する。この2つを混同し `fusion_mcp_read` に `object.operation="open"` の形で渡すと `InvalidParameterValue` になる。§2 の表記に引きずられて read 側にも `object.` を付けないこと。

`fusion_mcp_read` の正しい呼び出し例（`document`/`open`、実測済み 2026-07-03）:

```bash
curl -s -X POST http://127.0.0.1:27182/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "MCP-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{
        "name":"fusion_mcp_read",
        "arguments":{"queryType":"document","operation":"open"}
      }}'
```

レスポンスは `{"results": [...], "message": "...", "success": true}` の形。`results` の各要素は `name`, `isActive`, `isModified`, `isSaved` を持つ（`document`/`open` の場合）。`document`(`search`) では各要素の `id` フィールドが、`fusion_mcp_execute` の `document`（operation=`open`）に渡す `object.fileId` の値になる。

**ワークフロー原則**: API の存在・シグネチャが不確かなまま推測でスクリプトを書かない。まず `apiDocumentation` でクラス名・メンバー名を検索してから `script` を書く。

## 2. `fusion_mcp_execute`（実行系・最重要）

| featureType | 用途 | パラメータ |
|---|---|---|
| `script` | **Fusion API の Python スクリプトを実行する。** `def run(_context: str):` を定義することが必須。`print()` の出力がツール結果として返る | `object.script`（Python コード文字列） |
| `document`（operation=`open`） | ドキュメントを開く | `object.fileId`（`fusion_mcp_read` の `document/search` で事前取得） |
| `document`（operation=`close`） | アクティブドキュメントを閉じる。未保存変更がある場合は `userConfirmedSaveAndClose` か `userConfirmedCloseWithoutSave` のどちらかの明示指定が必須（ダイアログ回避のためのフラグ） | `object.operation="close"`, `object.userConfirmedSaveAndClose` / `userConfirmedCloseWithoutSave` |
| `document`（operation=`save`） | アクティブドキュメントを保存。**ツール説明文自体が「ユーザーの明示指示がない限り呼ばないこと」と明記** | `object.operation="save"` |

新規ドキュメント作成専用のツールは存在しない。`script` 経由で以下のように行う（実測済み 2026-07-03）:

```python
import adsk.core, adsk.fusion
def run(_context: str):
    app = adsk.core.Application.get()
    doc = app.documents.add(adsk.core.DocumentTypes.FusionDesignDocumentType)
    print("created:", doc.name)
```

### script 規約（すべて実測に基づく必須要件）

1. **`def run(_context: str):` を必ず定義すること**。これがエントリポイントとして呼ばれる。
2. **`print()` の出力がツール結果としてそのまま返る**。数値検証（バウンディングボックス・体積・エッジ数など）は必ず `print()` で明示的に出力すること。呼び出し元は戻り値を勝手に推測できない。
3. **例外は握りつぶさず投げっぱなしにする**。ツール説明文自体が「run 関数内で例外をキャッチするな」と明記している。デバッグ情報を残す設計思想であり、try/except で握りつぶすと失敗原因が失われる。
4. **mm→cm 変換は script 内で明示的に行うこと**。Fusion API の内部長さ単位は常に cm。ツールの `inputSchema` に単位表記はないため、変換を忘れても実行時エラーにはならず静かに10倍の寸法違いになる（`pitfalls.md` 参照）。変数名は `xxx_cm` のように単位を明示すると事故が減る。

### スクリプトテンプレート例（新規ドキュメント作成 + 直方体 + 数値検証、実測パターンに基づく）

```python
import adsk.core, adsk.fusion

def run(_context: str):
    app = adsk.core.Application.get()
    design = app.activeProduct  # adsk.fusion.Design

    # --- 単位変換: すべて mm 指定からここで cm に変換する ---
    width_mm, depth_mm, height_mm = 20.0, 20.0, 10.0
    width_cm, depth_cm, height_cm = width_mm / 10.0, depth_mm / 10.0, height_mm / 10.0

    root = design.rootComponent
    sketches = root.sketches
    xy_plane = root.xYConstructionPlane  # B-Rep面よりコンストラクション平面が安定
    sketch = sketches.add(xy_plane)

    lines = sketch.sketchCurves.sketchLines
    lines.addTwoPointRectangle(
        adsk.core.Point3D.create(0, 0, 0),
        adsk.core.Point3D.create(width_cm, depth_cm, 0),
    )

    profile = sketch.profiles.item(0)
    extrudes = root.features.extrudeFeatures
    ext_input = extrudes.createInput(profile, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
    distance = adsk.core.ValueInput.createByReal(height_cm)
    ext_input.setDistanceExtent(False, distance)
    extrude = extrudes.add(ext_input)
    body = extrude.bodies.item(0)

    # --- 数値検証: print() が唯一の戻り値経路 ---
    bbox = body.boundingBox
    dx = (bbox.maxPoint.x - bbox.minPoint.x) * 10.0  # cm -> mm
    dy = (bbox.maxPoint.y - bbox.minPoint.y) * 10.0
    dz = (bbox.maxPoint.z - bbox.minPoint.z) * 10.0
    print(f"body created: {body.name}, bbox_mm=({dx:.3f},{dy:.3f},{dz:.3f})")
```

### スクリプトテンプレート例（貫通穴、実測済み 2026-07-03）

`pitfalls.md` の「2D 断面で先に円を抜いてから押し出す」方針の実装形。既存ボディに中心 φ5mm の穴を貫通させる例（対象ボディは上記テンプレートで作成済みの `body` とする）。`CutFeatureOperation` + `ExtrudeFeatureInput.setAllExtent(ExtentDirections.PositiveExtentDirection)` で「厚みを指定せず突き抜けるまで切る」を表現する。

```python
import adsk.core, adsk.fusion

def run(_context: str):
    app = adsk.core.Application.get()
    design = app.activeProduct
    root = design.rootComponent

    hole_diameter_mm = 5.0
    hole_radius_cm = (hole_diameter_mm / 10.0) / 2.0

    xy_plane = root.xYConstructionPlane
    hole_sketch = root.sketches.add(xy_plane)
    hole_sketch.sketchCurves.sketchCircles.addByCenterRadius(
        adsk.core.Point3D.create(0, 0, 0), hole_radius_cm
    )
    # このスケッチには円1つしかないため profiles.item(0) で一意に取れる。
    # 外形と穴を同一スケッチに同居させる場合は面積最大/最小の文脈依存則に注意(pitfalls.md)。
    hole_profile = hole_sketch.profiles.item(0)

    extrudes = root.features.extrudeFeatures
    cut_input = extrudes.createInput(hole_profile, adsk.fusion.FeatureOperations.CutFeatureOperation)
    cut_input.setAllExtent(adsk.fusion.ExtentDirections.PositiveExtentDirection)
    extrudes.add(cut_input)

    body = root.bRepBodies.item(0)
    volume_mm3 = body.physicalProperties.volume * 1000.0  # cm3 -> mm3
    print(f"hole cut: face_count={body.faces.count}, edge_count={body.edges.count}, volume_mm3={volume_mm3:.4f}")
```

`setAllExtent` はボディの厚み・向きに関わらず「貫通するまで切る」ため、厚みを事前に数値で把握していなくても安全に貫通穴を開けられる。逆に有限深さの止まり穴が必要な場合は `setDistanceExtent` を使う。

## 3. `fusion_mcp_update`（undo/redo）

| featureType | 用途 |
|---|---|
| `undo` | 直近の操作を取り消す。プレビュー/インタラクティブ操作中は失敗し `canUndo`/`canRedo` を返す |
| `redo` | 直近に取り消した操作をやり直す |

undo の挙動はパラメトリック/ダイレクトモードに依存する（`pitfalls.md` 参照）。粒度（何を1操作として undo するか）を意識して使うこと。

## 4. `fusion_mcp_electronics_read`（読み取り専用、Fusion Electronics）

Fusion Electronics（schematic / board / library）のデータを構造化クエリで読む。**アクティブな Electronics ドキュメントが必要**。`electronics.Sheet`, `electronics.Frame`, `electronics.Part`, `electronics.Net`, `electronics.Wire`, `electronics.Board` など50種類以上のエンティティ型を `entity_type` で指定し、`object.fields`（列選択）/`object.filters`（`{property,op,value}`、文字列は`eq`、数値は`lt`/`gt`）/`object.pagination`（`limit`/`offset`/`nextOffset`）で絞り込むクエリビルダー形式。詳細スキーマは `resource://mcp.electronics_schema_<class>` リソース（`resources/list` で49種確認可能）で取得できる。

**実測済み 2026-07-03**（`projects/arduino-uno-compat/comparison/fusion-electronics-run.md`）: 新規 Electronics Design / Schematic ドキュメントを作成し、`Sheet`/`Frame`/`Part`/`Net`/`Wire`/`Library` クエリが正常応答することを確認した。読み取り側は EasyEDA Pro の API と同等以上に整理されている。`adsk.electron` Python API（`script` featureType 経由、245メンバー・80クラス）も読み取り専用のプロパティアクセスとしてフルに機能する。

**⚠️ Electronics の書き込みは実質不可能（実測済み 2026-07-03）**: `adsk.electron` はオブジェクトレベルで**完全に read-only** — 全プロパティに setter が無く、コレクション（`Parts`/`Instances`/`Nets`/`Wires`）に `add` 系メソッドが存在しない。唯一の書き込み経路は `fusion_mcp_execute` の `script` から `Application.executeTextCommand("Electron.<cmd>")` を叩く EAGLE コマンドブリッジだが、実際に書けるのは**図形プリミティブ（矩形・フレーム・テキスト・円）のみ**。回路設計の核心である**部品配置（`ADD`）とネット配線（`NET`/`WIRE`）は非対話経路が存在せず、silent no-op か対話ダイアログの表示に終わる**（全6582テキストコマンド中、ライブラリ部品を非対話配置するコマンドは無い。`sch_sheet_placeinstance` は既存部品の複製専用で「最初の1個」を生成できず鶏卵問題で詰む）。詳細は `pitfalls.md` の「Electronics / テキストコマンドの罠」を参照。**結論: Fusion Electronics は読み取り（設計監査・ネット照会・BOM抽出）用途に限る。回路設計の自動化には使えない。**

## 5. 応答時間の実測

読み取り系・単純なスクリプト実行はいずれも体感1〜2秒以内で応答した（実測済み 2026-07-03）。大規模ジオメトリ操作でのレイテンシは未検証。30–45秒という報告もある（`setup.md` のトラブルシュート表参照、コミュニティ報告）。
