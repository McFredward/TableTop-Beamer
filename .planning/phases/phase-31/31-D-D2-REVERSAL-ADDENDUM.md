# D-D2 Reversal Addendum (2026-05-06)

**Status:** BINDING — supersedes the original D-D2 specification in
`31-CONTEXT.md`, `31-RESEARCH.md`, and any conflicting acceptance criteria
in `31-02-PLAN.md`, `31-03-PLAN.md`, `31-05-PLAN.md`. Read this file in
addition to the plans during execution.

**Trigger:** Wave-0 audio-capture smoke test (Plan 31-00 Task 3) escalated
on 2026-05-06. `puppeteer-stream` Chrome-extension throws
`activeTab permission` error on Chrome 131 + headful Xvfb. Three
workarounds (`file://`→`http://`, `executablePath`-resolve, `video:true`)
all failed.

**User decision (2026-05-06):** Plan B — revert D-D2 to Pi-local audio
(researcher's original recommendation).

---

## What changes

### D-D2 New definition

**Audio is Pi-local via WebSocket-Trigger** (NOT in WebRTC stream).

- Animation-Sounds (alarm.mp3, electricity.mp3, etc.) are sent as
  WebSocket events from the server to Pi `/output/`.
- The existing audio binder code path (`src/app/runtime/wire/runtime-wire-room-audio-binders.js`)
  STAYS ACTIVE on Pi `/output/`. It is **NOT** to be deactivated.
- WebRTC stream is **video-only** (no audio track on the Producer or
  Consumer side).
- System UI `audioRoute` toggle remains as a future-feature, default
  `pi-local`. The `in-stream` option is rendered DISABLED with a
  tooltip until/unless puppeteer-stream audio capture stabilizes or a
  cross-platform alternative ships.

### Plan-by-plan implications

#### Plan 31-00 (Wave 0) — RESOLVED

- Task 3 (audio-smoke checkpoint) is RESOLVED via this user decision.
- The `test/ssr-audio-capture-smoke.test.mjs` scaffold STAYS in the
  repo as a future-feature gate. Mark it `t.skip()` with reason "D-D2
  is currently pi-local; in-stream audio deferred until cross-platform
  capture is verified".
- SUMMARY.md must be updated to reflect this resolution.

#### Plan 31-01 (Wave 1) — no change

#### Plan 31-02 (Wave 2) — important changes

- mediasoup Worker creates ONLY video Producer (Opus / audio rtpCapabilities
  are NOT required at the producer side; H264 only).
- Acceptance criterion "Subscriber receives at least 60 video frames within 5s"
  STAYS. Add: "Producer has no audio track / kind=='audio'".
- The signaling endpoint `/api/webrtc/signal` does NOT need to handle audio
  consumer requests. If a client requests an audio consumer, return
  `{ error: "audio not supported via stream — use pi-local audio path" }`.
- in-page mediasoup-client publisher: `getDisplayMedia({video:true, audio:false})`
  — explicit `audio:false`.
- Test scaffold `ssr-webrtc-signaling.test.mjs`: assert `producers.length === 1`
  and `producers[0].kind === 'video'` only.

#### Plan 31-03 (Wave 3) — important changes

- Pi receiver `<video>` element is `muted` by default (since stream has no
  audio anyway, but explicit muted prevents browser auto-mute issues with
  autoplay policies).
- DO NOT comment out or remove the existing audio-binder wiring on
  `/output/`. Specifically: in `runtime-orchestration.js` and bootstrap,
  ensure `runtime-wire-room-audio-binders.js` is loaded and active on
  the receiver-bootstrap code path, even though most of the runtime is
  now stream-only.
- Add to receiver-bootstrap: load `runtime-wire-room-audio-binders.js` so
  WebSocket-driven Pi-local audio still plays.
- Acceptance criterion: trigger an animation with sound from dashboard;
  Pi audio plays via Pi-local-HTML5-Audio path; verify with
  `grep -q 'wire-room-audio-binders' src/app/runtime/output-receiver/receiver-bootstrap.js`.

#### Plan 31-04 (Wave 4) — small changes

- `serverRendering.audioRoute` enum stays as `["in-stream", "pi-local"]`.
- Default value changes from `in-stream` to `pi-local`.
- `validateServerRenderingPatch` accepts both values, but server-side
  logic for `in-stream` is currently a no-op (audio capture deferred).
- Add a comment in the validator: "in-stream audio is deferred — see
  `.planning/phases/phase-31/31-D-D2-REVERSAL-ADDENDUM.md`".

#### Plan 31-05 (Wave 5) — small changes

- System & Performance UI: `audioRoute` toggle.
  - Default: unchecked = `pi-local` (NEW DEFAULT) | checked = `in-stream`.
  - But the `in-stream` option is disabled with tooltip "Currently
    deferred — requires cross-platform audio capture support
    (puppeteer-stream activeTab issue on Chrome 131+)".
  - Implementation hint: render the checkbox with `disabled` attribute
    based on a feature flag `WAVE0_AUDIO_CAPTURE_VERIFIED` that is
    initially `false` and becomes `true` only when audio-capture-smoke
    test passes. Future-proof.

#### Plan 31-06 (Wave 6) — UAT scenario adjustments

- UAT Scenario 6 (Audio + video sync): renamed to
  "Audio plays from Pi-local Audio when triggered". Verifies:
  - Trigger animation with sound from dashboard
  - Audio plays from Pi audio output (jack/HDMI/USB)
  - Audio matches the animation visually within ~100ms (best-effort,
    not strict due to no shared clock)
- UAT Scenarios 12+13 unchanged.
- Add UAT Scenario 15 (NEW): "audioRoute toggle in System UI — flipping
  it does not crash; if `in-stream` is selected, system gracefully
  shows a tooltip/banner indicating the feature is deferred."

---

## Why this preserves publishability

The user's binding constraint is publishability. Pi-local audio:

1. Works on any OS (Linux/Mac/Windows) — server is OS-agnostic.
2. Uses Pi-VC4-Audio-HW directly — efficient.
3. Server has no audio capture concerns — simpler server code.
4. Phase-30 audio-binder code is mature, well-tested.

The original D-D2 (audio-in-stream) had attractive sync properties but
required a Linux-specific audio loopback path that violates publishability.

---

## Test-suite implications

- `test/ssr-audio-capture-smoke.test.mjs`: marked `t.skip()` — scaffold
  preserved for future use.
- `test/ssr-webrtc-signaling.test.mjs`: assert video-only Producer.
- Existing 40/40 tests stay green.
- Pi-local audio path is already covered by Phase-26-h9 + Phase-30
  acceptance — no new tests needed for that.

---

## Tag

This addendum is committed alongside the Wave-0 SUMMARY.md update.
Reference commit will be added below the user's first message confirming
acceptance.
