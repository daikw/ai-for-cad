# TPU-PLA 界面テスト: Bambu Studio デュアルスライス手順

対象 STL: `stl/tpu-pla-bridge-test.stl`（30×20×11mm の机型。天板下 22mm スパンにサポート必須）

検証目的: TPU 本体 + PLA サポート界面の「剥離性」と「本体表面の仕上がり」を
本番 66h の前に小物で確認する。

## Bambu Studio での手順

1. 新規プロジェクト → プリンタ **Bambu Lab H2D Pro 0.4 nozzle**、
   ビルドプレート **Textured PEI Plate**
2. `tpu-pla-bridge-test.stl` をインポート
3. フィラメント設定:
   - Filament 1: **Generic TPU** → **右エクストルーダー**に割り当て
     - ノズル温度を **230°C** に変更（Overture 95A の上限。既定 240 は高すぎ）
   - Filament 2: **Bambu PLA Basic**（White）→ **左エクストルーダー**（AMS 2 Pro スロット 0 = White）
4. オブジェクトのフィラメント = 1 (TPU)
5. プロセス（0.20mm Standard @BBL H2DP ベース）:
   - サポート: **有効** / タイプ normal(auto)
   - **サポート/ラフト界面フィラメント = Filament 2 (PLA)** ← ここが本題
   - サポートベースは Filament 1 (TPU) のままで OK（界面のみ PLA が公式推奨構成）
6. スライスしてプレビュー確認:
   - サポート界面層が白（PLA）で表示されること
   - プライムタワーが生成される場合は位置がプレート内に収まっていること
7. **プレートのスライス済みファイルをエクスポート**（.gcode.3mf）→
   このディレクトリに `tpu-pla-bridge-test.gcode.3mf` として保存

## 投入（Claude 側でやる）

エクスポートできたら Claude に一声。preflight で
TPU→外部スプール255（右）/ PLA→AMS スロット0 のマッピングを確認して投入する。

## 評価ポイント（印刷後）

- PLA 界面がペリッと剥がれるか（公式技: 端に隙間を作り IPA を流して待つ）
- 剥がした後の TPU 天板下面の面品質
- TPU/PLA の切替部の糸引き・にじみ
