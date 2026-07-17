# pi-case-spark-like CHANGELOG

## v1 — 嵌合チェックアセンブリ (2026-07-17)

DGX Spark 風 Pi4 ケース候補（`dgx-pi4-body.stl` / `dgx-pi4-tray.stl`、
forgecad.io で作成しダウンロードした STL）に対して、Raspberry Pi 4B の
コミュニティ STEP モデルを組み付けた嵌合チェックを実施。

- `fit-assembly.forge.js` — 3 部品アセンブリ（`Explode lift` パラメータ付き）
- `checks.forge.js` — 嵌合検証スイート: **17 PASS / 4 waived / 0 failed**
  （`forgecad run checks.forge.js --backend manifold`）
- `rpi4-bbox.forge.js` — STEP 原本の読み込み・テッセレーション用
- `renders/` — Blender headless による組付確認レンダ

### 配置の導出（メッシュ実測から逆算）

- トレイのポスト ⌀6 ×4（頂面 z=9.5）: グリッド 49.03×58.00 = Pi4 取付穴と一致
- Pi4 は `rotateZ(-90)` + `translate(18.03, -2.5, 10.65)` が唯一の成立配置
  （USB/Ethernet が -Y 大開口へ、PCB 下面がポスト頂面 z=9.5 に着座）
- トレイと body はエクスポート座標のまま無変換で嵌合（ネジボス位置一致、
  ボス下面 z=6.5 = デッキ上面）

### 検証結果の要点

- 干渉: Pi∩tray 0.1mm³、body∩tray 0、Pi∩body はモデルアーティファクト
  （開き GPIO ピン）由来の 7.0mm³ のみで実質 0
- 着座: Pi はポスト 4 本に面接触、body はトレイに面接触、横ガタ <0.5mm
- クリアランス: 基板下 0.9mm / 天井 4.2mm / GPIO 側基板端-壁 0.57mm（タイト）
- USB/Ethernet クラスタは -Y 開口に収まり前面ほぼ面一

### 設計へのフィードバック（要ユーザー判断）

1. **USB-C 電源・micro-HDMI・AV が筐体内に埋まる**（-X 向き、開口なし）。
   給電は PoE/GPIO 前提か、側面開口の追加が必要
2. GPIO 側の基板端と +X 壁の隙間 0.57mm は FDM 公差でタイト
3. USB コーナーのネジは PoE ヘッダ近接のため頭径 ⌀4 以下を使う（Pi4 自体の制約）
