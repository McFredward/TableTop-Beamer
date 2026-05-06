---
status: partial
phase: 31-server-side-rendering-pivot
source: [31-VERIFICATION.md]
started: 2026-05-06T09:40:30Z
updated: 2026-05-06T09:40:30Z
test_board: nemesis-lockdown-a
notes:
  - "Pi 4 connected to Test-Board (Nemesis Lockdown Board A) on 5GHz WLAN to the Lenovo IdeaCentre server is REQUIRED."
  - "Boot the full stack via: cd /home/claw/tt-beamer && SSR_RENDER_HOST=1 SSR_PUBLISH=1 node server.mjs"
  - "On Pi: open http://<server-ip>:4173/output/ in Chromium."
  - "After EACH scenario, update debug/p31-acceptance-output.json with the result (PASS/FAIL) and replace the corresponding PENDING_MANUAL key."
  - "D-D2 REVERSAL applied: Scenario 6 RENAMED ('Audio plays from Pi-local Audio when triggered'); Scenario 15 NEW (audioRoute toggle graceful disabled-state)."
---

## Current Test

[awaiting human testing — 15 items]

## Tests

### 1. Cold boot
**setup:** Power Pi down ≥30 s. Power on Pi.
**steps:** Open `http://<server-ip>:4173/output/` in Pi Chromium. Stopwatch from URL load to (a) splash visible (b) first stream frame visible.
**expected:** First TT-Beamer splash visible within 1 s; first stream frame visible within 3 s. No black screen at any time. (D-D4)
**measurements to record:** splash_ms, first_frame_ms.
**result:** [pending]

### 2. Server restart resilience (D-X7 + D-C2 + D-B4)
**setup:** Pi /output/ open and consuming the stream. Trigger one animation (e.g. room-A → alarm).
**steps:** On server: `kill -INT $(pgrep -f 'node server.mjs')`. Wait for server to fully exit. Re-launch with same env vars: `SSR_RENDER_HOST=1 SSR_PUBLISH=1 node server.mjs`. Observe Pi.
**expected:**
- Pi shows reconnect banner within 3 s of disconnect.
- Stream resumes within ~5 s of server back online.
- The triggered animation **resumes from `runtime-active-animations.json` persistence** (D-X7) — not restarted, not lost.
- Black screen seen? **NO** (D-B4 BINDING).
**measurements to record:** disconnect_to_banner_ms, banner_to_resume_ms, animation_resumed (yes/no).
**result:** [pending]

### 3. Server crash resilience — Chromium tab kill (D-C2 + D-B4)
**setup:** Full stack running, Pi consuming stream.
**steps:** On server: `pgrep -f 'chromium.*display=' | xargs kill -9`. Observe Pi while Plan-01 backoff relaunches the SSR tab.
**expected:**
- Pi shows reconnect banner within 5 s.
- Plan-01 exponential-backoff (1 s → 30 s) relaunches the SSR Chromium tab automatically.
- Pi reconnects within the next attempt window.
- Black screen seen? **NO** (D-B4 BINDING).
**measurements to record:** crash_to_banner_ms, relaunch_attempts, total_recovery_ms.
**result:** [pending]

### 4. Network hiccup — Pi WLAN drop (D-C3 + D-B4)
**setup:** Full stack running, Pi consuming stream.
**steps:** On Pi: WLAN OFF. Wait 5 s. WLAN ON.
**expected:**
- Reconnect banner appears within 3 s of WLAN drop (heartbeat-stale or pc-disconnected reason code visible in banner copy).
- Stream resumes within 10 s of WLAN return.
- Black screen seen? **NO** (D-B4 BINDING).
**measurements to record:** wlan_off_to_banner_ms, wlan_on_to_resume_ms.
**result:** [pending]

### 5. Align-Mode round-trip (D-D1)
**setup:** Pi /output/ open. Activate Align Mode on Pi.
**steps:** Drag each of the 4 corners with finger. Observe (a) perceived latency between finger-move and projection-mapped corner update, (b) optional SVG ghost following finger, (c) save persists.
**expected:**
- <200 ms perceived latency (Plan-04 align-corner-drag mutation + Pitfall 6 SVG ghost provides <16 ms local visual feedback while server-rendered frame arrives ~30-150 ms later).
- Save action persists to `config/boards/<id>.json`.
- Reload → corner positions retained.
- Phase-19/27 contract preserved.
**measurements to record:** drag_to_visual_ms (stopwatch), persisted_after_reload (yes/no).
**result:** [pending]

### 6. Audio plays from Pi-local Audio when triggered (D-D2 REVERSAL)
**setup:** Pi /output/ open + connected to Pi audio output (jack/HDMI/USB). Pi audio level audible at the projector area.
**steps:** Trigger an animation that has an associated sound (e.g. alarm, electricity) from the dashboard.
**expected:**
- Audio plays from **Pi audio hardware** (NOT server speakers — D-D2 reversal).
- Trigger → audible: best-effort within ~100 ms (no shared clock; tolerance loose).
- WebRTC stream itself is video-only (verify by inspecting Pi `<video>` element in DevTools: `videoEl.srcObject.getAudioTracks().length === 0`).
- `runtime-wire-room-audio-binders.js` is loaded on /output/ (verify in browser sources panel or `grep -q 'wire-room-audio-binders' src/app/runtime/output-receiver/receiver-bootstrap.js`).
**measurements to record:** trigger_to_audible_ms, video_track_only (yes/no), audio_binder_loaded (yes/no).
**result:** [pending]

### 7. Multi-client stream (D-B2)
**setup:** Pi /output/ open. Open dashboard at `http://<server-ip>:4173/` on a desktop in a separate browser. Optionally a tablet at `http://<server-ip>:4173/output/?ssr-preview=1`.
**steps:** Trigger an animation. Observe all 3 clients side by side.
**expected:** All 3 clients show identical pixels within ~1 frame (~33 ms) drift. (Single mediasoup Producer fanned out to N consumers.)
**measurements to record:** observed_drift_frames, identical_pixels (yes/no).
**result:** [pending]

### 8. Phase-12 layering contract (A→B == B→A)
**setup:** Pi /output/ open.
**steps:** Trigger room-A alarm + room-A malfunction simultaneously (sequence A→B). Stop both. Reverse order on second test (B→A).
**expected:** Both orderings produce identical layered visual output. Phase-12 additive-layering contract preserved through SSR.
**measurements to record:** orderings_identical (yes/no), screenshots saved as `debug/p31-uat-8-AB.png` + `debug/p31-uat-8-BA.png`.
**result:** [pending]

### 9. Phase-19/27 align features end-to-end
**setup:** Pi /output/ open in Align Mode.
**steps:** Test (a) squish bars (Phase-19), (b) mid-line drag (Phase-27), (c) 4-corner trapezoid (Phase-27).
**expected:** All three features work pixel-identically to the pre-pivot Phase-30 baseline. Mesh-warp produced server-side, displayed on Pi `<video>`.
**measurements to record:** squish_bars_ok, mid_line_drag_ok, four_corner_trapezoid_ok (yes/no each).
**result:** [pending]

### 10. Bandwidth on 5GHz WLAN
**setup:** Pi /output/ open. `iftop` running on the server uplink. `cat /proc/net/dev` baseline on Pi.
**steps:** Run with `sandstorm.mp4` + 3 simultaneous GIFs for 5 minutes.
**expected:** Sustained ~30 fps on Pi diagnostic chip. Mean bandwidth measured by iftop on server uplink interface AND Pi RX bytes diff: <8 Mbit/s.
**measurements to record:** mean_fps, mean_mbit_per_s (server), mean_mbit_per_s (Pi), peak_mbit_per_s.
**result:** [pending]

### 11. 30-minute soak
**setup:** Pi /output/ open. Server `top` running. Browser DevTools console on Pi (capture `GL_CONTEXT_LOST` events).
**steps:** Run full mixed scenario for 30 min uninterrupted (animations, align-mode toggles, occasional WS triggers).
**expected:**
- Pi diagnostic chip fps stable >24 throughout.
- Server tab RAM stable ±50 MB (`top` snapshot every 5 min).
- No stream freeze (Pi `<video>.currentTime` continues advancing).
- No `GL_CONTEXT_LOST` browser-console events.
- Audio remains synced with visual (no drift accumulation).
**measurements to record:** Fill the table below at 5 min intervals.

| Time (min) | fps | Server CPU% | Server RAM (MB) | Pi CPU% | Bandwidth (Mbit/s) | Notes |
|-----------|-----|-------------|------------------|---------|--------------------|-------|
| 0  |     |             |                  |         |                    | Boot complete |
| 5  |     |             |                  |         |                    |               |
| 10 |     |             |                  |         |                    |               |
| 15 |     |             |                  |         |                    |               |
| 20 |     |             |                  |         |                    |               |
| 25 |     |             |                  |         |                    |               |
| 30 |     |             |                  |         |                    | End — verify no degradation |

**verdict:** STABLE / DEGRADED — _<one-line explanation>_
**result:** [pending]

### 12. Publishability — UI-driven encoder/resolution/fps change auto-restarts SSR tab
**setup:** Open dashboard at `http://<server-ip>:4173/`. Navigate to Settings → System & Performance subtab.
**steps:**
1. Confirm new `Server-side Rendering` section visible with 5 controls + Detected-encoders badge.
2. Change Encoder dropdown from `Auto` to a value in the Detected list (e.g. VAAPI if detected). Status line shows `Restarting render server (encoder change)…`.
3. On Pi /output/: reconnect banner appears within ~5 s (D-C2 BINDING). Stream resumes within ~5 s with the new encoder active.
4. Server logs show new `[ssr-host] encoder=<chosen> source=user` line at second SSR-tab boot.
5. Repeat for Stream-quality preset, Resolution preference, FPS target, Audio route.
6. Reload dashboard. Confirm all 5 form controls reflect the last-set values.

**expected:**
- All 5 controls render in the System & Performance subtab.
- Each control change persists across dashboard reload.
- Encoder change triggers SSR-tab restart within ~5 s.
- Pi reconnect banner appears (no black screen — D-B4 BINDING holds).
- Detected-encoders badge shows comma-separated list of available encoders.
- No crash, no silent failure.
**measurements to record:** encoder_dropdown_persists, preset_persists, resolution_persists, fps_persists, audio_persists (yes/no each), encoder_restart_seconds, badge_contents.
**result:** [pending]

### 13. Publishability — forced x264-software fallback works even when a hw encoder is available
**setup:** Stop server.
**steps:**
1. Edit `config/global-defaults.json#serverRendering.encoder` to `"x264-software"` (manually OR via Plan 05 UI before stopping).
2. Start server. Confirm `[ssr-host] encoder=x264-software source=user` log line.
3. On Pi /output/: stream comes up. fps may be lower than VAAPI baseline but MUST still produce a usable picture (target ≥15 fps at 720p; ideal 24-30 fps if CPU has headroom).
4. Trigger an animation. Verify it plays end-to-end.
5. Smoke-check resilience: rerun scenarios 1, 2, 5 on this configuration.

**expected:**
- System still produces a working stream with the user-selected fallback encoder.
- Performance is degraded-but-acceptable (fps ≥15, no stream freeze).
- No black screen at any point.
- All 11 baseline scenarios still pass on this configuration (smoke-check: 1, 2, 5).
**measurements to record:** software_fps, smoke_check_1_ok, smoke_check_2_ok, smoke_check_5_ok (yes/no each).
**result:** [pending]

### 14. Publishability — software-only environment (no NVENC, no VAAPI)
**setup:** Simulated by either:
- (a) running on a test host with no `/dev/dri/renderD12x` and no `nvidia-smi`, OR
- (b) setting environment variables that prevent encoder-detection probes (e.g. `SSR_DISABLE_VAAPI_DETECT=1 SSR_DISABLE_NVENC_DETECT=1` if Plan 00's detection module supports them — otherwise temporarily move `/dev/dri/renderD128` aside, OR run on a different machine that has only software h264).

**steps:**
1. Boot server. Expect `[ssr-host] available encoders: x264-software` (only).
2. Expect `[ssr-host] encoder=x264-software source=auto` (auto-pick falls back to software).
3. Expect `[ssr-host] qualityPreset=low-latency` (default per CONTEXT.md when only software is available).
4. On Pi /output/: stream comes up at 720p, target 30 fps, ~4 Mbit/s.
5. Run a 5-minute usage test (trigger animations, drag align-mode corners, restart server).

**expected:**
- Available-encoders list contains ONLY `x264-software`.
- Default preset is `low-latency` and resolution `720p`.
- System produces a usable 720p stream at ≥25 fps.
- All resilience scenarios produce explicit error UI — no black screen.
- Pi CPU usage measured and acceptable for weak-hardware operators.
**measurements to record:** available_encoders_list, default_preset, default_resolution, mean_fps, pi_cpu_percent.
**result:** [pending]

### 15. audioRoute toggle in System UI — graceful disabled-state (D-D2 REVERSAL — NEW)
**setup:** Dashboard System & Performance subtab open.
**steps:**
1. Locate the `Audio route` control. Confirm visual treatment matches D-D2 reversal: default UNCHECKED (= pi-local).
2. Hover over the `in-stream` option. Tooltip should read: "Currently deferred — requires cross-platform audio capture support (puppeteer-stream activeTab issue on Chrome 131+)" or similar.
3. Try clicking the in-stream option. Should be ineffective (HTML `disabled` attribute) — value does NOT change.
4. (Defense-in-depth) Send a forced `serverRendering-update` mutation via DevTools/console with `audioRoute: 'in-stream'`. Server should silently reject (validator returns `{ rejectReason: 'audioRoute-feature-flag-disabled' }` or similar).
5. Confirm no crash, no broken UI state, page remains usable.

**expected:**
- Default audioRoute = `pi-local` (D-D2 reversal new default).
- in-stream option visually disabled; tooltip explains deferral.
- UI flipping does not crash.
- Server-side validator rejects forced in-stream patches while `WAVE0_AUDIO_CAPTURE_VERIFIED === false`.
- No black screen, no console errors.
**measurements to record:** default_pi_local (yes/no), in_stream_disabled (yes/no), tooltip_present (yes/no), forced_patch_rejected (yes/no).
**result:** [pending]

## D-B4 Disconnect Audit Table

Update this table while running scenarios 2, 3, 4, and 12. **All four MUST show "Black screen seen? NO".** Any "YES" is a D-B4 violation requiring immediate hotfix.

| # | Scenario | Disconnect cause | UI shown | Black screen seen? |
|---|----------|------------------|----------|---------------------|
| 2 | Server SIGINT | Process terminated | _<reconnect banner reasons>_ | _NO/YES_ |
| 3 | Server tab kill -9 | Chromium crash | _<reconnect banner reasons>_ | _NO/YES_ |
| 4 | WLAN drop | Network outage | _<reconnect banner reasons>_ | _NO/YES_ |
| 12 | Encoder UI change | Forced SSR-tab restart | _<reconnect banner reasons>_ | _NO/YES_ |

## Performance Targets — Fill After UAT

```json
"performanceTargets": {
  "piFps": { "target": 24, "measured": <avg observed>, "passed": <true/false> },
  "operatorLatencyMs": { "target": 150, "measured": <stopwatch ms>, "passed": <true/false> },
  "serverCpuPercent": { "target": 80, "measured": <top measurement>, "passed": <true/false> },
  "piCpuPercent": { "target": 20, "measured": <Pi top measurement>, "passed": <true/false> },
  "bandwidthMbits": { "target": 8, "measured": <iftop measurement>, "passed": <true/false> }
}
```

Update `debug/p31-acceptance-output.json#performanceTargets` directly.

## Closure Decision Options

After running all 15 scenarios + 30-min soak + recording metrics:

- **CLOSE PASS** — all scenarios PASS, all performance targets met, all D-B4 disconnect checks NO. → Tag `phase-31-end`, update STATE.md + ROADMAP.md to mark Phase 31 CLOSED, plan Phase 32.
- **CLOSE PARTIAL** — D-B4 holds AND scenarios pass functionally, but fps target not met (Phase-30 precedent). → Document deferred fps tuning, tag `phase-31-end-partial`.
- **REOPEN-N** — D-B4 violation OR critical UAT scenario fails. → Return to corresponding Wave for fix. Examples: `reopen-wave-3` (receiver bootstrap), `reopen-wave-4` (align-mode), `reopen-wave-5` (UI/hotfix-gating).

## Summary

total: 15
passed: 0
issues: 0
pending: 15
skipped: 0
blocked: 0

## Gaps

- All 15 scenarios require Pi 4 hardware connected to Test-Board (Nemesis Lockdown Board A) on 5GHz WLAN to the Lenovo IdeaCentre server. Cannot be executed by an automated harness.
- 30-minute soak (scenario 11) is a real-time test that intentionally has no automated equivalent.
- Performance metrics (fps, CPU%, bandwidth) require physical instrumentation (Pi diagnostic chip + server `top` + `iftop`).

---

*Phase: 31-server-side-rendering-pivot · 31-HUMAN-UAT.md · 2026-05-06*
