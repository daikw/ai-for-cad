# arduino-uno-compat — Arduino UNO R3 互換機

## コンセプト

JLCPCB PCBA でそのまま発注できる Arduino UNO R3 互換ボード。
EasyEDA Pro 上に回路図（Schematics）と基板レイアウト（Artwork）を API 経由で作成する。

- ベース: Arduino UNO R3（ATmega328P-AU, TQFP-32, 16 MHz）
- USB-シリアル: CH340C（外付けクリスタル不要）
- USB コネクタ: USB Type-C（CC 5.1 kΩ プルダウン ×2）
- 電源: USB 5 V（ポリヒューズ経由）+ DC ジャック → 5 V LDO、3.3 V LDO 供給
- 基板: 2 層、UNO R3 フォームファクタ（68.6 × 53.4 mm）、シールド互換ピン配置
- 部品: LCSC 在庫あり（可能なら Basic parts）のみ

## ブロック構成

1. **電源**: USB-C VBUS → ポリヒューズ 500 mA → 5V / DC ジャック → AMS1117-5.0 → 5V
   （ショットキー OR 合成）/ AMS1117-3.3 → 3V3 / 電源 LED
2. **MCU**: ATmega328P-AU + 16 MHz クリスタル + 22 pF ×2 + パスコン + AREF 100 nF
   + RESET 10 kΩ プルアップ + リセットスイッチ
3. **USB-シリアル**: CH340C + パスコン、TXD/RXD ↔ MCU RX/TX（1 kΩ 直列）、
   DTR → 100 nF → RESET（オートリセット）、TX/RX LED
4. **I/O**: D13 LED（1 kΩ）、ピンソケット 10+8+8+6（UNO 配置）、ICSP 2×3

## 完了条件（2026-07-03 全達成 ✅）

- [x] 全部品が LCSC 部品番号付きで回路図に配置されている（40 部品）
- [x] 回路図の接続がネットリスト（幾何ベース検証）で意図どおり確認できる（160/160 ピン一致・ERC エラー 0/警告 3）
- [x] 回路図 → PCB 転送済み、UNO フォームファクタの基板外形とピンヘッダ位置が正しい
      （外形 2700×2100mil+45°カット×2、J3: SCL@740..D8@1640 / J4: D7@1800..D0@2500 @y=-100、
       J5: NC@1140..VIN@1840 / J6: A0@1940..A5@2440 @y=-2000、ICSP 2x3 @(2455/2555,-1000..-1200) 全パッド実測一致）
- [x] 配線完了（651 トラック・55 ビア・GND ベタ 2 層）、**DRC 違反 0**（接続エラー 0 含む）
- [x] 保存済みであることを API 再クエリで確認（save→close→reopen→651 トラック再確認）

## 既知の本家 UNO との相違（今後の改善候補）

- VIN の逆接保護ダイオード（本家の M7）を省略
- 取り付け穴（4×M3）未実装
- C4（CH340 の VCC パスコン）が U2 から遠い位置にある
- 下辺 VIN・上辺 D0 の一部トラックが 6mil 幅（外形クリアランス 0.3mm ルールとの両立のため）
- USB-C/DC ジャックは基板端から約 25/90mil 内側（シェル穴の外形クリアランス確保のため）

## 確定 BOM（EasyEDA システムライブラリ 0819f05c4eef4c71ace90d822a990e87）

| 部品 | LCSC | device uuid |
|---|---|---|
| ATmega328P-AU (TQFP-32) | C14877 | d3715ed247e945a4a323d50a26796f96 |
| CH340C (SOP-16) | C84681 | 02aab9e4fdf042e4bd078421b5c79fd2 |
| AMS1117-5.0 (SOT-223) | C6187 | a98fad213dba4a5ca7f94f8371d1931b |
| AMS1117-3.3 (SOT-223) | C6186 | c9e8f680e30a4d3cbde4cfbe9622845b |
| 16MHz クリスタル 3225 (X322516MLB4SI) | C13738 | dba011b143a248829c6d7f11716dc192 |
| 22pF 0603 | C1653 | 953be51a21524c3d92b2400c94f23348 |
| 100nF 0603 | C14663 | a299e4f29fd2469688f76621c3d59c4d |
| 1uF 0603 | C15849 | af2e25dc8e174a11bab66129be592f4d |
| 10uF 0805 | C15850 | e10bc30d72324129a5b7daae4e75f56f |
| 10kΩ 0603 | C25804 | b0602c6e20fc41faa226d9f001a9bead |
| 1kΩ 0603 | C21190 | 2340647df7144fc5a30489ed06518eb5 |
| 5.1kΩ 0603 | C23186 | 5e5266518f0e41f791738aa9f7251c1d |
| 330Ω 0603 | C23138 | 0a9f3a313c9145cf8517fd23769490cb |
| LED 赤 0603 (KT-0603R) | C2286 | 015cbd77079d4b0ea5c81b79fefdcea3 |
| SS34 ショットキー (SMA) | C8678 | 804240ef97df427480be2a5281ccea31 |
| ポリヒューズ 500mA (MF-MSMF050-2) | C17313 | 04225af78e114371a62e9643207f607a |
| リセット SW (TS-1187A-B-A-B) | C318884 | 38630614a58f4650bd5eefe9a5f79d9a |
| USB-C (TYPE-C-31-M-12) | C165948 | 730e76758f9742ca9ca85c73f4ec0ecd |
| DC ジャック (DC-005) | C16214 | d01cbf380da64006bd2828655d637543 |
| 1x10 メスソケット (ESQ-110-14-T-S) | — | 61dce6a33d6d409aa39aaa19fa612997 |
| 1x8 メスソケット (B-2200S08P) ×2 | C124416 | 12f149d39f454ace901ee6a81ebeacd1 |
| 1x6 メスソケット (2.54-1*6P母) | C40877 | 1c9ac7148f5a4088bd660e5a1c49cd3b |
| 2x3 ICSP ピンヘッダ (2.54-2*3P针) | C65114 | b60c8014fa4f46658a127a05a01f80d2 |

## EasyEDA 内リソース

- project uuid: c777d51cbe4a0315dc275bab10f45e25dbc9fcf4eb3124e82daba1f9e0c38f13
  （= sha256("/Users/daikiwatanabe/Documents/EasyEDA-Pro/projects/arduino-uno-compat.eprj")）
- Board1 / schematic 1610780bfa4c5903 / page P1 775c1f59ab7fe5f9 / PCB1 adb61583187709fe
- 発見: ローカルモードの project uuid はファイルパスの sha256。createProject API は
  ローカルモードでは silent fail するため、既存 .eprj をコピー → sqlite で改名 → openProject で作成。

## 作業ログ

- 2026-07-02: プロジェクト開始。bridge (49620) / EasyEDA 接続確認済み。
  ユーザー不在のため推奨構成（UNO R3 / CH340C / USB-C / JLCPCB PCBA）で自律進行。
- 2026-07-02〜03: 全工程を API のみで完遂（画面ロック中のため GUI 操作ゼロ）。
  - 回路図: 40 部品配置 + 160 スタブワイヤ配線、幾何 union-find 検証 160/160、ERC エラー 0。
  - PCB 転送: importChanges の確認ダイアログを DOM click で突破。
  - 配線: FreeRouting headless（118 接続中 113 自動）+ 残り（A5/UDM/UDP/CC1/CC2/VBUS/VUSB/5V 動脈）
    を自作 2 層 A* + 手動レーン設計でルーティング。USB-C 19.7mil 千鳥ピッチは 0.52mm ビアで解決。
  - ベタ: GND 両面 pour（外形から 14mil インセット）、Shift+B 合成キーで再構築。
  - DRC: 66 → 50 → 41 → 27 → 24 → 15 → 8 → **0 violations**。
  - EasyEDA 固有の罠と回避策は ~/.claude/projects/.../memory/easyeda-offline-api-tricks.md に集約。
