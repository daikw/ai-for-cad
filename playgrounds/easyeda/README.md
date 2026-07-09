# easyeda playground

EasyEDA Pro を AI エージェントから操作する実験場。回路図設計ベンチの本体は
[projects/arduino-uno-compat-20260703](../../projects/arduino-uno-compat-20260703/) にある。

## レイアウト

- `docs/` — スキル台帳（[EASYEDA_SKILLS.md](./docs/EASYEDA_SKILLS.md)）と
  拡張セットアップ手順（[EASYEDA_EXTENSIONS.md](./docs/EASYEDA_EXTENSIONS.md)）
- `easyeda-repos.json` — 外部リポジトリのマニフェスト（name / repo / priority / purpose）
- `scripts/` — マニフェスト駆動の fetch・状態確認・ローカルサービス起動スクリプト
- `extensions/`, `tools/`, `skills/` — 外部クローン（extensions/tools で計 ~3.8GB、skills は第三者製スキル 3 種）。**git 管理外**。以下で再取得:

  ```sh
  ./scripts/fetch-easyeda-repos.sh
  ../../scripts/sync-skills.sh   # 取得した skills をハーネス（.claude 等）へ配る
  ```

ドキュメント内のパス表記は移行元（リポジトリ直下に `easyeda/` があった構成）の
名残がありうる。スクリプトはこのディレクトリを root として動くよう修正済み。
