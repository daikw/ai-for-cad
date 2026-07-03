# forgecad-experiments assembly viewer

`projects/<name>/stl/` の印刷部品 + 手書きのゴースト部品（電装・フレーム等）を
ブラウザで確認する、プロジェクト横断の静的ビューア。ビルド不要、依存は CDN の
three.js（0.170.0 固定）のみ。各プロジェクトは JSON manifest 1 本で完結し、
index.html 側にプロジェクト固有の定数は一切置かない。

## 起動

```sh
viewer/serve.sh          # リポジトリルートから起動。= python3 -m http.server 8642（stdlib のみ）
# → http://localhost:8642/viewer/
```

STL・manifest を fetch するため `file://` では動かない。必ず HTTP で配信する
（`viewer/serve.sh` はリポジトリルートをサーブするので、`../projects/<name>/stl/*.stl`
や `../projects/<name>/viewer.json` を相対パスで取得できる）。

## 機能

| 機能 | 説明 |
|------|------|
| PROJECT | `viewer/projects.json` に列挙されたプロジェクトを切り替える |
| SCENE | manifest の `scenes` を切り替える（1 シーンしかない、または未定義のプロジェクトでは非表示） |
| 分解表示 | 各部品・ゴーストの `explode` ベクトル方向にスライダーで分解する |
| 断面クリップ | manifest の `clip.axis` 方向にスイープする断面 |
| ゴースト | 電装・フレーム・モータ等、購入部品のプリミティブ代替表示 |
| PARTS | 印刷部品ごとの表示切替（色スウォッチ付き） |

## manifest スキーマ（`projects/<name>/viewer.json`）

```jsonc
{
  "title": "…",                 // パネル見出し・status 表示に使う
  "subtitle": "…",               // パネル副題
  "stlBase": "../projects/<name>/stl",  // STL fetch のベースパス（/viewer/index.html からの相対パス）
  "up": "z",                      // 現状 CAD Z-up 固定（THREE.Object3D.DEFAULT_UP）
  "clip": { "axis": "y", "min": -120, "max": 120 },  // 断面クリップのスイープ範囲
  "camera": { "target": [0, 0, 60], "dist": 950 },   // デフォルトカメラ（scene 側で上書き可）

  "parts": [
    {
      "id": "CenterDeck", "name": "CenterDeck", "stl": "center-deck.stl",
      "color": "#4a505a",             // CSS hex 文字列
      "pos": [0, 0, 0],                // 省略時 [0,0,0]
      "rot": [{ "axis": "x", "deg": 90 }],  // 省略可。下記「回転」参照
      "explode": [0, 0, 1],           // 分解方向（省略時 [0,0,0]）
      "group": "drone"                 // scenes のグループフィルタ・offset/lift のキー
    }
  ],

  "ghosts": [
    { "id": "pico-w", "type": "box", "size": [51, 21, 3], "color": "#0e7f4e", "opacity": 0.4, "pos": [0, 0, 5.5], "group": "drone" },
    { "id": "motor-45", "type": "cylinder", "r": 7, "h": 12, "axis": "z", "segments": 24, "color": "#7d848c", "opacity": 0.4, "pos": [30.05, 30.05, 8], "group": "drone" },
    { "id": "seated-sphere", "type": "sphere", "r": 80, "color": "#7a8a99", "opacity": 0.16, "pos": [175, 0, 113.1], "explode": [0, 0, 1.2], "group": "seat" }
  ],

  "scenes": [   // 省略可。省略時は「全 parts/ghosts を group フィルタなしで表示する」単一シーンを合成する
    {
      "id": "docked", "label": "docked — …", "default": true,
      "groups": ["station", "drone"],           // このシーンで表示する group（省略時は全 group を表示）
      "offsets": { "drone": [175, 0, 113.1] },   // group ごとの平行移動
      "explodeLift": { "drone": [0, 0, 1.2] },   // group ごとに explode ベクトルへ加算する追加分解方向
      "camera": { "target": [0, 0, 60], "dist": 950 }
    }
  ]
}
```

### 座標・回転の規約

- 位置 `pos` は **three.js のセンター基準座標**（`Mesh.position`）。ForgeCAD 作図側の
  `box()`/`cylinder()` は X/Y はセンター、Z は `[0, size]`（底面基準）という別規約なので、
  ゴーストを manifest 化する際に呼び出し元がこの変換（`center = bottom + size/2` 等）を
  済ませておくこと。`sphere()` は forgecad 側も three.js 側も全軸センター基準で変換不要。
- `rot` は `{axis: "x"|"y"|"z", deg}` のステップを**順番に**並べた配列。
  `quat = stepN * … * step2 * step1`（各ステップをワールド座標系で先頭に合成）として適用する。
  1 軸だけの回転はステップ 1 個で表現できる。複合回転（例: spherical-drone の南側 apriltag
  `qz180.multiply(qx90)`）は `[{axis:"x",deg:90},{axis:"z",deg:180}]` のように複数ステップで表現する。
- ゴーストの `cylinder` は three.js の `CylinderGeometry`（Y-up）を `axis` に応じて回転してから
  配置する: `axis:"z"` → `rotateX(90°)`、`axis:"x"` → `rotateZ(-90°)`、`axis:"y"` → 無回転。

### scenes とグループ

- `scenes` を持たない manifest（例: handy-fdm-mini）は単一の暗黙シーンとして扱われ、
  `group` の値に関係なく全 parts/ghosts を表示する。
- `scenes` がある manifest（例: spherical-drone）は、各シーンの `groups` に列挙された
  group のエントリだけを表示する。エントリに `group` が無い場合は常に表示される。
- `offsets`/`explodeLift` はシーンごとに group 単位で適用される平行移動・追加分解ベクトル。
  spherical-drone の docked シーンはこれを使って、drone group（機体一式 + そのゴースト）を
  ステーションのポート A 位置へオフセットしつつ、分解時にファンネルから持ち上げる。

## 新しいプロジェクトを追加する

1. STL をエクスポートする: `projects/<name>/stl/*.stl`
2. `projects/<name>/viewer.json` を上記スキーマで書く（`scenes` は 1 シーンしか無いなら省略してよい）
3. `viewer/projects.json` の `projects` 配列に 1 行追加する:
   ```jsonc
   { "id": "<name>", "title": "<表示名>", "manifest": "../projects/<name>/viewer.json" }
   ```
4. `viewer/serve.sh` を起動し、PROJECT ドロップダウンで選んで確認する
