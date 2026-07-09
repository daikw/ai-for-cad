# mini-humanoid CHANGELOG

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
