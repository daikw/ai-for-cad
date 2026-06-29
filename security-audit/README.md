# K1 Max Security Audit

Creality K1 Max (stock firmware 1.0.0) の LAN 露出面に対するセキュリティ調査。

- **対象**: Creality K1 Max, firmware 1.0.0, IP 192.168.9.252
- **調査日**: 2026-06-26
- **手法**: Tailscale 経由 ubuntu01 から LAN アクセス。Profile B (Active/Authorized)
- **総合評価**: **CRITICAL**

## 調査体制

7 エージェント並列実行 (275 tool calls / 392k tokens / ~60 min):

| Agent | 対象 | 成果物 |
|-------|------|--------|
| port-scan | TCP/UDP 全ポートスキャン | [01-recon-port-scan.md](findings/01-recon-port-scan.md) |
| js-analysis | Vue.js SPA ソースコード解析 | [02-js-source-analysis.md](findings/02-js-source-analysis.md) |
| http-enum | HTTP エンドポイント列挙 | [03-http-endpoint-enum.md](findings/03-http-endpoint-enum.md) |
| camera | MJPEG カメラサービス分析 | [04-camera-mjpeg-analysis.md](findings/04-camera-mjpeg-analysis.md) |
| ws-deep | WebSocket API 列挙 | [05-websocket-api-enum.md](findings/05-websocket-api-enum.md) |
| firmware-cve | CVE / 脆弱性調査 | [06-firmware-cve-research.md](findings/06-firmware-cve-research.md) |
| report-synthesis | 統合レポート (日本語) | [00-synthesis-report.md](findings/00-synthesis-report.md) |

## 主要発見事項

| ID | 深刻度 | 発見 |
|----|--------|------|
| F-01 | CRITICAL | RCE — `print_proc`/`httpchunk` チェーンの公知エクスプロイトで root 取得可能 |
| F-02 | CRITICAL | 無認証 G-code 注入 — `gcodeCmd` でノズル 300°C 加熱等が遠隔実行可能 |
| F-03 | CRITICAL | 無認証ファイルアップロード — `POST /upload` に認証なし |
| F-04 | CRITICAL | AI 安全機能の無認証無効化 — `aiSw:-1` が受け入れられることを実証済み |
| F-05 | HIGH | CORS `*` — 悪意ある Web ページ閲覧だけで LAN 内プリンタを遠隔操作可能 |
| F-06 | HIGH | WebSocket 接続直後に 76 キーの完全状態ダンプ (無認証) |
| F-07 | HIGH | カメラ MJPEG ストリーム/スナップショットが無認証で公開 |
| F-08 | MEDIUM | ソースマップ (.map) 公開 — Vue.js フルソースがダウンロード可能 |

## 露出サービス

| Port | Service | Banner | Auth | Risk |
|------|---------|--------|------|------|
| 80/tcp | HTTP (Creality Web UI) | httpd/1.25.11.6 | なし | CRITICAL |
| 8080/tcp | MJPG-Streamer | MJPG-Streamer/0.2 | なし | HIGH |
| 9999/tcp | WebSocket JSON-RPC | httpd/1.25.11.6 | なし | CRITICAL |
| 22/tcp | SSH | - | - | CLOSED |

## 推奨アクション

1. **即座**: 専用 VLAN に隔離、信頼ホストのみ接続許可
2. **即座**: firmware を最新版に更新 (RCE 修正有無は要検証)
3. **短期**: リバースプロキシ (nginx) + Basic 認証を前段に配置
4. **中期**: コミュニティ firmware (Guilouz 等) への移行検討

