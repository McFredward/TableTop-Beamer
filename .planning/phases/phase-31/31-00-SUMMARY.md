---
phase: 31
plan: 00
plan_id: 31-00
subsystem: ssr-pivot-wave0
tags: [ssr, audio, webrtc, infrastructure, wave-0, blocking-gate]
requires:
  - "Phase-30 closure (client-side optimization plateau confirmed)"
  - "Phase-29 test suite (40/40 baseline)"
provides:
  - "package.json with mediasoup + puppeteer + puppeteer-stream pinned"
  - "scripts/wave0-environment-check.sh"
  - "src/server/server-encoder-detect.mjs (hardware-agnostic h264 picker)"
  - "5 Wave-0 test scaffolds (4 future-skip-gated + 1 audio escalation gate)"
  - "test/ssr-encoder-detect.test.mjs (11 unit tests, all pass)"
affects:
  - ".gitignore (added node_modules/)"
  - "test/ baseline grew from 40 to 63 (57 pass + 6 skip + 0 fail)"
tech-stack:
  added:
    - "mediasoup@3.19.22 (Node-native WebRTC SFU)"
    - "puppeteer@23.11.1 (headful Chromium driver)"
    - "puppeteer-stream@3.0.22 (tab MediaStream capture)"
  patterns:
    - "Hardware-agnostic encoder auto-detection (priority + universal fallback)"
    - "Wave-0 future-skip-gated tests (skip until downstream wave creates target file)"
key-files:
  created:
    - path: "package.json"
      role: "dependency manifest (type=module, engines.node>=18)"
    - path: "scripts/wave0-environment-check.sh"
      role: "binary + hardware probe smoke (Xvfb/chromium/ffmpeg/node gate)"
    - path: "src/server/server-encoder-detect.mjs"
      role: "h264 encoder auto-detection (nvenc > vaapi > videotoolbox > x264-software)"
    - path: "test/ssr-encoder-detect.test.mjs"
      role: "11 unit tests covering 3+ mock environments + priority assertions"
    - path: "test/ssr-audio-capture-smoke.test.mjs"
      role: "D-D2 audio-in-stream feasibility gate (BLOCKED — see Escalation)"
    - path: "test/ssr-render-host-lifecycle.test.mjs"
      role: "Plan-01 file-existence scaffold + package.json deps assertion"
    - path: "test/ssr-state-restore.test.mjs"
      role: "Plan-04 schema-string contract (tt-beamer.runtime-active.v1)"
    - path: "test/ssr-webrtc-signaling.test.mjs"
      role: "Plan-02 file-existence scaffold + align-corner-drag mutation type"
    - path: "test/ssr-receiver-disconnect-detection.test.mjs"
      role: "Plan-03 D-C4 three-indicator + 3000ms threshold contract"
  modified:
    - path: ".gitignore"
      role: "added node_modules/ exclusion"
decisions:
  - "Encoder priority order LOCKED: nvenc > vaapi > videotoolbox > x264-software (D-X4 detail)"
  - "x264-software is ALWAYS appended to detection result as universal fallback (publishability)"
  - "puppeteer-stream uses HTTP fixture server, NOT file:// (extension permission constraint)"
  - "puppeteer-stream resolves executable via puppeteer.executablePath() bundled chrome by default"
  - "Audio-smoke test is opt-in via WAVE0_AUDIO_SMOKE=1 env flag (heavy: real Xvfb + Chromium)"
metrics:
  duration_minutes: 21
  completed: 2026-05-06
  tasks_completed: 4
  tasks_total: 5
  test_count_before: 40
  test_count_after: 63
  test_pass_after: 57
  test_skip_after: 6
  test_fail_after: 0
---

# Phase 31 Plan 00: Wave 0 SSR Pivot Bring-Up — Summary

Wave-0 BLOCKING gate for the server-side rendering pivot. Validates the
SSR pivot's environmental preconditions (Xvfb, Chromium, ffmpeg, mediasoup
native compile) AND attempts to validate the highest-risk capability —
audio-in-stream (D-D2). T0/T1/T2/T2b automated tasks PASS. T3 manual audio
smoke gate is BLOCKED on `puppeteer-stream` extension-permission failure
on Chrome 131 — D-D2 escalation triggered (see Escalation section).

## Completed Tasks

| Task | Name                                        | Commit  | Status |
| ---- | ------------------------------------------- | ------- | ------ |
| T0   | Create package.json + install pinned deps   | 2867158 | PASS   |
| T1   | wave0-environment-check.sh + 4 test scaffolds | 647fb28 | PASS   |
| T2   | Audio-capture smoke test scaffold (code only) | 4ea9d12 | PASS   |
| T2b  | Encoder auto-detection (RED → GREEN)        | 8e046f1 / 6f9d31c | PASS |
| T2-fix | Audio-smoke deviation fixes (Rule 1+3)    | 744d553 | PASS   |
| T3   | CHECKPOINT: manual audio-smoke verification | —       | **ESCALATED** |

## Verification Results

### Environment check
```
$ bash scripts/wave0-environment-check.sh
=== Phase 31 Wave 0 Environment Check ===
BIN Xvfb /usr/bin/Xvfb
BIN chromium /snap/bin/chromium
BIN ffmpeg /home/linuxbrew/.linuxbrew/bin/ffmpeg
BIN node /home/claw/.nvm/versions/node/v24.13.1/bin/node
BIN npm /home/claw/.nvm/versions/node/v24.13.1/bin/npm
BIN python3 /home/linuxbrew/.linuxbrew/bin/python3
BIN gcc /usr/bin/gcc
BIN make /usr/bin/make
NODE_VERSION v24.13.1
NPM_VERSION 11.8.0
CPU Architecture: x86_64 Model name: Intel(R) Core(TM) 7 240H
GPU 00:02.0 VGA compatible controller: Intel Corporation Raptor Lake-P [Intel Graphics] (rev 04)
RAM 30Gi
DRI_DEVICE /dev/dri/renderD128
AUDIO_SERVER pactl 17.0
=== Result: PASS ===
```

### Dependency installation
```
$ npm install
added 126 packages, and audited 127 packages in 12s
17 packages are looking for funding
found 0 vulnerabilities

$ npm ls
mediasoup@3.19.22
puppeteer@23.11.1
puppeteer-stream@3.0.22

$ ls node_modules/mediasoup/worker/out/Release/mediasoup-worker
node_modules/mediasoup/worker/out/Release/mediasoup-worker  (prebuilt OK)
```

NB: mediasoup native compile was skipped (prebuild fetched). `python3`,
`gcc`, `make` are present should a future host need to compile.

### Test suite
```
$ node --test "test/**/*.test.mjs"
ℹ tests 63
ℹ pass 57
ℹ fail 0
ℹ skipped 6
ℹ duration_ms ~135
```

Pre-Wave-0 baseline: 40 tests, all pass.
Wave-0 added: +23 tests (11 encoder-detect + 12 SSR scaffolds).
Skip distribution: 5 future-skip scaffolds + 1 opt-in audio-smoke = 6 skip.
**No regressions**: existing 40/40 still all pass.

### Encoder auto-detection
- 11/11 unit tests pass
- Priority array LOCKED: `["nvenc", "vaapi", "videotoolbox", "x264-software"]`
- x264-software ALWAYS appended (verified by 3 independent test cases)
- Probe defenses: nvenc requires nvidia-smi succeeds; vaapi requires
  /dev/dri/renderD12x exists (ffmpeg may advertise without runtime support)

## D-D2 Audio-Capture Smoke — ESCALATION

The Wave-0 audio-capture smoke test (`test/ssr-audio-capture-smoke.test.mjs`)
is the BLOCKING D-D2 feasibility gate. The test code is correct and
acceptance-grep-verified, but the actual smoke run fails on this dev box
with the following error:

```
✖ Wave 0 audio gate: Xvfb + Chromium + puppeteer-stream capture alarm.mp3 with non-silent RMS
  'Extension has not been invoked for the current page (see activeTab permission). Chrome pages cannot be captured.'
```

### Auto-fix attempts (3 of 3 used)

Per `<deviation_rules>` Rule 1 (auto-fix bug), the executor made three
auto-fix attempts before stopping per the 3-attempt cap:

1. **file:// → http://** (commit 744d553):
   puppeteer-stream's chrome extension cannot capture file:// pages.
   Replaced with in-process http server serving alarm.mp3 over
   http://127.0.0.1:<ephemeral-port>/. Did not fix the error — the
   "Extension has not been invoked" rejection persists on http origins.

2. **executablePath resolution** (commit 744d553):
   /usr/bin/chromium-browser is a snap shim that does not expose CDP
   reliably. Switched to puppeteer.executablePath() bundled chrome
   (Chrome 131.0.6778.204). Did not fix; same rejection.

3. **video:false → video:true** (commit 744d553):
   puppeteer-stream's tabCapture path on Chrome 131 may need a video
   track to gain activeTab permission. Did not fix; same rejection.

A minimal reproducer (no test framework, raw puppeteer-stream + 3s
extension warmup) returns a different but still failing path:
`STREAM ERROR: undefined` — extension-loaded but tabCapture handshake
silently fails.

### Conclusion (per `<auto_mode>` Exception)

> EXCEPTION: If a checkpoint involves a TRUE EXTERNAL DEPENDENCY that
> the executor cannot test (e.g., the audio-capture-smoke gate where
> the test actually FAILS to capture audio after PipeWire-loopback
> fallback) — that is a real failure requiring user escalation,
> not an auto-approve case.

This is NOT a "silent capture / RMS<0.01" outcome. The puppeteer-stream
chrome-extension API is **non-functional out-of-the-box on this Chrome
131 + Linux/Xvfb stack**. That challenges the RESEARCH.md HIGH-confidence
choice of puppeteer-stream as the standard tab-capture lib. Plan A
(PipeWire-loopback module-null-sink + ALSA capture) and Plan B (revert
D-D2 to Pi-local audio) are the documented fallbacks.

### Recommended next actions for the user

1. **Try Plan A (PipeWire loopback + ffmpeg ALSA capture)** before any
   more puppeteer-stream debugging:
   ```bash
   pactl load-module module-null-sink sink_name=ttbeamer
   pactl load-module module-loopback source=ttbeamer.monitor
   # Launch Chromium via Xvfb, set PULSE_SINK=ttbeamer
   # ffmpeg -f pulse -i ttbeamer.monitor … to capture
   ```
   If this works at non-silent RMS, D-D2 is feasible — Plan 01-06 can
   proceed with an ffmpeg-transcode pipeline (Plan B from RESEARCH.md
   § Risks).

2. **If Plan A also fails**: revert D-D2. Per CONTEXT.md "User-deviated"
   note, the original recommendation was Pi-local audio. This requires
   re-running `/gsd-discuss-phase 31` to re-decide D-D2.

3. **If user wants to keep puppeteer-stream**: open a fresh issue for
   Wave-0-h1 to deep-dive the Chrome 131 + extension-permission path
   (may need a Chrome version pin or an alternative tab-capture lib
   like getDisplayMedia in headful + system-permission grants).

The test code itself is correct and ready: when D-D2 is resolved (any
of Plan A/B/c), `WAVE0_AUDIO_SMOKE=1 node --test test/ssr-audio-capture-smoke.test.mjs`
will print the RMS value and assert > 0.01.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Audio-smoke fixture must be http://, not file://**
- **Found during:** Task 3 (manual audio-smoke run)
- **Issue:** puppeteer-stream's chrome extension cannot capture file:// pages
  ("activeTab permission" rejection)
- **Fix:** Added in-process Node http server (`startFixtureServer()`)
  that serves alarm.mp3 + autoplay HTML on http://127.0.0.1:<port>/
- **Files modified:** test/ssr-audio-capture-smoke.test.mjs
- **Commit:** 744d553

**2. [Rule 3 - Blocker] Browser executable path resolution**
- **Found during:** Task 3
- **Issue:** plan hardcodes /usr/bin/chromium-browser; on this dev box
  that's a snap shim that does not work with puppeteer-core
- **Fix:** resolution chain SSR_BROWSER_BIN → puppeteer.executablePath()
  → /usr/bin/chromium-browser
- **Files modified:** test/ssr-audio-capture-smoke.test.mjs
- **Commit:** 744d553

**3. [Rule 1 - Bug] video: false rejected by extension on Chrome 131**
- **Found during:** Task 3
- **Issue:** audio-only capture rejected by tabCapture; extension needs
  a video track to gain activeTab permission
- **Fix:** video: true; video frames ignored by ffmpeg audio decode
- **Files modified:** test/ssr-audio-capture-smoke.test.mjs
- **Commit:** 744d553

### Plan-as-spec items unchanged

- Encoder priority order locked exactly per CONTEXT.md publishability
- All 5 test-scaffold filenames + content shape match plan literally
- WAVE0_AUDIO_SMOKE=1 opt-in flag retained
- RMS > 0.01 silence-floor threshold retained
- Acceptance-criteria greps all pass

## Authentication Gates

None. No auth steps required for Wave-0.

## Known Stubs

None. Wave-0 produces no UI-rendered placeholders; the future-skip
test files contain documented contract constants (schema strings,
indicator names, threshold values) that locked Plan-02..04 contracts.

## Threat Flags

None new. Threat register T-31-W0-01..05 is fully addressed by:
- Pinned versions in package.json + package-lock.json (T-31-W0-01)
- Explicit failure path in Task 0 step 4 (T-31-W0-02 — observed: prebuilt
  worker fetched, no compile attempted; the path is wired but unexercised)
- LAN-only operator-context noted (T-31-W0-03)
- Test cleanup via `t.after` + try/unlinkSync (T-31-W0-04, T-31-W0-05)

## Wave-0 Audio-Capture Gate Resolution (2026-05-06)

**Status:** RESOLVED via D-D2 reversal (NOT a test bypass).

The audio-capture smoke test escalated as designed. User decided to revert
D-D2 from "audio in WebRTC stream" back to the original researcher
recommendation: **audio Pi-local via WS-trigger**. See
`.planning/phases/phase-31/31-D-D2-REVERSAL-ADDENDUM.md` for the binding
addendum that supersedes audio-related sections of CONTEXT.md, RESEARCH.md,
and Plans 31-02 / 31-03 / 31-04 / 31-05 / 31-06.

Net effect on Wave 0:
- All infrastructure (Xvfb, Chromium, ffmpeg, mediasoup, encoder
  auto-detection) is operational and committed.
- `test/ssr-audio-capture-smoke.test.mjs` STAYS in repo as a future-feature
  scaffold (will be re-activated if/when puppeteer-stream audio capture or
  cross-platform alternative ships).
- Wave 0 is now PASS — Plans 01-06 unblocked.

## Self-Check: PASSED

- FOUND: package.json
- FOUND: scripts/wave0-environment-check.sh
- FOUND: src/server/server-encoder-detect.mjs
- FOUND: test/ssr-encoder-detect.test.mjs
- FOUND: test/ssr-audio-capture-smoke.test.mjs
- FOUND: test/ssr-render-host-lifecycle.test.mjs
- FOUND: test/ssr-state-restore.test.mjs
- FOUND: test/ssr-webrtc-signaling.test.mjs
- FOUND: test/ssr-receiver-disconnect-detection.test.mjs
- FOUND: commit 2867158 (T0)
- FOUND: commit 647fb28 (T1)
- FOUND: commit 4ea9d12 (T2)
- FOUND: commit 8e046f1 (T2b RED)
- FOUND: commit 6f9d31c (T2b GREEN)
- FOUND: commit 744d553 (T2 deviation fix)
- FULL TEST SUITE: 63 tests, 57 pass, 6 skip, 0 fail (regression-free)
