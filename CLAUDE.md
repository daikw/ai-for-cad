# forgecad-experiments

ForgeCAD モデリング実験リポジトリ。`projects/` 配下の各サブディレクトリが 1 プロジェクト（spherical-drone, pi-pico-case, ...）。`printers/` は印刷成果物ではなくプリンタ機器自体に関する資料（セキュリティ監査など）を置く。

## モデリングの完了条件

- モデル実装タスクの完了条件は checks.forge.js（`lib/forge-verify/verify.js` 使用）が `--backend occt` で ALL PASS（0 failed）すること。レンダの見た目は補助であってゲートではない
- 質量・重心などの物理予算は `suite.budget()` でチェックに含める。予算超過は理由付き WAIVED として毎回表示させ、黙って通さない
- 未実測のプレースホルダ寸法は `suite.waived()` で常時可視化する

## カーネル・数値ポリシー

- boolean 多用（大量 union、union 後の difference、boolean クリップ連鎖）や数値取得の前に `lib/forge-verify/kernel-pitfalls.md` を読む
- 数値（体積・質量・干渉・エンベロープ）は occt でのみ取得する。manifold は表示用
- エンベロープ検査は boundingBox ではなく「外側殻との intersection 体積 = 0」で行う

## スキル

設計〜検証は `.claude/skills/` の forgecad-high-level-spec → forgecad-lld → forgecad-make-a-model → forgecad-verify の順で使う。
