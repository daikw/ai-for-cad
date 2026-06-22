# desktop trash bin decoration viewer

W142 x D92 x H96mm の箱型スイープゴミ箱をシードにして、側面装飾7パターンを確認する静的ビューア。
ビルド不要、依存はCDNのthree.js（0.170.0固定）のみ。

## 起動

```sh
cd prints/desktop-trash-bin
./viewer/serve.sh
# -> http://localhost:8643/viewer/
```

STLとPNGをfetchするため、`file://` ではなくHTTPで配信する。

## 機能

| 機能 | 説明 |
|---|---|
| Patterns | 側面装飾7パターンの寸法・特徴・印刷注意を比較 |
| Preview | 選択中パターンのSTLを直接読み込み、実モデルと同じ形状で確認 |
| Selected STL | `desktop-trash-bin-<pattern>.stl` を選択中パターンに合わせて表示 |
| Renders | ForgeCADで生成した vertical-ribs seed の top / iso / front / side PNGを確認 |
| Fit Checks | シード寸法、前面高さ、角処理、装飾突起の検証結果を表示 |

## パターン

- `vertical-ribs`
- `horizontal-rails`
- `diagonal-slashes`
- `dot-grid`
- `window-frames`
- `wave-bars`
- `corner-posts`
