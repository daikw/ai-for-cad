# Fusion Electronics 能力調査ラン — Arduino UNO R3 互換機（回路図）

実施日: 2026-07-03 / エージェント: Fable 5（EDA 設計）
対象: ローカル起動中の Autodesk Fusion（PID 上の Photosynth WorkSpace）、公式 Fusion MCP `http://127.0.0.1:27182/mcp`
目的: EasyEDA Pro との比較ベンチマークの片翼。「何ができて何ができないか」の精密な記録。

---

## 結論（先に要点）

- **回路図設計は API では完遂できない。** 部品（ライブラリのデバイス）を非対話で配置する経路が存在しないため、Arduino のネットリストを組み上げられない。
- **読み取り API は非常に成熟**している。50 種超のエンティティ型を持つ構造化クエリ（`fusion_mcp_electronics_read`）+ 各クラスのスキーマリソース + `adsk.electron` Python API のフルアクセス。EasyEDA の API 網羅性に匹敵かそれ以上に整理されている。
- **書き込みには公式 API が存在しない。** 唯一の書き込み経路は `fusion_mcp_execute` の script から `Application.executeTextCommand("Electron.<cmd>")` を叩く **EAGLE コマンドブリッジ**。ただしこのブリッジで実際に書けるのは図形プリミティブ（矩形・フレーム・テキスト・円）だけで、**ライブラリ部品の配置と電気ネットの配線はできない**。

---

## Phase 1: 能力調査

### 1.1 接続

- setup.md の curl レシピ（initialize → `MCP-Session-Id` ヘッダ取得 → notifications/initialized → tools/list）でセッション確立。実測どおり確実に動作。SID=6021928291646795273。
- `tools/list` は 4 ツール: `fusion_mcp_electronics_read`, `fusion_mcp_execute`, `fusion_mcp_read`, `fusion_mcp_update`。
- `resources/list` は 50 リソース: `resource://mcp.electronics_entity_types` + 各クラスの `electronics_schema_<class>` 49 種。
- ユーザーが開いていたのは 4 ドキュメント（Fusion Design ×2、EcadDesign ×1、Schematic ×1）。**既存ドキュメントには一切書き込まず、自分で新規作成した Electronics Design / Schematic のみを操作した。**

### 1.2 読み取り API の実力（成熟・高評価）

`fusion_mcp_electronics_read` は `entity_type` に `electronics.<Class>` を渡す構造化クエリビルダー。`object.fields`（列選択）/ `object.filters`（`{property,op,value}`、文字列は eq、数値は lt/gt）/ `object.pagination`（limit/offset/nextOffset）をサポート。実測でアクティブな Schematic に対し以下が返った:

- `electronics.Sheet` → `{object_id:40, number:1, x1:-0.5,y1:-0.5,x2:6.5,y2:4, ...}`（座標単位 inch）
- `electronics.Frame` → タイトルブロック 1 件
- `electronics.Part` / `Net` / `Wire` / `Library` → 空（新規シートのため。クエリ自体は正常応答）

`adsk.electron` Python API（`fusion_mcp_execute` script 経由）は 245 メンバー・80 超のクラス。主要クラスのメンバーを実測列挙:

- `Schematic`: sheets / parts / nets / libraries / errors / exportManager / `beginDesignChange` / `endDesignChange` / `deleteEntities` / `selectObjects` など
- `Part`: device / deviceset / name / value / instances / package3d（**すべて read-only property**）
- `Instance`: x / y / angle / mirror / name / value / gate / sheet（**すべて RO**）
- `Net`: name / segments / pinRefs / portRefs / netClass（**すべて RO**）
- `Wire`: x1/y1/x2/y2 / width / style / layer（**すべて RO**）

**重要**: プロパティはすべて setter 無し（RO）。コレクション（Parts / Instances / Nets / Wires）は `count` / `item` / `cast` のみで **`add` 系メソッドが無い**。つまり `adsk.electron` はオブジェクトレベルで完全に読み取り専用。書き込みメソッドは `EcadDesign` の `beginDesignChange` / `endDesignChange`（undo 単位のトランザクション）と `deleteEntities`（削除）だけ。**新規オブジェクト生成 API は存在しない。**

### 1.3 書き込み経路の探索

`adsk.electron` に生成 API が無いため、書き込み手段を探索:

1. `app.executeTextCommand("Commands.List")` はエラーを返すが、その中に `CommandId: Electron::Group` がリークし、Electron 名前空間コマンドの存在が判明。
2. `app.executeTextCommand("TextCommands.List")` が全 6582 コマンドを返す。うち electron/ecad/eagle 関連 166 行。書き込み系の要点:
   - `Electron.run <eagle cmd>` — EAGLE コマンドを流す汎用ブリッジ
   - `Electron.sch_placerectangle fromx fromy tox toy [unit] [layer] [angle] [mirror]`
   - `Electron.sch_placeframe fromx fromy tox toy ...`
   - `Electron.sch_sheet_placeinstance sheetid sourcepartname partname gatename unit x y ...`
   - `Electron.sch_sheet_changedescription sheetid newdescription`
   - `Electron.placecircle` / `Electron.placetext`（PCB 側）
   - `Electron.mfgexport` / `Electron.mfgodb`（CAM 出力）
   - `Electron.querypartvariants` / `queryvariants` / `addvariant` / `removevariant`
3. `commandDefinitions` を走査し、新規ドキュメント作成コマンドを発見・実行:
   - `NewElectronDesignDocumentCommand`（New Electronics Design）→ `execute()` = True、EcadDesign ドキュメント新規作成成功
   - `NewElectronSchDocumentCommand`（New Schematic）→ Schematic ドキュメント新規作成成功

---

## Phase 2: 回路図設計の試行と壁の正確な位置

### 2.1 書き込みが動くことの証明（図形プリミティブ）

新規 Schematic 上で `Electron.sch_placerectangle 0.5 0.5 1.5 1.0 inch 94 0 0` を実行 → **矩形数 0→1**（読み取り API で確認）。**座標引数が完備した専用自動化コマンドは非対話で確実に書き込める。**

### 2.2 壁① — 部品配置がどの経路でもできない（致命的）

回路図設計の核心＝ライブラリからの部品配置。以下をすべて試し、いずれも失敗:

| 試行 | 結果 |
|---|---|
| `Electron.run USE '<Resistor.lbr フルパス>'; ADD R R1 (2 2);`（単一呼び出しでセミコロン連結） | OK 応答だが **parts 0 のまま。silent no-op** |
| `Electron.run ADD RCHIP-0603(1608-METRIC) R1 (2 2)`（完全修飾デバイス名） | silent no-op |
| `Electron.run ADD R R1 (2 2)` / `ADD R@Resistor R1 (2 2)` ほか複数構文 | すべて silent no-op |
| `Electron.run ADD R-EU_R0603 R1 (2 2)`（存在しない名） | **Fusion の部品ブラウザ（ADD ダイアログ）がモーダルで開き、MCP サーバ全体がハング**。AppleScript で Done クリックして復旧 |
| `Electron.sch_sheet_placeinstance 1 R R1 G$1 inch 2 2`（ライブラリ deviceset を source に） | `ERR: Unable to get source part object from schematic document` |

ローカルには 77 個の EAGLE ライブラリ（Resistor / Capacitor / Connector_USB / LED / Diode / Transistor 等、`.../Autodesk Fusion 360/Electron/JV426HQ7JQTNLJJE/lbr/`）が存在し、Resistor.lbr には deviceset `R`（14 パッケージ変種、`CHIP-0603` 等）が含まれることも XML から確認済み。**にもかかわらず `Electron.run ADD` は配置しない。**

判明した構造:
- `Electron.run <raw EAGLE>` は EAGLE コマンドの限定的ホワイトリストのみを Fusion アクションにマップする。`ADD` は「Fusion の Place-Component ブラウザを開く」に特別マップされており（名前が解決不能だとブラウザ表示、解決できても非対話配置はしない）、EAGLE 本来の非対話 ADD にはならない。
- `Electron.sch_sheet_placeinstance` は「**既存の**部品を複製する」コマンド（`sourcepartname` = schematic 上の既存部品）。最初の 1 個をライブラリから生成できないため鶏卵問題で詰む。
- 部品を「ライブラリから追加する」自動化テキストコマンドは全 166 行の中に存在しない（あるのは複製・図形配置・ライブラリ**編集**（NewSymbol/Package/Device）のみ）。

**結論: 部品配置は本質的に対話式の Place-Component ブラウザ（クラウド/管理ライブラリ連携）に紐付いており、非対話 API 経路が無い。**

### 2.3 壁② — ネット/ワイヤ配線もできない

- `Electron.run NET (2 2) (3 2);` → silent no-op（nets 0 のまま）
- `Electron.run WIRE (0.2 0.2) (0.3 0.2);` → silent no-op（wires 0 のまま）
- `sch_placenet` / `sch_placewire` 相当の専用コマンドは存在しない。

部品が置けない以上ピンも無く配線は元々無意味だが、ネット描画コマンド自体もブリッジから動かないことを確認した。

### 2.4 壁③ — 引数不足の生 EAGLE コマンドはサーバをハングさせる

`Electron.run grid`（引数不足）を実行 → **Grid 設定ダイアログがモーダルで開き、MCP サーバの全リクエストが `Cannot perform '...' while a command dialog is open` で 2 分ハング**。`terminateActiveCommand` すら「ダイアログが開いている」で拒否される。復旧は **AppleScript（System Events）で Grid ウィンドウの Cancel ボタンを直接クリック**するしかなかった。GUI 自動化はスコープ外だが、これをやらないとセッション全体が復旧不能になる罠。

---

## 到達点

- 新規 Electronics Design / Schematic ドキュメントの作成: **可**
- 全エンティティの読み取り: **可**（成熟）
- 図形プリミティブ（矩形・フレーム・テキスト）の配置: **可**（非対話）
- **部品（ライブラリデバイス）の配置: 不可**
- **ネット/ワイヤの配線: 不可**
- ERC/ネットリスト検証: 部品が無いため到達せず（`electronics.Error` の読み取り API 自体は存在）

DESIGN.md のブロック構成（電源 / MCU / USB-シリアル / I/O）は 1 部品も配置できないため未着手。壁は「部品配置」の一点で、そこで完全に止まる。

---

## 作業メトリクス

- 所要 script/execute 呼び出し: 約 24 回（read 系含む総 API 呼び出しは約 35 回）
- モーダルダイアログによるハング: 2 件（grid 引数不足 / ADD 名前解決不能）。いずれも AppleScript の GUI クリックで復旧。**MCP 単独では復旧不能** = 大きな運用リスク
- 体感レイテンシ: 読み取り・単純 script は 1〜2 秒。ハング時は最大 2 分（タイムアウト）
- ハマり所と復旧:
  - `Electron.run grid` ハング → System Events で Grid ダイアログの Cancel クリック
  - `Electron.run ADD <未解決名>` ハング → ADD ダイアログの Done クリック
  - `sch_sheet_placeinstance` の sheetid はオブジェクト id ではなく **シート番号（1 始まり）**

---

## エージェント操作性の評価（EasyEDA 比較観点）

| 観点 | Fusion Electronics | EasyEDA Pro（本プロジェクト実績） |
|---|---|---|
| ドキュメント API 成熟度 | 高（構造化クエリ + スキーマリソース + Python フルアクセス） | 高（extension API + WebSocket bridge） |
| 読み取り | 非常に強い。50+ エンティティ型、フィルタ・ページング完備 | 強い。ネットリスト幾何検証まで実施できた |
| **書き込み** | **公式 API 無し。EAGLE ブリッジは図形のみ。部品配置・配線は非対話経路が皆無** | **API のみで 40 部品配置 + 160 スタブ配線 + PCB 転送 + ルーティング + DRC 0 まで完遂** |
| 検証 | 読み取り API で数値検証は可能（部品が置ければ） | 幾何 union-find でネット一致 160/160 検証済み |
| 障害モード | モーダルダイアログが MCP サーバ全体をハング。GUI 復旧必須 | 確認ダイアログは DOM click で突破可能 |

**最大の差**: EasyEDA は API のみで回路図→PCB→配線→DRC を完遂できた（本プロジェクトの既存実績）のに対し、Fusion Electronics は **部品を 1 個も API で配置できず、回路図設計の入り口で止まる**。Fusion の読み取り API は EasyEDA と同等以上に整理されているが、書き込みが「公式には非対応、非公式ブリッジも図形限定」で、エージェント自動化の対象としては現時点で成立しない。

---

## 補足: 使用した接続・スクリプト

- 接続/呼び出しスクリプト: `scratchpad/fusion/{init.sh, call.sh, parse.py}`（session ヘッダ管理 + tools/call ラッパ）
- ライブラリ実体: `~/Library/Application Support/Autodesk/Autodesk Fusion 360/Electron/JV426HQ7JQTNLJJE/lbr/`（77 個の .lbr）
- EAGLE エンジン: libeagle version 0.1.2（`Electron.version`）
