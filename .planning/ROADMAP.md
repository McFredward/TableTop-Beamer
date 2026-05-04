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

## Phase 28 - Cross-cutting UX & State Polish (CLOSED)
Ziel: Mehrere kleinere, voneinander entkoppelte UX/State-Probleme nach Phase-27-Closure beheben — board-gebundene Align-Profile, board-switch save-gate-Parität, Asset-Lifecycle-Korrektheit (Dirty-Flag-Hygiene + saubere Delete-Modals + Cache-Invalidierung bei Re-Upload mit gleichem Namen) und Diagnostic-Overlay-Cross-Client-Sync samt Topbar-Layout-Fix.

Status: CLOSED am 2026-05-04. 6 Plans (28-00..28-05) ausgeführt; Test-Suite 25/25 grün; Verifier 32/32 automated PASS. 7 Items im 28-HUMAN-UAT.md erwarten Browser-Smoke vom User. Closure-Doku: `.planning/phases/phase-28/SUMMARY.md`. Tag: `phase-28-end`. Final version: `0.28.0`.

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
