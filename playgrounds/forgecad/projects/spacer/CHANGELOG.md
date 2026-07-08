# spacer — CHANGELOG

パラメトリック円筒スペーサー（OD12 / ID6 / H5 mm）。同一お題を ForgeCAD で反復した
4 世代を、versioning ポリシーに従い 1 ディレクトリに統合した（旧 `spacer`,
`spacer-v2`〜`spacer-v4` の 4 ディレクトリ。移行元は git 管理外だったため、旧版の
ソース差分は本 CHANGELOG の記録のみ）。

## v4（現行）

- 英語コメント化し、`console.log` で壁厚・体積を実行時出力
- `scene()`（カメラ・ライト・背景）を追加してレンダリング品質を明示
- fusion360 スキルの Route D（code-CAD = ForgeCAD）の位置づけを冒頭に明記
- 出力: `spacer.forge.js` + `exports/spacer_od12_id6_h5.{step,stl}`

## v3

- 検証を `verify.notEmpty` / `verify.lessThan` の新 API 形式に整理
- STEP チェック用の別ファイル（`spacer-step-check.forge.js`）を廃止して 1 ファイル化
- STEP ファイル名を自己記述的に（`spacer-od12-id6-h5.step`）

## v2

- 「材料・製造プロセス未指定 → 公称寸法（公差補正なし）」の方針をコメントで言語化
- 圧入・嵌合用途が判明したら ID に公差補正を入れて再エクスポートする旨を注記

## v1

- 初版。`param()` 3 つ（OD/ID/H）+ `spec()` による数値検証
  （bbox 12×12×5 ±0.05mm、体積 424.115 mm³ ±0.5%、貫通穴の担保）
- STEP エクスポートの独立確認用に `spacer-step-check.forge.js` を併置
