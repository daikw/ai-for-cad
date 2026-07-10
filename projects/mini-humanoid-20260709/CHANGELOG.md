# mini-humanoid CHANGELOG

## v2 (2026-07-10)

外装の作り込みパス。ref との乖離の主因が「パーツ数」ではなく「1 パーツあたりの造形密度」
だったため（parts-ledger.md の棚卸しで判明）、Sonnet 5 ×5 並列（head / leg / torso /
arm / verify、1 ファイル 1 オーナー）で全外装を再構築した。

- **頭**: 楕円体 → 角丸ヘルメット（box + fillet R11、殻 2.3mm）+ 面一黒バイザー
  （コンフォーマル intersection）+ 白目 ×2 + 耳ポッド ×2。頭頂 Z=300 を assert で担保
- **脚**: 2 層足（黒ソール + 3 段テーパー白アッパー）、膝/足首の白 U リンク +
  ピボットボス、関節間だけを覆う中空ラップシェル（r9、白黒交互パターン）
- **胴**: 台形パネルライン（溝 1.0mm）+ ベントスロット + 背中シェル + 骨盤カバー
- **腕**: 肩ポッド + 上腕/前腕ラップシェル（先細り）+ 肉厚グリッパ
- **checks 拡張**: 全印刷パーツ bed-fit、部位別質量予算、頭頂 Z=300±1 →
  **94 passed / 6 waived / 0 failed**（--backend occt）
- 総質量 665.47g（予算 800g）、CoM (x=-0.24, y=-0.14)、部位別質量:
  head 40.7 / torso 103.8 / leg 27.6×2 / arm 22.6×2 [g]

### 統合時に摘出・修正した問題

1. **前腕シェル × hip roll サーボの干渉 16.9mm³**（LLD-8 FAIL）: 台帳の
   「z<140 → |x|≥42.5」ルールは z∈[140,160] に張り出す hip roll サーボ
   （global x≤39.25, y≤-14）を想定していなかった。前腕シェル上段の奥行きを
   32→29・y+1.5 シフト（y∈[-13,16]）で解消
2. 腕の質量 0.41g 超過（並列作業中に verify-agent のチェックが検出、arm-agent が修正）

### 得られた知見（kernel-pitfalls.md #9/#10 に追記）

- selector 無し fillet は broad-edge budget により非決定的にスキップされる →
  `{ convex: true }` 等を常に明示
- truck バックエンドでは fillet は difference の前に掛ける必要がある。
  `shell()` はプリミティブ専用のため、角丸中空殻は fillet → 大きめキャビティ
  difference で作る



## v1 (2026-07-09)

全高 300mm・17 DoF のホビーヒューマノイド初版。

- 参考画像: ChatGPT (DALL-E) 生成 3 枚（`refs/`）。直交ビュー / サーボ配置 / 外観
- サーボ: Dynamixel XL330-M288-T ×17（トルク予算は hld.md 参照）
- 検証: `forgecad run checks.forge.js --backend occt` → **34 passed / 6 waived / 0 failed**
- 総質量 646.96g（予算 800g）、CoM (x=-0.96, y=-0.20, z=148.2)

### 検証スイート・inspect が摘出した設計バグと修正

1. **肩ピッチサーボ × 電装の干渉**（基板 966mm³ / バッテリー 1373mm³）
   → 電装をキャビティ床に平積み（バッテリー→基板、z≤195）、肩軸を Z218→222 へ +4
2. **下腿プレートと大腿プレートが同一スロットで 936mm³ 重複**
   → 下腿プレートを z∈[18,66] に短縮し、膝ホーンは大腿プレート持ちに分離。
   膝サーボ本体は後方スイングさせ shank 背面プレートへ溶着固定
3. **フェイスパネル（平板）がスカル外へ 661mm³ 突出**
   → 楕円体 intersection によるコンフォーマルバイザーに変更

### 備考

- `forgecad run` は `forgecad.json` を上に辿ってプロジェクトルートを解決するため、
  リポジトリルートの `forgecad.json`（`{}`）が無いと
  `../../playgrounds/forgecad/lib/forge-verify/verify.js` の require が
  "File not found" で失敗する（spherical-drone CHANGELOG 既知事項の再発。今回コミットで固定）
- 残存する collisions チャンネル検出は全て意図した溶着（ボルト結合の簡略表現）:
  プレート同士 ~25mm³、膝サーボマウント 195mm³、肘トッププレート 466mm³ 等
