# ROADMAP

## Direction
Liefere zuerst einen stabilen Vertical Slice fuer OG-Nemesis (Phase 1), erweitere danach auf wiederholbaren Session-Betrieb mit Profilen und Datenzonen (Phase 2), halte den Runtime-Operator-Flow in Phase 4 bewusst preview-frei, fuehre in Phase 5 einen serverautoritativen Multi-Device-Livebetrieb mit dediziertem Final-Beamer-Output ein, generalisiere in Phase 6 auf boardspiel-agnostischen Betrieb mit englischem Operator-Flow, haerte in Phase 7 die Multi-Device-Synchronisation fuer deterministisches Low-Latency-Verhalten auf allen Clients und fokussiere in Phase 8 Multi-Play-Area-Support plus boardseitigen Bildupload-Import sowie ein verpflichtendes Outside-/Inside-Animationspaket inklusive priorisierter P0-Wellen fuer Outside-Regressionen, Final-Output-Fullscreen-Fit, Boomerang-Entfernung mit Inside-Editor-Paritaet, HF8 (Outside-mp4-Restore/conditional-visibility/Apply-only-UX), HF9 (lifecycle-stabiles Outside-mp4 + strict conditional unmounting), HF10 (deterministische mp4-Sichtbarkeit plus nahtloser Loopbetrieb ohne Replay-Break/Black-Frame/Gap), HF11 (definitionsgetriebene Room-Animationen fuer alle Typen + first-start Default-Autoload mit explizitem Reset-Button-Flow) und HF12 (Room-Editor Unified-Speed-Refinement ohne dedizierten GIF-Speed-Slider sowie Opacity-Paritaet inkl. mp4); Phase 9 priorisiert danach erst die umfassende Refaktorierung von `src/app.js` in modulare Domaenengrenzen, dann die verpflichtende Stabilitaets-Hotfix-Welle fuer lifecycle-correct rehydrate/no-replay expired events und low-end load hardening, gefolgt von einem verpflichtenden P0-Hotfixpaket fuer cross-browser Polygon-Mapping, `/output/final` mixed-media lifecycle integrity, weak-hardware `mp4` performance controls und explizites Fehlerfeedback ohne silent no-op, plus einem neuen verpflichtenden P0-Follow-up fuer strict outside-sandstorm lifecycle independence ohne restart durch room/cluster/global starts; Phase 10 fokussiert anschliessend einen speed-first Operator-UX-Track mit Settings-Subtabs, robusten one-handed mobile Rails und expliziten tap-gesteuerten Quick-Modes (`activate`/`deactivate`/`clear`), gefolgt von P0-Hotfixes fuer fail-open final compositor (10-HF1), multi-area schema hydration (10-HF2), shared polygon hydration parity (10-HF3), runtime panel observability/final-blackout-parity (10-HF4), multi-area precedence/fallback override (10-HF5), canonical multi-area retention ueber save/defaults/import (10-HF6), extraction decoupling + startup/reload retention (10-HF7), strict canonical play-area resolution ohne fallback override (10-HF8) sowie command reliability/performance hardening (10-HF9); Phase 11 implementiert danach verpflichtende UX-Korrekturen (outside-apply first-click, global expired event replay guard, dashboard global per-trigger loop toggle), board storage unification (11-HF1), global runtime recovery (11-HF2) und full-duration playback recovery plus per-trigger audio toggle (11-HF3), bevor operator ergonomics refinements folgen.

## Phase 11 - UX Operation Acceleration + Mobile Parity (CLOSED PASS)
Ziel: Schneller Operator-Betrieb auf Desktop + Mobile durch tap-gesteuerte Raumanimationen (Quick-Modes), strukturierte Settings-Gliederung, gesicherte Einhandbedienung sowie deterministische first-apply Sync-Pfade und per-trigger Loop/Audio-Steuerung.

Status: Plan 11-1 (12/12 Tasks), Plan 11-HF1 (12/12 Tasks), Plan 11-HF2 (8/8 Tasks), Plan 11-HF3 (7/7 Tasks), Plan 11-HF4 (7/7 Tasks), Plan 11-HF5 (8/8 Tasks) und Plan 11-HF6 (8/8 Tasks) sind implementiert. Plan 11-2 ist nach HF6 PASS wieder freigegeben.

Milestones:
1. M1 UX Operation Flow: tabellarische Settings + mobile one-handed rails + tap-gesteuerte Quick-Modes.
2. M2 HF1 Recovery Package: outside sync first-click, loop-checkbox in globals, expired-event replay guard, room hold unification, board storage consolidation.
3. M3 HF2 Recovery Package: global animations runtime fix, per-trigger loop choice in dashboard.
4. M4 HF3 Recovery Package: global one-shot full-duration fix (~4s), per-trigger audio choice in dashboard.
5. M5 HF4 Recovery Package: non-loop global final-output suppression root-cause fix with one-shot full-duration exactly-once parity.
6. M6 HF5 Recovery Package: non-loop global initiator-only desync closure via server-authoritative exactly-once multi-client replication.
7. M7 HF6 Recovery Package: polling/hydration-safe seen-once full-duration one-shot playback contract with explicit-cancel-only guard.

Exit Criteria:
- Any client that sees a non-loop trigger revision completes exactly one full-duration local playback.
- Polling snapshots do not prematurely cancel started one-shot playback without explicit stop/clear revision.
- Loop-mode behavior plus global stop/clear semantics remain non-regressed.
- Deterministic multi-client polling seen-once full-playback parity (initiator + peers + `/output/final`) has explicit FAIL->PASS evidence.
- All artifact and regression matrices are PASS.

Execution Update (11-HF4):
- Completed: non-loop global suppression on `/output/final` closed via server-authoritative one-shot epoch rebasing.
- Verification PASS: `.planning/phases/phase-11/11-HF4-VERIFICATION.md` + `debug/p11-hf4-acceptance-regression-output.json`.

Execution Update (11-HF5):
- Completed: initiator-only non-loop desync is closed through server-authoritative fanout payloads and optimistic-path guard removal.
- Verification PASS: `.planning/phases/phase-11/11-HF5-VERIFICATION.md` + `debug/p11-hf5-acceptance-regression-output.json`.

Execution Update (11-HF6):
- Completed: seen non-loop trigger revisions now enforce local full-duration exactly-once playback with revision-key retention.
- Completed: polling snapshots cannot cancel started one-shots without explicit stop/clear revision authority.
- Verification PASS: `.planning/phases/phase-11/11-HF6-VERIFICATION.md` + `debug/p11-hf6-acceptance-regression-output.json`.

Phase 11 Closure:
- Status: CLOSED PASS after Plan 11-HF6. All binding objectives (operator UX acceleration, mobile parity, server-authoritative non-loop one-shot replication, polling/hydration-safe seen-once full-duration contract) are implemented and verified.
- Follow-up telemetry item `P11-T13` deferred to Phase 12 discovery if needed; no outstanding blockers.

## Phase 12 - Concurrent Room Animation Layering (Plan 12-1 CLOSED PASS)
Ziel: Mehrere Raumanimationen (coded, mp4, gif) muessen im selben Raum gleichzeitig und in beliebiger Trigger-Reihenfolge voll sichtbar uebereinandergelegt werden. Aktuell blockiert/verdraengt eine neu gestartete Animation eine bereits laufende Animation desselben Typs/Raums je nach Reihenfolge (z. B. Alarm verschwindet, wenn er nach Malfunction startet).

Status: Plan 12-1 ist CLOSED PASS am 2026-04-11 (`.planning/phases/phase-12/12-1-VERIFICATION.md`, `debug/p12-1-acceptance-regression-output.json`).

Execution Update (12-1):
- Completed: Generic additive layering guard in `src/app/runtime/runtime-orchestration.js` — `roomConcurrencyByKey` map build in `draw()`, `ctx.globalCompositeOperation = "lighter"` switch in room branch + cluster-member branch of `drawAnimation()` when room concurrency >= 2.
- Completed: Type-independent — coded, mp4 and gif room animations inherit the guard via shared `drawRoomComposition` wrapper inside `ctx.save()` / `clipToRoom` scope.
- Completed: Single-animation rooms preserve `source-over` blend; no visual regression for lone effects.
- Completed: RED baseline (alarm->malfunction r=3.996, malfunction->alarm r=87.228) vs. GREEN proof (identisches r=106.7 in beiden Ordnungen + triple permutation invariance coded/mp4/gif).
- Completed: Loop-mode, stop/clear immediate-authority, and Phase 11 HF6 seen-once retention non-regressed with static guards.
- Verification PASS: `.planning/phases/phase-12/12-1-VERIFICATION.md`, `debug/p12-1-acceptance-regression-output.json`.

Milestones:
1. M1 Root-Cause: Warum verdraengt eine reihenfolgeabhaengige Animationsstart die bereits laufende Animation im selben Raum?
2. M2 Unified Layering Contract: Pro Raum koennen mehrere gleichzeitige Animationen beliebigen Typs (coded/mp4/gif) additiv sichtbar koexistieren.
3. M3 Explicit-Stop-Only: Eine laufende Raumanimation wird nur durch explizites `stop`/`clear` oder natuerliches Ende beendet, niemals durch den Start einer weiteren Animation im selben Raum.
4. M4 Non-Regression: Loop-/One-Shot-Lifecycle, Global-Trigger-Pfade und bestehende Stop/Clear-Semantik bleiben unveraendert.
5. M5 Deterministic Evidence: FAIL->PASS Proof fuer Reihenfolgen-Invarianz (A->B == B->A) ueber Control-View und `/output/final`.

Exit Criteria:
- Jede beliebige Kombination aus gleichzeitig laufenden Raumanimationen (coded, mp4, gif) ist auf Control-View und `/output/final` vollstaendig sichtbar uebereinandergelegt.
- Der Start einer zweiten Animation im selben Raum loescht/maskiert keine bestehende laufende Animation desselben Raums.
- Stop/Clear und Ende-des-Loops bleiben die einzigen Wege, eine laufende Animation zu beenden.
- A->B vs. B->A Trigger-Reihenfolge produziert identisches visuelles Endergebnis, wenn beide Animationen gleichzeitig laufen.
- Loop-Mode, Global-Trigger und bestehende Regression-Matrix sind unveraendert PASS.

## Phase 13 - Server-Authoritative Config + Gesture Zoom + Touch Polygon Editing (Plans 13-1/13-2/13-3 CLOSED PASS — static guards)
Ziel: Browser-Persistenz komplett entfernen (single source of truth = Server-Config), Zoom-Slider durch Mausrad/Pinch-Gesten ersetzen, Polygon-Vertex-Editing auf Touch zuverlaessig machen.

Status: Plan 13-1 execute-ready und aktiv. 13-2 und 13-3 blockiert auf 13-1 PASS.

Milestones:
1. M1 Plan 13-1 Server-Authoritative Config Closure.
2. M2 Plan 13-2 Gesture Zoom Closure.
3. M3 Plan 13-3 Touch Polygon Editing Closure.
4. M4 Phase 13 Exit: keine Browser-Persistenz mehr, Gesture-Zoom live, Touch-Polygon-Drag zuverlaessig.

Exit Criteria:
- Null `localStorage`/`indexedDB` Referenzen in `src/app/**` und `src/live/**` Runtime-Code.
- Jede Config-Mutation roundtripped durch den Server und wird innerhalb ~200ms + Live-Sync-Latenz auf allen Clients sichtbar.
- Server-Unreachable blockiert den App-Start mit expliziter Error-UI + Retry-Button.
- Zoom-Slider entfernt; Wheel/Pinch-Gesten produzieren identische Zoom-Semantik im Range 25%-400% mit korrektem Cursor/Midpoint-Anchoring.
- User kann Polygon-Vertices auf Mobile mit dem Finger zuverlaessig verschieben.
- Phase 11 HF6 und Phase 12 Contracts unveraendert PASS.

User Decisions (2026-04-11):
- Server offline -> harter Block mit Error + Retry.
- Write cadence -> 200ms debounce.
- Zoom range -> 25% bis 400%.
- Subtab memory -> sessionStorage (ephemer).

Execution Update (13-1):
- Completed: Server-authoritative config pivot. 32 browser-storage references removed from runtime (zero `localStorage`/`indexedDB` function calls remain in `src/app/**` and `src/live/**`, only documentation comments).
- Completed: `persistBoardProfiles()` body replaced with 200ms-debounced `scheduleGlobalConfigWrite()`; 44 call sites unchanged.
- Completed: Blocking startup with full-screen "Server nicht erreichbar" overlay + Retry button.
- Completed: Server broadcasts `global-config-update` after every write; clients refetch + apply via existing WebSocket.
- Completed: Save-to-global / Load-and-apply buttons removed; Import-from-file button added.
- Completed: Settings subtab -> sessionStorage; API base + log level -> URL query params.
- Verification PASS: `.planning/phases/phase-13/13-1-VERIFICATION.md`, `debug/p13-1-acceptance-regression-output.json`.

Execution Update (13-2):
- Completed: Zoom slider removed from DOM + JS; wheel handler (cursor-anchored) + two-finger pinch handler (midpoint-anchored) on `#stage`.
- Completed: Zoom range extended to `[0.25, 4.0]` via new `BOARD_ZOOM_SCALE_MIN`/`MAX` constants.
- Completed: Pan mode, fit-to-room, reset-zoom buttons unchanged.
- Verification PASS: `.planning/phases/phase-13/13-2-VERIFICATION.md`, `debug/p13-2-acceptance-regression-output.json`.

Execution Update (13-3):
- Completed: `isAcceptablePolygonPointerEvent` accepts touch/pen pointers; 5 `event.button !== 0` sites replaced.
- Completed: `getCoarsePointerHitMultiplier` scales vertex + edge hit radii by 1.8x on `(pointer: coarse)` devices; visual handles unchanged.
- Completed: `#room-overlay { touch-action: none; }` in `src/styles.css`.
- Completed: Pinch gesture arbitration — active polygon drags block pinch capture.
- Verification PASS: `.planning/phases/phase-13/13-3-VERIFICATION.md`, `debug/p13-3-acceptance-regression-output.json`.

Phase 13 Closure: all three plans PASS static guards. In-browser verification by the user is the remaining gate before merge (multi-device config sync, server-offline overlay + retry, wheel + pinch zoom centered on anchor, touch polygon drag on a real touchscreen).

Execution Update (HF Wave 13-HF1..13-HF13):
- HF1..HF6 closed interactive UX regressions on desktop zoom anchoring and mobile pan/zoom lag (`dad3e8c`..`dca8cf4`).
- HF7 isolated + fixed residual mobile pan/zoom lag via GPU layer promotion, cached stage geometry, and draw/poll pause (`67fef9d`).
- HF8 applied the HF7 pause pattern + rAF render coalescer to polygon drag (`a71ea57`).
- HF9 replaced the full-overlay rebuild with an incremental SVG drag renderer + vertex grab offset (`6f66cda`).
- HF10 fixed HF9 stale-refs regression by rendering before `begin*Drag` in every call site (`44e1688`).
- HF11 restored the room transform pipeline inside the incremental renderer (`3ad41e0`).
- HF12 added display-space grab-offset capture and `[0, 1]` edge clamp for vertex drag (`e56085a`).
- HF13 replaced HF12's drag-time freeze with a session-stable stretch anchor in `getRoomTransform`/`getRoomPoints` — the structural root-cause fix (`71f72cb`).
- Seven HF acceptance-regression harnesses GREEN with explicit non-regression gates for every prior HF/phase.

Phase 13 Final Closure: CLOSED PASS. See `.planning/phases/phase-13/CLOSURE.md`.

## Phase 14 - Refactoring + Module Split (PLANNING)
Ziel: Nicht-funktionale Konsolidierung nach dem grossen HF-Wave. Redundanter bzw. nicht genutzter alter Code wird vollstaendig entfernt, und Dateien mit 2k+ Zeilen (primaer `src/app/runtime/runtime-orchestration.js` mit ~14.5k LOC) werden in Domaenen-Module aufgeteilt.

Status: Scaffolding in `.planning/phases/phase-14/`. Kein Feature-Scope; reine Struktur/Cleanup Phase.

Milestones:
1. M1 Inventory: gemessene File-Size-Matrix, Liste der toten Pfade, dokumentierte Modulgrenzen.
2. M2 Dead-Code Purge: Entfernung unbenutzter Exports, legacy-Persistenzreste, commented-out Blocks.
3. M3 Runtime Module Split: `runtime-orchestration.js` in thematische Submodule (draw loop, room rendering, polygon editor, live-sync glue, settings UI binding, touch gesture machine, zoom, startup/hydrate) zerlegt.
4. M4 Non-Regression Hold: saemtliche Phase-11/12/13 Acceptance-Harnesses unveraendert PASS.

Exit Criteria:
- `src/app/runtime/runtime-orchestration.js` existiert nicht mehr als >2k LOC Monolith (oder ist als schlanker Entry-Point verbleibend, der Domaenenmodule orchestriert).
- Jede produktive Datei in `src/app/**` ist unter einem klar motivierten Zeilenbudget (target: < ~1500 LOC pro Modul, soft cap).
- `grep -r "// removed"` / `grep -r "// legacy"` / ausgekommentete Code-Bloecke verifiziert entfernt.
- Keine regressiven Aenderungen in Phase 11/12/13 Acceptance-Harnesses — alle GREEN.
- Build + Startup unveraendert; in-browser smoke unveraendert.

## Phase 18 - UX Overhaul: Simplicity & Mobile-First (CLOSED)
Ziel: Umfassende UX-Ueberarbeitung fuer intuitive Bedienung ohne Funktionalitaetsverlust.

Status: CLOSED. 5 Plans (18-01 bis 18-05) + extensive Bugfixes. 55+ Commits.

Delivered:
- Dashboard: Quick Mode an oberster Position mit Inline-Animation-Picker (horizontale Pills)
- Settings: Panel-Konsolidierung (Board Setup, Room Editor), Animation Create/Edit Workflow, Terminologie (Effect/GIF/Video)
- Polygon Workflow: Rechtsklick/Long-Press Room-Creation, Undo/Redo (Ctrl+Z), Doppelklick-Vertex-Insert
- Mobile: Landscape Side-by-Side Layout, Slider Touch Guard, Pill-Subtabs
- Visual: Glassmorphism-Panels, Custom Range-Slider, Accent-Buttons
- Fixes: Loading Overlay (Server-Snapshot-aware), Outside MP4 Restart-Fix, Canvas clientWidth Rotation-Fix, Pan bei jedem Zoom, Animation-Flicker-Fix, englische Texte

## Phase 19 - Align Mode Overhaul + Projection Mapping (PLANNING)
Ziel: Align Mode ueberarbeiten mit prominentem Dashboard-Button, Play Area Grenzen Anzeige, 4-Ecken Projection Mapping auf /output, und Output-Pfad von /output/final auf /output aendern.

Status: PLANNING.

Milestones:
1. M1 Align Mode Visibility: Button an prominenter Stelle im Dashboard, nicht versteckt.
2. M2 Play Area Display: Align Mode zeigt Play Area Grenzen an.
3. M3 Projection Mapping: 4-Ecken-Verschiebung auf /output fuer perfekte Beamer-Anpassung (Maus-Drag + Pfeiltasten-Feinjustierung), CSS perspective transform, schwarz ausserhalb.
4. M4 Output Path: /output/final → /output umrouten.

Exit Criteria:
- Align Mode Button im Dashboard sichtbar ohne Scrollen.
- Play Area Polygone im Align Mode sichtbar auf /output.
- 4 Ecken per Drag oder Pfeiltasten verschiebbar auf /output waehrend Align Mode.
- Projection Mapping nur aktiv waehrend Align Mode, sonst normaler Output.
- Output erreichbar unter /output statt /output/final.

## Phase 26 - Data-storage cleanup + Pi /output/ rendering hardening (CLOSED)
Ziel: Per-board State in `config/boards/<id>.json` konsolidieren, `global-defaults.json` auf wirklich globale Felder schrumpfen, Board-Package-Format auf v3 heben. Anschliessend (in Hotfix-Welle 9) eine harte Pi-/output/-Performance- und Render-Regression schliessen.

Status: CLOSED PASS am 2026-05-04 nach Hotfix-Welle 9. Closure-Doku: `.planning/phases/phase-26/SUMMARY.md`. Tag: `phase-26-end-h9`. Final version: `0.26.23`.

Milestones:
1. M1 Data unification: per-board State in `config/boards/<id>.json` konsolidiert, `global-defaults.json` reduziert, Board-Image-Pfade unter `/config/boards/assets/` zusammengefasst, Package-Schema auf `tt-beamer.board-package.v3` gehoben.
2. M2 UX/Animation polish: Power-Outage `Break solid color`, "copy animations from another board"-Button, leere Animationsbibliothek bei Board-Import.
3. M3 Hotfix UX (h1..h8): Board-Delete-Cascade, Slider-Persistenz, Polygon-Editor-Visuals, FX-Picker-Stale-Refresh, Cluster-Picker-Disambiguation.
4. M4 Hotfix h9 — Pi /output/ rendering hardening: Render-Mode-Toggle (auto/2d/gl) + Diagnostic-Overlay, server-persistiert + live-synced; Solid-Color-Cross-Room-Performance-Fix; GL-Triangle-Seam-Fix (highp + NEAREST); GIF-Reliability auf Pi (Idle-Bypass + ImageDecoder-Fallback).

Exit Criteria:
- Per-board State liegt vollstaendig in `config/boards/<id>.json` und Roundtrip Save/Load erhaelt alle Felder.
- `tt-beamer.board-package.v3` Imports/Exports verlieren keine Daten.
- Pi /output/ rendert bei vielen gleichzeitigen Solid-Color-Raeumen ohne FPS-Einbruch ohne dass die Cross-Room-Overlap-Aufhellung zurueckkehrt.
- GL-Triangle-Linien sind auf Solid-Color-Raeumen unsichtbar.
- GIF-Animationen starten zuverlaessig auf Pi /output/ nach Reload.
- Render-Mode + Diagnostic-Overlay sind in System-Tab toggle-bar, server-persistiert und live auf alle Clients gesynced.

## Phase 32 - SSR Stream Performance + Connection Stability (PASS-AUTOMATED-PENDING-MANUAL)
Ziel: Zwei post-Phase-31 Release-Blocker, die im Live-Test sichtbar wurden. (1) **Stream-FPS-Plateau:** SSR und WebRTC-Stream sind beide bei ~25 fps trotz preset-target 30. Operator-perceived "real-time" Drag im Align-Mode soll Framerate Richtung 60 fps lifen. Untersuchung: Sind Stream-fps an SSR-fps gekoppelt (rAF in headful Chromium, paint-throttle, Encoder-input-rate, mediasoup output-rate) oder ist das Zufall? (2) **Reconnect-Storm-Regression nach Cold-Boot:** Manchmal nach Server-Start reconnected der Pi-Receiver dauerhaft und fängt sich nicht — nur Server-Restart hilft. Sobald es einmal stabil läuft, läuft es lange stabil. Annahme: Server + Pi sind immer im gleichen lokalen LAN.

Status: PASS-AUTOMATED-PENDING-MANUAL am 2026-05-07. Automated 13/13 PASS, Test-Suite 274/270/4/0. **Block A** geliefert: Xvfb `-fakescreenfps 120` (root-cause fix für rAF cap auf headful Chromium unter Xvfb), Chromium-native VAAPI libva-Probe (ersetzt ffmpeg-only check, lifts encoder von x264-software → vaapi auf Raptor Lake-P iGPU), `streamFpsCap` Schema-Feld + Publisher-Wiring + Align-Mode-Boost (250ms polling loop), Settings-UI im System & Performance Panel (4-radio FPS cap + boost checkbox), Bitrate-scaling (30→8M, 45→12M, ≥60→16M). **Block B** geliefert: `/api/ssr/ready` producer-readiness gate + WS `producer-ready` event, `MAX_RECONNECT_ATTEMPTS=10` hard cap REMOVED (root-cause), adaptive backoff `[1s, 2s, 5s, 10s, 30s]` forever-retry, sessionStorage backoff state (page-reload-safe), `RECONNECTING — Xs (attempt N)` countdown overlay, server-side `purgeStaleMediasoupWorker` boot-cleanup. Closure-Doku: `.planning/phases/phase-32/32-SUMMARY.md`. Tag pending: `phase-32-end` (after manual UAT pass) oder `phase-32-delivered-to-uat` (now). 5 Pi-hardware UAT-Items (`32-HUMAN-UAT.md`) gating final closure: FPS-on-hardware, drag-fluidity perception, cold-boot ×10, Pi-reload ×10, VC4 1080p@60 decode budget.

**Plans:** 4/4 plans complete

Plans:
- [x] 32-W0-PLAN.md — Wave 0: test scaffolding + baseline (10 new test files, ≥20 skip-gated assertions)
- [x] 32-01-PLAN.md — Wave 1 Block A: Xvfb -fakescreenfps 120 + VAAPI libva probe + streamFpsCap + alignModeBoost wiring
- [x] 32-02-PLAN.md — Wave 1 Block B: /api/ssr/ready gate + forever-retry adaptive backoff + countdown overlay + boot cleanup
- [x] 32-03-PLAN.md — Wave 2: Settings UI extension (Stream FPS Cap radio + Align-Mode Boost toggle)

Trigger: Phase-31-Hotfix-Welle h24-h26 + h36-h38 hat Reconnect-Storm einmal stabilisiert (consumer-cap, per-IP cleanup, threshold raise). Aber bei kaltem Server-Boot bleibt das Problem latent reproducible. Parallel zeigte h18 dass FPS-lift auf 30 nominell möglich war, aber unter typischer Last sich auf ~25 einpegelte — Codepfade vermutlich nicht skaliert für > 25 fps Throughput.

Hard Constraints (carried forward):
- Phase-31 user-contracts (align mode, mesh-warp, layering) bleiben non-regressed.
- Server-authoritative state (Phase 13 + Phase 31 h41/h42) bleibt.
- Test-Board: Nemesis Lockdown Board A.
- Server + Pi gleicher local LAN (gigabit ethernet bevorzugt — keine WAN-Latenz-Annahmen).

Out of Scope (Phase 32):
- Audio-Pfad (Pi-lokal seit D-D2-Reversal — bleibt).
- Codec-Wechsel weg von H264 (nur falls Stream-Lift dies erfordert wird es Gray Area).
- Pi-side Render-Fallback wenn Server unerreichbar.

Discuss-Phase Gray Areas (zu klären):
- D1: Stream-FPS-Kopplung — wo ist die Decoupling-Stelle? Capture-Rate vs Encode-Rate vs Decode-Rate. Welche Stage limitiert?
- D2: Target-FPS — 30 (preset)? 60 (operator-perceived)? Encoder-Budget + Pi-Decode-Budget müssen reichen.
- D3: Bitrate-Lift — bei FPS-Verdopplung Bitrate ebenfalls anheben oder Quality-Trade akzeptieren?
- D4: Reconnect-Storm-Reproduktion — was triggert den Cold-Boot-Fail-Modus? Producer-startup-race? Consumer-cap exhaustion before cleanup? DTLS-handshake-deadlock?
- D5: Backoff-Strategie — exponential? Jittered? Server-pushed STOP-RETRYING signal?
- D6: Stream-Health-Indicator UI — soll Operator sehen wenn Re-connecting vs hängt?

Milestones (vorläufig — werden in CONTEXT.md/PLAN finalisiert):
1. M1 Discuss-Phase Closure: Gray Areas entschieden, CONTEXT.md fertig.
2. M2 Research-Phase Closure: FPS-Pfad-Profiling (CDP timeline + mediasoup stats) — quantitatives Bild davon wo die Frames gedrosselt werden.
3. M3 Stream-FPS-Lift: validate ≥40 fps unter typischer Last (Multi-Room + Animation + Align-Drag).
4. M4 Reconnect-Storm-Repro: deterministisches Repro-Script schreiben.
5. M5 Reconnect-Storm-Fix: Server-Restart als "letzte Option" obsolet.
6. M6 UAT: Pi auf Test-Board zeigt durchgehend ≥40 fps + überlebt 10× Pi-Reload + 10× Server-Restart ohne stuck-state.

Exit Criteria (vorläufig):
- Stream + SSR FPS messbar ≥40 (idealer Range 50-60) auf Nemesis Lockdown Board A.
- Operator-perceived Drag-Latenz im Align-Mode subjektiv "real-time".
- Cold-Boot des Servers + Pi-Receiver-connect stabil ≥10 wiederholungen ohne stuck-Reconnect.
- Pi-Reload während laufendem Stream stabil ≥10 wiederholungen ohne Server-Restart-Notwendigkeit.
- Test-Suite weiterhin grün; neue Tests für FPS-Floor + Reconnect-Repro.

Re-Use Decisions (carried forward, nicht erneut diskutieren):
- WebRTC + mediasoup + h264 (Phase 31 D-A1/D-A2) bleibt.
- Headful Chromium + Xvfb + puppeteer-stream (Phase 31 D-A3) bleibt.
- Pi-local audio (Phase 31 D-D2-Reversal) bleibt.

## Phase 31 - Server-Side Rendering Pivot (CLOSED-WITH-HOTFIXES)
Ziel: Architektonischer Pivot — Pi 4 wird zum Thin-Display-Client. Der Server (deutlich stärkere Hardware) übernimmt die komplette Render-Pipeline (Animations-Decode, Compositing, Mesh-Warp / Projection-Mapping, Multi-Area, Effects). `/output/` auf dem Pi konsumiert ausschließlich einen finalen Pixel-Stream. User-facing Verträge bleiben identisch: Align-Mode, 4-Ecken-Projection-Mapping, Multi-Area, Animation-Timeline, alle bisherigen Animations-Typen (coded, gif, mp4, solid-color). Es ändert sich ausschließlich der **Render-Ort**.

Status: CLOSED-WITH-HOTFIXES am 2026-05-06. 7/7 Plans (31-00..31-06) PASS + automated 9/9 PASS + 35 post-UAT hotfixes (h12-h46) für GIF-Reliability, Align-Mode round-trip, Drag-Flow, Room-Overlay-Sync, server-authoritative Profile-State, Reconnect-Storm. Test-Suite 215 total / 211 pass / 4 skip / 0 fail. Closure-Doku: `.planning/phases/phase-31/31-SUMMARY.md`. Tag: `phase-31-end`. Final version: `0.31.0-h46`. Zwei Items zu Phase 32 carried over: (1) Stream-FPS-Plateau ~25, (2) Reconnect-Storm-Regression auf Cold-Boot.

**Plans:** 8/7 plans complete

Plans:
- [x] 31-00-PLAN.md — Wave 0: BLOCKING audio-capture gate + npm install + 5 test scaffolds (D-D2 escalation point)
- [x] 31-01-PLAN.md — Wave 1: SSR render-host bring-up (Xvfb + headful Chromium + lifecycle)
- [x] 31-02-PLAN.md — Wave 2: WebRTC stream bring-up (mediasoup SFU + signaling + in-page publisher)
- [x] 31-03-PLAN.md — Wave 3: Pi receiver re-skin (DOM + status overlays + D-B4 binding constraint + reconnect)
- [x] 31-04-PLAN.md — Wave 4: Align-mode round-trip (D-D1) + active-animations persistence (D-X7)
- [x] 31-05-PLAN.md — Wave 5: Phase-30-hotfix audit (server-vs-Pi gating) + dashboard preview opt-in
- [x] 31-06-PLAN.md — Wave 6: UAT (11 scenarios) + 30min soak + Phase-29 40/40 retest + closure

Trigger: Phase-30 hat client-seitig auf VC4 GPU plateau'd bei ~12 fps trotz 16-Task-Welle. Ziel ≥20 fps, ideal 30 fps. Phase-30-Stabilitätshotfixes h1-h15 bleiben als Defense-in-Depth im Code, falls SSR später optional wird.

Hard Constraints (carried forward):
- Mesh-Warp + 4-Corner Projection-Mapping (Phase 19/27/28) bleibt user-konfigurierbar.
- Multi-Area + per-board Polygon-Geometrie (Phase 8/13) bleibt server-authoritativ.
- Animation-Layering-Contract (Phase 12: additiv, explizit-stop-only, A→B == B→A) bleibt unverändert.
- Animation-Definitions live in `config/boards/<id>.json` + `config/global-defaults.json` (Phase 26+29 Schema v4) — keine Schema-Änderungen erforderlich für die Pivot.
- Align-Mode-Interaktion bleibt vom User aus auf `/output/` steuerbar.
- Test-Board: Nemesis Lockdown Board A.

Out of Scope (Phase 31):
- Neue Animations-Typen.
- UX-Redesign von Dashboard/Settings.
- Schema-Migrationen.
- Cluster/Multi-Server-Render (deferred falls Single-Server reicht).

Discuss-Phase Gray Areas (zu klären, nicht hier festgelegt):
- D1: Streaming-Protokoll — MJPEG-over-HTTP vs WebRTC vs WebSocket-binary-frames vs HLS vs raw-h264-via-MSE.
- D2: Server-Render-Stack — headless Chromium (puppeteer-stream / playwright + WebRTC) vs node-canvas + ffmpeg encode vs nativer Renderer (skia-canvas/raylib) vs WebGL-server (gl npm + headless-gl).
- D3: Encode-Format — h264 vs vp9 vs vp8 vs raw RGB; Pi-Decode-Budget muss reichen.
- D4: Latenz-Budget — von Operator-Click bis sichtbarem Frame auf Pi.
- D5: Fallback bei Server-unreachable — Black-Screen vs lokales Notfall-Rendering vs Cache.
- D6: Align-Mode auf Stream — Server rendert mit aktiver Mapping-Transformation oder Pi nimmt nur Touch/Drag-Events entgegen und sendet sie zurück.
- D7: Audio-Pfad — Sounds bleiben Pi-lokal (HTML5 Audio + WebSocket-Trigger) oder kommen mit dem Stream.
- D8: Bandbreiten-Budget — Pi LAN/WLAN, 1920×1080@30fps Encode-Bitrate.
- D9: Multi-Client-Support — kann der Server auch Dashboard-Clients über denselben Pfad bedienen, oder nur `/output/` (Single Renderer Instance)?
- D10: Animation-State-Sync — wer ist source of truth für `runtime-state` während des Übergangs (Server-only, Pi-mirror, gar nichts auf Pi)?

Milestones (vorläufig — werden in CONTEXT.md/PLAN finalisiert):
1. M1 Discuss-Phase Closure: alle Graubereiche entschieden, CONTEXT.md fertig.
2. M2 Research-Phase Closure: technische Validierung der gewählten Streaming/Encode-Stack auf Pi (Decode-fps, CPU/GPU-Last).
3. M3 Server-Side-Render Bring-up: Server rendert das gleiche Frame wie heute auf Dashboard, ohne Pi.
4. M4 Stream-Transport Bring-up: Pi-Client zeigt Server-Stream live an, Throughput ≥20 fps validiert.
5. M5 User-Contract-Parity: Align-Mode + Projection-Mapping + Multi-Area + Animation-Timeline funktionieren end-to-end via Stream.
6. M6 Fallback + Resilience: Server-Restart, Server-unreachable, Network-Hiccup-Verhalten definiert + getestet.
7. M7 UAT: Pi auf Test-Board zeigt ≥20 fps mit allen Phase-30-Defensives als Backup-Pfad.

Exit Criteria (vorläufig):
- Pi `/output/` rendert ≥20 fps (idealer Range 24-30 fps) auf Nemesis Lockdown Board A unter typischer Last (multiple Räume + Outside-Animation + globale Trigger).
- Operator-Click-bis-sichtbar auf Pi ≤200 ms (entscheidbar in Discuss-Phase).
- Align-Mode + 4-Ecken-Mapping vom Pi aus voll bedienbar.
- Phase 11/12/13/19/26/27/28/29 Akzeptanz-Verträge non-regressed.
- Test-Suite weiterhin grün; neue Tests für Stream-Transport.

Re-Use Decisions (carried forward, nicht erneut diskutieren):
- Phase-30 Stability-Hotfixes h6-h15 bleiben im Code als Fallback-Pfad falls SSR ausfällt.
- Server-Authoritative Config (Phase 13) bleibt — keine Browser-Persistenz.
- Schema v4 (Phase 29) bleibt — keine Migration.

## Phase 30 - Render-Stability Regressions Closure (CLOSED PARTIAL)
Ziel: Drei Render-/Sync-Regressionen beheben, die vor Release aufgefallen sind. Test-Board: Nemesis Lockdown Board A. Mid-phase erweitert um Plan 30-04 (Pi /output/ fps target ≥20 fps).

Status: CLOSED PARTIAL am 2026-05-06. Drei der vier Ziele erreicht (B1 + B2 + B3). Plan 30-04 (Pi fps ≥20) NICHT erreicht trotz 16-Task-Welle (T1-T16) — Final-fps auf Pi ~12 fps. Stabilität dagegen deutlich besser: GL-Context-Loss eliminiert (T14), mp4-Loop-Seamlessness wiederhergestellt, GIF-Reliability gehärtet, Mesh-Warp-Seams in GL+2D geschlossen, Diagnostic-Overlay live-synct. Architektonische Konsequenz: client-seitige Optimierung plateau'd auf VC4 — Phase 31 pivotiert zu Server-Side-Rendering mit Pi als Thin-Display-Client. Closure-Doku: `.planning/phases/phase-30/SUMMARY.md`. Tag: `phase-30-end-partial`. Final version: `0.30.0-30-04-T14T15T16-raf-yield`.

**Plans:** 3/4 plans completed (30-01 + 30-02 + 30-03 PASS, 30-04 PARTIAL)

Plans:
- [x] 30-01-PLAN.md — B3: Diagnostic Overlay live-sync to /output/ (PASS — D + E + h1 + h2)
- [x] 30-02-PLAN.md — B1: Animation seams in solid-color and others (PASS — h1..h9 wave + T4 GL-mesh seam closure)
- [x] 30-03-PLAN.md — B2: Pi GIF reliability without reload (PASS — Candidates A + B + C + h1 + h2)
- [~] 30-04-PI-PERF-PLAN.md — Pi /output/ fps to 24-30 (PARTIAL — 16 tasks, T6/T8 cancelled and forwarded to Phase 31; final ~12 fps vs target 20+)

Backlog (User-Smoke 2026-05-05, post Phase-29-Closure):
- B1 — Sichtbare Linien/Seams in Animationen, insbesondere `solid-color`: solid-color-Räume zeigen sichtbare Linien innerhalb des Raums (Transformations-Naht). Phase 26 h9 hatte den GL-Triangle-Seam-Fix (highp + NEAREST) — Regression. Kontrakt: solid-color soll wirklich SOLID sein, ohne sichtbare Naht-Linien innerhalb eines Raums; auch andere Animationen dürfen diese Linien nicht zeigen.
- B2 — GIF-Animationen starten nicht zuverlässig auf Pi /output/: Auf stärkeren Geräten sichtbar, auf Pi starten manche nicht; Reload bringt fehlende Animationen, aber andere brechen dann ab. Phase 26 h9 hatte Idle-Bypass + ImageDecoder-Fallback bereits adressiert — Regression. Kontrakt: alle GIF-Animationen müssen auf Pi /output/ deterministisch starten, auch ohne Reload, und nach einem Reload nicht andere brechen.
- B3 — `Show diagnostic overlay` synct nicht zu /output/: Toggle wirkt nur im Dashboard. Phase 28 B6 hatte Cross-Client-Sync bereits eingeführt — Regression. Kontrakt: Toggle-State synct live an alle Clients inkl. /output/, und Overlay erscheint/verschwindet dort sofort.

Milestones:
1. M1 Seam closure: solid-color (und ggf. andere) Animationen zeigen keine sichtbaren Naht-Linien innerhalb eines Raums; deterministische Reproduktion + FAIL→PASS-Evidenz auf Test-Board.
2. M2 Pi GIF reliability: alle GIF-Animationen starten zuverlässig auf Pi /output/ ohne Reload; deterministische Reproduktion auf Pi-Hardware.
3. M3 Overlay live-sync: Diagnostic-Overlay-Toggle propagiert live an /output/.

Exit Criteria:
- Auf dem Test-Board sind keine Naht-Linien innerhalb eines Raums in solid-color (und in den anderen verwendeten Animationen) sichtbar — verifiziert visuell auf Pi /output/.
- Auf Pi starten alle in einem Boot konfigurierten GIF-Animationen ohne Reload; nach Reload brechen keine anderen ab.
- Aktivieren von "Show diagnostic overlay" im Dashboard zeigt das Overlay binnen Live-Sync-Latenz auf /output/; Deaktivieren versteckt es dort sofort.
- Test-Suite weiterhin grün (Phase 29: 40/40); keine Regression in Phase 26 h9 / Phase 28 B6 Akzeptanz.

Out of Scope:
- Neue Animations-Typen oder neue Render-Modes.
- Änderungen am Persistence-Schema (Phase 29 v4 bleibt).
- Refactoring außerhalb dessen was zur Regression-Behebung minimal nötig ist.

## Phase 29 - Persistence Audit & Legacy Cleanup (CLOSED)
Ziel: Systematischer Review aller Persistenz-Schemas (`config/global-defaults.json`, `config/boards/<id>.json`, `config/projection-profiles.json`, `config/asset-manifest.json`) auf redundante / ungenutzte Felder. Tot-Code rauswerfen, Schema schlanker machen, Import/Export weiterhin funktional halten — keine Backwards-Compat erforderlich (Pre-Release).

Status: CLOSED am 2026-05-05 (h3 final 2026-05-05). 7 Plans (29-W0..29-06) ausgeführt + 3 Hotfixes (h1..h3). 7 DEAD/REDUNDANT Felder entfernt (`hiddenRoomNames`, `roomStateProfiles`, `animationSoundMap`, `playAreaPolygon`, `deletedRoomIds`/tombstones, plus h1: `specialPolygons`, `roomGeometry`). BOARD_PROFILE_FIELDS 15→11→**9** (h1). Schema v3→v4 mit SCHEMA_OUTDATED-Reject. Open Question 3 (`roomGeometry` runtime-vs-disk asymmetry) und der parallele `specialPolygons` shadow-map-Befund in h1 aufgelöst: per-room polygons leben jetzt single-source in `roomCatalog[*].polygon`; runtime-state slice für `roomGeometryByBoard` bleibt LIVE, on-disk Field gestrichen. h2: pre-release boot-noise removal (one-shot purge migration + 2 Tests entfernt). h3: kritischer Fix — `isDirty()` retourniert false ohne geladenes Profil, so dass Dashboard's "Unsaved on /output/" nicht mehr spurious fires. Test-Suite 40/40 grün, 0 skip. Closure-Doku: `.planning/phases/phase-29/SUMMARY.md`. Tag: `phase-29-end` (re-tagged at h3 HEAD). Final version: `0.29.3`.

**Plans:** 7/7 plans complete

Plans:
- [x] 29-W0-PLAN.md — Wave 0: 4 new test scaffolds + extend board-profile-fields.test.mjs (skip-gated future assertions)
- [x] 29-01-PLAN.md — Wave 1: 29-AUDIT.md classification doc + user-verify checkpoint (gates Wave 2) — completed 2026-05-05, commit `c88ca27` (auto-mode sign-off)
- [x] 29-02-PLAN.md — Wave 2: drop hiddenRoomNames + roomStateProfiles plumbing (BOARD_PROFILE_FIELDS 15→13) — completed 2026-05-05, commits `72cc5fe` (hiddenRoomNames) + `5438a11` (roomStateProfiles)
- [x] 29-03-PLAN.md — Wave 2: drop animationSoundMap source-side + dead audio-mapping panel JS
- [x] 29-04-PLAN.md — Wave 2: drop playAreaPolygon + deletedRoomIds/tombstones (BOARD_PROFILE_FIELDS at final 11)
- [x] 29-05-PLAN.md — Wave 3: lib/migrations/phase-29-purge.mjs + boot-time disk cleanup + lossless animationSoundMap migration — completed 2026-05-05, commits `c5565b0` (module) + `864230f` (boot-wiring + one-shot disk strip) + `027f8a9` (6 W3 test gates flipped)
- [x] 29-06-PLAN.md — Wave 4: BOARD_PACKAGE_SCHEMA v3→v4 + filterBoardToLiveFields export filter + SCHEMA_OUTDATED import reject

Backlog (User-Audit nach Phase-28-Closure):
- B1 — Sound-Pfade in `global-defaults.json` (`animationSoundMap`): Verdacht auf Legacy-Field. Sounds sind Teil der Animation-Definitions im Board (`outsideFx.animations[].soundAssetRef`, `roomFx.animations[].soundAssetRef`, `defaultAnimations[].soundAssetRef`). Verifizieren ob `animationSoundMap` noch read-paths hat; wenn nicht → entfernen.
- B2 — `deletedRoomIds` in board-JSON: Tombstone-Liste für gelöschte Räume. Verifizieren ob das Feld irgendwo noch konsumiert wird (Migration? Hydration-Reconciliation?). Wenn nicht → entfernen.
- B3 — `roomStateProfiles` in board-JSON: Zustands-Map (broken/burning/alienCount/corpse) pro Raum. Verifizieren ob das Feld noch render-relevant ist oder ein Phase-pre-X-Relikt. Wenn nicht → entfernen.
- B4 — Vollständiger Schema-Audit aller anderen Keys in den vier JSON-Files: jeder Key wird auf Read-Path im Source-Tree geprüft; toten Code + tote Felder entfernen. Import/Export-Schemas synchron mitziehen.

Milestones:
1. M1 Audit-Phase: jedes Feld klassifizieren (LIVE / DEAD / MIGRATION-ONLY).
2. M2 Code-Cleanup: write-Pfade + read-Pfade + normalizers für DEAD-Felder entfernen.
3. M3 Disk-Cleanup: tote Felder aus on-disk JSON-Files purgen (one-shot Migration).
4. M4 Import/Export-Sync: Bundle-Export- und Import-Handler an das schlanke Schema anpassen.

Exit Criteria:
- Schema-Inventar (`29-AUDIT.md`) mit Klassifikation pro Feld.
- Auf disk: keine DEAD-Felder mehr in den vier Config-JSON-Files.
- In Source: keine Reads/Writes/Normalizers für DEAD-Felder (grep-verifizierbar = 0 hits).
- Bundle-Export/Import-Roundtrip mit dem schlanken Schema funktional.
- Test-Suite weiterhin grün; Phase-28-Acceptance (B1..B6) non-regressed.

Out of Scope:
- Backwards-Compat zu alten exportierten Packages (Pre-Release-OK).
- Neue Persistence-Features oder Schema-Version-Bumps.

## Phase 28 - Cross-cutting UX & State Polish (CLOSED)
Ziel: Mehrere kleinere, voneinander entkoppelte UX/State-Probleme nach Phase-27-Closure beheben — board-gebundene Align-Profile, board-switch save-gate-Parität, Asset-Lifecycle-Korrektheit (Dirty-Flag-Hygiene + saubere Delete-Modals + Cache-Invalidierung bei Re-Upload mit gleichem Namen) und Diagnostic-Overlay-Cross-Client-Sync samt Topbar-Layout-Fix.

Status: CLOSED am 2026-05-04 (h8 final). 6 Plans (28-00..28-05) + 8 Hotfixes (h1..h8) aus interaktivem Testing. Test-Suite 25/25 grün. Closure-Doku: `.planning/phases/phase-28/SUMMARY.md`. Tag: `phase-28-end`. Final version: `0.28.1`.

**Plans:** 6/6 plans complete

Plans:
- [x] 28-00-PLAN.md — Wave 0: test/ scaffold (8 *.test.mjs files + helpers; node --test baseline)
- [x] 28-01-PLAN.md — B1: per-board lastUsedProfileName field + auto-load on board-switch
- [x] 28-02-PLAN.md — B2: board-switch save-gate parallel to Phase 27 W5 align-toggle gate
- [x] 28-03-PLAN.md — B3 + B4: asset-picker dirty-fire selection-match guard + custom delete modal (showConfirm reuse)
- [x] 28-04-PLAN.md — B5: server sha256[:12] asset manifest + client resolveAssetUrlWithHash + render-layer wraps
- [x] 28-05-PLAN.md — B6: diagnostic-overlay topbar integration (CSS inline-variant + DOM relocation; Wave-0 + visual smokes auto-resolved per auto-mode)

Wave structure (serialized to enforce zero same-wave file overlap and dirty-contract dependency):
- Wave 0: 28-00 (test scaffold; foundation for automated verification).
- Wave 1: 28-01 (B1; depends on 28-00).
- Wave 2: 28-02 (B2; depends on 28-01 — extends syncAlignModeDirtyDashboardState).
- Wave 3: 28-03 (B3 + B4; depends on 28-02 — both edits sit in animation-editor-edit-pane-asset-picker.js, atomic).
- Wave 4: 28-04 (B5; depends on 28-03 — converts the TODO(28-04) markers planted by 28-03).
- Wave 5: 28-05 (B6; depends on 28-04 — manual checkpoints + CSS).

Backlog (User-Test 2026-05-04, post Phase-27-Closure):
- B1 — Per-board Align-Profil-Memory: Profile sind bereits per-Board, aber beim Board-Switch bleibt das aktuell geladene Profil hängen. Stattdessen soll jedes Board sich sein zuletzt genutztes Align-Profil merken und beim Switchen automatisch laden.
- B2 — Board-Switch save-gate (Align-Dirty-Block): Analog zur Phase-27-B5-Sperre des Align-Mode-Toggles soll ein Dirty-Align-State auch das Board-Switchen blockieren — mit klarem Hinweis, bis Save oder Discard.
- B3 — Asset-Upload/Delete dirty-flag-Hygiene: Upload und Delete von GIFs/MP4s sollen das Dirty-Flag NICHT triggern — nur wenn die jeweilige Animation für ein Dropdown selektiert ist und sich der effektive Asset-Ref durch die Aktion verändert hat (Animation tatsächlich anders).
- B4 — Custom Asset-Delete-Modal: Browser `confirm()` für GIF/MP4-Löschung ersetzen durch ein eigenes Modal im selben Stil wie der Board-Delete-Modal.
- B5 — Asset-Cache-Invalidierung bei Re-Upload mit gleichem Namen: Wenn ein GIF/Video gelöscht und ein neues mit demselben Dateinamen hochgeladen wird, spielt aktuell weiter die alte Animation. Root-Cause finden (Cache-Key auf Pfad/Name? Image/Video-Object-Reuse?) und beheben — immer aktuellste Bytes nutzen.
- B6 — Diagnostic-Overlay Cross-Client-Sync + Topbar-Integration: "Show diagnostic overlay" soll alle Clients (insb. /output/) direkt erfassen (live-sync). Im Dashboard soll das Overlay in die Topbar integriert werden (aktuell überlagert es Logo + Titel "TableTop Beamer").

Milestones:
1. M1 Per-board Align-Profil-Memory (B1) — last-used-Profil per Board persistiert + auto-load on switch.
2. M2 Board-Switch save-gate (B2) — Dirty-Block für Board-Switch parallel zum Align-Mode-Toggle.
3. M3 Asset-Lifecycle-Korrektheit (B3, B4, B5) — keine spurious dirty flags, eigenes Delete-Modal, korrekte Cache-Invalidierung bei Re-Upload.
4. M4 Diagnostic-Overlay UX (B6) — cross-client live-sync + Topbar-Integration ohne Logo-Overlap.

Exit Criteria:
- Board-Switch lädt automatisch das per-Board zuletzt verwendete Align-Profil; manuelles Re-Loading entfällt.
- Während Align-Dirty auf /output/ ist, bleibt Board-Switch deaktiviert mit identischer Hint-UX wie Phase 27 B5 (Tooltip + Disabled-Style).
- GIF/MP4-Upload+Delete erzeugen kein Dirty-Flag, solange kein Dropdown-Auswahl-State sich tatsächlich ändert.
- GIF/MP4-Löschung verwendet einen eigenen, board-style-konsistenten Modal — keine `window.confirm`-Aufrufe.
- Re-Upload mit gleichem Dateinamen zeigt sofort den neuen Inhalt in allen aktiven Animationen (kein Browser-/Asset-Cache-Stale).
- Diagnostic-Overlay-Toggle propagiert live an alle Clients inkl. /output/; Dashboard-Topbar bleibt frei vom Overlay-Block.

Out of Scope:
- Neue Asset-Typen oder neue Animationsklassen.
- Align-Mode-Editor-Features außerhalb der save-gate-Erweiterung.
- Server-seitige Storage-Schema-Änderungen außerhalb dessen, was für Re-Upload-Cache-Invalidierung minimal nötig ist.

## Phase 27 - Align Mode Refinement (CLOSED)
Ziel: Align Mode auf Basis von User-Test-Feedback (2026-05-04) konsistent und transparent gestalten — einheitliches Verhalten innerer und aeusserer Linien, Trapez-Verzerrung, geladenes-Profil-Anzeige + Dirty-Flag, Multi-Device-Save-Pflicht, schlankerer Default sowie korrekter Right-Click-Menue-Kontrast.

Status: CLOSED am 2026-05-04. 5 Plans + 17 Hotfixes (h1..h17) + Bonus-Feature (h12 — 4 Eck-Skallierungs-Buttons). Closure-Doku: `.planning/phases/phase-27/SUMMARY.md`. Tag: `phase-27-end`. Final version: `0.27.0`.

**Plans:** 5/5 plans complete

Plans:
- [x] 27-01-PLAN.md — Grid model: line-uniform color (B1) + outer-corner local-only drag (B2) + 80%/3×3 default layout (B6)
- [x] 27-02-PLAN.md — Profile chip + dirty flag + Save/Save-as-new/Discard toolbar + D-08 schema validation (B3, B4)
- [x] 27-03-PLAN.md — Right-click context menu rewrite: hit-test priority + three menu shapes + line-centric labels (B7, B8)
- [x] 27-04-PLAN.md — Squish bars: 4 outside-edge handles + opposite-side anchor + trapezoid edge-perpendicular axis (B9)
- [x] 27-05-PLAN.md — Multi-device save-gate: alignModeDirtyOnOutput broadcast + dashboard disable-with-hint + 10s grace timer (B5)

Wave structure (serialized to enforce zero same-wave file overlap):
- Wave 1: 27-01 (foundation — grid model + drawLines).
- Wave 2: 27-02 (toolbar — depends on 27-01).
- Wave 3: 27-03 (right-click menu — depends on 27-02; both touch handle-ui.js).
- Wave 4: 27-04 (squish bars — depends on 27-03; touches handle-ui.js + handle-drag.js).
- Wave 5: 27-05 (multi-device save-gate — depends on 27-02 dirty-listener API; touches server + cross-cutting client files, parallel-safe with 27-03/27-04 in principle but serialized for execution simplicity).

Milestones:
1. M1 Edge-uniformity: aeussere Rand-Linien verhalten sich identisch zu inneren Linien (BACKLOG B1).
2. M2 Trapezoid corners: aeussere Ecken sind frei verschiebbar — Rechteck-Constraint entfernt (BACKLOG B2).
3. M3 Profile awareness: aktuell geladenes Profil ist sichtbar; Dirty-Flag mit Save/Discard-Optionen; Dirty-State blockiert Align-Mode-Off auf Remote-Clients (BACKLOG B3..B5).
4. M4 Default layout: neuer Default ist 80%-Rechteck mit genau einer mittleren horizontalen + vertikalen Linie (BACKLOG B6).
5. M5 Right-Click correctness: kontextabhaengiges Menue (Linie / Punkt / leere Flaeche), Loeschen verifiziert end-to-end (BACKLOG B7+B8).
6. M6 Whole-board squish handles: kleine Bars ausserhalb des Rechtecks (analog zu den Rotations-Buttons) zum Stauchen/Strecken des gesamten Boards in einem Zug (BACKLOG B9).

Exit Criteria:
- Aeussere und innere Linien sind in Drag-, Snap- und Selektionsverhalten ununterscheidbar.
- Aeussere Ecken sind unabhaengig verschiebbar (Trapez moeglich); GL-Mesh-Warp passt sich an.
- Geladenes Profil + Dirty-Status sind in der Align-Mode-UI jederzeit sichtbar.
- Dirty-State auf einem Device blockiert das Ausschalten von Align Mode auf anderen Devices mit klarer Hint-Message.
- Frische Default-Profile haben das 80%-Rechteck-Layout mit genau zwei mittleren Linien.
- Right-Click auf Linie zeigt nur "Delete line" + Create-Optionen, auf Punkt zeigt zusaetzlich "Delete point", auf leere Flaeche zeigt KEINE Delete-Optionen.
- Linien-Loeschen funktioniert konsistent ueber Right-Click und persistiert in das geladene Profil.
- Squish-Handles ausserhalb des Rechtecks sind sichtbar, draggable und skalieren das gesamte Grid proportional (B1-Outer-Drag bleibt zusaetzlich verfuegbar).

Out of Scope:
- Aenderungen ausserhalb der Align-Mode-UI.
- Neue Projection-Mapping-Features ausser dem Trapez-Corner-Release und den Squish-Handles.

## Phase 32 - SSR Stream Performance + Connection Stability (CLOSED-FAILED-AT-MANUAL-UAT)

Status: CLOSED-FAILED am 2026-05-08. Automated 13/13 PASS, aber Live-Pi-UAT reproduzierte image-hang + persistente reconnect-loops trotz 12 nightly hotfixes (h1-h12, h4 reverted). Connection-Stability-Scope wird zu **Phase 33** eskaliert. Block-A FPS-Lift code (Xvfb fakescreenfps, VAAPI libva probe, streamFpsCap schema, settings UI) bleibt landed und wirkt forward.

Closure-Doku: `.planning/phases/phase-32/32-CLOSURE-ADDENDUM.md` + `32-SUMMARY.md` (status FAILED-AT-MANUAL-UAT). Tag pending: `phase-32-closed-failed-manual`.

## Phase 33 - Connection Stability Deep Dive (PASS-AUTOMATED-PENDING-PI-HARDWARE)

Ziel: Make the SSR → Pi WebRTC connection rock-solid under all realistic operator usage. No image-hang. No persistent reconnect loops. No "Server-Restart hilft" workaround. System runs hours without intervention. Page-reload <10s recovery. Server cold-boot <10s recovery. Multi-cycle live-hardware acceptance matrix (10× cold-boot, 10× Pi-reload, 1h steady-state, 3 fault-injection scenarios).

Status: PASS-AUTOMATED-PENDING-PI-HARDWARE 2026-05-08. 363 default tests / 346 pass / 17 skip / 0 fail + 80/80 live integration tests + 10/10 manual repro 10× cold-boot. All 14 suspects fixed + regression-tested. 8 Pi-hardware UAT scenarios deferred to operator. Closure-Doku: `.planning/phases/phase-33/33-SUMMARY.md` + `33-VERIFICATION.md`.

Plans delivered:
- 33-W0 Test infrastructure (harness + smoke + state-leak)
- 33-01 Producer lifecycle wire-up (S4, S5, S7) — 8s frame-stale → 101ms server-push
- 33-02 Server self-healing (S6, S8, S12) — mediasoup auto-respawn + ssr-tab WS watchdog + PID-scoped purge
- 33-03 Receiver state-machine refactor (R-2, R-7, S11, S14) — ConnectionState enum + capped retry + GIVEN_UP + first-frame backoff reset
- 33-04 Operator telemetry (S10, S13) — status-detail line + GivenUp overlay + Retry button
- 33-05 Comprehensive test suite + Phase-32 hotfix regression
- 33-h1/h2/h3 Watchdog tri-state + cold-boot suppression + same-IP multi-consumer fix

Pflicht-Inputs (Phase-32-hotfix-night Diagnostik):
- `.planning/debug/phase-32-connect-baseline-p31.md`
- `.planning/debug/phase-32-connect-head-trace.md`
- `.planning/debug/phase-32-connection-comprehensive-audit.md`
- `.planning/debug/phase-32-connection-broken-research.md`
- `.planning/debug/phase-32-connection-broken-debug.md`

Milestones:
1. M1 Best-Practices-Research: Twilio/Daily/Jitsi/LiveKit/mediasoup-demo reconnect patterns dokumentiert (33-RESEARCH.md).
2. M2 State-Machine-Contract: schriftlicher Connection-State-Vertrag mit allen Timern, Messages, Transitionen (33-STATE-MACHINE.md).
3. M3 Reproducible Failure Harness: lokales Script reproduziert das Live-Failure innerhalb 5 Minuten (33-REPRO-HARNESS.md + test/manual/**).
4. M4 Three-Layer Isolation: Publisher / Signaling / Receiver einzeln testbar mit synthetischem Gegenstück.
5. M5 Comprehensive Test Suite: Unit + Live-Fixture + Stress + Fault-Injection + State-Leak.
6. M6 Operator Telemetry Surface: RECONNECTING countdown zeigt Last-Error-Reason + Total-Attempts + Last-Successful-Connect.
7. M7 Multi-Cycle Live UAT: ≥10× cold-boot, ≥10× Pi-reload, ≥1h steady-state, ≥3 fault-injection scenarios — alle PASS auf production hardware.

Exit Criteria:
- 10/10 cold-boots <10s connect, zero stuck-reconnect.
- 10/10 Pi-reloads <10s connect.
- ≥1h steady-state run, zero spontaneous reconnects.
- 3 fault-injection scenarios (kill server, kill mediasoup-worker, drop network) recover <30s.
- Integration tests reproduce live failure if it ever returns (the gap Phase 32 missed).
- Each fix references state-machine contract + has regression test (D-06 anti-hotfix-pattern).
- mp4 outside-sandstorm playback verified (incidental — confirms h9 GPU fix on hardware).

Out of Scope:
- Neue Animations-Typen oder Render-Features.
- Audio path changes (Pi-local stays).
- Codec change away from H264.
- WAN/TURN/Internet routing.
- FPS-Lift work über Phase 32 hinaus.

User Decisions (2026-05-08):
- Investigation BEFORE Code (D-01).
- No "Just-Try-Another-Hotfix" Pattern (D-06).
- Architectural refactor erlaubt falls Research zeigt dass production-grade reconnect das verlangt (D-07).
- Pi-Hardware UAT ist mandatorisch — Phase kann ohne Live-Hardware-Access nicht abgeschlossen werden.

Carrying Forward (LOCKED, do not re-open):
- D-A1: WebRTC + h264 + mediasoup
- D-A3: Headful Chromium 131 + Xvfb + puppeteer-stream
- Pi-local audio (D-D2 reversal)
- Server-authoritative state
- streamFpsCap + alignModeBoost settings (Phase 32 Block A)
- 12 hotfixes h1-h12 (h4 reverted) bleiben net-positiv baseline.

## Phase 34 - SSR Render-Quality + /output/ Thin-Consumer Refactor (PLANNING)

Ziel: Zwei Folge-Themen aus Phase 33 schließen, die NACH Wiederherstellung der WebRTC-Verbindung sichtbar wurden. Visuelle Render-Qualität im SSR-Tab herstellen (kein 2D-Fallback mit Banding) und `/output/` zu einem schlanken Consumer machen, der nur dekodierten Stream zeigt statt die volle App lokal nochmal zu rendern.

Status: PLANNING. Eingang sind die zwei in `.planning/phases/phase-33/33-CLOSURE.md` als "Outstanding (deferred to Phase 34)" gelisteten Items.

Scope (zwei Tracks):

**Track A — SSR-Tab GL→2D Fallback Fix.** Auf der aktuellen Hardware fällt der SSR-Tab Runtime auf 2D-Canvas zurück statt WebGL zu nutzen — sichtbar als Banding-Artefakte in solid-color Animationen (vom User auf gaming-PC + voraussichtlich Pi reproduziert). Lösung: explizites GL-Forcing im SSR-Tab Bootstrap + Härtung der Chrome GPU-Init Flags in `ssr-render-host.mjs`. Verifikation: Renderer-Detection-Probe meldet WebGL2 Context; visuelle Probe der bekannten Banding-Animation zeigt smooth gradients.

**Track B — `/output/` Thin-Consumer Refactor.** Aktuell lädt `/output/` die FULL App inklusive GIF-Decoder, Animations-Engine und Runtime-Orchestration und dekodiert lokal Animationen, obwohl es nur den vom Server kommenden H264-Stream + Pointer-Forwarding für Align-Mode brauchen würde. Doppelte Arbeit, doppelter CPU-Verbrauch, und der Pi vergeudet Cycles auf JS, das nichts darstellen darf. Lösung: Boot-Pfad split.
- `/output/?ssr=1` — full app (das ist der SSR-Tab selbst — bleibt unverändert).
- `/output/` (kein Param) — strip down to `<video>` + `receiver-bootstrap` + Align-Mode Pointer-Forwarder. Keine Runtime-Orchestration, keine GIF/MP4 Decoder, keine Animations-Engine.

Milestones:
1. M1 Track A — Renderer-Detection-Probe identifiziert ob aktueller SSR-Tab WebGL oder 2D nutzt; Root-Cause für GL→2D Fallback dokumentiert.
2. M2 Track A — Explizites GL-Forcing implementiert + Chrome GPU-Init Flags gehärtet (`ssr-render-host.mjs` Args). Verifikation: WebGL2-Kontext aktiv, Banding visuell weg.
3. M3 Track B — Bootstrap-Splitter implementiert: `?ssr=1` → full app; default → thin consumer (`<video>` + receiver + align-pointer).
4. M4 Track B — Pi-Performance-Probe vorher/nachher (CPU-Auslastung im /output/-Tab). Zielwert: deutlich messbare Reduktion.
5. M5 Beide Tracks — Live-Verifikation auf gaming-PC desktop browser + Pi-Hardware (sobald verfügbar). Phase 33 Connection-Stability darf nicht regressen.

Exit Criteria:
- Renderer-Detection im SSR-Tab meldet WebGL2 (nicht 2D-Canvas Fallback).
- Bekannte solid-color Banding-Animation rendert visuell ohne Banding.
- `/output/` ohne `?ssr=1` Param lädt KEINE GIF/MP4-Decoder, KEINE Animations-Engine, KEINE Runtime-Orchestration. Nur `<video>` + WebRTC-Receiver + Align-Pointer.
- `/output/?ssr=1` verhält sich identisch zum bisherigen SSR-Tab (no behavior regression).
- Pi `/output/`-Tab CPU-Verbrauch messbar geringer als vor dem Refactor.
- Phase 33 Connection-Stability bleibt PASS — SSR-Verbindung stabil über reload-cycles, kein Reconnect-Regress.
- VAAPI bleibt default-disabled (Phase 33 fix `3cd6748` carries forward).
- Tests in `test/connection-stability/**` weiterhin grün.

Out of Scope:
- VAAPI Re-Enable Versuche (bleibt opt-in via `SSR_ENABLE_VAAPI=1`).
- WebRTC State-Machine oder Reconnect-Logic Änderungen.
- Neue Animations-Typen oder Render-Features.
- Audio path changes.
- Codec change away from H264.

Pflicht-Inputs:
- `.planning/phases/phase-33/33-CLOSURE.md` — Outstanding-Sektion definiert beide Tracks.
- `.planning/phases/phase-33/33-SUMMARY.md` — Carry-forward defensive layers.

Carrying Forward (LOCKED, do not re-open):
- VAAPI default-disabled (Phase 33 commit `3cd6748`)
- Frame-stale 30s threshold + keyframe-on-resume + heartbeat-reset + RPC 20s + watchdog 150s tolerance (alle Phase 33 iter-fixes bleiben net-positiv).
- Alle in Phase 33 Carrying-Forward gelisteten Items.

**Plans:** 4/4 plans complete

Plans:
- [x] 34-W0-PLAN.md — Wave 0: contract tests (route-split, runtime-env, chrome-flags, thin-output script-graph, render-mode probe sink) — RED rails for Tracks A and B
- [x] 34-B-PLAN.md — Track B: atomic URL migration + thin /output/ — server route split (`/ssr` → index.html, `/output` → output.html), runtime-env classifier update, ssr-render-host.mjs URL migration (TWO sites), NEW output.html + output-audio-binder.js
- [x] 34-A-PLAN.md — Track A: GL flag fix (decouple hasIgpuDev from hasVaapiEnabled), 2D-fallback ban on `/ssr` only (D-02), force `state.renderMode = "gl"` on `/ssr`, ssr-stats renderMode telemetry log line
- [x] 34-V-PLAN.md — Verification + closure: 34-VERIFICATION.md, 34-HUMAN-UAT.md, 34-CLOSURE.md; D-06 final gate (connection-stability 80/0)

## Phase 35 - Thin /output/ Refactor + Align-Mode Decoupling + Banding Fix (PASS-AUTOMATED-PENDING-OPERATOR-UAT)

Ziel: Phase 34 hat das URL-split-Konzept richtig durchgezogen, aber zwei Defizite hinterlassen die Phase 35 schließt. (1) Der `runtime-projection-handle-ui.js` + `runtime-projection-handle-drag.js` + dependencies sind tief in die runtime-orchestration init-chain verwebt mit injected refs (grid-state, applyTransform, profileSaveFlow, ctx, etc.) — sie sind nicht standalone ladbar in der thin `output.html`. Resultat: Pi-/output/ zeigt zwar den H264-Stream, hat aber kein align-mode UI mehr. (2) Die Solid-color banding in 2D-canvas-fallback wurde in Phase 34 untersucht und als source-side bestätigt (encoder-bitrate-bump zeigte identische output bei 2M und 32M); die Hypothese "GL-flags entkoppeln" hat den Phase-33-class main-thread-hang reproduziert und wurde reverted. Phase 35 macht den eigentlichen refactor + sucht einen banding-fix der die Connection-Stability nicht verletzt.

Status: PASS-AUTOMATED-PENDING-OPERATOR-UAT (closes 2026-05-10; all 5 plans complete; D-06 fail=0 invariant upheld at 85/84/0/1; visual UAT-1/UAT-2 deferred to gaming-PC operator session per 35-HUMAN-UAT.md; D-08 Pi UAT items deferred per CONTEXT.md). Tag: `phase-35-end-pending-uat`. See `.planning/phases/phase-35/35-CLOSURE.md`.

Scope (drei Tracks):

**Track A — Align-mode decoupling.** Den polygon-editor + projection-handle-ui Code-Pfad isolieren: explizite `bootAlignMode({ video, getProfile, onDrag, ... })` API mit allen heutigen impliziten Abhängigkeiten als expliziten Args. Ziel: standalone-ladbar aus `output.html` ohne den Rest der runtime-orchestration init-chain. ~3000 LOC betroffen (handle-ui + handle-drag + projection-mapping + polygon-editor).

**Track B — Live-sync minimal subset.** Den live-sync WebSocket-subscription den audio-binder + align-mode brauchen aus der vollen `runtime-live-sync-core.js` herausziehen. Heute zieht der full live-sync 800+ LOC orchestration-state-merging Pi-irrelevanter logik mit sich. Ziel: thin subscription die nur trigger-events + outsideFx + roomFx mutations weiterreicht.

**Track C — Banding fix.** Drei kandidate-pfade (von Phase-34 closure dokumentiert):
- C1: **Source-side dithering** in der 2D-canvas color-overlay rendering. Klassischer 8-bit-trick — pseudo-random noise über solid-color overlays hinzufügen, bricht step-bänder visuell auf. ~5-10% FPS overhead.
- C2: **`--use-gl=swiftshader`** statt `--use-gl=angle` ausprobieren. Andere software-GL-backend, evtl ohne synchronous-flush-hang. Risk: andere render-issues.
- C3: **`SSR_ENABLE_VAAPI=1` opt-in test** auf user's hardware mit Phase-34-h2 als safety-baseline. Wenn Hardware das verträgt, hardware-GL liefert 16-bit-fp und beseitigt banding.

Phase 35 Wave-0 muss eine **live-end-to-end-smoke-test** beinhalten — Phase 34's miss kam daher dass automated tests code-shape geprüft haben aber niemand `/output/` mit beiden Tracks live geladen hat. Smoke-test soll: server starten, /output/ in Playwright öffnen mit system Chrome, verifizieren dass (a) stream playback funktioniert, (b) align-mode toggle aktiviert handles auf overlay, (c) drag-events durchkommen.

Pflicht-Inputs:
- `.planning/phases/phase-34/34-CLOSURE-ADDENDUM.md` — definiert die 3 Tracks
- `.planning/phases/phase-34/34-CONTEXT.md` — locked decisions die carry-forward gehen
- `src/app/runtime/output-receiver/receiver-bootstrap.js` — heutiges thin-receiver-fundament
- `src/app/runtime/viewport/runtime-projection-handle-ui.js` (1756 LOC), `runtime-projection-handle-drag.js` (941 LOC), `runtime-projection-mapping.js` (431 LOC), `runtime-polygon-editor.js` (575 LOC) — refactor-targets
- `src/app/runtime/live-sync/runtime-live-sync-core.js` — minimal-subset extraktions-target

Milestones:
1. M1 Track A — bootAlignMode API designed + projection-handle-ui ladbar standalone (no runtime-orchestration dep).
2. M2 Track B — minimal live-sync subscription extracted; audio-binder + align-mode beide nutzen es ohne full live-sync.
3. M3 Live-end-to-end smoke-test wave-0 rail liegt + ist in CI runnable.
4. M4 Track C — gewählten banding-fix-pfad implementiert + visual-confirmed via screenshot-vergleich.
5. M5 Live-UAT auf gaming-PC desktop browser: stream + align-mode handles + drag + no banding bei solid-color fade.

Exit Criteria:
- /output/ zeigt H264 stream PLUS funktionierendes align-mode (handles sichtbar, drag funktioniert, server bekommt `align-corner-drag` mutations)
- Visual smoketest: bekannte solid-color fade-animation auf gaming-PC zeigt KEINE step-bänder
- D-06 hard gate: `test/connection-stability/**` bleibt 72/0
- Phase 33 commit `3cd6748` (VAAPI default-disabled) UNCHANGED es sei denn user opt-in nach Track-C-C3 erfolgreich
- Wave-0 live-end-to-end smoke-test ist in master und wird in default `npm test` ausgeführt
- Pi /output/ thin-mode CPU-Verbrauch messbar geringer als pre-Phase-34 (deferred bis Pi hardware verfügbar — wie Phase 33 + 34 Pattern)

Out of Scope:
- Animations-engine refactor (separates Thema)
- Audio-pipeline-änderungen (Pi-local stays per D-D2)
- Codec-wechsel (H264 stays per D-A1)
- Phase-32-FPS-lift work
- VAAPI re-enable als default (bleibt opt-in)

Carrying Forward (LOCKED, do not re-open):
- VAAPI default-disabled (Phase 33 commit `3cd6748`)
- Phase 33 watchdog hardening + frame-stale 30s + heartbeat-reset + RPC 20s + watchdog 150s tolerance
- Phase 34 hotfix h1 (`/ssr` → OUTPUT_ROLE_FINAL classification)
- Phase 34 hotfix h2 (GL-flags gated on hasVaapiEnabled — restored Phase 33 baseline)
- D-A1 (WebRTC + h264 + mediasoup), D-A3 (Headful Chromium 131 + Xvfb)
- Pi-local audio (D-D2 reversal)
- streamFpsCap + alignModeBoost settings

**Plans:** 5/5 plans complete

Plans:
- [x] 35-W0-PLAN.md — Wave 0 BLOCKING rails: scripts/with_server.py + test/live-e2e/ (D-05 a-f) + 3 RED unit tests + CI integration (D-04, D-05, D-06) — CLOSED 2026-05-10 (commits e973d11, c5cd049, ccbf136, 2bb64f6, 0f59f85, f0588c7); D-06 hard-gate verified `pass=84 fail=0 skipped=1` on `test/connection-stability/*.test.mjs`; SUMMARY in 35-W0-SUMMARY.md
- [x] 35-B-PLAN.md — Track B live-sync minimal subset: bootOutputLiveSync + refactor output-audio-binder + receiver-bootstrap (D-02, D-06)
- [x] 35-A-PLAN.md — Track A pure-extract align-mode decoupling: bootAlignMode + 11 IIFE script-tag wiring in output.html + remove Wave-4 4-corner approximation (D-01, D-02, D-06)
- [x] 35-C-PLAN.md — Track C banding fix: Bayer 4×4 dither in runtime-effect-visuals.js solid-color path; conditional C2 SwiftShader escalation (D-03, D-04, D-06)
- [x] 35-V-PLAN.md — Verification + closure: 35-VERIFICATION.md, 35-HUMAN-UAT.md, 35-CLOSURE.md; D-06 final gate; operator UAT (all 8 D-decisions)

Phase 35 iter2 (post-UAT hotfixes):
- h1 (`bfddee2`): lazy-load align-mode bundle on /output/ (output-align-mode-loader.js, NEW). Initial scripts cut from 17 to 6; bundle prefetches 2s post-load; activates only when liveSync.onAlignModeChange fires true. Fixes the long-unstable-WebRTC-connection-then-stable pattern operator reported.
- h2 (`bfddee2`): real polygon data wiring backed by /api/boards reads. Replaces the Phase 35-A no-op stubs that made align-mode handles render against default rectangles.
- h3 (`bb7f2e2`): solid-color polygon clip restored. Track C had swapped fillRect→putImageData; putImageData ignores canvas clip path so solid-color animations flooded the bounding rectangle. Fix swaps to drawImage (which respects clip) via new getDitheredSolidColorCanvas helper. Bayer dither preserved.
- Verified live: DCL 0.04s, video 0.26s, 66 polygons rendered (65 non-rectangular), solid-color overlay polygon-clipped (53 distinct row-widths in 118 colored rows = 44.9% diversity), D-06 fail=0 preserved.
- Phase 35 status: CLOSED-PARTIAL-WITH-ITER2-HOTFIXES (supersedes premature PASS-AUTOMATED-PENDING-OPERATOR-UAT).
- Closure addendum: 35-CLOSURE-ITER2-ADDENDUM.md.

## Phase 36 - Comprehensive Align-Mode-on-Thin-/output/ (READY)

Ziel: Den vollen handle-ui (vertex / midpoint / rotation drag, image-pan, right-click menu für add/remove lines, CTRL+Z undo, dirty-flag, sizing alignment mit stream content) auf der thin /output/ funktionsfähig bringen, OHNE die volle Dashboard-App zu laden. Das ist die comprehensive Version von Phase 35-A's pure-extract Versuch — Phase 35-iter2 hat gezeigt dass die ad-hoc Hotfix-Iterationen nicht ausreichen weil handle-ui mehr implizite ctx-Abhängigkeiten hat als per-bug fixierbar sind.

Status: PLANNING.

Trigger: 2026-05-10 operator UAT nach Phase 35-iter2 h8 — sechs offene align-mode interaction bugs nach mehreren hotfix-Iterationen. h9 hat /output/ partial-reverted auf Phase 34's 4-corner approximation; volle handle-ui ist Phase 36 scope.

Scope (Wave-0 BLOCKING — RED tests pro interaction):
- T1 sizing: handle frame ist visuell aligned mit stream content (no ESC-required realignment)
- T2 corner pulls: alle 4 corner handles ändern den stream sichtbar
- T3 vertex drag: Eckpunkte greifen den richtigen Vertex (nicht falsche corner-id von hitTest fallback)
- T4 midpoint drag: Linie-Stauch handles sind klickbar + funktionieren  
- T5 rotation handles: rotation greifbar, Drehung wird im stream übernommen
- T6 image-pan: Drag im freien Bereich verschiebt stream-content
- T7 right-click menu: Kontextmenü zum Hinzufügen/Löschen von Linien erscheint
- T8 CTRL+Z undo: macht Verzerrungen rückgängig im stream
- T9 dirty-flag: reagiert auf jede gesture, propagiert zum dashboard-side dirty-indicator
- T10 receiver-input-forwarder + bootAlignMode konflikt-frei (nicht beide gleichzeitig aktiv)

Pflicht-Inputs:
- `.planning/phases/phase-35/35-CLOSURE-ITER2-ADDENDUM.md` — h9 root-cause analysis
- `src/app/runtime/output-receiver/output-align-mode.js` — Phase 35-A bootAlignMode Versuch (NICHT geladen, reference)
- `src/app/runtime/output-receiver/output-align-mode-loader.js` — Phase 35-iter2 h1+h2 lazy-loader Versuch (NICHT geladen, reference)
- `src/app/runtime/viewport/runtime-projection-handle-ui.js` (1756 LOC) — handle-ui infrastruktur
- `src/app/runtime/viewport/runtime-projection-handle-drag.js` (941 LOC) — drag handlers
- `src/app/runtime/runtime-orchestration.js` — dashboard's handle-ui init (für ctx-kontrolle)
- `src/styles.css` line ~119, ~199 — pointer-event flow zwischen #ssr-input-overlay, #stage, #room-overlay
- Phase 31 h32 architecture comment in handle-ui.js (line 1617-1622) — pre-Phase-35 architecture rationale

Forschungsfragen (RESEARCH.md scope):
- Was sind ALLE ctx-fields die handle-ui auf /output/ tatsächlich aufruft? (vollständige inventur — nicht stub-by-grep)
- Gibt's "init bundles" die als geschlossene units übernommen werden können (z.B. profile-persistence init mit dependencies + alle deren writers)?
- Wie löse ich den event-handling Konflikt zwischen `#ssr-input-overlay` (z:4) und handle-ui Handles (z:9999)? Drei kandidate Pfade: (a) `#ssr-input-overlay` pointer-events:none wenn handle-ui aktiv, (b) Handles z-index über overlay, (c) handle-ui events bubblen von ssr-input-overlay
- Soll handle-ui auf /output/ einen "thin export" entry-point bekommen (Option H aus iter2 discussion)?

Three-options analysis:
- **Option D-extended:** Erst-mal ALLE missing wirings auf einmal in einem cleanen RESEARCH+PLAN cycle (statt iterativ)
- **Option H:** handle-ui refactor zum first-class thin-export pattern. Bigger diff aber sustainable.
- Hybrid: Option D-extended für jetzt, Option H als deferred refactor wenn sich's lohnt.

Pflicht-Wave-0: Live-E2E test-rail erweitern um T1-T10 Assertions. Vor jedem code change muss eine RED test existieren der die failure mode reproduziert.

Milestones:
1. M1 RESEARCH: ctx-inventur fertig + event-handling Konflikt-Lösung gewählt
2. M2 Wave-0 RED tests existent + funktionieren als regression-Detektoren
3. M3 Implementation Wave 1: sizing + corner-pulls (T1+T2)
4. M4 Implementation Wave 2: vertex/midpoint/rotation drag (T3+T4+T5)
5. M5 Implementation Wave 3: image-pan + right-click + CTRL+Z + dirty (T6+T7+T8+T9)
6. M6 Live-UAT: alle 10 interactions funktional, D-06 fail=0 preserved

Exit Criteria:
- Operator-tested align-mode auf gaming-PC desktop browser zeigt:
  - Korrekte handle-frame-Größe (kein ESC-Realign nötig)
  - Alle handle-Typen klickbar + verschieben den richtigen Bereich im stream
  - Right-click menu erscheint, CTRL+Z undoes, dirty-flag korrekt
- D-06 hard gate `test/connection-stability/**` bleibt `fail=0`
- /output/ bleibt thin (≤8 src-based scripts initial; align-mode bundle lazy-loaded wie h1)
- Dashboard align-mode regression check: dashboard side weiterhin funktional

Out of Scope:
- Voll-App auf /output/ laden (verletzt thin-Ziel)
- /align separate URL (UX-Änderung — operator soll auf /output/ direkt arbeiten)
- Audio-pipeline-Änderungen
- Codec-wechsel von H264

Carrying Forward (LOCKED, do not re-open):
- VAAPI default-disabled (Phase 33 commit `3cd6748`)
- Phase 34 hotfix h2 (hasVaapiEnabled-gated GL flags)
- Phase 35-iter2 h3 banding fix (Bayer dither + drawImage clip)
- Phase 35-iter2 h1+h2 als reference material (lazy-loader pattern + polygon-data wiring)
- Phase 35-B output-live-sync.js (proven thin subscription)


**Plans:** 5/7 plans executed

Plans:
- [x] 36-W0-PLAN.md — RED test rails (T1-T10 Live-E2E + dashboard parity + bootHandleUi shape unit + server.mjs dirty-flag stdout log) — COMPLETE 2026-05-10 (commits fd0078e, a6e2529, 3a0c99a; SUMMARY: 36-W0-SUMMARY.md; closure gates ALL pass)
- [x] 36-A1-PLAN.md — Option-H thin-export: bootHandleUi + emitLiveMutation + grid-state liveSyncCoreOverride DI + ?ctx-trace=1 harness — COMPLETE 2026-05-10 (commits a6a86a6, a1b3e20, 06efd15; SUMMARY: 36-A1-SUMMARY.md; bootHandleUi RED→GREEN pass=3 fail=0; D-08 connection-stability fail=0 preserved; dashboard regression untouched)
- [x] 36-A2-PLAN.md — Loader integration (bootHandleUi wiring with FULL §1.5 inventory dep-bag + idempotent JS-time stage/room-overlay DOM append + Q1 alignModeDirtyEndpoint LOCKED) + D-02 (a) inversion (overlay pointer-events:none permanent in receiver-bootstrap.js) + Phase 35-A CSS `pointer-events:none !important` rule REMOVED — COMPLETE 2026-05-10 (commits 584ae6e, d451e1e; SUMMARY: 36-A2-SUMMARY.md; D-08 fail=0 preserved; D-09 script-tag count unchanged at 1; output.html UNCHANGED; bootHandleUi reachable from /output/ via lazy-loader; M3 unblocked)
- [x] 36-M3-PLAN.md — Wire T1 (sizing) + T2 (corner pulls) + T10 (no dual-path conflict). M3-LATE: dashboard runtime-orchestration migration to bootHandleUi
- [x] 36-M4-PLAN.md — Wire T3 (vertex drag) + T4 (midpoint drag) + T5 (rotation handle)
- [ ] 36-M5-PLAN.md — Wire T6 (image-pan) + T7 (right-click menu) + T8 (CTRL+Z undo) + T9 (dirty-flag); Q3 LOCK (immediate broadcast on add/remove line) + Q5 LOCK (1000-entry undo cap)
- [ ] 36-V-PLAN.md — Verification: 36-VERIFICATION.md + 36-HUMAN-UAT.md (Pi UAT deferred per D-10)

## Phase 37 - Transformation Banding Fix (DEFERRED)

Ehemalige Phase 36 (umnummeriert weil align-mode dringender). Ziel: Die Streifen aus dem projection-transform path eliminieren, die beim 2D-fallback warp-output entstehen — nicht der solid-color-overlay-banding den Phase 35 mit Bayer dither gefixt hat. Das ist die Phase-32-class banding die der User mehrfach beschrieben hat ("die bekannten Streifen die durch GL gefixed wurden"). Phase 32 hatte das durch `--ignore-gpu-blocklist + --enable-gpu-rasterization` GL-flags gelöst, Phase 34 hotfix h2 hat diese flags reverted weil Mesa-llvmpipe synchron-flush gehängt hat. Phase 37 muss einen alternativen Pfad finden der die Connection-Stability nicht verletzt.

Status: DEFERRED bis Phase 36 (align-mode) abgeschlossen ist.

Trigger: 2026-05-10 operator UAT nach Phase 35 close — "Die bekannten Streifen die bereits mehrfach gefixed wurden (durch GL?) wegen der transformation sind wieder da".

Scope (zwei kandidate-Pfade):

**Pfad C2 (Phase 35 deferred, primary):** `--use-gl=angle --use-angle=swiftshader` als Chrome-flag. SwiftShader ist Google's pure-software GL ES backend mit 16-bit-fp internal precision (anders als Mesa-llvmpipe's 8-bit). Wichtig: NICHT `--use-gl=swiftshader` (Chromium docs markieren das als kaputt). Risk-Surface: ssr-render-host.mjs Chrome-flag-line. D-06 hard-gate connection-stability MUSS bleiben. Die hasVaapiEnabled-gated `--ignore-gpu-blocklist` + `--enable-gpu-rasterization` flags BLEIBEN UNCHANGED (Phase 34 h2 lock). Nur das `--use-angle=default` → `--use-angle=swiftshader` swap.

**Alternativ (research-required):** Alternative software-GL-stacks (z.B. Mesa-llvmpipe mit specific env-vars wie LIBGL_ALWAYS_SOFTWARE=1 + GALLIUM_DRIVER=llvmpipe + LP_NUM_THREADS=...) oder higher-precision shader path im 2D-fallback-renderer.

Pflicht-Inputs:
- `.planning/phases/phase-35/35-CLOSURE-ITER2-ADDENDUM.md` — Bug 3 specification
- `.planning/phases/phase-34/34-CLOSURE-ADDENDUM.md` — Phase 34 h2 GL-flag-revert rationale (Mesa-llvmpipe hang)
- `.planning/phases/phase-33/33-CLOSURE.md` — VAAPI-default-disabled rationale
- `.planning/phases/phase-32/32-SUMMARY.md` — wo `--ignore-gpu-blocklist + --enable-gpu-rasterization` landed wurden (the original Phase 32 banding fix)
- `src/server/ssr-render-host.mjs` — Chrome flags
- `src/app/runtime/viewport/runtime-projection-2d-fallback-renderer.js` — banding source path
- `src/app/runtime/viewport/runtime-projection-gl-renderer.js` — alternative if GL flags can be enabled safely

Wave-0 mandate: live-end-to-end-smoke-test extended with **transformation-banding visual regression assertion** (operator-known animation that triggered the original report; pixel-distinct-values measurement proxy for visible bands; before/after screenshot comparison). Phase 35-iter2 hat gezeigt dass der bisherige solid-color smoketest (41 distinct values) nichts über transformation-bands aussagt — neue Metrik nötig.

Milestones:
1. M1 Research: confirm SwiftShader doesn't have the synchronous-flush issue Mesa-llvmpipe has (RESEARCH §A3 carry-over from Phase 35).
2. M2 C2 SwiftShader swap implementation behind feature-flag (default off).
3. M3 Visual smoketest extended.
4. M4 Live-UAT auf gaming-PC: bands gone + connection stable.
5. M5 If C2 fails (hangs OR bands persist), document in 36-CLOSURE-ADDENDUM and propose Phase 37.

Exit Criteria:
- Operator-known animation rendered through projection-transform path shows no visible bands on gaming-PC desktop browser
- D-06 hard gate `test/connection-stability/**` stays `fail=0`
- Phase 33 commit `3cd6748` (VAAPI default-disabled) UNCHANGED
- Phase 34 hotfix h2 (`hasVaapiEnabled`-gated GL flags) UNCHANGED
- Phase 35-iter2 h1 (lazy-load) UNCHANGED — initial /output/ script-count stays ≤8
- Phase 35-iter2 h2 (real polygon data) UNCHANGED

Out of Scope:
- Animations-engine refactor (separates Thema)
- Audio-pipeline-änderungen (Pi-local stays per D-D2)
- Codec-wechsel (H264 stays per D-A1)
- VAAPI re-enable als default (bleibt opt-in)
- Pixel-diff visual regression suite (Phase 34/35 deferred)

Carrying Forward (LOCKED, do not re-open):
- VAAPI default-disabled (Phase 33 commit `3cd6748`)
- Phase 33 watchdog hardening + frame-stale 30s + heartbeat-reset + RPC 20s + watchdog 150s tolerance
- Phase 34 hotfix h1 (/ssr → OUTPUT_ROLE_FINAL classification)
- Phase 34 hotfix h2 (hasVaapiEnabled-gated GL flags — Phase 33 baseline)
- Phase 35 D-A1 (WebRTC + h264 + mediasoup), D-A3 (Headful Chromium 131 + Xvfb)
- Pi-local audio (D-D2 reversal)
- streamFpsCap + alignModeBoost settings
- Phase 35 Bayer 4×4 dither at runtime-effect-visuals.js (solid-color overlay path)
- Phase 35-iter2 h1 lazy-load pattern (output-align-mode-loader.js)
- Phase 35-iter2 h2 polygon-data /api/boards wiring
