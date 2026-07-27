# Blender playground

Blender 5.1+ をローカル MCP で操作する toolchain。CAD シーン操作、レンダリング、
USD エクスポート、任意の DGX/Isaac Sim ホストへの転送を扱う。

## レイアウト

- `skills/blender/` — シーン制作ワークフロースキル（headless bpy 正本・視覚 judge ループ・並列モジュール編集）
- `tools/blender-mcp/` — stdio MCP サーバー、Blender アドオン、セットアップスクリプト、テスト

## セットアップ

```sh
cd playgrounds/blender/tools/blender-mcp
mise run sync

/Applications/Blender.app/Contents/MacOS/Blender \
  --background \
  --python scripts/setup_blender_addon.py \
  -- --auto-start

codex mcp add blender -- "$(pwd)/.venv/bin/ai-for-cad-blender-mcp"
```

`execute_bpy` は任意 Python を Blender 内で実行する escape hatch なので、既定では無効。
必要な作業だけ明示的に有効化する。
