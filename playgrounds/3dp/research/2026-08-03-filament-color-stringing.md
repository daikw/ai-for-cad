# フィラメント色と糸引き（ヒゲ）・材質特性の調査ノート

調査日: 2026-08-03
調査手段: X 検索（xAI x_search）+ Web 検索 + 一次ソース確認
発端: 「PLA の中でも白がヒゲ（糸引き）できやすい？」という疑問。ラボの Bambu H2D Pro（デュアルノズル）で白 PLA 側のヒゲが目立つ現象の裏取り。

## TL;DR

- 「白 PLA が特に糸引きやすい」という定説レベルの報告は X・コミュニティに**ない**
- 白 = 酸化チタン（TiO₂）顔料入りで挙動が他色と違うのは事実。ただし実証されている固有問題は**ノズル摩耗と脆さ傾向**であり、糸引きではない
- 糸引き・脆さのワーストとして名指しされるのは**シルク・マット・特殊色**
- 糸引きの主犯は色より**吸湿と温度設定**。白は要求温度高め + 吸湿の影響が目立ちやすく、体感的に「白はヒゲる」となりやすい
- デュアルノズルで「白のヒゲばかり」に見えるのは、①白の要求温度の高さ、②**視認性バイアス**（黒地の白ヒゲは全部見える。逆方向の "black bleeding into white" スレも存在）、③白側スプールの吸湿、の合わせ技が有力

## 1. 白 PLA（TiO₂ 顔料）

- TiO₂ 粒径 ~200nm（カーボンブラックの約20倍）。真鍮ノズルを摩耗させる・脆くなる傾向・押出不良の報告（Hackaday PSA + コメント欄）
- 要求印刷温度は高め。温度を上げた結果として糸引きが増える、が一番ありそうな経路
- 一方 CNC Kitchen の実測では引張 68 MPa・層間接着 45–46 MPa で**白は最強クラスの色**。「白＝弱い」は誤り（単一メーカー調査の留保つき）
- X 直接報告: 白黒 PLA でヒゲ（@raahgiken13, 2026-08）はあるが「白だから」と断定するものはなし

## 2. 色ちがい全般の実測データ

| 項目 | 結果 | ソース |
|---|---|---|
| 引張強度（色別） | 白・透明青 68 MPa 最強 / マット黒 60 MPa 最弱（15%差） | CNC Kitchen |
| 層間接着 | 白・赤 45–46 MPa 最強 / 銀・マット黒 31–32 MPa 最弱 | CNC Kitchen |
| 寸法精度 | 黒が全温度域で優位（体積偏差 1.96% vs ナチュラル 5.50%） | PMC9146642 |
| 最適温度帯 | 黒 200–210°C / ナチュラル 210–220°C（**色で違う**） | PMC9146642 |

- カーボンブラックは核形成剤として働き結晶化挙動を変える。黒は温度を上げると強度が単調低下（52→43 MPa）
- マット黒の艶消し添加剤は軽度に研磨性。長期運用は硬化鋼ノズル推奨
- 「顔料が多いほど印刷が難しい」は Ultimaker コミュニティ等で共通見解

## 3. シルク PLA

- **脆さはほぼ総意**。X 日本語圏で「普段揉めてばかりの3Dプリンタおじさんが『シルクPLAは脆い』にだけは全員同意」（@Qto6BshdBJYXdch, 27 likes）。「壊せるサポート材に使えるレベル」
- メカニズム: 光沢用エラストマー系添加剤が層間接着を落とす。標準 PLA 比 10–20% 弱
- 糸引きはブランド差が支配的（Polymaker は糸引きゼロ報告 / 中華激安は糸引きだらけ報告）

## 4. デュアルノズル（H2D 系）固有

- アイドル側ノズルの ooze は**デュアル機共通の物理現象**（Simplify3D / Ultimaker フォーラムの古典的定番回答: ooze shield + prime tower で受ける）
- H2D 既知問題 2 つ:
  1. **ノズル切替時に 20–30mm の糸垂れ**（forum #184824）。色不問。Bambu 公式一時対応 = プライムタワーの **Skip Points 無効化**
  2. **アイドルノズル温度制御の雑さ**（Bambu Studio 2.5.x 以降）: toolchange で inactive 側を heater OFF → 60°C から再加熱時の圧力スパイクで ooze（forum #233923）。逆に印刷温度のまま保持して垂れ続ける報告も（OrcaSlicer issue #11953）
- 日本語 X: 「デュアルノズルでも温度低め（PLA 200°C 程度）が糸引き・ダレに有効」（@monohoshi_blog）

## 5. 対策の定石（優先順）

シングル・共通:
1. 乾燥（糸引きの最大要因は水分。新品スプールでも保証なし）
2. 印刷温度を 5°C ずつ下げる（−10°C まで）
3. リトラクション +0.2mm ずつ（Bambu ダイレクトドライブは 0.4–1.0mm が目安）
4. 色を替えたら温度キャリブレーションはやり直す

デュアル追加:
1. 白スプールを乾燥（切り分けを兼ねる）
2. アイドル側 standby 温度を下げる（180°C 目安、白はさらに −5°C）
3. prime tower 有効 + 必要なら ooze shield
4. toolchange retraction 増
5. H2D: Skip Points 無効化
6. 切り分け: **白と他色を左右入れ替えて印刷** → ノズル起因（左右固有）かフィラメント起因（白についてくる）かが一発で分かる

## ソース

一次・実測:
- Hackaday: PSA — Watch Out For White Filament — https://hackaday.com/2022/12/06/psa-watch-out-for-white-filament/
- CNC Kitchen: How the color of PLA filament influences part strength — https://www.cnckitchen.com/blog/how-the-color-of-pla-filament-influences-3d-printed-part-strength
- MDPI/PMC: Printing Temperature and Filament Color vs Dimensional Accuracy & Tensile Strength — https://pmc.ncbi.nlm.nih.gov/articles/PMC9146642/

フォーラム:
- Bambu forum: Left-to-right nozzle change oozes (H2D) — https://forum.bambulab.com/t/left-to-right-nozzle-change-oozes/184824
- Bambu forum: H2D toolchange forces inactive nozzle to 60°C — https://forum.bambulab.com/t/h2d-dual-toolchange-forces-inactive-nozzle-to-60-c-causes-petg-stringing/233923
- OrcaSlicer issue #11953: H2D Nozzle temperature issues — https://github.com/OrcaSlicer/OrcaSlicer/issues/11953
- Bambu forum: Black filament bleeding into white — https://forum.bambulab.com/t/black-filament-bleeding-into-white/132154/5
- Bambu forum: Different colors = Different Print Quality? — https://forum.bambulab.com/t/different-colors-different-print-quality/26379
- Simplify3D: Unused extruder leaky — https://forum.simplify3d.com/viewtopic.php?t=8407
- Ultimaker: Dual-extrusion oozes — https://community.ultimaker.com/topic/39276-dual-extrusion-oozes-requiring-a-prime-wipe-tower/
- Ultimaker: PLA Color Differences — https://community.ultimaker.com/topic/32530-pla-color-differences-performance-settings/
- Zortrax: Silk PLA layer adhesion — https://forum.zortrax.com/t/the-adhesion-between-layers-of-silk-pla-is-not-strong/13602
- Bambu Wiki: stringing/oozing — https://wiki.bambulab.com/en/filament-acc/filament/print-quality/stringing-oozing

X 投稿（2026-08-03 検索時点）:
- @raahgiken13（白黒 PLA のヒゲ報告, 2026-08-01）
- @Qto6BshdBJYXdch（シルク PLA 脆さの総意, 2026-07-14）
- @GT_Freedom1（シルク PLA = 壊せるサポート材, 2026-07-15）
- @monohoshi_blog（デュアルでも温度低めが有効, 2025-08-13）
- @Mithril_MEX（パージタワー無しの糸引き, 2025-08-16）
- @tack_lime（特殊色の扱いにくさ, 2019-03）
