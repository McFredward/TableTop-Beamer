# Phase 31 UAT Results — Detailed Log

**Status:** PENDING — to be filled by operator during the manual UAT pass on Pi hardware. Companion document to `31-HUMAN-UAT.md` (which has the structured per-scenario instructions). Use this file for detailed timestamps, raw measurements, and screenshot references.

**Test-Board:** Nemesis Lockdown Board A
**Server:** Lenovo IdeaCentre Mini 01IRH10R, Ubuntu 24.04.4 LTS, Intel Core 7 240H, 32 GiB RAM, Intel Raptor Lake-P iGPU + DRI renderD128
**Pi:** Raspberry Pi 4 (8 GB), VC4-V3D, 5 GHz WLAN
**UAT date:** _<fill on run>_
**Operator:** _<fill on run>_
**Dashboard URL:** http://<server-ip>:4173/
**Pi /output/ URL:** http://<server-ip>:4173/output/
**Boot command:** `cd /home/claw/tt-beamer && SSR_RENDER_HOST=1 SSR_PUBLISH=1 node server.mjs`

---

## Scenario 1 — Cold Boot

**Started:** _<HH:MM:SS UTC>_
**Steps:**
1. Pi powered down ≥30 s.
2. Power on Pi, wait for desktop, navigate to /output/.
3. Stopwatch from URL load to first stream frame visible.

**Measurements:**
- Splash visible: _<ms>_
- First frame visible: _<ms>_

**Result:** _PASS / FAIL_
**Screenshots:** debug/p31-uat-1-splash.png, debug/p31-uat-1-firstframe.png

---

## Scenario 2 — Server Restart Resilience (D-X7 + D-C2 + D-B4)

**Started:** _<HH:MM:SS UTC>_
**Steps:**
1. Trigger room-A alarm.
2. `kill -INT $(pgrep -f 'node server.mjs')` on server.
3. Wait for server exit. Re-launch.
4. Observe Pi.

**Measurements:**
- Disconnect → banner: _<ms>_
- Banner → resume: _<ms>_
- Animation resumed from persistence (D-X7): _<yes/no>_
- Black screen seen: **_NO_** (binding — must be NO)

**Result:** _PASS / FAIL_
**Screenshots:** debug/p31-uat-2-banner.png, debug/p31-uat-2-resumed.png

---

## Scenario 3 — Server Crash (Chromium Tab Kill -9, D-C2 + D-B4)

**Started:** _<HH:MM:SS UTC>_
**Steps:**
1. `pgrep -f 'chromium.*display=' | xargs kill -9` on server.
2. Observe Pi while Plan-01 backoff relaunches the SSR Chromium tab.

**Measurements:**
- Crash → banner: _<ms>_
- Plan-01 relaunch attempts: _<count>_
- Total recovery: _<ms>_
- Black screen seen: **_NO_**

**Result:** _PASS / FAIL_

---

## Scenario 4 — Network Hiccup, Pi WLAN Drop (D-C3 + D-B4)

**Started:** _<HH:MM:SS UTC>_
**Steps:**
1. WLAN OFF on Pi for 5 s.
2. WLAN ON.

**Measurements:**
- WLAN off → banner: _<ms>_
- WLAN on → resume: _<ms>_
- Disconnect reason codes shown in banner: _<e.g. heartbeat-stale, frame-stale>_
- Black screen seen: **_NO_**

**Result:** _PASS / FAIL_

---

## Scenario 5 — Align-Mode Round-Trip (D-D1)

**Started:** _<HH:MM:SS UTC>_
**Steps:**
1. Activate Align Mode on Pi.
2. Drag each of the 4 corners with finger.
3. Save profile.
4. Reload Pi /output/. Verify corners persisted.

**Measurements:**
- Drag → visual update: _<ms>_ (target <200 ms)
- Pitfall 6 SVG ghost visible while dragging: _<yes/no>_
- Persisted after reload: _<yes/no>_

**Result:** _PASS / FAIL_
**Screenshots:** debug/p31-uat-5-pre-drag.png, debug/p31-uat-5-post-drag.png

---

## Scenario 6 — Audio Plays from Pi-Local Audio When Triggered (D-D2 REVERSAL)

**Started:** _<HH:MM:SS UTC>_
**Steps:**
1. Confirm Pi audio output connected and audible.
2. Trigger an animation with sound from dashboard (e.g. alarm).
3. Listen for audio source.

**Measurements:**
- Trigger → audible: _<ms>_ (target ~100 ms best-effort, no shared clock)
- Audio source: _<Pi audio HW / server speakers>_ — must be **Pi audio HW**
- WebRTC video track only (audio tracks length === 0): _<yes/no>_
- `runtime-wire-room-audio-binders.js` loaded on /output/: _<yes/no>_

**Result:** _PASS / FAIL_

---

## Scenario 7 — Multi-Client Stream (D-B2)

**Started:** _<HH:MM:SS UTC>_
**Steps:**
1. Open Pi /output/, dashboard at /, optional tablet at /output/?ssr-preview=1.
2. Trigger animation. Photograph all 3 simultaneously.

**Measurements:**
- Observed drift: _<frames>_ (target <1 frame ≈ 33 ms)
- Identical pixels across 3 clients: _<yes/no>_

**Result:** _PASS / FAIL_
**Screenshots:** debug/p31-uat-7-clients.jpg

---

## Scenario 8 — Phase-12 Layering Contract (A→B == B→A)

**Started:** _<HH:MM:SS UTC>_
**Steps:**
1. Trigger room-A alarm + room-A malfunction in order A→B; screenshot.
2. Stop both. Trigger again in order B→A; screenshot.
3. Compare screenshots.

**Measurements:**
- A→B output matches B→A output: _<yes/no>_

**Result:** _PASS / FAIL_
**Screenshots:** debug/p31-uat-8-AB.png, debug/p31-uat-8-BA.png

---

## Scenario 9 — Phase-19/27 Align Features

**Started:** _<HH:MM:SS UTC>_
**Steps:**
1. Squish bars (Phase-19): _<test result>_
2. Mid-line drag (Phase-27): _<test result>_
3. 4-corner trapezoid (Phase-27): _<test result>_

**Result:** _PASS / FAIL_

---

## Scenario 10 — Bandwidth on 5GHz WLAN

**Started:** _<HH:MM:SS UTC>_
**Steps:**
1. Run sandstorm.mp4 + 3 simultaneous GIFs for 5 minutes.
2. Measure with iftop on server uplink + cat /proc/net/dev on Pi.

**Measurements:**
- Mean fps: _<value>_
- Mean Mbit/s (server uplink): _<value>_
- Mean Mbit/s (Pi RX): _<value>_
- Peak Mbit/s: _<value>_

**Result:** _PASS / FAIL_

---

## Scenario 11 — 30-Minute Soak (M7)

**Started:** _<HH:MM:SS UTC>_

| Time (min) | fps | Server CPU% | Server RAM (MB) | Pi CPU% | Bandwidth (Mbit/s) | Notes |
|-----------|-----|-------------|------------------|---------|--------------------|-------|
| 0  |     |             |                  |         |                    | Boot complete |
| 5  |     |             |                  |         |                    |               |
| 10 |     |             |                  |         |                    |               |
| 15 |     |             |                  |         |                    |               |
| 20 |     |             |                  |         |                    |               |
| 25 |     |             |                  |         |                    |               |
| 30 |     |             |                  |         |                    | End — verify no degradation |

**Verdict:** _STABLE / DEGRADED — <one-line explanation>_
**Result:** _PASS / FAIL_

---

## Scenario 12 — Publishability: UI Encoder Change Auto-Restarts SSR Tab

**Started:** _<HH:MM:SS UTC>_
**Steps:**
1. Open dashboard System & Performance subtab. Confirm `Server-side Rendering` section visible with 5 controls + Detected-encoders badge.
2. Change Encoder dropdown. Status line shows "Restarting render server (encoder change)…". Pi reconnect banner appears within ~5 s.
3. Server logs show `[ssr-host] encoder=<chosen> source=user`.
4. Repeat for Stream-quality preset, Resolution, FPS, Audio route.
5. Reload dashboard. All 5 controls reflect last-set values.

**Measurements:**
- Encoder dropdown persists: _<yes/no>_
- Preset persists: _<yes/no>_
- Resolution persists: _<yes/no>_
- FPS persists: _<yes/no>_
- Audio route persists (note: in-stream toggle disabled): _<yes/no>_
- Encoder restart (banner → resume): _<seconds>_
- Detected-encoders badge contents: _<comma-separated list>_

**Result:** _PASS / FAIL_

---

## Scenario 13 — Publishability: Forced x264-Software Fallback

**Started:** _<HH:MM:SS UTC>_
**Steps:**
1. Stop server. Edit config/global-defaults.json#serverRendering.encoder = "x264-software".
2. Start server. Confirm log: `[ssr-host] encoder=x264-software source=user`.
3. Open Pi /output/. Trigger animation.
4. Smoke-check scenarios 1, 2, 5 on this configuration.

**Measurements:**
- x264-software fps: _<value>_
- Smoke-check 1 (cold boot): _<yes/no>_
- Smoke-check 2 (server restart): _<yes/no>_
- Smoke-check 5 (align mode): _<yes/no>_

**Result:** _PASS / FAIL_

---

## Scenario 14 — Publishability: Software-Only Environment

**Started:** _<HH:MM:SS UTC>_
**Setup choice:** _<(a) test host with no /dev/dri/renderD12x and no nvidia-smi, OR (b) SSR_DISABLE_VAAPI_DETECT=1 SSR_DISABLE_NVENC_DETECT=1, OR (c) different machine with only software h264>_

**Measurements:**
- `[ssr-host] available encoders:` line: _<comma-separated list — must be only `x264-software`>_
- `[ssr-host] encoder=… source=auto` line: _<value>_
- `[ssr-host] qualityPreset=…` line: _<must be `low-latency`>_
- Resolution at boot: _<must be 720p>_
- Mean fps in 5-minute usage test: _<value>_ (target ≥25)
- Pi CPU%: _<value>_

**Result:** _PASS / FAIL_

---

## Scenario 15 — audioRoute Toggle Graceful Disabled-State (D-D2 REVERSAL — NEW)

**Started:** _<HH:MM:SS UTC>_
**Steps:**
1. Dashboard System & Performance → Audio route control.
2. Confirm default UNCHECKED (= pi-local).
3. Hover in-stream option. Read tooltip.
4. Click in-stream option (should be ineffective, HTML disabled).
5. (Defense-in-depth) Force `serverRendering-update` mutation with `audioRoute: 'in-stream'` via DevTools console.

**Measurements:**
- Default = pi-local: _<yes/no>_
- in-stream option disabled: _<yes/no>_
- Tooltip present + correct copy: _<yes/no>_
- Forced patch rejected by validator: _<yes/no>_
- No crash / page remains usable: _<yes/no>_

**Result:** _PASS / FAIL_

---

## D-B4 Disconnect Scenarios — Black-Screen Audit (BINDING)

| # | Scenario | Disconnect cause | UI shown | Black screen seen? |
|---|----------|------------------|----------|---------------------|
| 1 | Server SIGINT | Process terminated | _<reconnect banner reasons>_ | _NO/YES_ |
| 2 | Server tab kill -9 | Chromium crash | _<reconnect banner reasons>_ | _NO/YES_ |
| 3 | WLAN drop | Network outage | _<reconnect banner reasons>_ | _NO/YES_ |
| 4 | Encoder UI change | Forced SSR-tab restart | _<reconnect banner reasons>_ | _NO/YES_ |

All four MUST be NO. If any is YES → D-B4 BINDING violation → fix mandatory before close.

---

## Performance Targets — Final

| Metric | Target | Achieved | Passed? |
|--------|--------|----------|---------|
| Pi /output/ fps (mean over scenario 11) | ≥20 (target 24) | _<value>_ | _<yes/no>_ |
| Operator → pixel latency (median over 5 trigger events) | <150 ms | _<value>_ | _<yes/no>_ |
| Server CPU mean | <80% one core | _<value>_ | _<yes/no>_ |
| Pi CPU mean | <20% (was ~95% Phase 30) | _<value>_ | _<yes/no>_ |
| Bandwidth mean (5-min sandstorm + 3 GIFs) | <8 Mbit/s | _<value>_ | _<yes/no>_ |

---

## Operator Sign-Off

UAT operator: _<name>_
Date: _<YYYY-MM-DD HH:MM UTC>_
Signature / git author: _<email>_
Closure decision: _<close-pass / close-partial / reopen-wave-N>_

After completion, update `debug/p31-acceptance-output.json` so all `PENDING_MANUAL` keys are replaced with `PASS` or `FAIL`, then commit with `docs(31-06-T2): manual UAT results recorded`.

---

*Phase: 31-server-side-rendering-pivot · 31-UAT-RESULTS.md (template) · 2026-05-06*
