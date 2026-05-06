# Phase-31 FPS Investigation Plan — 21 fps cap → 30 fps minimum

**Created:** 2026-05-06
**Status:** Investigation
**Goal:** identify and remove the 21-fps cap so the WebRTC stream sustains
≥30 fps end-to-end on any reasonable server, regardless of receiver hardware.
**Acceptance:** chip shows STREAM ≥30fps AND SSR ≥30fps for ≥60s on
the developer's workstation (strong server) AND a dual-core x86 laptop
(weak server). Pi-class receiver does not need to hit 30 fps locally —
it just consumes the stream — but its diagnostic chip must report
≥30 fps inbound.

---

## What we know now (h17 evidence)

- User reports: "ssr und stream both capped ~21 fps" on a server with
  strong hardware (the developer's workstation).
- Stream encoder is `x264-software` (no VAAPI encoder currently auto-
  detected → fell through to software) at preset `low-latency`,
  bitrate 4 Mbps, fpsTarget 30.
- The h15 GIF-fix is unrelated (same fps before/after).
- The h17 diagnostic overlay now exposes the seven downstream
  measurements we need to triangulate the bottleneck. Re-run and read
  the chip in this exact order:
  1. **SSR fps** (rAF rate inside the SSR Chromium tab)
  2. **STREAM fps** (frames decoded per second on the receiver)
  3. **encoder + preset + target bitrate** (server config)
  4. **decoder impl** (FFmpeg/HW decoder on the receiver)
  5. **rtt / jitter** (network)
  6. **drops / loss** (transport quality)
  7. **GPU renderer** (SwiftShader/llvmpipe vs iGPU vs discrete)

If two metrics drop in lock-step we know which side caps the pipeline:
- SSR=21 + STREAM=21 → bottleneck is upstream of capture (page render
  rate or capture rate).
- SSR=60 + STREAM=21 → bottleneck is between capture and consumer
  (encoder, transport, decoder).

---

## Hypothesis tree

The pipeline has **6 fps clamps** in series. Whichever is lowest wins:

```
[1] page render rate (rAF in /output?ssr=1)
       ↓ (clamped by Chromium occlusion / vsync / GPU schedule)
[2] tab capture rate (getDisplayMedia frameRate constraint)
       ↓ (clamped by chrome.tabCapture rate or compositor)
[3] simulcast encoder rate (mediasoup-client → libwebrtc → x264-software)
       ↓ (clamped by CPU encode budget at chosen preset/bitrate)
[4] mediasoup transport rate (no clamp, just queueing)
       ↓
[5] receiver decode rate (browser h264 decode, RTCInboundRtp framesDecoded)
       ↓ (clamped by HW decoder availability or CPU)
[6] receiver paint rate (videoEl frame rate)
```

For **SSR=21, STREAM=21, target=30**, my prior is the cap is at [1] or
[2] — both metrics tracking each other means the page or capture is
the source. The candidates, ranked by likelihood given current evidence:

### H1: Chromium occlusion-throttle still applies (~67% likely)

Even with `--disable-renderer-backgrounding`, `--disable-features=
CalculateNativeWinOcclusion,IntensiveWakeUpThrottling,BackForwardCache`
and `--disable-frame-rate-limit`, Chromium's BeginFrameSource under
Xvfb still falls back to ~20 Hz when the kernel-side window manager
doesn't report visibility events. In h15 we MERGED the doubled
`--disable-features` so anti-throttle defenses now actually apply,
which may have already helped — but a fresh smoke run with the
extended overlay will tell us SSR fps directly.

**Disambiguation experiment:** add a `--max-gum-fps=60`-style probe by
injecting a `setInterval(() => document.title = ...)` "wake" loop in
the SSR tab. If wakes pump fps from 21 → ~60, we have direct proof of
occlusion throttle (and the fix is more aggressive flags or a real
window-manager).

### H2: getDisplayMedia tab-capture rate is the cap (~20% likely)

Chromium's `chrome.tabCapture` API is the substrate for
`getDisplayMedia({preferCurrentTab})`. The cap was 30 fps in older
Chromium versions; it's currently configurable but the tab being
captured must paint at ≥cap for it to achieve cap. `applyConstraints
({frameRate: {ideal:30, max:60}})` should lift it but may silently
cap when the tab capture pipeline lacks GPU acceleration.

**Disambiguation experiment:** swap `getDisplayMedia` for the
`chrome.tabCapture` extension API (puppeteer-stream's existing path)
and compare. Or measure RTCRtpSender.getStats() framesPerSecond at the
sender to compare to receiver's framesDecoded.

### H3: x264-software encode budget at 1080p (~10% likely)

The encoder is `x264-software` at preset `low-latency` (= x264
`ultrafast`) targeting 4 Mbps at 1920×1080. On a strong workstation
that should comfortably hit 30+ fps, but if simulcast is producing
three layers (low/mid/high), the CPU cost triples. Logs show:

```
[ssr-host] qualityPreset=balanced bitrate=8000000 fpsTarget=30
[ssr-host] encoder=x264-software source=auto
```

Server picked `balanced` (8 Mbps, x264 `veryfast`) → potentially
heavier than `low-latency`. If the SSR fps is ≥30 but stream fps is
21, this is the cap.

**Disambiguation experiment:** check `decoderImplementation` and
sender-side stats. Drop simulcast to single layer.

### H4: VAAPI not detected → software encode unnecessarily (~3% likely)

If `/dev/dri/renderD128` is present but our encoder probe didn't pick
VAAPI, we burn CPU on x264 instead of the iGPU. Probe is brittle —
the user's `inxi` output earlier showed Intel iGPU with `i915` driver
which is VAAPI-capable. If VAAPI is missing from `availableEncoders`,
the probe is the bug.

**Disambiguation experiment:** read `serverInfo.availableEncoders`
from the new diagnostic chip; check `vainfo` on the host shell.

---

## Investigation procedure

Phase A: **measure** (no code change)

1. Boot SSR with extended overlay.
2. Open `/output/` on the receiver (Pi or workstation).
3. Wait 30 s for warmup, GIF preload, and stats to stabilize.
4. Read the 6-line overlay. Record:
   - SSR fps, STREAM fps, ENCODE encoder/preset/bitrate, RTC rtt/jitter,
     decoder impl, GPU renderer, drops/loss.
5. Compute: which clamp is binding?

Phase B: **disambiguate** (one-line code probes)

For each hypothesis still alive after Phase A, add a single CDP probe
or one-flag toggle and re-measure. Each iteration is ≤10 minutes.

Phase C: **fix** (whichever hypothesis has the strongest evidence)

| Hypothesis | If confirmed, fix |
|------------|-------------------|
| H1 occlusion | Inject a "wake" timer in SSR tab; consider page-visibility-API spoof; investigate `--ozone-platform=x11` instead of `--ozone-platform=headless`. |
| H2 tabCapture | Increase capture frameRate explicitly; verify `applyConstraints` is taking effect via getSettings(); fall back to `chrome.tabCapture` direct API. |
| H3 x264 budget | Switch preset to `low-latency` (x264 ultrafast), drop simulcast to single-layer 720p, or pre-bake VAAPI hint flags. |
| H4 VAAPI miss | Repair encoder-detect probe to actually inspect /dev/dri + vainfo. |

Phase D: **verify** with the regression tests already in place
(getStats poll, formatter assertions) plus a new one that spins a real
puppeteer Chromium and asserts inbound-rtp framesPerSecond ≥ target.

---

## Why not just "set fps to 60 everywhere"

The pipeline has six independent fps controls — overshooting one
without the others wastes resources without lifting actual delivered
fps. The user explicitly framed the goal as "30 fps minimum on weak
hardware too," which means the bottleneck-removal must be principled:
identify the cap, lift exactly that one, re-measure, repeat. Random
flag mutation is what got us into the doubled-`--disable-features`
mess in h15.

---

## Out of scope

- Changing video codec (h264 → AV1) — receiver decoder support is
  not universal (Pi can't decode AV1 in HW).
- Adopting a different streaming framework (LiveKit, Janus) — same
  underlying pipeline, same cap candidates.
- Increasing bitrate above the user's network LAN budget (~12 Mbps
  available per the diagnostic chip's `avail=` field).

## Done when

- SSR ≥ 30 fps for ≥60 s in extended overlay.
- STREAM ≥ 30 fps for ≥60 s.
- One regression test asserting both, run via the existing
  `npm test` script.
- All four hypotheses from §"Hypothesis tree" have a documented
  outcome — confirmed cause, definitively excluded, or "still
  potential cap on weaker hardware, monitor."
