# ai-for-cad assembly viewer

`projects/<name>-<YYYYMMDD>/stl/` の印刷部品 + 手書きのゴースト部品（電装・フレーム等）を
ブラウザで確認する、プロジェクト横断の静的ビューア。ビルド不要、依存は CDN の
three.js（0.170.0 固定）のみ。各プロジェクトは JSON manifest 1 本で完結し、
index.html 側にプロジェクト固有の定数は一切置かない。

## 起動

```sh
viewer/serve.sh          # リポジトリルートから起動。= python3 -m http.server 8642（stdlib のみ）
# → http://localhost:8642/viewer/
```

STL・manifest を fetch するため `file://` では動かない。必ず HTTP で配信する
（`viewer/serve.sh` はリポジトリルートをサーブするので、`../projects/<name>-<YYYYMMDD>/stl/*.stl`
や `../projects/<name>-<YYYYMMDD>/viewer.json` を相対パスで取得できる）。

## 機能

| 機能 | 説明 |
|------|------|
| PROJECT | `viewer/projects.json` に列挙されたプロジェクトを切り替える |
| BRANCH | プロジェクトの `branches`（枝）を切り替える（1 枝しかない、または未定義のプロジェクトでは非表示） |
| VERSION | manifest の `versions`（版）を切り替える（1 版しかない、または未定義の manifest では非表示） |
| SCENE | manifest の `scenes` を切り替える（1 シーンしかない、または未定義のプロジェクトでは非表示） |
| 分解表示 | 各部品・ゴーストの `explode` ベクトル方向にスライダーで分解する |
| 断面クリップ | manifest の `clip.axis` 方向にスイープする断面 |
| ゴースト | 電装・フレーム・モータ等、購入部品のプリミティブ代替表示 |
| PARTS | 印刷部品ごとの表示切替（色スウォッチ付き） |
| MOTION | manifest の `motions` を再生する（未定義の manifest では非表示。再生中は分解表示が無効） |
| provenance | manifest の `provenance`（AI モデル / スキル / DSL / 日付）をバッジ表示する |
| ホバー強調 | PARTS 行または 3D メッシュのホバーで該当部品を強調（他は減光）。`description` があればチップ表示 |
| 言語切替 | パネル右上の EN/JA ボタンで UI 言語を切り替える（初期値はブラウザ言語、localStorage に保存）。manifest 由来のテキストは切替対象外 |
| 2D 図面 | manifest の `drawings`（DXF）を線描画、`images`（PNG 等）を平面表示する。2D CAD・回路図用 |

## manifest スキーマ（`projects/<name>-<YYYYMMDD>/viewer.json`）

```jsonc
{
  "title": "…",                 // status 行の表示に使う（パネル見出しは "ai-for-cad viewer" 固定）
  "stlBase": "../projects/<name>-<YYYYMMDD>/stl",  // STL fetch のベースパス（/viewer/index.html からの相対パス）
  "up": "z",                      // 現状 CAD Z-up 固定（THREE.Object3D.DEFAULT_UP）
  "clip": { "axis": "y", "min": -120, "max": 120 },  // 断面クリップのスイープ範囲
  "camera": { "target": [0, 0, 60], "dist": 950 },   // デフォルトカメラ（scene 側で上書き可）。"top": true で真上ビュー（2D 図面向け）

  "provenance": {                 // 省略可。何で作ったかのバッジ表示（全フィールド任意）
    "aiModel": "Claude Fable 5",
    "skills": ["forgecad-high-level-spec", "forgecad-verify"],
    "dsl": "forgecad",
    "date": "2026-07"
  },

  "parts": [
    {
      "id": "CenterDeck", "name": "CenterDeck", "stl": "center-deck.stl",
      "color": "#4a505a",             // CSS hex 文字列
      "pos": [0, 0, 0],                // 省略時 [0,0,0]
      "rot": [{ "axis": "x", "deg": 90 }],  // 省略可。下記「回転」参照
      "explode": [0, 0, 1],           // 分解方向（省略時 [0,0,0]）
      "group": "drone",                // scenes のグループフィルタ・offset/lift のキー
      "description": "…"              // 省略可。ホバー時のチップに表示する説明
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
  ],

  "drawings": [   // 省略可。2D DXF を XY 平面に線描画する（2D CAD プロジェクト用）
    // 対応エンティティ: LINE / CIRCLE / ARC / LWPOLYLINE（bulge 非対応 — QCAD は丸めを ARC で出すので実用上足りる）
    // TEXT や寸法などその他のエンティティは無視される
    { "id": "profile", "name": "profile (DXF)", "dxf": "desk-hook.dxf", "color": "#e8eef4", "pos": [0, 0, 0], "description": "…" }
  ],

  "images": [     // 省略可。PNG/JPG を width 指定の平面として表示する（レンダ画像・回路図など）
    { "id": "render", "name": "render (PNG)", "src": "desk-hook.png", "width": 110, "pos": [80, -24, 0], "rot": [], "description": "…" }
  ],

  "motions": [   // 省略可。下記「モーション」参照
    {
      "id": "transmit", "label": "回転伝達", "loop": true, "durationMs": 4000,
      "easing": "linear",                        // モーション既定（track 側で上書き可）
      "tracks": [
        {
          "part": "HubDrive",                    // parts[].id / ghosts[].id、または "group": "…" で一括指定
          "rotate": { "axis": "z", "degFrom": 0, "degTo": 360, "pivot": [0, 0, -19.3] },  // pivot 省略時はその部品の basePos（その場スピン）
          "orbit": { "axis": "z", "center": [0.5, 0, 0], "degFrom": 0, "degTo": 720 },   // 位置のみ center 周りに公転（姿勢は回らない）
          "translate": { "from": [0, 0, 0], "to": [0, 0, 10] }
        }
      ]
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

### モーション

アセンブリが特定シナリオで動く様子を、宣言的な `motions` 定義で再生する。

- 1 track には `rotate` / `orbit` / `translate` を任意に併記でき、**rotate → orbit → translate
  の固定順**で合成する。姿勢は毎フレーム `basePos`/初期姿勢から絶対計算するので累積誤差が出ない。
- `rotate.pivot` / `orbit.center` は `pos` と同じ manifest 座標で書く。シーンの `offsets` は
  適用時に自動加算されるので、offset 付きシーンでもモーション定義を書き直す必要はない。
- `easing` は `linear` / `easeIn` / `easeOut` / `easeInOut`（cubic）。**ループする回転は
  `linear` にする**こと（他だと周回境界で角速度が不連続になる）。
- **再生中は分解表示（explode）が無効になる**。pivot/center は組立状態の座標で書かれるため、
  分解状態で回すと部品が誤った軸を公転するのを防ぐ。停止すると explode 値・全部品の位置姿勢が復帰する。
- `loop: false` のモーションは終端姿勢で停止し、ボタンが「↺ リセット」になる。

実例（oldham-coupling）: オルダムカップリングの中央ディスクは「自軸スピン θ + 軸間中点を
中心とする半径 e/2 の円軌道を 2θ で公転」という運動をする。これは `rotate`（pivot 省略 =
その場スピン 0→360°）と `orbit`（center = 軸中点、0→720°）の合成でちょうど表現できる:

```jsonc
"tracks": [
  { "part": "HubDrive",  "rotate": { "axis": "z", "degFrom": 0, "degTo": 360 } },
  { "part": "HubDriven", "rotate": { "axis": "z", "degFrom": 0, "degTo": 360 } },
  { "part": "Disc",
    "rotate": { "axis": "z", "degFrom": 0, "degTo": 360 },
    "orbit":  { "axis": "z", "center": [0.5, 0, 0], "degFrom": 0, "degTo": 720 } }
]
```

## 枝（branch）とバージョン（version）

`docs/model-versioning.md` の「枝＝並存する別解」「バージョン＝古い方を置き換える改善版」
という区別に対応して、ビューアも 2 段階で切り替えられる。**枝は `projects.json` の
プロジェクトエントリ側、バージョンは manifest（`viewer.json`）側**で宣言する — この対応が
崩れないようにする（枝を manifest 側で表現したり、バージョンをプロジェクトエントリの
枝として表現したりしない）。

### 枝（`viewer/projects.json`）

```jsonc
{ "id": "parts-tray", "title": "Parts Tray", "branches": [
  { "id": "b1-uniform-cells", "label": "b1 — uniform cells", "manifest": "../projects/parts-tray-20260706/b1-uniform-cells/viewer.json" },
  { "id": "b2-edge-joinery", "label": "b2 — edge joinery", "manifest": "../projects/parts-tray-20260706/b2-edge-joinery/viewer.json" }
] }
```

`branches` を持たないプロジェクトエントリは従来どおり `manifest` を直接持つ（単枝モデルは
今まで通りフラットのままでよい）。`branches` が 1 件だけ、または未定義の場合は BRANCH
フィールドセットごと非表示になる。先頭の枝がデフォルトで選択される（`default: true` で
明示指定も可）。

### バージョン（`projects/<name>-<YYYYMMDD>/viewer.json`）

```jsonc
"versions": [
  { "id": "v9.7", "default": true, "stl": { "print-layout": "pi-pico-case-print-v9-7.stl" } },
  { "id": "v9",   "stl": { "print-layout": "pi-pico-case-print-v9.stl" } }
]
```

`stl` は `parts[].id` → 差し替え STL ファイル名のマップ。バージョン切替時はそのパーツの
geometry だけを再ロードし、位置・色・シーン構成など他の manifest 定義は変化しない。
`versions` が 1 件だけ、または未定義の manifest では VERSION フィールドセットごと非表示になる。

## 新しいプロジェクトを追加する

1. STL をエクスポートする: `projects/<name>-<YYYYMMDD>/stl/*.stl`
2. `projects/<name>-<YYYYMMDD>/viewer.json` を上記スキーマで書く（`scenes` は 1 シーンしか無いなら省略してよい）。`provenance` で AI モデル / スキル / DSL を明示し、機構が動くモデルなら `motions` も書く
3. `viewer/projects.json` の `projects` 配列に 1 行追加する（単枝モデル）:
   ```jsonc
   { "id": "<name>", "title": "<表示名>", "manifest": "../projects/<name>-<YYYYMMDD>/viewer.json" }
   ```
   2 本目の枝が生えたら `branches` 配列に切り替える（上記「枝とバージョン」参照）。
4. `viewer/serve.sh` を起動し、PROJECT ドロップダウンで選んで確認する
