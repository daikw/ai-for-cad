# 3Dプリント監視 LLM-as-judge 調査レポート

> Codex (gpt-5.5, research preview) によるセカンドオピニオン調査。
> 調査時点: 2026-05-18

結論から言うと、**VLM単体で「中止」を自動実行するのは雑すぎる**。実用ラインは「専用CV/軽量イベント検知で候補を絞る → VLMが理由付きで二次判定 → 連続検知ポリシーで pause」という構成。

## 1. 既存OSS / 商用

**Obico** は現時点の本命に近い。アーキテクチャは、OctoPrint/Klipper側プラグインが **30-60秒間隔** でフレームを取得し、クラウドまたは自ホストのAIエンジンに送り、信頼度が閾値を超えたら通知または自動pauseする流れ。モデルはCNN系で、spaghetti、detachment/warp、layer shift、nozzle blob を対象にしているが、clog、minor stringing、早期失敗は弱いと明記されている（[Obico AI detection](https://www.obico.io/blog/how-obico-ai-failure-detection-works/)）。自ホストでは `ml_api` コンテナがあり、Darknet/ONNX、GPU/CPU fallback の構成（[Obico GPU docs](https://www.obico.io/docs/server-guides/advanced/nvidia-gpu/)）。
重要なのは、Obicoですら「一枚画像の魔法」ではなく、閾値・履歴・ユーザーfeedbackで現実に寄せている点。

**PrintWatch / PrintPal** は商用寄りで、カメラ映像をクラウドMLに送り、欠陥が悪化するかを追跡してから停止・ヒーターOFF・通知などを行う思想（[PrintWatch release](https://printwatch.printpal.io/documentation/printwatch-official-release/)）。サイト上では 93% accuracy、5ms inference を主張しているが、これはマーケ文脈なので、そのままK1 Maxでの実効性能とは見ない方がいい（[PrintWatch](https://printwatch.printpal.io/)）。

**OctoEverywhere Gadget** はObicoに近いクラウド型で、webcam feedを監視し、通知または自動pauseを行う。公開ページでは adhesion/layer/shell issue、blob、spaghetti feedback分類、1日300万枚超の画像処理をうたっている（[Gadget](https://octoeverywhere.com/gadget)）。Klipper/Mainsail/Fluidd対応はあるが、Creality K1 Max stock firmwareにそのまま刺さる話ではない。

**Mainsail/FluiddのAI plugin** というより、実態は Obico や OctoEverywhere が Moonraker/Klipper側に入り、Mainsail/Fluidd UIへ乗る形（[Fluidd Obico guide](https://docs.fluidd.xyz/configuration/obico_for_remote_access), [OctoEverywhere Klipper](https://octoeverywhere.com/klipper)）。

**PrintGuard / Edge-FDM-Fault-Detection** は2025年以降の面白いOSSで、few-shot/prototypical network系のエッジ向け故障検知。ただしこれもVLM-as-judgeではなく、専用CV分類器（[Edge-FDM-Fault-Detection](https://github.com/oliverbravery/Edge-FDM-Fault-Detection)）。

**純粋にVLMへ画像を投げるOSS** は、ターンキー製品としてはまだ薄い。研究では **LLM-3D Print** があり、層またはセグメント完了後に画像をLLMへ渡し、failure modeを特定し、プリンタパラメータを取得・修正する構成を示している（[arXiv](https://arxiv.org/abs/2408.14307), [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2214860425003926)）。ただしこれは研究プロトタイプで、K1 Maxの長時間監視を無人で任せるOSSではない。

## 2. アーキテクチャパターン

Creality K1 Max stock firmwareなら、mjpg-streamerの **1280x720 / 約9Mbps** をAPIへ流し続けるのは論外。`?action=snapshot` が取れるなら snapshot、無理ならOpenCVでstreamから間引き、JPEG 70-85%、必要ならROI cropにする。

推奨サンプリング:

| フェーズ | 間隔 | 目的 |
|---|---:|---|
| heating / homing | 判定しない | 無駄 |
| first layer, 最初の5-10分 | 10-15秒 | adhesion / first layer / clog兆候 |
| 安定印刷 | 60-90秒 | spaghetti / shift / support collapse |
| 差分急増・前回caution後 | 15-20秒を3回 | 誤検知確認 |
| layer/Z変化が取れる場合 | layer完了直後 | 比較しやすい |

VLMは、**single-shotより直前フレーム比較** がいい。最低でも `t-120s`, `t-60s`, `current` の3枚、可能なら差分サムネイルも渡す。layer shift、warp、support倒壊は一枚だけだと「そう見える」に落ちやすい。

VLM候補:

| 種類 | 候補 | 評価 |
|---|---|---|
| 安いクラウド | Gemini 3.1 Flash-Lite | 入力 $0.25/1M token、画像対応。高頻度監視向き（[Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)） |
| 高品質クラウド | Claude Sonnet/Opus | 画像の扱いは堅いが高い。Claudeは画像tokenを `width*height/750` 目安で計算し、Sonnet 4.6は $3/1M input（[Claude vision](https://platform.claude.com/docs/en/build-with-claude/vision), [pricing](https://platform.claude.com/docs/en/about-claude/pricing)） |
| ローカル | Qwen2.5-VL 3B/7B | bbox/JSON/動的解像度が強い。3Bはedge候補、7BはGPU推奨（[Qwen2.5-VL](https://qwenlm.github.io/blog/qwen2.5-vl/), [paper](https://arxiv.org/abs/2502.13923)） |
| ローカル強め | InternVL3 / 3.5 | 強いが重い。家庭用常時監視にはやや過剰（[InternVL3](https://arxiv.org/abs/2504.10479), [InternVL3.5](https://arxiv.org/abs/2508.18265)） |
| 旧定番 | LLaVA | 実験用。今から本命にする理由は薄い（[LLaVA](https://github.com/haotian-liu/LLaVA)） |

## 3. LLM-as-judge プロンプト設計

プロンプトは自由文で聞くな。JSON固定にする。

```text
あなたはFDM 3Dプリント監視の判定器。
画像に見える証拠だけで判定する。見えない原因を断定しない。
不確実なら severity を一段下げる。

出力はJSONのみ:
{
  "verdict": "normal|caution|pause",
  "failure_modes": ["warp","spaghetti","layer_shift","bed_adhesion","first_layer","nozzle_clog","support_collapse","blob","unknown"],
  "confidence": 0.0-1.0,
  "evidence": ["画像中の位置と観察事実"],
  "uncertainty": ["見えない/判断不能な理由"],
  "recommended_action": "log|notify|resample|pause"
}
```

渡す context はこれで十分:

```json
{
  "printer": "Creality K1 Max stock",
  "phase": "first_layer|printing|finishing",
  "progress_pct": 12.4,
  "elapsed_sec": 1830,
  "nozzle_temp": 220,
  "bed_temp": 60,
  "last_verdicts": ["normal", "caution"],
  "camera_note": "fixed side/front view, 1280x720 mjpg-streamer",
  "instruction": "Compare previous frames with current. Do not punish normal supports/infill."
}
```

hallucination 抑制は「画像に見える証拠だけ」「通常の support/infill を spaghetti 扱いしない」「bbox/位置を言わせる」「不確実なら resample」に寄せる。信頼度はモデルの気分なので、そのまま止めない。

## 4. 意思決定ポリシー

自動操作は `stop` より `pause` が基本。いきなり stop は FP 時の損害が大きい。

| 条件 | アクション |
|---|---|
| normal | JSON ログのみ |
| caution 1回 | ログ、次回を15秒後に早める |
| caution 3/5回 | Slack通知、画像添付 |
| pause 2連続 | `print_k1.pause()` |
| spaghetti / detached / support_collapse 高信頼 2連続 | 即 pause + Slack |
| first layer で adhesion/first_layer 高信頼 2/3回 | pause、再開は人間判断 |
| pause 後 10分無応答か blob がヘッド巻き込み疑い | stop 検討 |

GitLab issue はリアルタイム通知ではなく、失敗確定後の事後記録でいい。Slack は `caution` 以上、プリンタ操作は `pause` だけに絞るのが現実的。

## 5. 2025-2026 の state of the art

商用実装はまだ **専用CVモデル + 閾値 + feedback loop** が主流。Obico の 2nd-gen や First Layer AI もその方向で、VLM 汎用推論ではない（[Obico](https://www.obico.io/blog/how-obico-ai-failure-detection-works/)）。

研究側では **LLM-3D Print** が「VLM/LLM が画像を見て、原因推定し、パラメータ修正まで行う」方向を示した。ただし、層ごとに止めて撮影する設計で、家庭用プリンタの常時監視とは運用が違う（[LLM-3D Print](https://arxiv.org/abs/2408.14307)）。

OSS/GitHub では PrintGuard のようなエッジ専用分類器の方が実装に近い。VLM は賢いが遅く、コストがあり、キャリブレーションが甘い。**2026 時点の実用品は「専用 CV を主、VLM を説明付き二次判定」**。

## 6. 自分が実装するなら

構成:

```text
mjpg-streamer
  -> frame sampler / ROI crop / JPEG encode
  -> cheap motion/diff gate
  -> VLM judge(JSON)
  -> policy state machine
  -> print_k1.py pause/stop/status
  -> logs + Slack + artifacts
```

擬似コード:

```python
from collections import deque
from time import sleep, time

frames = deque(maxlen=5)
verdicts = deque(maxlen=5)

def loop(printer, vlm, notifier):
    last_sample = 0
    while True:
        st = printer.status()  # print_k1.py: state/progress/temp/etc.
        if st["state"] not in {"printing", "paused"}:
            sleep(5)
            continue

        interval = choose_interval(st, verdicts)
        if time() - last_sample < interval:
            sleep(1)
            continue

        frame = capture_jpeg("http://K1_IP:8080/?action=snapshot")
        frame = preprocess(frame, resize=(960, 540), crop_roi=True)
        frames.append(frame)
        last_sample = time()

        if not should_call_vlm(st, frames, verdicts):
            continue

        result = vlm.judge(
            images=list(frames)[-3:],
            context={
                "printer": "Creality K1 Max stock",
                "progress_pct": st.get("progress"),
                "elapsed_sec": st.get("elapsed"),
                "nozzle_temp": st.get("nozzle_temp"),
                "bed_temp": st.get("bed_temp"),
                "phase": infer_phase(st),
                "last_verdicts": list(verdicts),
            },
        )
        verdicts.append(result)

        action = policy(result, verdicts, st)
        log_json(result, st)

        if action == "notify":
            notifier.slack(result, frame)
        elif action == "pause":
            printer.pause()
            notifier.slack(result, frame, urgent=True)
        elif action == "stop":
            printer.stop()
            notifier.slack(result, frame, urgent=True)
```

コスト試算: 5 時間ジョブ、first layer だけ高頻度、以後 60 秒、合計 340 回判定:

| モデル | 仮定 | 概算 |
|---|---|---:|
| Gemini 3.1 Flash-Lite | 画像+prompt 1.8k input、300 output、340回 | 約 $0.30/job |
| Claude Sonnet 4.6 | 画像込み約 2k input、300 output、340回 | 約 $3-4/job |
| ローカル Qwen2.5-VL | GPU 電気代のみ、ただし初期調整が重い | API 費用 $0 |

最初の実装は **Gemini Flash-Lite 相当の安い VLM でログ運用 → 30 ジョブ分ラベル付け → 閾値調整 → pause 解禁** がいい。いきなり自動停止まで行くのは、技術ではなく運用設計が甘い。
