# ai-for-cad

AI-for-CAD 実験リポジトリ。CAD プロジェクトは全ツールチェーン共通で `projects/<name>-<YYYYMMDD>/`（日付 = プロジェクト開始日）に置く。`playgrounds/<toolchain>/` はスキル・ツール・ライブラリ・研究の置き場（成果物プロジェクトは置かない）。`viewer/` が共有の成果物ビューア。

## バージョン管理方針（docs/model-versioning.md が正本）

- **枝**（並存する別解）はディレクトリ: `projects/<name>-<ts>/b<N>-<slug>/`。枝が 1 本のうちはフラット
- **バージョン**（置換する改善版）は同一ディレクトリで in-place。CHANGELOG.md に `## v<N>` 見出しで記録し、印刷した版の STL/G-code は `-v<N>` サフィックスで保存
- パラメータ違いだけの変種は `Param.choice` + `variant-*.forge.js`。ディレクトリを増やさない
- 新モデル追加時は `projects/<name>-<ts>/project.json`（メタ正本: category / tags / summary / provenance / viewer 参照）を書き、`viewer/projects.json` のインデックスにパスを 1 行追加する（README にモデル一覧表は置かない）

## ForgeCAD（playgrounds/forgecad/）

- モデル実装タスクの完了条件は checks.forge.js（`playgrounds/forgecad/lib/forge-verify/verify.js` 使用）が `--backend occt` で ALL PASS（0 failed）すること。レンダの見た目は補助であってゲートではない
- 質量・重心などの物理予算は `suite.budget()` でチェックに含める。予算超過は理由付き WAIVED として毎回表示させ、黙って通さない
- 未実測のプレースホルダ寸法は `suite.waived()` で常時可視化する
- boolean 多用や数値取得の前に `playgrounds/forgecad/lib/forge-verify/kernel-pitfalls.md` を読む。数値（体積・質量・干渉・エンベロープ）は occt でのみ取得する（manifold は表示用）。エンベロープ検査は boundingBox ではなく「外側殻との intersection 体積 = 0」で行う
- 設計〜検証は forgecad-high-level-spec → forgecad-lld → forgecad-make-a-model → forgecad-verify の順で使う

## スキルの正本と同期

- スキルの正本は `playgrounds/<toolchain>/skills/`（git 管理）。`.claude/.codex/.agents` はコピーで、`scripts/sync-skills.sh` で同期する（clone 直後とスキル編集後に実行）
- easyeda 系スキルのうち第三者リポジトリ由来の 3 種（easyeda-api / extension-dev-skill / easyeda-pro-claude-skill）は commit しない。`playgrounds/easyeda/scripts/fetch-easyeda-repos.sh` が `playgrounds/easyeda/skills/` に取得する。自作スキル（easyeda-export-artifacts 等）は同ディレクトリに commit する（どちらも sync-skills.sh の同期対象）

## その他の playground

- **fusion360**: Fusion MCP + `adsk` Python スクリプト駆動。API 内部単位は cm。検証は見た目でなくエクスポート/数値で行う（fusion360 スキル参照）
- **easyeda**: 外部クローン（extensions/ tools/ 計 ~3.8GB）は git 管理外。`playgrounds/easyeda/scripts/fetch-easyeda-repos.sh` で再取得
- **qcad**: 2D 作図 → DXF 生成 → PNG 目視検証（グローバルの daikw:qcad スキル参照。repo 内に専用 playground 資産はない）
