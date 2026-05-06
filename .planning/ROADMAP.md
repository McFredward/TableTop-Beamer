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

## Phase 31 - Server-Side Rendering Pivot (PLANNING)
Ziel: Architektonischer Pivot — Pi 4 wird zum Thin-Display-Client. Der Server (deutlich stärkere Hardware) übernimmt die komplette Render-Pipeline (Animations-Decode, Compositing, Mesh-Warp / Projection-Mapping, Multi-Area, Effects). `/output/` auf dem Pi konsumiert ausschließlich einen finalen Pixel-Stream. User-facing Verträge bleiben identisch: Align-Mode, 4-Ecken-Projection-Mapping, Multi-Area, Animation-Timeline, alle bisherigen Animations-Typen (coded, gif, mp4, solid-color). Es ändert sich ausschließlich der **Render-Ort**.

Status: PLANS READY (2026-05-06). Discuss-Phase + Research-Phase abgeschlossen. CONTEXT.md (D-A1..D-D4 LOCKED, D-X1..D-X8 Researcher-Discretion), RESEARCH.md (mediasoup + puppeteer-stream + Xvfb headful Chromium stack, audio-capture risk-flagged) und VALIDATION.md liegen vor. Plan-Set 31-00..31-06 (7 Plans) execute-ready.

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
