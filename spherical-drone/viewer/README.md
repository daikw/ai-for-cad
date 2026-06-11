# spherical-drone assembly viewer

`stl/` の印刷部品（OCCT/manifold エクスポート）+ ゴースト部品（電装・pogo pin・Jetson）を
ブラウザで確認する静的ビューア。ビルド不要、依存は CDN の three.js（0.170.0 固定）のみ。

## 起動

```sh
cd spherical-drone
./viewer/serve.sh          # = python3 -m http.server 8642（stdlib のみ）
# → http://localhost:8642/viewer/
```

STL を fetch するため file:// では動かない。必ず HTTP で配信する。

## 機能

| 機能 | 説明 |
|------|------|
| Scene | drone（機体単体）/ station（+着座球ゴースト）/ docked（ポート A に着座） |
| 分解表示 | ケージ上下・蓋・ポート等が組立方向に開く。docked ではドローンがファンネルから持ち上がる |
| 断面クリップ | Y 平面でスイープ。ファンネル断面・pogo pin と接点ディスクの噛み合いを確認できる |
| ゴースト | Pico W / ESC / 電池 / モータ / プロペラ掃引円盤 / 接点ディスク / pin / Jetson |
| PARTS | 印刷部品ごとの表示切替 |

## 寸法の同期

配置定数（PORT_X=175, SEAT_Z=113.1 等）は `dims.js` の値を手書きで写している。
dims.js を変えたら index.html 冒頭の定数ブロックも更新し、STL を再エクスポートすること。

## スクリーンショット

| docked | 分解 + 断面 |
|---|---|
| ![docked](./sd-viewer-docked.jpeg) | ![explode](./sd-viewer-explode.jpeg) |
