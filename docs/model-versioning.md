# モデルのバージョン管理方針

モデルの発展を「枝」と「バージョン」に分けて管理する。判定基準はひとつ:
**新しい方が古い方を置き換えるならバージョン、並存するなら枝**。

## 3つの層

### 1. モデル（コンセプト）

「何を作るか」の単位。`playgrounds/<dsl>/projects/<model>/` が 1 モデル。
例: parts-tray（部品仕分けトレイ）、pi-pico-case、spherical-drone。

### 2. 枝（branch, `b<N>-<slug>`）

同一コンセプトに対する**別解**。設計アプローチや割り切りが違い、どちらも
生き続けうる（新しい枝が古い枝を廃止しない）。

- ディレクトリで分ける: `playgrounds/<dsl>/projects/<model>/b<N>-<slug>/`
- `<N>` は枝番（生えた順の連番）、`<slug>` は特徴を表す kebab-case
- **枝が 1 本しかないモデルはフラットのまま**（`playgrounds/<dsl>/projects/<model>/` ＝暗黙の b1）。
  2 本目が生えた時点で初めて `b1-<slug>/` に掘り下げる
- 例: `parts-tray/b1-uniform-cells`（均一セル・単体トレイ）と
  `parts-tray/b2-edge-joinery`（可変セル＋エッジ連結）。目的が少し違うので並存

### 3. バージョン（`v<N>` / `v<N>.<M>`）

同一枝内の**改善版**。新しい版が古い版を置き換える（古い版をもう印刷しない）。

- ディレクトリは分けない。同じディレクトリ内で in-place に進化させる
- 履歴は `CHANGELOG.md` に版見出し（`## v9.7 (date) — 要旨`）で残す。
  何を観察してどう直したかを書く（pi-pico-case の CHANGELOG が実例）
- 印刷まで行った版の成果物は `<model>-print-v<N>.stl` / `.gcode` の
  サフィックス付きで保存し、上書きしない（実物と突き合わせるため）
- マイナー修正は `v<N>.<M>`（例: v9.1〜v9.7）

### 番外: パラメータ変種（variant）

同一版のパラメータ違い（装飾パターン、サイズ展開など）。コードは 1 本で、
`Param.choice` ＋薄い `variant-*.forge.js` ラッパーで表現する。
ディレクトリもバージョンも分けない。desktop-trash-bin の装飾 7 パターンが実例。

## 判定フロー

```
コードは同じでパラメータだけ違う？
  YES → パラメータ変種（Param.choice + variant-*.forge.js）
  NO ↓
新しい方が古い方を置き換える？（古い方をもう印刷しない）
  YES → バージョン（in-place + CHANGELOG、印刷版 STL は -vN で保存）
  NO  → 枝（b<N>-<slug>/ ディレクトリ、README/レジストリに並記）
```

## 命名規約まとめ

| 対象 | 形式 | 例 |
|---|---|---|
| モデル | `playgrounds/<dsl>/projects/<model>/` | `playgrounds/forgecad/projects/parts-tray/` |
| 枝 | `b<N>-<slug>/`（2 本目から） | `b2-edge-joinery/` |
| バージョン | CHANGELOG 見出し `v<N>` / `v<N>.<M>` | `## v9.7 (2026-05-26)` |
| 印刷成果物 | `<name>-print-v<N>.stl` | `pi-pico-case-print-v9.stl` |
| パラメータ変種 | `variant-<slug>.forge.js` | `variant-dot-grid.forge.js` |

## 既存モデルの整理（2026-07-03 適用）

| モデル | 枝 | 現行版 | 備考 |
|---|---|---|---|
| spherical-drone | 単枝 | v1 | checks ALL PASS（形状検証） |
| handy-fdm-mini | 単枝 | v1 | HLD に v0〜v3 ロードマップあり（すべて同一枝の版計画） |
| pi-pico-case | 単枝 | v9.7 | 版管理の参照実装（CHANGELOG＋版付き印刷 STL） |
| desktop-trash-bin | 単枝 | v1 | 装飾 7 パターンはパラメータ変種 |
| parts-tray | b1-uniform-cells | v1 | 旧 `parts-trays` |
| parts-tray | b2-edge-joinery | v1 | 旧 `parts-tray-v2`。刻印「PARTS TRAY V2」は方針制定前の歴史的ラベルで、幾何は変更しない（実物と一致させておく） |

「v2」を名乗っていた parts-tray-v2 を枝に再分類した理由: b1 を置き換える改善版
ではなく、可変セル＋連結ジョイントという別解であり、b1（単体・均一セル）と
用途が並存するため。
