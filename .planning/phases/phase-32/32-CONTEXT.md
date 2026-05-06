# Phase 32: SSR Stream Performance + Connection Stability - Context

**Gathered:** 2026-05-06
**Status:** Ready for research + planning
**Mode:** AUTONOMOUS — user is AFK, expects fully self-driven discuss → plan → execute → verify → close with extensive tests proving the fixes.

<domain>
## Phase Boundary

Zwei post-Phase-31 release-blocker, die im Live-Test sichtbar wurden:

**Block A — Stream-FPS-Plateau:** SSR und WebRTC-Stream sind beide bei
~20-25 fps trotz preset-target 30. Das Projekt läuft jetzt auf
deutlich potenterer Hardware (Lenovo IdeaCentre Mini, Intel Core 7
240H, 32 GiB) — der Cap kann nicht legitim sein. Operator-perceived
"real-time" Drag im Align-Mode soll smooth sein. Stream-FPS soll
ausreitzen was Hardware + Netzwerk schafft, mit Operator-konfigurier-
barem Cap in System-Settings.

**Block B — Reconnect-Storm-Regression:** Manchmal nach Server-Cold-Start
reconnected der Pi-Receiver dauerhaft und fängt sich nicht — nur Server-
Restart hilft. Sobald es einmal stabil läuft, läuft es lange stabil.
Storm soll an der Ursache verhindert werden, nicht symptomatisch
gepatcht. Falls trotzdem ein storm losgeht, soll Recovery so schnell
wie möglich automatisch erfolgen.

**Test-Board:** Nemesis Lockdown Board A.

**Trigger:** Phase-31-Hotfix-Welle h24-h26 + h36-h38 hat Reconnect-
Storm einmal stabilisiert (consumer-cap, per-IP cleanup, threshold raise).
Aber bei kaltem Server-Boot bleibt das Problem latent reproducible.
Parallel zeigt h18 dass FPS-lift auf 30 nominell möglich war, aber
unter typischer Last sich auf ~20-25 einpegelte — Codepfade vermutlich
nicht skaliert für > 25 fps Throughput auf der Server-Hardware.

**Annahme:** Server + Pi sind immer im gleichen lokalen LAN
(gigabit ethernet bevorzugt). Keine WAN-Latenz-Annahmen.

**Explizit nicht im Scope:**
- Audio-Pfad (Pi-lokal seit D-D2-Reversal — bleibt).
- Codec-Wechsel weg von H264 (bleibt H264 hardware-gestützt).
- Pi-side Render-Fallback wenn Server unerreichbar.
- WAN/TURN/Internet-Routing.
- Non-Phase-31 architecture revisits.
- Neue Animations-Typen oder Render-Modes.

**Carrying forward (Phase 31 LOCKED, nicht erneut diskutieren):**
- D-A1: WebRTC + h264 + mediasoup
- D-A3: Headful Chromium + Xvfb + puppeteer-stream
- D-A3: 1080p adaptive ↔ 720p
- D-D2-Reversal: Pi-local audio
- Server-authoritative state (Phase 13 + Phase 31 h41/h42)
- `config/global-defaults.json` → `serverRendering` key für persistierte settings
- System & Performance > "Server-side Rendering" UI panel (Phase 31)

</domain>

<decisions>
## Implementation Decisions

### Block A — Stream FPS Lift

- **D-A1: FPS-Ziel = was Hardware + Netzwerk sustainen können.**
  Floor 30 fps (UAT-Pflicht), Ceiling 60 fps (matches publisher's
  `getDisplayMedia` constraint `frameRate: { ideal: 60, max: 60 }` in
  `src/server/ssr-stream-publisher.mjs:174`). Es gibt KEINEN festen
  target — es wird ausgereizt. Falls die Hardware mehr kann, läuft
  sie mehr. Operator wählt cap.

- **D-A2: SSR-fps vs Stream-fps — Decoupling abhängig vom Modus.**
  - **Außerhalb Align-Mode:** gekoppelt OK — kein Sinn mehr Stream-
    Frames zu encoden als gerendert werden (würde nur duplicate
    frames encoden, encoder-budget verschwendet).
  - **Inside Align-Mode:** ENTKOPPELT. Während drag werden Trans-
    formationen kontinuierlich animiert — die müssen smooth sein
    auch wenn die game-state-Animation steady ist. Stream-fps ≥
    SSR-fps in dieser phase.

- **D-A3: Operator-configurable Stream-FPS-Cap in System-Settings.**
  Existing `Server-side Rendering` panel (Phase 31) wird erweitert um:
  - **Stream FPS Cap** Slider/Select: `30 / 45 / 60 / native (= no cap)`
  - **Align-Mode Boost** Toggle: ON (default) — bei aktivem align-
    mode automatisch zu cap-max boosten; OFF — keep regular cap.
  - **Bitrate scaling** läuft adaptive: bei höherer FPS wird bitrate
    proportional gehoben (constraint: 1080p@60 ≤ 16 Mbit/s default —
    LAN-gigabit kann das easy).
  Persistiert in `config/global-defaults.json.serverRendering` key.

- **D-A4: ROOT-CAUSE-FIRST — investigation before patches.**
  User hat explizit gesagt: "Es kann nicht sein, dass es nur 20-25fps
  schafft auf potenter Hardware — schau was verbessert werden kann,
  guck ruhig in die Tiefe." Researcher MUSS zuerst profilen WO der
  cap sitzt:
  - Capture-rate (puppeteer-stream Output-Rate aus headful Chromium
    unter Xvfb — die `frameRate: { ideal: 60 }` constraint kann von
    headful Chromium ignoriert werden auf die Xvfb dpi setting)
  - Encoder budget (x264 software ultrafast preset CPU-usage @ 1080p:
    headroom für höhere fps?)
  - mediasoup output rate (drop frames if encode lags behind input?)
  - Pi h264 decode budget (VC4 V3D @ 1080p@60 — handled?)
  - rAF / paint-throttle in headful Chromium tab (1Hz throttle when
    not visible? CDP `Page.startScreencast` rate?)

- **D-A5: Quality-vs-FPS-Tradeoff = Operator-Choice.**
  Falls Hardware target FPS @ 1080p nicht sustainen kann, gibt es
  zwei adaptive paths:
  - Bei `auto`: drop zu 720p um FPS-target zu halten.
  - Bei `1080p locked`: drop fps-cap.
  Default = auto (FPS wins über resolution für drag-smoothness).

- **D-A6: Hardware-encoder Auto-detection bleibt (Phase 31 D-A4).**
  Falls NVENC/VAAPI verfügbar — automatisch genutzt. Auf der current
  Server-Hardware (Intel Raptor Lake-P iGPU mit Quick Sync) MUSS
  VAAPI evaluiert werden — Phase 31 ist auf x264-software gefallen
  (`source=auto` log zeigt "encoder=x264-software"), das ist die
  primäre Hypothese für den FPS-cap. Researcher prüft VAAPI-Pfad.

### Block B — Connection Stability (Reconnect-Storm)

- **D-B1: ROOT-CAUSE-FIRST — verhindere den storm an der Ursache.**
  User: "Der storm an sich soll verhindert werden, finde die
  Ursachen." Researcher MUSS deterministische repro schreiben für
  cold-boot fail-mode. Hypothesen:
  - Producer-startup race: Pi-receiver versucht `consume()` BEVOR
    SSR-tab seinen Producer registriert hat.
  - DTLS-handshake-deadlock: per-IP cleanup (h38) löscht eine
    ICE-pending connection bevor sie fertig handshaken konnte.
  - Stale state aus vorigem boot: server crashes hinterlassen
    dangling consumer/transport entries die mediasoup blockt.
  - Mediasoup worker-startup race: router not ready bei first
    consumer-attempt.

- **D-B2: Adaptive backoff mit forever-retry.**
  LAN-only — kein give-up. Backoff-schedule:
  `1s → 2s → 5s → 10s → 30s (max)`. Reset auf 1s sobald connection
  ≥ 30s stable. Pi-receiver holds backoff-state across page-reloads
  (sessionStorage).

- **D-B3: Pi-side status overlay (Antwort B2=a).**
  Sichtbarer "RECONNECTING — Xs" overlay auf der /output/ page
  während reconnect-versuche. Verschwindet sobald connection
  ≥ 5s stable. KEIN dashboard-alert (operator nutzt /output/).

- **D-B4: Server-side proactive cleanup beim boot (B3=ja).**
  Defense-in-depth: beim server-start mediasoup worker terminieren
  + neu starten falls eine vorherige instanz noch läuft, alle
  socket connections vom previous run schließen, port-bindings
  fresh. Verhindert dangling-state-cold-boot.

- **D-B5: Producer-readiness gate vor consumer-attempts.**
  Pi-receiver fragt server `/api/ssr/ready` (oder einen WS-event)
  und wartet bis SSR-tab + producer + transport gestartet sind
  bevor erster consume-versuch. Eliminates producer-race-storm.

### Block C — Investigation Targets (Researcher)

- **I-1: FPS-pipeline profile.** Wo sitzt der ~25-fps cap exakt?
  Use CDP performance domain, mediasoup `consumer.getStats()`, Pi
  receiver `videoEl.getVideoPlaybackQuality()`. Quantitative numbers
  before any fix.
- **I-2: Cold-boot reconnect-storm repro.** Schreibe deterministisches
  test-script das den storm reproduziert (multi-restart server-cycles).
- **I-3: VAAPI evaluation.** Auf Raptor Lake-P iGPU — funktioniert
  VAAPI h264-encode? Wenn ja, was ist die fps-Decke?
- **I-4: Pi VC4 h264 decode @ 1080p@60.** Headroom check.
- **I-5: getDisplayMedia output rate.** Liefert puppeteer-stream
  tatsächlich 60fps wie constrained, oder cappt headful Chromium
  unter Xvfb?

### Folded Todos

Keine — Phase 32 entstand aus Phase-31-Carry-over, nicht aus dem
todo-backlog.

### Claude's Discretion

User explicitly delegated full autonomy: "implementiere alles so
selbständig wie möglich und teste ausgiebig". Areas where Claude
decides without further user input:
- Wave/plan structure (researcher → planner figures this out).
- Specific repro-script format.
- Test coverage shape (target: ≥ 30 new tests covering FPS-floor
  + reconnect-storm-repro + recovery-time + producer-readiness gate).
- UI styling of "RECONNECTING" overlay (follow Phase-31 receiver-status-ui
  patterns at `src/app/runtime/output-receiver/receiver-status-ui.js`).
- Default values for new System-settings (FPS cap default, boost on/off).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 31 (foundation — locked decisions, do not revisit)
- `.planning/phases/phase-31/31-CONTEXT.md` — D-A1..D-D4 LOCKED
- `.planning/phases/phase-31/31-SUMMARY.md` — closure with hotfix h12-h46 themes
- `.planning/phases/phase-31/31-FPS-INVESTIGATION-PLAN.md` — prior FPS investigation thread (h17-h18 era)
- `.planning/phases/phase-31/31-D-D2-REVERSAL-ADDENDUM.md` — Pi-local audio binding

### Codebase touchpoints — Stream FPS pipeline
- `src/server/ssr-render-host.mjs` §QUALITY_PRESETS (line ~50) — fpsTarget per preset (currently all 30)
- `src/server/ssr-render-host.mjs` §preset-resolution (line ~91-127) — userFps override path
- `src/server/ssr-stream-publisher.mjs` §getDisplayMedia (line ~162-200) — frameRate constraint, applyConstraints
- `src/server/ssr-mediasoup-router.mjs` — H264 codec config + producer/consumer setup
- `src/server/server-encoder-detect.mjs` — encoder auto-detection (NVENC/VAAPI/x264)
- `src/server/ssr-server-rendering-config.mjs` — serverRendering settings persistence

### Codebase touchpoints — Reconnect / signaling
- `src/server/ssr-webrtc-signaling.mjs` — connection cap, per-IP cleanup (h36-h38)
- `src/app/runtime/output-receiver/receiver-webrtc-client.js` — Pi reconnect logic
- `src/app/runtime/output-receiver/receiver-status-ui.js` — status overlay UI patterns
- `src/app/runtime/output-receiver/receiver-bootstrap.js` — connection bootstrap

### Settings UI
- `src/app/lib/ui/settings/server-rendering-panel.js` — System & Performance > Server-side Rendering panel (Phase 31)
- `config/global-defaults.json` — serverRendering key
- `src/server/ssr-server-rendering-config.mjs` — config validation/persistence

### Test scaffolding
- `test/phase-31-*` — h24-h46 hotfix tests, including reconnect threshold + per-IP cleanup
- `test/ssr-*` — Phase-31 SSR test infrastructure

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`receiver-status-ui.js`** — already has overlay pattern; extend for "RECONNECTING — Xs" countdown.
- **`server-rendering-panel.js`** — settings UI; extend with FPS-cap slider + boost toggle.
- **`ssr-server-rendering-config.mjs`** — config validation; add fpsCap, alignModeBoost fields.
- **`server-encoder-detect.mjs`** — extend with VAAPI evaluation if not already covered.
- **`ssr-webrtc-signaling.mjs`** — h36-h38 cap/cleanup logic; extend with proactive boot-cleanup.

### Established Patterns

- **Live-sync via WebSocket** — settings changes broadcast via `live-session-update` (Phase 31 h30 pattern).
- **Server-authoritative state** — settings live in `config/global-defaults.json`, no per-client localStorage (Phase 13 + h41/h42).
- **Hotfix-style atomic commits** — small, focused, well-documented (h-numbered).
- **Test naming** — `test/phase-32-{slug}.test.mjs`.

### Integration Points

- **System & Performance subtab** — extend existing UI, don't create new tab.
- **`/api/live/command`** — settings mutations go via this endpoint (Phase 13 server-auth pattern).
- **mediasoup router** — single instance, must survive cold-boot cleanly.
- **CDP DevTools protocol** — already used by puppeteer-stream; useful for FPS profiling.

</code_context>

<specifics>
## Specific Ideas

- **"Es kann nicht sein, dass es nur 20-25fps schafft"** — User explicitly
  flags the current cap as illegitimate. The expectation is a measurable
  lift backed by quantitative profiling, not just "we set the cap higher".
- **"Im align-mode hingegen werden die Transformationen auch angezeigt
  und die sollen so smooth wie möglich sein."** — Drag-feedback fluidity
  is the operator-experience goal that justifies the lift work.
- **"Es soll einstellbar sein, welches cap man für die Stream FPS
  einstellt."** — Operator must be able to dial down on weaker hardware
  too; the slider must support both directions.
- **"Der storm an sich soll verhindert werden, finde die Ursachen"** —
  Symptom patches (consumer-cap raise, per-IP cleanup) are not enough;
  this phase must close the root-cause analysis.
- **"so stabil sein, dass es sich so schnell wie möglich wieder fängt"** —
  When recovery is needed, target sub-second perception of failure
  (status overlay) and quick automatic recovery.

</specifics>

<deferred>
## Deferred Ideas

- **Multi-Pi receiver support** — currently single Pi; multi-output deferred.
- **WAN/Internet streaming** — TURN-server out of scope (LAN-only).
- **Codec change to AV1/VP9** — defer until Pi 5 generation.
- **Dashboard reconnect-alert** — explicitly rejected by user (B2=a only,
  Pi-side overlay sufficient).
- **Render-fallback if server unreachable** — defer; Pi shows error overlay
  instead per current Phase-31 design.

</deferred>

---

*Phase: 32-ssr-stream-performance-connection-stability*
*Context gathered: 2026-05-06*
