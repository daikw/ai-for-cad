# spherical-drone CHANGELOG / 開発ノート

## v1 (2026-06-11)

初版。hld.md / lld.md に基づくドローン 4 部品 + ステーション 5 部品。

### 既知のツールチェーン問題: manifold バックエンドの difference 崩壊

**症状**: `union()` で合成した形状を base にして `difference()` すると、
カッターに接触していた部分品だけが残り、本体が**警告なしに消える**。

再現（forgecad 0.9.4, manifold）:

```js
const shell = difference(box(150,200,95), box(145,195,95).translate(0,0,3)); // 248cm³
const boss  = cylinder(92, 4.5).translate(60, 80, 3);
difference(union(shell, boss), cylinder(12, 1.25).translate(60, 80, 84));
// → 5.8cm³（boss−穴 のみ。shell が消える）。occt では正しく 254.5cm³
```

- `.subtract()` / `add()` / 配列 union すべて同様に壊れる
- タンジェント接触でも 1mm オーバーラップでも発生
- cage.forge.js（パッドだけ残存 0.9cm³）、center-deck（メインバー消失、レンダで確認）、
  core-module（殻消失 1cm³）で実害を確認

**対策（本プロジェクトの規約）**:

1. **すべての実行・レンダ・エクスポートに `--backend occt` を付ける**。
   各スクリプト先頭の `getActiveBackend()` ガードが manifold 実行を即座に止める
   （`await activateBackend()` はトップレベル await 不可で使えない）
2. 防御的パターンとして、穴は union 前の単体プリミティブに開ける
   （cage のパッド穴で採用）

OCCT は本件の全ケースで正しく、ケージ生成も manifold 比 4–5 倍速い
（cage-top: 61s vs 245–322s）。


### 検証スイート（checks.forge.js）が摘出した設計バグと修正

`forgecad run checks.forge.js --backend occt` が lld.md §10 を実装する。摘出 → 修正済み:

| # | バグ | 修正 |
|---|------|------|
| 1 | port-module の外殻キャビティが 3mm 浅く、**ファンネル開口が天板で塞がれていた**（着座球と 57cm³ 干渉） | キャビティを z3..95 に貫通、リム穴付き天板のみ残す |
| 2 | pogo-base 上面（深さ60）が接点パッド面（60.5）より 0.5mm 高く、**ピン圧縮前に樹脂同士が接触** | ペデスタルポケットを 6→7mm に深化（ベース上面=深さ61、0.5 クリア） |
| 3 | ケージ取付パッド Ø7 が r81.8〜81.9 まで張り出し **Ø160 球エンベロープ超過** | リング肉厚 2.5→3.4（RI 76.6）、パッド円 r78.3、パッドを r80 円筒で**最後に**クリップ（OCCT では intersection 後の difference がクリップを巻き戻す挙動も確認） |
| 4 | ToF 視界: 直下 27° FoV はフット/レッグ/ペンタゴンリングに必ず遮られる。さらに**ペンタゴンリングの大円弧ストラットが極側へ ~2mm 垂れ**、唯一の回廊（経度 -18° のレッグ間ギャップ）を塞いでいた | ToF を r19・経度 -18° に移し、ROI オフセットで光軸を 9° 外側へ（ソフト設定必須、dims.js 注記）。ペンタゴンリング 5 辺のみ**緯線円弧**で生成し垂れを排除 |
| 5 | ESC モック形状が雑で取付ボスと 310mm³ 干渉（実物は基板+部品の 2 段） | 基板 30×30×1.2（z-6.7..-5.5）+ 部品 20×20×4（ボス間の空隙）に修正 |
| 6 | apriltag-plate の差し込みタングが面領域の内側に埋まっていて機能せず | タングを面の下端から突出（y -46..-36）に修正、station 側の起立配置も再計算 |

### ツールチェーン追加知見（forgecad 0.9.4）

- `union(array)` は逐次 fold で巨大 union が遅い（ケージ 277 体 ≈ 96s）。
  **チャンク+ペアワイズの木マージ（dims.js `balancedUnion`）で ~170 倍**（0.6s）
- difference バグの恒久対策として `safeCut(union, difference, positives, cuts)` を導入:
  (A∪B)−C ≡ (A−C)∪(B−C) を利用し、**union 前に各プリミティブへカッターを分配**。
  manifold/occt 両方で体積一致を確認（deck 18.6cm³ 等）
- `render 3d` / `render inspect` は `--backend` / `--param` を受けず、render サーバ環境では
  `importMesh`（binary 読み込み）も不可。`render hq` は有料。
  → モデルを manifold-safe にするのが唯一の直接レンダ経路
- `export stl` は `--backend` 可・`--param` 不可 → print-*.forge.js ラッパーで変種を焼き込み
- manifold は「ぴったり接線接触」の union で開メッシュ（boundary edges）を作ることがある
  → ストラット端 0.2mm 延長・節球 +0.08mm の**オーバーラップ余裕**を入れる

- ケージは `Build=group`（既定）で **boolean なしの ShapeGroup** を返す。manifold は
  浅い角度で交わるストラット同士の union で開メッシュを作り CSG 連鎖が破綻するため、
  レンダ経路は group、STL/checks は `Build=solid`（occt / manifold export）で分離
- manifold の safeCut 結果は重なり領域を二重計上した体積を返す（deck 21.2 vs occt 18.6
  cm³）。**質量はじめ正式な数値は必ず occt で取る**（manifold は表示用）
- OCCT の `boundingBox()` はトリム面の制御点由来で**実体のない膨張値**を返すことがある
  （cage-top r81.87 phantom、実体は r80 内）。エンベロープ検査は bbox でなく
  「外側殻との intersection 体積 = 0」で行う（checks.forge.js）
- difference と intersection を同一プリミティブに連鎖すると**どちらかが落ちる**
  （両カーネル）→ ケージパッドは boolean クリップをやめ、パッド中心を内側
  r76.5 に置いて穴だけ r78.3 のオフセット配置に変更

### lld.md からの実装上の変更

| 箇所 | LLD | 実装 | 理由 |
|------|-----|------|------|
| カメラタブ | 28×20 | 28×11 (z ≤ 10.5) | プロペラは z13–16 で r17–68 の全周環を掃引するため、その帯を横切る幅広形状は不可 |
| ケージ辺数 | 45−5=40 本/半球 | 50 本/半球 | subdiv-1 の辺数の数え間違いを修正（120 = 赤道10 + 55×2） |
| pogo-base | Ø20 + 耳 PCD25 | Ø26 + 下から M2×3 | pin 円 r11.5 が Ø20 に収まらない。耳案はペデスタルが底穴 Ø40 を塞ぐ |
| 配線チャネル | 溝付き Ø3 ストラット | 溝なし Ø3 ストラット | Ø3 に 1.6 溝を彫ると残壁 <0.7mm。ジップタイ留めに変更 |
| ケージネジ位相 | 下半球を 18° 回転 | パッド位置は共通、穴選択を 36° 互い違い | 赤道頂点（36° ピッチ）と整合 |
| battery-tray | 3 g | 7.7 g 実測 | 壁全周 + プロング分。軽量化は v2（壁窓抜き） |

### v2 軽量化レバー（lld.md §9 より、未着手）

- strutD 1.8 → 1.5（要落下試験）
- リング断面 2.5×6 → 2.2×5 + スカラップ
- battery-tray 壁の窓抜き（−3 g 見込み）
- 1S 300mAh / カメラ初期非搭載

## 2026-07-02

- `checks.forge.js` を `lib/forge-verify/verify.js`（共有検証ライブラリ）へ移植。
  既存 31 チェックは同一セマンティクスで全 PASS（`--backend occt`、実測 ~233s）
- `suite.budget()` による drone AUW 予算チェックを追加。対象は**ドローン側の
  印刷部品のみ**（center-deck / cage-top / cage-bottom / battery-tray、PLA
  1.24 g/cm³）+ lld.md §9 の電装・配線上限（56 g + 7 g）。ステーション側
  （port-module / core-body・lid / pogo-base）は AUW に無関係なので予算から
  除外（旧版はこれを誤って含めており、合計 1252.98 g という意味のない数字を
  出していた）。修正後の実測合計は **116.19 g**（75 g ラインに対し WAIVED
  として毎回表示。lld.md §9 の AUW 見込み 87–106 g に対しやや高いのは、
  battery-tray が見積 3 g に対し実測 7.7 g 前後だったこと、および電装を
  常に上限値 56 g で計上していることによる）
- `motorPcd` / `jetsonHoleX` / `jetsonHoleY` のプレースホルダ値（lld.md §11）を
  `suite.waived()` 項目として常時可視化。checks の summary から漏れないように
  した（3 件、毎回表示）
- リポジトリルートに `forgecad.json`（内容は `{}`）を追加。`forgecad run` は
  スクリプトのプロジェクトルートを `forgecad.json` を上に辿って解決し、その
  外への `require()` をブロックするため、`spherical-drone/` から
  `../lib/forge-verify/verify.js` を読めるようにするには、共通の祖先である
  リポジトリルートにも `forgecad.json` が要る。ローカル専用の設定で、
  `forgecad run` はその中身を解釈せず forgecad.io とも通信しない（push/pull/
  publish のときだけ通信する）
