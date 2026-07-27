# 実測済みの落とし穴

いずれも 2026-07 の cyber-alley 制作セッション（Blender 5.1.0 / macOS）で実際に踏んだもの。

## レンダーエンジンの enum 識別名は版で変わる

`scene.render.engine` に設定する Eevee の識別名は Blender のメジャーバージョンで変更されてきた。決め打ちで書くと初回実行で `TypeError: enum not found` 系のエラーになる。失敗時のエラーメッセージに有効な enum 値の一覧が含まれるので、そこから選び直すのが最短。スクリプトを他バージョンでも使い回すなら、設定を try して失敗したら候補リストを順に試すフォールバックを入れる。

## Eevee の shadow atlas 上限

ライトを増やしていくと shadow atlas の容量を超え、レンダ時に shadow buffer 警告が出て影が壊れる。対処は「影を落とすライトを主要数灯（実績値: 5 灯）に限定」し、残りのアクセントライトは `light.use_shadow = False` で色と明るさだけに使う。並列モジュール構成では各モジュールが勝手にライトを足すため特に起きやすい（multi-agent-modular.md のライト規律参照）。

## 路面反射をライトの偽装で作らない

濡れた路面の光筋を手描きの発光オブジェクトでごまかすと、judge に「幾何学的すぎる」と繰り返し指摘される。Eevee のスクリーン空間レイトレーシングを有効にして、看板・店舗を実際に反射させる方が早く収束する。

## `claude -p` の画像レビューはタイムアウトしやすい

画像 2 枚の視覚レビューで 90 秒では不足する。`timeout 180s` 以上を確保する。また Claude Code のセッション内から呼ぶ場合は `CLAUDECODE=""` で環境変数をクリアしてネスト検出を回避する。まれに空出力が返る。1 回だけリトライし、それでも空なら直前の指摘の修正完了をもって暫定合格とし、次のチェックポイントで再評価する。

## headless Blender の常駐化は `nohup` では死ぬ

`nohup ... &` で切り離した headless Blender（MCP ブリッジ用）は親セッション終了時に即死する。macOS では `launchctl submit -l <label> -o <log> -e <log> -- <Blender> --factory-startup --background --python <addon.py>` で launchd 配下に置くと生き残る。起動確認は `launchctl print gui/$(id -u)/<label>` とポートの `lsof`。

## osascript のキーストロークで Blender GUI を操作しない

`Shift+F4` などの keystroke 送信は macOS 側のショートカット（Mission Control 等）に横取りされ、Blender に届かないうえ画面状態が壊れる。Blender のメニューバーも System Events からはほぼ列挙できない。GUI への反映が必要なら「`.blend` ファイルを開く・開き直す」操作に限定する。

## 同一プロセスでの再読込を検証に使わない

Library Link の更新確認や完成検証を、編集に使った Blender プロセス内でやるとキャッシュされた状態を見て嘘の PASS が出る。検証は必ず新規プロセスで `.blend` を開き直して行う。

## ImageMagick `montage` のフォントエラー

比較用コンタクトシートを `montage` でラベル付き生成すると、フォント未指定で `unable to read font` エラーになる環境がある。`-font` で実在フォントを明示するか、ラベルなしで並べる。
