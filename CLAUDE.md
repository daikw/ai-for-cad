# ai-for-cad

AI-for-CAD 実験リポジトリ。`playgrounds/<toolchain>/` がエージェントスキルファミリーごとの実験場（forgecad / fusion360 / easyeda / qcad）、`benchmarks/` が同一お題のツール横断比較、`viewer/` が全 playground 共有の成果物ビューア。モデルは `playgrounds/<toolchain>/projects/<model>/` に置く。

## バージョン管理方針（docs/model-versioning.md が正本）

- **枝**（並存する別解）はディレクトリ: `.../projects/<model>/b<N>-<slug>/`。枝が 1 本のうちはフラット
- **バージョン**（置換する改善版）は同一ディレクトリで in-place。CHANGELOG.md に `## v<N>` 見出しで記録し、印刷した版の STL/G-code は `-v<N>` サフィックスで保存
- パラメータ違いだけの変種は `Param.choice` + `variant-*.forge.js`。ディレクトリを増やさない
- 新モデル追加・派生時は `viewer/projects.json` も更新する（README にモデル一覧表は置かない）。viewer.json には `provenance`（aiModel / skills / dsl）を書く

## ForgeCAD（playgrounds/forgecad/）

- モデル実装タスクの完了条件は checks.forge.js（`playgrounds/forgecad/lib/forge-verify/verify.js` 使用）が `--backend occt` で ALL PASS（0 failed）すること。レンダの見た目は補助であってゲートではない
- 質量・重心などの物理予算は `suite.budget()` でチェックに含める。予算超過は理由付き WAIVED として毎回表示させ、黙って通さない
- 未実測のプレースホルダ寸法は `suite.waived()` で常時可視化する
- boolean 多用や数値取得の前に `playgrounds/forgecad/lib/forge-verify/kernel-pitfalls.md` を読む。数値（体積・質量・干渉・エンベロープ）は occt でのみ取得する（manifold は表示用）。エンベロープ検査は boundingBox ではなく「外側殻との intersection 体積 = 0」で行う
- 設計〜検証は forgecad-high-level-spec → forgecad-lld → forgecad-make-a-model → forgecad-verify の順で使う

## スキルの正本と同期

- スキルの正本は `playgrounds/<toolchain>/skills/`（git 管理）。`.claude/.codex/.agents` はコピーで、`scripts/sync-skills.sh` で同期する（clone 直後とスキル編集後に実行）
- easyeda 系 3 スキルは第三者リポジトリ由来のため commit しない。`playgrounds/easyeda/scripts/fetch-easyeda-repos.sh` が `playgrounds/easyeda/skills/` に取得する（sync-skills.sh の同期対象に含まれる）

## その他の playground

- **fusion360**: Fusion MCP + `adsk` Python スクリプト駆動。API 内部単位は cm。検証は見た目でなくエクスポート/数値で行う（fusion360 スキル参照）
- **easyeda**: 外部クローン（extensions/ tools/ 計 ~3.8GB）は git 管理外。`playgrounds/easyeda/scripts/fetch-easyeda-repos.sh` で再取得
- **qcad**: 2D 作図 → DXF 生成 → PNG 目視検証（daikw:qcad スキル参照）
