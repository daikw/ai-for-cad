# 印刷ジョブ管理パイプライン

H2D Pro（および将来のプリンタ）向け印刷ジョブの成果物・証跡・履歴を git で永続化するための規約。
2026-08-07 制定。背景: セッション一時領域に置いたカメラ写真の消失、`.codex/`（gitignore 済み）
配下に置いたジョブ一式が git 管理外だった事故。

## ディレクトリ規約

```
playgrounds/3dp/print-jobs/
  PIPELINE.md              # 本書（規約の正本）
  README.md                # ジョブ索引（tools/printjob.mjs index で自動生成）
  <YYYY-MM-DD>-<slug>/     # 1 ジョブ = 1 ディレクトリ（開始日 + ケバブケース slug）
    job.json               # マニフェスト（正本・コミット対象）
    source/                # 入力: STL / SCAD / 3MF / 生成スクリプト
      cache/               # ダウンロード等の重量物（gitignore。URL+sha256 を job.json に記録）
    output/                # スライス出力: *.gcode.3mf（gitignore）+ 検証 JSON / ログ / プレビュー PNG
    evidence/              # 証跡: チャンバーカメラのスナップショット・実物写真（コミット対象）
```

- **ジョブの枝分かれ**（同素材の再スライス・条件違い）は同一ディレクトリ内のファイル名サフィックスで表現し、
  ディレクトリを増やさない（`whisker-tower-control` / `whisker-tower-testA` 等）。
- 別モデル・別目的になったら新しいジョブディレクトリを切る。

## git 管理ポリシー

| 種別 | 扱い | 理由 |
|---|---|---|
| `job.json` / 検証 JSON / slice.log / プレビュー PNG | **コミット** | 再現・監査の要。軽量 |
| `evidence/`（写真・スナップショット） | **コミット** | 再取得不能。消失事故の再発防止 |
| 生成スクリプト（`gen-*.mjs` / `.scad`）・小さい STL | **コミット** | 入力の正本 |
| `*.gcode.3mf` | **ignore** | 重量物かつ committed なスライスコマンド + プロファイルから再現可能。sha256 は検証 JSON に記録済み |
| `source/cache/`（ダウンロード STL/ZIP 等の重量物） | **ignore** | 取得元 URL + sha256 を job.json に記録して再取得する |

## job.json スキーマ（v1）

```jsonc
{
  "schema": "printjob/v1",
  "slug": "2026-08-04-fibonacci-balls",
  "title": "人間可読なタイトル",
  "status": "prepared | submitted | printing | completed | failed | aborted",
  "printer": "bambu-h2d-pro",
  "source": {
    "kind": "makerworld | generated | repo",
    "url": "モデルページ等（あれば）",
    "license": "ライセンス表記",
    "notes": "取得・生成の経緯",
    "files": [ { "path": "source/...", "sha256": "...", "origin": "url または生成コマンド" } ]
  },
  "prints": [
    {
      "artifact": "output/xxx.gcode.3mf",
      "sha256": "検証 JSON と一致させる",
      "sliceCommand": "再現可能な完全コマンド（スキルスクリプト経由）",
      "estimatedTime": "2h 4m",
      "filament": "TPU 16.3g + PLA 16.4g など",
      "amsSlots": "255,0",
      "submittedAt": "ISO8601",
      "result": "completed | failed | aborted",
      "resultNotes": "エラーコード・中断理由・品質所見"
    }
  ],
  "evidence": [ { "path": "evidence/IMG_7926.JPG", "caption": "..." } ],
  "links": { "tickets": ["GitLab WorkItem URL"], "mrs": [], "model": "..." },
  "learnings": [ "このジョブから得た恒久知見（1 行ずつ）" ]
}
```

## ライフサイクルと運用

1. **開始**: `node tools/printjob.mjs new <slug> --title "..."` でスキャフォールド
2. **入力確保**: ダウンロード物は即 `source/`（重量物は `source/cache/`）へ。URL + sha256 を job.json に記録
3. **スライス**: `printing-with-bambu-h2d-pro` スキルの slice-h2d-pro.mjs で `output/` に出力。
   コマンド全文を job.json の `sliceCommand` に記録（再現性の要）
4. **投入**: lab-ops wrapper で submit 後、`prints[]` に submittedAt / amsSlots / sha256 を記録
5. **証跡**: 開始時・完了時・異常時に `node tools/printjob.mjs snapshot <slug> <label>` で
   チャンバーカメラ画像を `evidence/` に保存（**セッション一時領域に置かない**）
6. **完了**: result / resultNotes / learnings を記録し、`node tools/printjob.mjs index` で索引更新
7. **チケット連携**: 意味のある成果・学びは GitLab WorkItem に note（画像は uploads API →
   `--form "file=@..."`）。job.json の `links.tickets` に URL を記録

## スキルとの互換

`printing-with-bambu-h2d-pro` スキルはジョブ置き場を `<repo>/.codex/print-jobs/` と案内するが、
`.codex/` はリポジトリ全体で gitignore されているため、本リポジトリでは
`playgrounds/3dp/.codex/print-jobs` → `../print-jobs` のシンボリックリンクで受ける
（`node tools/printjob.mjs init` が作成する。リンク自体は ignore されるので clone 後に再実行）。

## アンチパターン（事故の記録）

- カメラスナップショットをセッションのスクラッチパッドに置く → 数日で消える（2026-08-06 消失事故）
- `.codex/` 配下にジョブを置いて満足する → git 管理外、クローンで消える
- スライス済み 3MF だけ残して job.json を書かない → 条件・結果・経緯が失われる
- 実験結果を会話ログにだけ残す → チケット note か job.json の learnings に落とす
