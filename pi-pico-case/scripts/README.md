# CAD → Slice → Print 自動化スクリプト

ForgeCAD で出力した `.stl` を OrcaSlicer でスライスし、Creality K1 Max (stock firmware) に LAN 経由でアップロード → 印刷投入するためのスクリプト群。

## 依存

- macOS + `/Applications/OrcaSlicer.app` (`brew install --cask orcaslicer`)
- `uv` (Python ランナー — シェバング行で自動的に解決される)
- 同 LAN に Creality K1 / K1 Max (stock firmware, root mod 不要)

## 使い方

### スライス

```bash
scripts/slice.py pi-pico-case-print.stl --outdir gcode --preset k1max-0.20-pla
```

プリセット:

| 名前 | 層厚 | 用途 |
|---|---|---|
| `k1max-0.20-pla` | 0.20mm | 既定。一般用途 |
| `k1max-0.16-pla` | 0.16mm | 仕上がり優先 |
| `k1max-0.12-pla` | 0.12mm | 高精細 |

出力: `gcode/plate_1.gcode`。スライサ自動配置・自動 brim・auto-overhang 検出。

### K1 Max への印刷投入

```bash
# upload + start を一気に
scripts/print_k1.py submit gcode/plate_1.gcode --as pi-pico-case.gcode

# 分割実行
scripts/print_k1.py upload gcode/plate_1.gcode --as pi-pico-case.gcode
scripts/print_k1.py list                  # 機器上のファイル確認
scripts/print_k1.py start pi-pico-case.gcode

# 監視 / 中断
scripts/print_k1.py status
scripts/print_k1.py pause
scripts/print_k1.py stop
```

`--host` を渡すと別の K1 / K1 Max にも投げられる（既定: `192.168.9.252`）。

## プロトコルメモ

stock K1 firmware は外向きに 3 つの口を持っている:

| ポート / パス | プロトコル | 用途 |
|---|---|---|
| `:80 /info` | HTTP GET | `{mac,model,version}` を返すビーコン |
| `:80 /upload` | HTTP POST (multipart, field `file`) | `/usr/data/printer_data/gcodes/<filename>` に着地 |
| `:80 /websocket` | WebSocket | クライアント UI 用（こちらは別系統） |
| `:9999` | **WebSocket** | **本命の制御チャネル**。JSON-RPC `{"method":"set"\|"get","params":{...}}` |

主要メッセージ:

| 方向 | params | 効果 |
|---|---|---|
| `get` | `{"reqGcodeFile": 1}` | `retGcodeFileInfo2` でファイル一覧を返却 |
| `set` | `{"opGcodeFile": "printprt:/usr/data/printer_data/gcodes/<name>"}` | 印刷開始 |
| `set` | `{"pause": 1}` | 一時停止 |
| `set` | `{"stop": 1}` | 中止 |
| `set` | `{"lightSw": 0\|1}` | 庫内ライト |
| `set` | `{"fan": 0\|1}` | モデルファン |

State push は 1〜2 秒間隔で `{nozzleTemp, bedTemp0, printProgress, deviceState, state, ...}` などが届く。
