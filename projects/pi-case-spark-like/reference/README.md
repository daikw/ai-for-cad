# reference/ — Raspberry Pi 4B model

嵌合チェックに使う Raspberry Pi 4 Model B の 3D モデル。**このディレクトリの
STEP/STL は git 管理外**（第三者モデルでライセンス不明のため再配布しない）。
clone 直後は `./fetch.sh` で取得・再生成する。

| ファイル | 生成方法 | 用途 |
|---|---|---|
| `rpi4b.step` | [MGS-CAD-Files](https://github.com/multigamesystem/MGS-CAD-Files) からダウンロード | 原本（109 ボディ、コミュニティモデル） |
| `rpi4b-mesh.stl` | STEP → occt テッセレーション（`rpi4-bbox.forge.js` 経由） | checks / fit-assembly の入力 |
| `rpi4b-placed.stl` | `viewer-pi-placed.forge.js` で組付位置に変換 | 共有ビューア表示用 |

## モデルの既知のアーティファクト（実物と異なる点）

- GPIO ピンがプラスチックヘッダなしの裸ピンで、数本が基板端から最大 1.7mm
  外側に開いている（実物のヘッダは基板端の内側に収まる）
- 4 つの取付穴が PCB 厚内で塞がれている（スクリュー貫通の boolean 検証不可）

検証済みの正確な点: 基板外形 85×56、取付穴グリッド 49.03×58.00（公称 49×58）、
PCB 厚 1.6、USB/Ethernet 張り出し 2.85、サイドポート位置（公式図面と一致 ±0.5）。
