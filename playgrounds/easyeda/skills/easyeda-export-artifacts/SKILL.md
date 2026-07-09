---
name: easyeda-export-artifacts
description: >-
  Exports schematics (SVG/PNG) and populated PCB 3D models (OBJ/STEP/STL) from
  a running EasyEDA Pro via the WebSocket bridge, and registers them in this
  repo's shared viewer. Use when the user asks to pull a schematic image, PCB
  artwork 3D, or board render out of EasyEDA into projects/ or the viewer.
  Not for designing or editing circuits (use easyeda-api directly) and not for
  installing the bridge itself (see easyeda-api's Quick Start).
---

# EasyEDA 成果物エクスポート（回路図 / 実装済み PCB 3D）

EasyEDA Pro 内のプロジェクトから回路図画像と部品込み PCB 3D を取り出し、
`projects/<name>-<ts>/` に保存してビューアに登録するまでの手順。
Freedom Level: 中（コマンドは実績のある形。保存先・viewer 登録は文脈で調整）。

## 前提

- EasyEDA Pro が起動していて、run-api-gateway 拡張がブリッジに接続済みであること
- ブリッジの発見（`edaConnected: true` を確認する）:

```sh
for port in $(seq 49620 49629); do
  curl -s -m 1 http://localhost:$port/health | grep -q easyeda-bridge && echo "BRIDGE_PORT=$port"
done
```

以降 `$P` = ブリッジポート。コードは `POST /execute` の `{"code": "..."}` で実行する。
長い処理は JSON body に `"timeout": 110000` を、curl に `-m 120` を付ける。

## 1. プロジェクトを特定して開く

**落とし穴**: `getAllProjectsUuid()` は引数なしだと空配列を返す。ローカルプロジェクトは
teamUuid にプロジェクトディレクトリの絶対パス（例: `~/Documents/EasyEDA-Pro/projects`）を渡す。

```js
const team = "/Users/<user>/Documents/EasyEDA-Pro/projects";
const uuids = await eda.dmt_Project.getAllProjectsUuid(team);
// 各 uuid を eda.dmt_Project.getProjectInfo(uuid) で引いて friendlyName を確認
await eda.dmt_Project.openProject(uuid);          // 開く（GUI が切り替わる）
await new Promise(r => setTimeout(r, 3000));
const info = await eda.dmt_Project.getCurrentProjectInfo();
// info.data[].schematic.uuid / info.data[].pcb.uuid が対象ドキュメント
```

作業後は元のプロジェクトを `openProject()` で開き直して返しておく。

## 2. ドキュメントを開いてエクスポート

エクスポート前に対象ドキュメントをエディタで開く:

```js
await eda.dmt_EditorControl.openDocument("<schematic-or-pcb-uuid>");
await new Promise(r => setTimeout(r, 2500));
```

### 回路図（SVG / PNG / PDF）

```js
const f = await eda.sch_ManufactureData.getExportDocumentFile(
  "<fileName>", "SVG",                 // "PNG" / "PDF" も可
  { theme: "Black on White" },         // 白地。既定はダーク
  "All Schematic");
```

### PCB 3D（部品モデル込み）

```js
const f = await eda.pcb_ManufactureData.get3DFile(
  "<fileName>", "obj",                                        // "step" も可
  ["Component Model", "Via", "Silkscreen", "Wire In Signal Layer"],
  "Outfit", /* autoGenerateModels */ true);
```

- viewer にそのまま載せるなら **obj**（+ .mtl が同梱される）。CAD 連携なら step
- 基板シェルだけなら `get3DShellFile("<name>", "stl" | "step" | "obj")`
- `autoGenerateModels: true` は部品モデル生成で数十秒かかりうる（timeout を伸ばす）

## 3. File の持ち帰り（ここが一手間）

**落とし穴**: 戻り値の `File` は単体ファイルではなく **ZIP**（`type: "application/zip"`）。
かつブラウザ内オブジェクトなので base64 文字列にして持ち帰る。1MB 超は 2 段階に分ける:

```js
// execute その1: 生成して globalThis に退避（サイズだけ返す）
globalThis.__export = f; return { name: f.name, size: f.size };
// execute その2: base64 化（32KB チャンクで String.fromCharCode — 一括だと引数上限で落ちる）
const buf = new Uint8Array(await globalThis.__export.arrayBuffer());
let bin = ""; const CH = 32768;
for (let i = 0; i < buf.length; i += CH) bin += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
return btoa(bin);
```

ローカル側で `base64.b64decode` → 保存 → `unzip`。中身は
`Schematic1/SCH_..._P1_<date>.svg` や `<name>.obj` + `<name>.mtl`。
リネームして zip は削除する（例: `schematic/schematic.{png,svg}`, `pcb/<name>-pcb.{obj,mtl}`）。

## 4. viewer への登録

- **PCB 3D**: manifest の `parts[]` に `"obj"` + `"mtl"`（`viewer/README.md` のスキーマ参照）。
  座標は mm で、EasyEDA は **Y が負方向**に伸びる（基板左上が原点近く）。camera target は
  bbox 中心に合わせる。bbox は OBJ の `v ` 行を舐めれば分かる
- **回路図**: `images[]` に PNG を登録（`width` 指定、A4 横なら概ね 250mm 幅が見やすい）
- toolchain 混在プロジェクトでは project.json の `viewers[]` に easyeda エントリを分けて
  登録する（マージしない）。provenance はエントリ側に書く

## 検証

- 保存した PNG を Read して回路図が読めることを目視確認する
- `viewer/serve.sh` を起動し、該当プロジェクトで OBJ が部品込みで表示されること、
  console にエラーが無いことを確認する
- EasyEDA を元のプロジェクトに戻したことを `getCurrentProjectInfo()` で確認する
