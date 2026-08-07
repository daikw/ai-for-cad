# playgrounds/3dp

H2D Pro を中心とした 3D プリント実験の置き場。

- **print-jobs/** — 印刷ジョブの成果物・証跡・履歴。規約は [print-jobs/PIPELINE.md](./print-jobs/PIPELINE.md)、索引は [print-jobs/README.md](./print-jobs/README.md)（自動生成）
- **tools/printjob.mjs** — ジョブのスキャフォールド・カメラ証跡取得・履歴記録・索引生成

スライス・投入・監視の実務は `printing-with-bambu-h2d-pro` スキル（ユーザーグローバル）と
lab-ops リポジトリの `bambu-h2d(-remote)` wrapper が担う。本ディレクトリはその「記録側」。

クローン直後は `node tools/printjob.mjs init` を実行（スキル互換の `.codex/print-jobs`
シンボリックリンクと gitignore を整える）。
