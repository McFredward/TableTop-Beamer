---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Release ready (Phase 49 closed 2026-05-19)
last_updated: "2026-05-19T00:00:00.000Z"
progress:
  total_phases: 47
  completed_phases: 14
  total_plans: 76
  completed_plans: 168
  percent: 100
---

# STATE

## Project

- Name: TT Beamer - Nemesis Overlay Prototype
- Context: Brettspiel-Beamer-Projekt fuer visuelle, nicht spielbeeinflussende Overlays
- Product Focus: Transition von OG-Nemesis auf boardspiel-agnostischen Katalogbetrieb

## Lifecycle

- Planning Mode: active
- Current Phase: — (52 closed 2026-05-22, shipped as v1.0.3)
- Current Phase Key: (none — live)
- Last Prepared: 2026-05-22
- Execution Readiness: LIVE (TT-Beamer shipped v1.0.0 after Phase 49; each subsequent phase bumps the version per durable feedback memory)
- Previous Phase: 52 (CLOSED — 2026-05-22, Released as v1.0.3, Per-animation transforms + live-editor temporary/permanent distinction. New collapsible Transform card in the animation editor edit pane (room mp4/gif only — matches live editor's gate) with the 6 transform field controls. New "Save as default for this animation" button in the live editor that commits all live-editor field values back to the animation definition for any scope (room/inside/outside). Done now strictly means "temporary for this run" — removed the silent transform-persist that previously made Done also a commit path. UX choice: button over checkbox so the user can tune freely first then explicitly commit.)
- Earlier Phase: 51 (CLOSED — 2026-05-22, Released as v1.0.2, Animation Name input keystroke focus loss — _lastDirtyState transition gate on the blur inside syncDirtyBar.)
- Older Phase: 50 (CLOSED — 2026-05-21, Released as v1.0.1, Aspect-ratio-aware board import.)
- Older Phase: 49 (CLOSED — 2026-05-19, Released as v1.0.0, Release-Prep Small-Fixes Sammelphase: original Windows hardening (49-A Ctrl+C in existing shell + 49-B Job-Object close kill) plus 28 operator-UAT-driven gap-closures spanning align-mode SSR desync, dashboard 8 Hz CPU drain, mobile drag-reorder, mobile portrait viewport zoom + cluster-rail clipping, animation-editor dirty-bar UX, board-switch profile fallback, 'Import from other board' feature, undo-to-baseline dirty-flag handling, polygon-edit SSR propagation, Win32 dashboard white-page + verdict-line crash.)
- Last Executed Plan: 47-03 — Wave 3 Windows operator-facing diagnostics + INSTALL/USAGE docs polish. Three stable operator-greppable INFO log lines added to `src/server/ssr-render-host.mjs`: (1) launch banner inside `if (isWin32)` — `[ssr-host] launching headless={new|false} on Win32 (userDataDir=<tmp>[, SSR_WIN_HEADLESS=0])` — replaces the Wave-2 transient `[ssr-host] win32 launch:`; (2) Win32 verdict inside `if (process.platform === "win32")` after publisher try/catch — `[ssr-host] win32 verdict: OK browserConnected=<bool> producerIds=[<csv>]` OR `[ssr-host] win32 verdict: FAILED <reason>`; (3) env-gated args dump (platform-agnostic) — `[ssr-host] launch args (<platform>): <joined chromium args>` when `SSR_LOG_LAUNCH_ARGS=1`. Args composition refactored to named `const chromiumArgs = buildChromiumLaunchArgs({...})` single-source-of-truth (dump logs exact array passed to launcher()). New `test/phase-47-diagnostics.test.mjs` (3 source-grep tests P/Q/R, same pattern as test/phase-34-render-mode-probe.test.mjs) pins the literal substrings. `docs/INSTALL.md` +4 subsections under "## Windows 10 / 11" (Expected behavior, Operator UAT checklist with 6-item sign-off list, SSR_WIN_HEADLESS escape hatch, SSR_LOG_LAUNCH_ARGS bug-report dump). `docs/USAGE.md` +1 top-level "## Cross-platform behavior" section + Contents entry — explicit Win+Linux parity statement (no visible Chrome window on either; Ctrl+C cleanup within 5s on both). Linux boot-log surface byte-identical when SSR_LOG_LAUNCH_ARGS unset (all new logger.info calls inside Win32 or env-knob gates). npm test 421/401/1/19 → 424/404/1/19 (+3/+3; same 1 pre-existing 04-T3 fail; same 19 skipped). Phase-47 suite 18/18 green (Wave-1's 9 + Wave-2's 6 + Wave-3's 3). `bash start.sh --dry-run` exits 0. logger.info count 13 → 16 (matches plan prediction). Zero deviations — clean RED→GREEN+docs cycle. Commits: 485d336 (RED), 60dc5e5 (GREEN), ac2afb2 (docs).
- Planned Next Execution: Phase 47 Plan 04 — Wave 4 operator UAT on operator's Windows 11 box. D-03 empirical proof: headless-new + getDisplayMedia + WebRTC producer parity on Win11. UAT runbook uses Wave-3 diagnostic strings (`[ssr-host] launching headless=`, `[ssr-host] win32 verdict:`) as greppable start.log contracts and docs/INSTALL.md Operator UAT checklist (6 items) as the sign-off list. Escape hatch (`SSR_WIN_HEADLESS=0`) + args dump (`SSR_LOG_LAUNCH_ARGS=1`) documented as operator fallbacks.
- Last Execution Summary: Phase 47 Plan 03 closed 2026-05-17 (Wave 3 — operator diagnostics + INSTALL/USAGE docs). Files: src/server/ssr-render-host.mjs (Wave-2 transient log replaced with Wave-3 banner inside if(isWin32); Win32 verdict line added after publisher try/catch; named `const chromiumArgs` + SSR_LOG_LAUNCH_ARGS=1 env-gated dump); test/phase-47-diagnostics.test.mjs (created — 3 source-grep tests P/Q/R); docs/INSTALL.md (+4 subsections under Windows section); docs/USAGE.md (+1 top-level Cross-platform behavior section + Contents entry). Tests: 424 / 404 pass / 1 pre-existing fail (04-T3 baseline) / 19 skipped. Linux non-regression rail (LINUX_ITER15_BASELINE) still green — Wave 3 added no logger.info outside Win32/env-knob gates. Wave 4 (Plan 47-04) operator UAT is the only remaining Phase-47 gate.

## Source Inputs

- docs/PHASE1-BACKLOG.md
- docs/PHASE1-PLAN.md
- docs/PHASE2-PLAN.md

## Decision Log

- Phase-10 closure baseline ist PASS und bindend: Plan 10-HF9 schliesst command reliability/performance hardening inklusive FAIL->PASS Matrix.
- Phase-11 Startregel ist bindend: unmittelbar nach Phase-10 closure startet ein execute-ready UX-Acceleration-Wave (Plan 11-1).
- Phase-11 Scope-Regel ist bindend: Settings-Subtabs + Quick-Modi (`activate`/`deactivate`/`clear`) fuer sequenzielle Room-Taps sind primaere Ziele.
- Phase-11 Mobile-Regel ist bindend: one-handed fast operation (sticky action rail, grosse Tap-Ziele, stabile Board-Uebersicht) ist Pflichtgate.
- Phase-11 Safety-Regel ist bindend: Quick-Mode-Status ist immer explizit sichtbar; action success/failure/timeout darf nie still bleiben.
- Plan-11-1 Umsetzung: Settings-Workspace ist in drei Subtabs gegliedert (`Board & Geometry`, `Animations`, `System & Performance`) mit stabiler Tab-Memory.
- Plan-11-1 Umsetzung: Quick-Mode-Engine (`off`/`activate`/`deactivate`/`clear`) ist room-tap-gesteuert, explizit sichtbar und mode-switch/inflight-guarded.
- Plan-11-1 Umsetzung: Mobile one-handed UX nutzt sticky Quick-Action-Rail + Board-Overview-Guard; Acceptance-Matrix ist PASS (`11-1-VERIFICATION.md`).
- Neues verpflichtendes Phase-11 P0-Paket ist bindend: Outside-Mode-Sync darf keinen zweiten `Apply changes`-Click benoetigen; erster valider Apply/Snapshot ist deterministisch fuer alle Clients inkl. `/output/final`.
- Neues verpflichtendes Phase-11 P0-Paket ist bindend: abgelaufene one-shot globale Events duerfen nach Reload/Reconnect nie replayen (terminal lifecycle persistence/hydration).
- Neues verpflichtendes Phase-11 Featurepaket ist bindend: globale Animationen erhalten pro Eintrag `Loop until stopped` als explizite Laufzeitoption.
- Neues verpflichtendes Phase-11 UX-Simplification-Paket ist bindend: Room-Animationen entfernen `Hold until I stop`; Runtime-Verhalten ist immer hold-until-stop.
- Neues verpflichtendes Phase-11 Model-Paket ist bindend: imported-vs-non-imported Board-Split wird entfernt; ein kanonisches Board-Catalog/Storage-Modell gilt fuer alle Boards.
- Plan 11-HF1 ist als execute-ready Prioritaetswelle gesetzt und blockiert Plan 11-2 bis PASS closure mit Matrix-Evidenz und Artefakt-Sync.
- Plan-11-HF1 Umsetzung: `outside-apply-changes` wird als deterministische state-sync Mutation priorisiert und nicht mehr koalesziert; first-apply propagated snapshot closes without second click.
- Plan-11-HF1 Umsetzung: globale one-shot hydration behaelt authoritative `startedAtEpochMs`; abgelaufene Events replayen nach reload/reconnect nicht mehr.
- Plan-11-HF1 Umsetzung: per-global `Loop until stopped` ist als Inside-Definition-Option persistiert; room runtime bleibt strikt always-hold ohne hold-checkbox UI.
- Plan-11-HF1 Umsetzung: Board storage/catalog wurde auf kanonische `config/boards` + `config/boards/assets` Pfade vereinheitlicht inkl. idempotenter Legacy-Migration von `config/boards/imported`.
- Kritische Korrektur nach HF1 ist bindend: globale Animationen sind im Runtime-Betrieb regressiert und muessen per sofortiger Recovery-Welle wieder deterministisch start-/sichtbar sein.
- Verbindliche UX-Korrektur fuer Phase 11: Loop-Steuerung fuer globale Trigger liegt als schneller Dashboard-Checkbox-Entscheid pro Trigger (`one-shot` vs `loop until stopped`) und darf keine Definitionsbearbeitung erfordern.
- Plan 11-HF2 ist als verpflichtende execute-ready Recovery-Welle gesetzt und blockiert Plan 11-2 bis FAIL->PASS closure mit expliziter Global-Start/Stop-Evidenz.
- HF2-Sicherheitsregel: bestehende globale `stop`/`clear` Semantik bleibt unveraendert deterministisch und wird als Non-Regression-Hard-Gate geprueft.
- HF2-Klarstellung: die in HF1 eingefuehrte definitionsgebundene Loop-Steuerung gilt als field-invalidated Bedienpfad; kanonischer Operator-Pfad ist per-trigger Dashboard-Loop-Auswahl.
- Kritisches P0-Feedback nach HF3 ist bindend: globale Loop-Animationen laufen weiterhin, aber non-loop globale Trigger erscheinen nicht mehr auf `/output/final`.
- Plan 11-HF4 ist als verpflichtende execute-ready Recovery-Welle gesetzt und blockiert Plan 11-2 bis FAIL->PASS closure.
- HF4-Renderregel: non-loop globale Trigger muessen auf `/output/final` deterministisch sichtbar sein und exakt einmal fuer die volle Soll-Dauer laufen.
- HF4-Non-Regression-Regel: loop mode bleibt unveraendert PASS; bestehende globale `stop`/`clear` Semantik bleibt unveraendert deterministisch.
- HF4-Evidenzregel: Wave-Close erfordert explizites FAIL->PASS fuer `/output/final` one-shot duration parity gegen Control.
- Plan-11-HF4 Umsetzung: `trigger-global` starts werden server-authoritativ mit `startedAtEpochMs` rebased; non-loop globals sind auf `/output/final` wieder sichtbar und laufen volle 4s exakt einmal.
- Plan-11-HF4 Umsetzung: Loop-Mode sowie globale `stop`/`clear` Semantik bleiben non-regressed PASS; control-vs-final one-shot FAIL->PASS parity ist geschlossen (`11-HF4-VERIFICATION.md`, `P11-HF4-T6-FAIL-PASS-PROOF.md`).
- Kritisches P0-Follow-up nach HF4 ist bindend: non-loop globale Trigger laufen aktuell nur auf dem initiierenden Client; Peers und `/output/final` sind nicht deterministisch synchronisiert.
- Plan 11-HF5 ist als verpflichtende execute-ready Recovery-Welle gesetzt und blockiert Plan 11-2 bis FAIL->PASS closure.
- HF5-Root-Cause-Regel: initiator-only Fehlerpfad wird verbindlich entlang command emission vs server apply vs snapshot/event fanout isoliert und geschlossen.
- HF5-Authoritative-Regel: non-loop globale Trigger sind server-authoritativ und replizieren exakt einmal an Initiator, Peers und `/output/final`.
- HF5-Optimistic-Guard-Regel: lokale optimistic one-shot Renderpfade duerfen keine distributed-sync Fehler maskieren (remove/guard verpflichtend).
- HF5-Non-Regression-Regel: loop mode sowie bestehende globale `stop`/`clear` Semantik bleiben unveraendert deterministisch PASS.
- HF5-Evidenzregel: Wave-Close erfordert strikte multi-client FAIL->PASS one-shot duration parity (Initiator + Peers + `/output/final`).
- Plan-11-HF5 Umsetzung: non-loop globals fanouten server-authoritativ mit kanonischem run-id/trigger-revision Vertrag; initiator/peer/`/output/final` erhalten exakt einen Run.
- Plan-11-HF5 Umsetzung: lokale optimistic non-loop global-start Maskierung ist entfernt; Runtime wartet auf Snapshot-Fanout und meldet pending/failure explizit.
- Plan-11-HF5 Umsetzung: loop + stop/clear Non-Regression sowie strict multi-client FAIL->PASS parity sind PASS (`11-HF5-VERIFICATION.md`, `P11-HF5-T7-FAIL-PASS-PROOF.md`).
- Kritisches P0-Follow-up nach HF5 ist bindend: non-loop globale Trigger werden auf Peers und `/output/final` teils gesehen, aber durch polling/hydration vor sichtbarer Voll-Dauer vorzeitig beendet.
- Plan 11-HF6 ist als verpflichtende execute-ready Recovery-Welle gesetzt und blockiert Plan 11-2 bis FAIL->PASS closure.
- HF6-Seen-Once-Regel: sobald ein Client eine non-loop trigger revision sieht, muss die lokale Wiedergabe exakt einmal fuer die volle konfigurierte Dauer laufen.
- HF6-Polling-Regel: Polling-Snapshots duerfen gestartete one-shot Runs nie vorzeitig beenden, ausser eine explizite stop/clear revision liegt vor.
- HF6-Non-Regression-Regel: loop mode bleibt unveraendert; bestehende globale `stop`/`clear` Semantik bleibt autoritativ und unmittelbar.
- HF6-Evidenzregel: Wave-Close erfordert deterministische multi-client Tests fuer `seen-once -> full local playback` unter Polling (Initiator + Peers + `/output/final`).
- Plan-11-HF6 Umsetzung: seen non-loop trigger revisions werden lokal revisionsgebunden retained und laufen exakt einmal fuer volle Soll-Dauer ab dem lokalen Seen-Zeitpunkt.
- Plan-11-HF6 Umsetzung: polling/hydration snapshots beenden aktive one-shots nicht mehr ohne explizite stop/clear Autoritaet; `globalClearRevision` deckt clear-authority fuer polling-only Clients ab.
- Plan-11-HF6 Umsetzung: loop + stop/clear Non-Regression sowie deterministic multi-client polling FAIL->PASS parity sind PASS (`11-HF6-VERIFICATION.md`, `P11-HF6-T7-FAIL-PASS-PROOF.md`).
- Kritisches P0-Feedback nach HF7 ist bindend: aktuell laden alle Boards nur noch das default fallback polygon; kanonisch gespeicherte board play-areas werden nicht angewendet.
- Kritisches P0-Feedback nach HF7 ist bindend: `Load global defaults` stellt board-spezifische play-areas derzeit nicht korrekt wieder her.
- Plan 10-HF8 ist als verpflichtende Recovery-Welle gesetzt und blockiert Plan 10-1 erneut bis FAIL->PASS closure mit all-board Matrix.
- HF8-Determinismusregel: play-area loading/apply muss fuer ALLE Boards strikt aus kanonischen gespeicherten Quellen erfolgen, inklusive startup/reload/defaults-apply und ohne board-spezifische Sonderpfade.
- HF8-Defaultsregel: `Load global defaults` muss board-spezifische kanonische play-areas wieder anwenden (kein global-default-only Overshadow, kein silent fallback rectangle).
- HF8-Fehlerfeedbackregel: canonical polygon load/apply failures duerfen nie still maskiert werden; UI muss expliziten user-visible Fehler (toast/status) mit board/area/source Kontext zeigen.
- HF8-Fallbackregel: default fallback polygon ist nur als explizit gemeldeter degraded path erlaubt; silent fallback ohne Operator-Hinweis ist unzulaessig.
- HF8-Paritaetsregel: control-view und `/output/final` bleiben auf demselben canonical play-area resolver Vertrag mit identischer area-id-set-Ausgabe.
- Plan-10-HF8 Umsetzung: `Load global defaults` nutzt canonical-first apply; lokale fallback-Polygone ueberschreiben geladene board-spezifische canonical play-areas nicht mehr.
- Plan-10-HF8 Umsetzung: canonical load/apply degradations erzeugen explizite issue-Signale mit board/source Kontext und werden via status/toast sichtbar statt still maskiert.
- Plan-10-HF8 Umsetzung: control-view vs `/output/final` parity (`set`, `areaCount`, `areaIdSet`) sowie all-board lifecycle/browser matrix sind PASS (`P10-HF8-T8`, `P10-HF8-T9`).
- Plan-10-HF8 Umsetzung: FAIL->PASS closure ist dokumentiert (`P10-HF8-T10-FAIL-PASS-PROOF.md`); Plan 10-1 ist erneut freigegeben.
- Neues verpflichtendes P0-Problem fuer Phase 10 ist bindend: mobile/low-end Clients sehen wiederholt Command-Timeouts (`trigger-room` und `stop`) unter Last; Command-Verarbeitung muss deterministisch, unmittelbar und no-drop sein.
- Neues verpflichtendes P0-Problem fuer Phase 10 ist bindend: Performance auf `Nemesis Lockdown Board A` ist auf Handy/Raspberry Pi unzureichend (langes Laden, ruckeliges `sandstorm.mp4`, board-switch latency).
- Plan 10-HF9 ist als priorisierte execute-ready Hotfix-Welle gesetzt und blockiert Plan 10-1 erneut bis FAIL->PASS closure.
- HF9-Command-Regel: command pipeline wird ack/timeout/resend-path gehaertet, mit fairer Queue-Scheduling-Strategie und no-drop Semantik auch unter Burst-Last.
- HF9-Low-Latency-Regel: command apply bleibt unter Last low-latency (priorisierte stop/clear Pfade, bounded apply slices, no starvation).
- HF9-MP4-Performance-Regel: low-end decode/render Strategie fuer `sandstorm.mp4` nutzt adaptive perf profile, prewarm/buffering guards und deterministic degrade/recover ohne Sync-Drift.
- HF9-Board-Switch-Regel: board-switch muss in control + `/output/final` deutlich geringere Latenz haben und darf kein stale frame residue erzeugen.
- HF9-Non-Regression-Regel: sync determinism (ordering/version/idempotent apply) und render correctness (control/final parity, canonical clip correctness) bleiben strikt unveraendert.
- Plan-10-HF9 Umsetzung: RED-Repros T1..T6 dokumentieren Timeout/Ack/Resend/Fairness/No-drop Failures deterministisch vor Hardening.
- Plan-10-HF9 Umsetzung: command pipeline nutzt deterministische max-3 retry closure (stabile mutation IDs), weighted fairness scheduler und no-drop backpressure semantics.
- Plan-10-HF9 Umsetzung: low-end `sandstorm.mp4` nutzt native frame-ready callback strategy (`requestVideoFrameCallback`) plus prewarm/draw-cadence guards; board-switch latency/stale-residue gates sind PASS.
- Plan-10-HF9 Umsetzung: FAIL->PASS closure + sync/render non-regression sind PASS (`P10-HF9-T13`, `P10-HF9-T14`); Plan 10-1 ist wieder freigegeben.
- Neues P0-Root-Cause-Feedback fuer Phase 10 ist bindend: fehlende Play-Area-Eintraege nach clean local storage entstehen, weil board-profile candidate extraction/migration von aktuell geladenen board-catalog IDs abhaengt.
- Wenn ein Board-Key (z. B. imported/multi-area board) zu diesem Zeitpunkt nicht in der geladenen Liste ist, kann Migration den Profil-Key verwerfen und auf default play area zurueckfallen.
- Plan 10-HF6 bleibt historische PASS-Evidenz, ist fuer clean-start Pfade jedoch field-invalidated; Plan 10-HF7 blockiert Plan 10-1 erneut bis FAIL->PASS closure.
- HF7 Scope ist bindend: (1) extraction unabhaengig von loaded board list, (2) migration behaelt unknown board keys, (3) deterministische multi-play-area retention ueber startup/default-apply/reload, (4) artefakt-sync ueber gesamte HF-wave.
- Plan-10-HF7 Umsetzung: RED repros fuer clean-start profile-loss, extraction coupling und unknown-key migration drop sind deterministisch dokumentiert (`P10-HF7-T1..T3`).
- Plan-10-HF7 Umsetzung: extraction ist loaded-list-unabhaengig und migration behaelt unknown/imported board keys inkl. multi-area selection (`P10-HF7-T4`, `P10-HF7-T5`).
- Plan-10-HF7 Umsetzung: startup/default-apply/reload retention sowie Chrome/Firefox/mobile clean-start parity sind PASS (`P10-HF7-T6`, `P10-HF7-T7`).
- Plan-10-HF7 Umsetzung: FAIL->PASS closure ist dokumentiert (`P10-HF7-T8-FAIL-PASS-PROOF.md`); Plan 10-1 ist wieder freigegeben.
- Kritisches Follow-up fuer Phase 10 ist bindend: fuer `Nemesis Lockdown Board A` zeigt Chrome zwei Play-Areas (`Play Area 1` + `Bunker`), waehrend Firefox und mobile-class Chrome nur `Play Area 1` laden (`Bunker` fehlt).
- Plan 10-HF6 ist als verpflichtende P0-Hotfix-Welle gesetzt und blockiert Plan 10-1 erneut bis FAIL->PASS Closure.
- Merge-Pfad-Regel Plan 10-HF6: canonical Source-Merge (saved profile vs defaults vs imported board payload) wird end-to-end tracebar gemacht und muss Multi-Area-Daten deterministisch vollstaendig behalten.
- Fallback-Regel Plan 10-HF6: fallback/default area darf valide Multi-Area-Daten nie ersetzen, auch nicht wenn nur ein Teil-Set im Payload vorhanden ist.
- Paritaets-Regel Plan 10-HF6: area-count und area-id-set pro Board muessen browserneutral identisch sein (Chrome/Firefox/mobile-class) und zwischen control-view und `/output/final` 1:1 uebereinstimmen.
- Plan-10-HF6 Umsetzung: Canonical Merge behält valide Multi-Area-Profile deterministisch und verwirft subset-basierte Snapshot-Prioritaet als Ersatzquelle.
- Plan-10-HF6 Umsetzung: Fallback/default area ersetzt keine valide subset-/multi-area Canonical-Daten mehr; Selection bleibt canonical-first.
- Plan-10-HF6 Umsetzung: Browser-Paritaet (`areaCount` + `areaIdSet`) sowie Control-vs-`/output/final` Set-Paritaet sind PASS (`P10-HF6-T9-BROWSER-IMPORTED-MULTIAREA-REGRESSION.md`).
- Plan-10-HF6 Umsetzung: FAIL->PASS Closure ist dokumentiert (`P10-HF6-T10-FAIL-PASS-PROOF.md`).
- Plan-10-HF5 Umsetzung: invalid multi-area play-area entries werden vor Canonical-Selection verworfen; valide kanonische Areas behalten Vorrang vor default fallback hex.
- Plan-10-HF5 Umsetzung: Control-View und `/output/final` nutzen einen gemeinsamen kanonischen Play-Area-Resolver-Vertrag.
- Plan-10-HF5 Umsetzung: Firefox/Chrome/mobile-class Parity + imported-board/multi-area Regression sind PASS; FAIL->PASS Proof ist geschlossen (`P10-HF5-T10-FAIL-PASS-PROOF.md`).
- Neues verpflichtendes P0-Blocker-Feedback fuer Phase 10 ist bindend: in Firefox und mobile-Chrome werden fuer `Nemesis Lockdown A` weiterhin falsche Polygone geladen (Default-Play-Area/Fallback-Hex sichtbar).
- Root-Cause-Verdacht fuer Plan 10-HF5 ist bindend: Fehlerbild haengt wahrscheinlich an Multi-Play-Area-Boards (mehrere getrennte Areas) im Vergleich zu Single-Play-Area-Boards.
- Test-First-Regel Plan 10-HF5: zuerst explizite RED-Repros fuer Multi-Play-Area vs Single-Play-Area, danach erst Diagnose/Fix.
- Firefox-Diagnostik-Regel Plan 10-HF5: headless/automation traces plus Firefox-vs-Chrome parity traces sind Pflichtgate, statische Checks allein sind unzulaessig.
- Fallback-Regel Plan 10-HF5: valid canonical gespeicherte Play-Areas duerfen nie durch default play area/fallback hex ersetzt werden, weder im Control-View noch in `/output/final`.
- Browser-Paritaets-Regel Plan 10-HF5: canonical gespeicherte Play-Areas muessen auf allen Browsern identisch angewendet werden (inkl. mobile-class Chrome).
- Gate-Regel Plan 10-HF5: Plan 10-1 bleibt blockiert bis HF5 FAIL->PASS Evidenz plus imported-board/multi-area Regression-Matrix PASS sind.
- Neues kritisches P0-Follow-up fuer Phase 10 ist bindend: `domain-modules-missing` meldet fehlende Runtime-Panel-Exposition (`TT_BEAMER_RUNTIME_PANELS`) im Firefox-Debug.
- HF4-Root-Cause-Regel: Runtime-Panel-Modulpfad wird testgetrieben auf Load-Order/Global-Exposure analysiert und browserneutral gehaertet (keine board-spezifischen Sonderpfade).
- HF4-Ownership-Regel: Settings-Ownership-Checks sind applicability-aware; conditionally unmounted Controls (`#outside-mode`, `#outside-direction`) gelten als korrekt, sofern fachlich nicht anwendbar.
- HF4-Clip-Regel: Ship-Clip-Regression-Checker muss invalid polygons deterministisch verwerfen und valide canonical/multi-play-area/legacy States browserneutral akzeptieren.
- HF4-Final-Path-Regel: `/output/final` darf bei vorhandenen kanonisch-validen Polygonen nicht auf invalid-default Fallback kippen; Firefox/Chrome-Parity wird ueber executable diagnostics geprueft.
- Kritisches Follow-up fuer Phase 10 ist bindend: vorherige HF2-Massnahmen schliessen den Realbetrieb nicht; neue Welle 10-HF3 ist P0-Blocker vor 10-1.
- Test-First-Regel Plan 10-HF3: zuerst drei reproduzierbare FAIL-Tests fuer exakten Symptom-Satz (Lockdown A Firefox/mobile-class apply drift, defaults-apply override, final-output black/fallback rectangle trotz valider Polygone).
- Diagnose-Regel Plan 10-HF3: nur direkt ausfuehrbare Lifecycle-/Board-Switch-/Canonical-Source-Assertions zaehlen; statische Checks allein sind nicht gate-faehig.
- Root-Cause-Regel Plan 10-HF3: Fix wird erst nach FAIL-Reproduktion und Diagnose gesetzt und bleibt strikt generisch fuer alle importierten Boards/Browser.
- Evidenz-Regel Plan 10-HF3: Wave-Close erfordert explizites FAIL->PASS im selben Testsatz plus Browser-/Import-Matrix und Artefakt-Sync.
- Plan-10-HF3 Umsetzung: Root cause war fehlende Snapshot-Hydration fuer `playAreasByBoard` und `selectedPlayAreaIdByBoard`; final/control konnten stale fallback polygons behalten.
- Plan-10-HF3 Umsetzung: Shared polygon-contract snapshot hydration wurde generisch verdrahtet (keine board-spezifischen branches) und mit T1..T6 FAIL->PASS + imported/browser matrix geschlossen.
- Neues verpflichtendes P0-Feedback fuer Phase 10 ist bindend: gespeicherte inside/outside polygons + playAreas werden auf Firefox/Chrome mobile-class teils nicht deterministisch geladen/angewendet (startup/reload/default-apply).
- P0-Regel Plan 10-HF2: Fix ist generisch schema-/pipeline-basiert fuer alle aktuellen und zukuenftigen importierten Boards; board-spezifische Sonderpfade sind unzulaessig.
- Precedence-Regel Plan 10-HF2: `apply global defaults` darf valide persistierte Board-Polygone nicht still durch Standard-Polygone ueberschreiben.
- Final-Hydration-Regel Plan 10-HF2: `/output/final` muss browser-neutral aus kanonischen Board-Polygonen hydrieren/rendern; valides Polygonmaterial darf ausserhalb Chrome keinen Black-Screen erzeugen.
- Gate-Regel Plan 10-HF2: Plan 10-1 bleibt blockiert bis Canonical-Schema-/Fallback-/Imported-Board-Non-Regression + all-browser Matrix (Chrome/Firefox desktop + mobile-class emulation where possible) PASS sind.
- Plan-10-HF2 Umsetzung: polygon hydration normalisiert jetzt alias-Felder (`inside`/`outside` polygon aliases + object-point payloads) in den kanonischen `playAreas` Vertrag.
- Plan-10-HF2 Umsetzung: defaults-apply respektiert Polygon-Precedence (persistierte valide Board-Polygone bleiben erhalten, kein stilles Override durch Defaults).
- Plan-10-HF2 Umsetzung: final-output Clipquellen laufen ueber kanonisches `getPlayAreas` + area-validierte Polygon-Normalisierung, wodurch valid-polygon Black-Screen-Pfade eliminiert sind.
- Plan-10-HF2 Umsetzung: cross-browser + imported-board Regressionsevidenz ist PASS dokumentiert (`P10-HF2-T7-BROWSER-REGRESSION.md`).
- Neues verpflichtendes P0-Runtime-Hotfix fuer Phase 10 ist bindend: `/output/final` wird auf `Nemesis Lockdown A` (outside `sandstorm.mp4`) schwarz und muss board-spezifisch root-cause-basiert behoben werden.
- Plan-10-HF1 Umsetzung: root-cause fuer board-spezifischen Final-Blackout war fail-closed Clip-Geometrie; outside/room Layer konnten bei degenerierten Polygonen gleichzeitig ausfallen.
- Plan-10-HF1 Umsetzung: Final-Compositor clipping ist fail-open gehaertet (invalid/degenerate room/play-area polygons blockieren Rendering nicht mehr).
- Plan-10-HF1 Umsetzung: all-board Regression inkl. mp4 outside board `nemesis-lockdown-a` (`sandstorm.mp4`) ist PASS (`P10-HF1-T5-ALL-BOARD-REGRESSION.md`).
- Phase-10 Gate-Regel Update: Plan 10-HF1 blockiert Plan 10-1 bis PASS (Final-Render-Path aktiv auf allen Boards, room+outside co-render parity, sync/control non-regression).
- Render-Vertragsregel Phase 10 HF1: board/media-spezifische Outside-Pfade duerfen den finalen Compositor nie fail-closed abbrechen; bei Outside-readiness Fehlern gilt fail-open (frame skip, kein Blackout).
- Evidenz-Regel Phase 10 HF1: all-board Regression inkl. mp4-outside-background Boards ist Pflichtnachweis vor weiterer Phase-10-Featurearbeit.
- Phase-10 Planning Entscheidung: naechste Welle ist planning-only und fokussiert schnelle Operator-Bedienung auf Desktop + Mobile (kein Execute in diesem Schritt).
- Phase-10 IA-Regel: Settings werden in logisch gruppierte Sub-Tabs zerlegt, damit Navigation und Scan-Zeit im Livebetrieb sinken.
- Phase-10 Runtime-Regel: drei explizite Quick-Modi (`activate`/`deactivate`/`clear`) werden als sequenzieller Room-Click-Flow mit klarer Mode-Sichtbarkeit priorisiert.
- Phase-10 Mobile-Regel: one-handed Reaktionspfad ist Pflichtgate (sticky Action-Rail, grosse Tap-Ziele, stabile Board-Uebersicht waehrend Burst-Operationen).
- Phase-10 Gate-Regel: Plan 10-1 ist execute-ready und bindet Determinismus-/Non-Regression-Matrix fuer schnelle Mehrfach-Clicks auf Desktop/Mobile.
- Plan-9-HF4 Umsetzung: outside playback lifecycle now uses a board-scoped outside-definition lifecycle key and timeline ownership that is decoupled from room/cluster/global-inside trigger churn.
- Plan-9-HF4 Umsetzung: repeated room starts no longer restart/rewind outside sandstorm playback; stop outside and clear-all semantics remain deterministic PASS (`9-HF4-VERIFICATION.md`, `P9-HF4-T6-REPEATED-ROOM-START-REGRESSION.md`).
- Neues verpflichtendes P0-Runtime-Bugfix vor Phase-9-Close ist bindend: Start einer neuen Room-Animation darf Outside Sandstorm niemals von Beginn an neu starten.
- Lifecycle-Regel Plan 9-HF4: Outside-Playback-State ist strikt scope-isoliert und unabhaengig von room/cluster/global-inside start/stop Events.
- Cache-Regel Plan 9-HF4: Outside-Media-Cache-Reset ist bei unrelatierten Starts verboten; Reset ist nur fuer outside-spezifische Lifecycle-Events erlaubt.
- Non-Regression-Regel Plan 9-HF4: bestehende `stop outside`/`clear all` Semantik bleibt unveraendert deterministisch; Sync-Invarianten (ordering/version/idempotent apply) bleiben unveraendert.
- Evidenz-Regel Plan 9-HF4: verpflichtende Repeated-Room-Start-Regression mit Nachweis, dass aktive Outside-Sandstorm-Playback-Position nicht restartet/rewindet.
- Plan-9-HF3 Umsetzung: canonical coordinate mapping now uses a shared stage-rect normalization + normalized-to-pixel contract for overlay and render paths (browser/DPR/fullscreen deterministic).
- Plan-9-HF3 Umsetzung: room mp4 playback lifecycle is isolated from outside/global video caches; room `malfunction` mp4 no longer cross-starves GIF room rendering on `/output/final`.
- Plan-9-HF3 Umsetzung: configurable deterministic mp4 weak-hardware controls are active (`tier`/`renderCap`/`qualityFloor`/`degradeThreshold`/`recoverThreshold`) and synchronized via runtime snapshots.
- Plan-9-HF3 Umsetzung: command/API failure + timeout paths now emit explicit operator-visible feedback via status + deduplicated toast surface (no silent no-op).
- Neues verpflichtendes P0-Runtime-Bugfixpaket aus Runtime-Testing ist bindend fuer Phase 9: Browser-Offset bei Polygon-Overlay, `/output/final` Mixed-Media-Lifecycle-Bug (`malfunction` mp4 stoppt GIF-Rendering), weak-hardware `mp4`-Lag und fehlende explizite Fehlerfeedbacks.
- Plan 9-HF3 ist als priorisierte execute-ready Hotfix-Welle gesetzt und blockiert Plan 9-2 bis PASS.
- Koordinaten-Regel fuer 9-HF3: ein kanonischer Mapping-Pfad muss browser-/DPR-/fullscreen-deterministisch bleiben und fuer Control + `/output/final` identisch gelten.
- Feedback-Regel fuer 9-HF3: command/API fail- und timeout-Pfade duerfen nie still sein; explizite user-facing Fehleranzeige ist Pflichtgate.
- Neues verpflichtendes Stabilitaets-Feedback aus Langzeittest ist bindend: expired one-shot events duerfen nach Reload/Reconnect nicht erneut abgespielt werden.
- Plan 9-HF2 war als priorisierte execute-ready Hotfix-Welle gesetzt, ist abgeschlossen und bleibt als Baseline gueltig.
- Lifecycle-Regel fuer 9-HF2: rehydrate/rejoin behandelt abgelaufene Events deterministisch als terminal/completed (no replay).
- Runtime-Regel fuer 9-HF2: low-end load hardening ist verpflichtend (frame-budget shedding, particle caps, coalescing) ohne Sync-Determinismus-Regression.
- Plan-9-HF2 Umsetzung: snapshot hydration/rejoin reconciles finite-duration elapsed events as terminal/completed and suppresses replay across reload/reconnect.
- Plan-9-HF2 Umsetzung: runtime hardening ladder applies frame-budget pressure levels with bounded non-critical coalescing and visual caps for low-end stability.
- Plan-9-HF2 Umsetzung: deterministic sync invariants remain PASS under hardening (`P9-HF2-T6-SYNC-INVARIANTS.md`); long-run and low-end matrices are PASS (`P9-HF2-T7-LONG-RUN-SOAK.md`, `P9-HF2-T8-LOW-END-STRESS.md`).
- Acceptance correction is binding: Plan 9-1 is not accepted and cannot be used as closure baseline.
- Plan-9-HF1 Umsetzung: hard gate is PASS with `src/app.js` reduced from 12163 to 28 lines and runtime moved to `src/app/runtime/runtime-orchestration.js`.
- Plan-9-HF1 Umsetzung: mandatory domain seams are present for editor/sync/settings/media with thin bootstrap ownership in `src/app.js`.
- Plan 9-HF1 bleibt als abgeschlossene Modularisierungsbasis gueltig; Phase-9-Abschluss haengt nun an 9-HF3 Runtime-Bugfix-Gates.
- Hard objective for 9-HF1: reduce `src/app.js` from 12163 lines to <= 4200 lines (>= 65% reduction) while preserving behavior.
- Extraction completeness gate for 9-HF1 is explicit: editor flows, animation runtime orchestration, sync command handlers, settings controllers, and media handlers must leave `src/app.js`.
- Regression policy for 9-HF1 is strict: targeted parity per extraction slice plus full matrix PASS before closure.
- Neues verpflichtendes Ziel fuer Phase 9 ist gesetzt: `src/app.js` wird umfassend in eine klare modulare Struktur mit duennen Bootstrap-Einstieg, stabilen Domain-Grenzen und shared utility layer zerlegt.
- Dokumentationsregel Phase 9: sinnvolle englische Kommentare sind verpflichtend fuer nicht offensichtliche Logik (State-Transitions, Render-/Sync-Lifecycle, Integrationsgrenzen), ohne Kommentarrauschen.
- Observability-Regel Phase 9: Runtime-Diagnostik wird ueber strukturierte, kontextsensitive und low-noise Logs erweitert (Scope/Event/IDs/Level), statt unstrukturierter Ad-hoc-Ausgaben.
- Ausfuehrungsregel Plan 9-1: sichere inkrementelle Migration mit branch-by-abstraction und verpflichtendem Regression-Guard nach jedem Extraktionsslice ist das priorisierte erste execute-ready Wellenpaket.
- Plan-9-1 Umsetzung: `src/app.js` nutzt jetzt modulare Adapter-Seams fuer boot/shared/state/domain/ui/input/render bei unveraenderten Laufzeitvertrags-Signaturen.
- Plan-9-1 Umsetzung: zentrale strukturierte Logger-Kontrakte (`scope`/`event`/Kontextfelder + Level-Gating) ersetzen kritische Ad-hoc-Console-Diagnostik.
- Plan-9-1 Umsetzung: Regressionsevidenz ist PASS in `.planning/phases/phase-09/9-1-VERIFICATION.md` dokumentiert.
- Plan 8-1 ist abgeschlossen: Mehrbereichs-Play-Areas laufen kanonisch ueber `playAreas[]` mit aktiver Auswahl-ID und Legacy-Ladealias.
- Plan 8-1 Runtime-Entscheidung: Inside/Outside-Clipping nutzt denselben Union-Maskenpfad ueber alle gueltigen Play-Area-Polygone.
- Plan 8-1 Import-Entscheidung: Board-Import akzeptiert JSON und Multipart-Bildupload; Bildboards starten mit leerem Room-Catalog fuer manuellen Polygonworkflow.
- Neues verpflichtendes Feedback fuer Phase 8 ist gesetzt: Room-Klick-Selection regressiert, da Play-Area-Click-Selektion den Input abfaengt.
- P0-Regel Plan 8-HF1: Play-Area-Selektion per Board-Klick wird vollstaendig entfernt; Room-Klick ist der priorisierte kanonische Selection-Pfad.
- Neues verpflichtendes Feedback fuer Phase 8 ist gesetzt: erfolgreicher Bildimport zeigt aktuell keinen sofort sichtbaren UI-Erfolg.
- P0-Regel Plan 8-HF1: neues Import-Board erscheint nach Success sofort im Board-Dropdown und wird direkt aktiv selektiert; leerer Polygon-Startzustand bleibt gueltig.
- Plan-8-HF1 Umsetzung: Play-Area-Maske ist im Overlay nur noch visuell (`pointer-events: none`); Room-Klick bleibt deterministischer Selection-Source-of-Truth.
- Plan-8-HF1 Umsetzung: Import-Success nutzt `no-store` Katalogrefresh plus Response-Upsert, damit neue Bildboards sofort im Dropdown sichtbar sind.
- Plan-8-HF1 Umsetzung: Post-Import aktiviert das neue Board verpflichtend mit explizitem Guard; Aktivierungsfehler sind nicht mehr still.
- Plan-8-HF1 Umsetzung: Runtime-Katalog akzeptiert importierte Boards mit leerem Room-Catalog als gueltigen manuellen Empty-Start.
- Neues verpflichtendes Mars-Featurepaket fuer Phase 8 ist gesetzt: Outside-Animationsverwaltung wird aus dem Play-Area-Editor ausgelagert und als eigene Settings-Sektion `Outside Animations` priorisiert.
- Pflichtregel Mars-Paket: neue Outside-Animation `Outside Sandstorm` basiert auf `sandstorm.mp4` und bleibt immer stumm (kein Audio-Pfad).
- Playback-Regel Mars-Paket: Outside-Animationen erhalten optionale Boomerang-Semantik pro Animation (vorwaerts->rueckwaerts->vorwaerts).
- Mapping-Regel Mars-Paket: Asset-Mapping ist pro Outside-Animation in UI editierbar (`gif`/`mp4`/coded key), neue Outside-Animationen koennen in UI angelegt werden.
- Resource-Regel Mars-Paket: vorhandene Dateien aus `resources` sind im UI als Asset-Quelle auswaehlbar.
- Persistenz-Regel Mars-Paket: Outside-Animationsdefinitionen + Settings werden wie bestehende Profile/Defaults persistent gespeichert/geladen (inkl. Legacy-Migrationsguard).
- Plan-8-HF2 execution: Outside animations are definition-driven (`selectedAnimationId` + `animations[]`) with per-animation boomerang and asset mapping.
- Plan-8-HF2 execution: `Outside Sandstorm` defaults to `sandstorm.mp4` and outside runtime audio is hard-muted.
- Plan-8-HF2 execution: Outside configuration moved to dedicated `Outside Animations` settings section with dropdown editor, create flow, and `/api/resources` asset picker.
- Plan-8-HF2 execution: outside definition persistence/defaults include legacy alias normalization (`outside`, `outsideAnimations`, `selectedOutsideAnimationId`).
- Neues verpflichtendes P0-Betriebsfeedback fuer Phase 8 ist gesetzt: `Coded/Space` rendert nur schwarz, `Outside Sandstorm` flackert/rewindet, Boomerang-Checkbox ist nicht setzbar, Asset-Type-Dropdown springt zurueck.
- UX-Pflichtregel Phase 8 HF3: Outside-Animation-Editor erhaelt `Apply changes`, damit Type/Resource/Optionen atomar zusammen committen.
- P0-Regel Plan 8-HF3: Restore fuer `Coded/Space`, stabile Sandstorm-Wiedergabe, stabile Editor-Inputs (`boomerang`, `assetType`) und Save/Reload-Determinismus sind Blocker-Gate vor Plan 8-2.
- Plan-8-HF3 Umsetzung: coded outside asset refs sind wieder deterministisch auf den Runtime-`outside-space` Pfad normalisiert (kein schwarzer No-Op).
- Plan-8-HF3 Umsetzung: Sandstorm MP4 laeuft im kontinuierlichen Forward-Playback (native loop/rate) ohne frameweises Restart-Seeking.
- Plan-8-HF3 Umsetzung: Outside-Editor nutzt Draft-Inputs mit explizitem `Apply changes`; Type/Resource/Optionen werden atomar als ein Update uebernommen.
- Plan-8-HF3 Umsetzung: HF3 Regression/Persistenzmatrix ist PASS dokumentiert (`P8-T39-OUTSIDE-EDITOR-REGRESSION.md`, `8-HF3-VERIFICATION.md`).
- Neues verpflichtendes P0-Betriebsfeedback fuer Phase 8 ist gesetzt: `Coded/Space` ist erneut schwarz, Asset-Picker filtert nicht typspezifisch, Boomerang-Playback flickert/instabil.
- P0-Regel Plan 8-HF4: Asset-Picker ist strikt type-spezifisch (`coded` keys, `mp4` nur `.mp4` aus `resources`, `gif` nur `.gif` aus `resources`).
- Playback-Regel Plan 8-HF4: Boomerang spielt vollstaendig vorwaerts bis Ende, vollstaendig rueckwaerts bis Anfang, danach Repeat ohne sichtbaren on/off Flicker oder abrupten Restart.
- Gate-Regel Plan 8-HF4: Plan 8-2 bleibt blockiert bis HF4-PASS inklusive konsistentem Artefakt-Sync.
- Plan-8-HF4 Umsetzung: coded outside asset refs/picker keys werden wieder deterministisch auf den funktionierenden `outside-space` Rendererpfad normalisiert (kein Black-Screen-Rueckfall).
- Plan-8-HF4 Umsetzung: Outside-Asset-Picker filtert strikt per `assetType` (`coded` keys, `mp4` `.mp4`, `gif` `.gif`) inkl. deterministic type-switch refresh ohne stale/revert drift.
- Plan-8-HF4 Umsetzung: Outside-mp4 boomerang laeuft als explizite full-cycle state machine (`forward -> reverse -> repeat`) ohne sichtbaren on/off flicker oder abrupten restart-jump.
- Plan-8-HF4 Umsetzung: HF4 Regression/Evidence ist PASS dokumentiert (`P8-T45-BOOMERANG-REGRESSION.md`, `8-HF4-VERIFICATION.md`).
- Neues verpflichtendes P0-Betriebsfeedback fuer Phase 8 ist gesetzt: `Outside Sandstorm` zeigt starkes Flackern im Reverse-Teil des Boomerang-Playback.
- P0-Regel Plan 8-HF5: Root-Cause liegt im Reverse-Playback-Lifecycle und wird zuerst reproduzierbar analysiert, dann gezielt behoben.
- Playback-Regel Plan 8-HF5: Boomerang bleibt full-cycle (`forward -> smooth reverse -> repeat`) ohne sichtbares Reverse-Flicker; normaler mp4-Playback-Pfad ohne Boomerang bleibt regressionsfrei.
- Persistenz-Regel Plan 8-HF5: `Apply changes` sowie Save/Reload/Restart fuer Outside-Settings (`boomerang`, `assetType`, `assetRef`) bleiben deterministisch intakt.
- Gate-Regel Plan 8-HF5: Plan 8-2 bleibt blockiert bis HF5-PASS inklusive Regression-/Evidence-Artefakten und konsistentem Artefakt-Sync.
- Plan-8-HF5 Umsetzung: Reverse-Flicker-Root-Cause wurde als seek-overlap/decoder-thrash im Boomerang-Reverse-Lifecycle isoliert und reproduzierbar dokumentiert.
- Plan-8-HF5 Umsetzung: mp4-Boomerang-Reverse nutzt jetzt anchored reverse timing plus seek-cadence/video.seeking arbitration fuer visuell stabilen Reverse-Abschnitt.
- Plan-8-HF5 Umsetzung: normaler mp4-Pfad ohne Boomerang bleibt regressionsfrei stabil (`P8-T49-MP4-NON-BOOMERANG-REGRESSION.md`).
- Plan-8-HF5 Umsetzung: `Apply changes` und Persistenz fuer `boomerang`/`assetType`/`assetRef` bleiben deterministisch intakt (`P8-T50-APPLY-PERSISTENCE-REGRESSION.md`).
- Plan-8-HF5 Umsetzung: HF5 Regression/Evidence ist PASS dokumentiert (`8-HF5-VERIFICATION.md`, `P8-T51-HF5-REGRESSION.md`).
- Neues verpflichtendes P0-Problem fuer Phase 8 ist gesetzt: `/output/final` skaliert im Browser-Fullscreen nicht auf Display-Aufloesung und zeigt nur einen Top-Left-Teilausschnitt.
- P0-Regel Plan 8-HF6: Fullscreen-Fit fuer `/output/final` ist blockierend und priorisiert vor Plan 8-2; Boomerang-Thema ist in dieser Welle nachrangig.
- Recompute-Regel Plan 8-HF6: Canvas/Stage muessen bei Resize, Orientation, Browser-Fullscreen-Wechsel und Device-Pixel-Ratio-Aenderung deterministisch neu berechnet werden.
- Non-Regression-Regel Plan 8-HF6: Rendering-, Koordinaten- und Clipping-Pfade bleiben unter Reflow/Fit stabil ohne Letterbox-/Offset-Bug.
- Gate-Regel Plan 8-HF6: Plan 8-2 bleibt blockiert bis HF6 PASS inklusive konsistentem Artefakt-Sync.
- Plan-8-HF6 Umsetzung: `/output/final` nutzt jetzt einen einheitlichen viewport+dpr Recompute-Lifecycle fuer `resize`/`orientationchange`/`fullscreenchange`/DPR-Wechsel.
- Plan-8-HF6 Umsetzung: Final-Output-Fit erzwingt transformfreien Full-Area-Stage-Pfad ohne Top-Left-Offset oder Letterbox-Drift.
- Plan-8-HF6 Umsetzung: Reflow-Regression fuer Rendering/Coords/Clip ist PASS dokumentiert (`P8-T57-FINAL-OUTPUT-REFLOW-REGRESSION.md`, `8-HF6-VERIFICATION.md`).
- Neues verpflichtendes P0-Feature-/Cleanup-Paket fuer Phase 8 ist gesetzt: Boomerang wird vollstaendig entfernt (UI/Runtime/Persistenznutzung), Legacy-Read bleibt als no-op-kompatibler Guard erlaubt.
- Paritaets-Regel Plan 8-HF7: `Inside Animations` wird Outside-paritaetisch als eigene Settings-Sektion mit Dropdown-Editor, Create-Flow und atomarem `Apply changes` geliefert.
- Mapping-Regel Plan 8-HF7: Inside-Animationen erhalten pro Eintrag `assetType` (`coded`/`gif`/`mp4`) sowie typspezifisch gefilterte `assetRef` aus `resources`.
- Persistenz-Regel Plan 8-HF7: Inside-Definitionsmodell bleibt ueber Save/Reload/Restart/Defaults migrationsstabil; boomerang-bezogene Felder bleiben beim Legacy-Load tolerant, aber aktiv wirkungslos.
- Zielbild-Regel Plan 8-HF7: neue Inside-/Outside-Animationen sind definitionsgetrieben in UI hinzufuegbar, ohne Codeaenderung pro neuem Animationseintrag.
- Gate-Regel Plan 8-HF7: Plan 8-2 bleibt blockiert bis HF7 PASS inklusive konsistentem Artefakt-Sync.
- Plan-8-HF7 Umsetzung: Outside boomerang ist aus aktiver UI/Runtime/Persistenznutzung entfernt; Legacy-boomerang-Felder bleiben als no-op-load kompatibel.
- Plan-8-HF7 Umsetzung: `Inside Animations` liefert Outside-Paritaet inkl. Create/Dropdown, typed asset mapping (`coded`/`gif`/`mp4`) und atomarem `Apply changes`.
- Plan-8-HF7 Umsetzung: Inside-Definitionsmodell ist ueber Save/Reload/Restart/Defaults sowie Live-Snapshot-Hydration migrationsstabil (`8-HF7-VERIFICATION.md`, `P8-T64-HF7-REGRESSION.md`).
- Neues verpflichtendes P0-Feedback fuer Phase 8 ist gesetzt: Outside-mp4-Playback ist regressiert (gif/coded ok), muss root-cause-basiert wiederhergestellt werden.
- Conditional-Visibility-Regel Plan 8-HF8: `outside mode`/`outside direction` sind nur in fachlich anwendbaren Kontexten sichtbar (z. B. `coded` + `outside-space`) und fuer `gif`/`mp4` bzw. nicht-applicable coded renderer ausgeblendet.
- UX-Regel Plan 8-HF8: redundante `Use selected resource asset`-Buttons werden entfernt; `Apply changes` bleibt der einzige Commitpfad.
- Gate-Regel Plan 8-HF8: Plan 8-2 bleibt blockiert bis HF8 PASS inklusive konsistentem Artefakt-Sync.
- Plan-8-HF8 Umsetzung: Outside-mp4 ist auf stabilem non-boomerang Forward-Loop-Pfad wiederhergestellt (`P8-T65-OUTSIDE-MP4-ROOT-CAUSE.md`).
- Plan-8-HF8 Umsetzung: `outside mode`/`outside direction` sind strikt kontextsensitiv (nur coded `outside-space`) und fuer `gif`/`mp4` ausgeblendet.
- Plan-8-HF8 Umsetzung: redundante `Use selected resource asset`-Buttons sind entfernt; `Apply changes` bleibt alleiniger Commit-CTA.
- Neues verpflichtendes P0-Follow-up fuer Phase 8 ist gesetzt: Outside-mp4 bleibt im Realbetrieb regressiert; HF8-Restore ist lifecycle-seitig nicht stabil genug.
- P0-Regel Plan 8-HF9: Root-Cause-Fix fuer Outside-mp4 muss Start/Stop/Re-Start sowie Save/Reload/Restart robust abdecken.
- Visibility-Regel Plan 8-HF9: nicht-applicable Controls (`outside mode`/`outside direction`) muessen vollstaendig verschwinden (unmount), disabled-only ist unzulaessig.
- Regression-Regel Plan 8-HF9: verpflichtende Evidenz fuer mp4 Start/Stop-Reihen und UI show/hide transitions bei Type-/Asset-Kontextwechseln.
- Gate-Regel Plan 8-HF9: Plan 8-2 bleibt blockiert bis HF9 PASS inklusive konsistentem Artefakt-Sync.
- Plan-8-HF9 Umsetzung: Outside-mp4-Lifecycle nutzt run-gebundenes Playback-Hardening (re-prime bei Start/Stop/Re-Start, draw-ready guard) fuer robusten non-boomerang Betrieb.
- Plan-8-HF9 Umsetzung: Nicht-applicable `outside mode`/`outside direction` werden strikt unmounted; disabled-only Restzustaende sind entfernt.
- Plan-8-HF9 Umsetzung: Type-/Asset-Transitions triggern unmittelbare deterministic visibility sync (`input`+`change`) ohne stale reappear drift.
- Plan-8-HF9 Umsetzung: HF9 Regression/Evidence ist PASS dokumentiert (`8-HF9-VERIFICATION.md`, `P8-T71-OUTSIDE-MP4-LIFECYCLE-ROOT-CAUSE.md`, `P8-T73-MP4-REGRESSION-GUARD.md`, `P8-T74-STRICT-CONDITIONAL-UNMOUNT.md`, `P8-T75-VISIBILITY-TRANSITION-REGRESSION.md`).
- Kritisches P0-Follow-up fuer Phase 8 ist gesetzt: Outside-mp4 ist erneut nicht deterministisch sichtbar im Realbetrieb und benoetigt einen erneuten root-cause-basierten Restore.
- P0-Regel Plan 8-HF10: Outside-mp4 muss im Outside-Layer deterministisch sichtbar rendern (inkl. Start/Stop/Re-Start und Save/Reload/Restart), ohne hidden/no-op/first-frame-black Rueckfall.
- Playback-Regel Plan 8-HF10: mp4-Loop laeuft nahtlos ohne sichtbaren Replay-Break, Black-Frame oder Restart-Gap/Flicker.
- Non-Regression-Regel Plan 8-HF10: bestehender `Apply changes`-Commitpfad sowie Persistenz ueber Save/Reload/Restart bleiben unveraendert intakt.
- Evidence-Regel Plan 8-HF10: runtime-fokussierte Mehrzyklus-Evidenz fuer Visibility- und Loop-Kontinuitaet ist verpflichtend als Gate.
- Gate-Regel Plan 8-HF10: Plan 8-2 bleibt blockiert bis HF10 PASS inklusive konsistentem Artefakt-Sync.
- Plan-8-HF10 Umsetzung: Outside-mp4 nutzt deterministische Visible-Start-Primes plus short-gap fallback-frame continuity gegen no-op/first-frame-black Rueckfall.
- Plan-8-HF10 Umsetzung: Outside-mp4-Loop nutzt seamless boundary wrap guards ohne replay break/black frame/restart gap flicker.
- Plan-8-HF10 Umsetzung: Apply-/Persistenzpfade bleiben unveraendert stabil und sind als Non-Regression evidenzbasiert PASS (`P8-T81-APPLY-PERSISTENCE-NON-REGRESSION.md`).
- Plan-8-HF10 Umsetzung: HF10 Runtime-Evidence ist PASS dokumentiert (`8-HF10-VERIFICATION.md`, `P8-T77-OUTSIDE-MP4-VISIBILITY-ROOT-CAUSE.md`, `P8-T80-VISIBILITY-LOOP-LIFECYCLE-REGRESSION.md`).
- Neues verpflichtendes Featurepaket fuer Phase 8 ist gesetzt: frei editierbare Animationen werden auf alle Animationstypen ausgeweitet, inklusive raumbezogener Animationen mit create/edit/delete im selben definitionsgetriebenen Editor-Ansatz wie outside/effects.
- Modellregel Plan 8-HF11: Room-Animationen werden definitionsgetrieben mit `assetType` (`coded`/`mp4`/`gif`) und editierbarem Asset-Mapping gefuehrt, damit neue Room-Animationen ohne Codeaenderung in UI angelegt werden koennen.
- Bootstrap-Regel Plan 8-HF11: bei erstem Browserstart ohne lokale Daten werden serverseitige Defaults automatisch geladen und angewendet; der Button `Load and apply defaults` bleibt als expliziter Reset-/Wiederherstellen-Pfad fuer spaetere Session-Aenderungen erhalten.
- Gate-Regel Plan 8-HF11: Plan 8-2 bleibt blockiert bis HF11 PASS inklusive konsistentem Artefakt-Sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).
- Plan-8-HF11 Umsetzung: Room-Animationen laufen jetzt als per-board `roomFx`-Definitionen (`selectedAnimationId` + `animations[]`) mit Settings-CRUD und typed asset mapping (`coded`/`gif`/`mp4`) inkl. typspezifischem Picker.
- Plan-8-HF11 Umsetzung: Room runtime/render/start/edit/stop ist definitionsgetrieben (inkl. GIF/MP4/coded assets) und nicht mehr auf starre statische Room-Animationstabellen beschraenkt.
- Plan-8-HF11 Umsetzung: Startup-Guard erzwingt first-start Defaults-Autoload bei leerem Local-Storage deterministisch; manueller Button `Load and apply defaults` bleibt unveraendert als spaeterer Reset-Flow erhalten.
- Plan-8-HF11 Umsetzung: HF11 Regression/Evidence ist PASS dokumentiert (`8-HF11-VERIFICATION.md`, `P8-T88-HF11-REGRESSION.md`).
- Neues verpflichtendes P0-Refinement fuer Phase 8 ist gesetzt: dedizierter `GIF Playback speed`-Slider im Room-Editor wird entfernt zugunsten eines einheitlichen `Speed`-Sliders fuer alle Room-Assettypen (`coded`/`gif`/`mp4`).
- Opacity-Regel Plan 8-HF12: `Opacity` muss fuer alle Room-Animationstypen editierbar bleiben, inklusive `mp4` (kein disable/hide fuer mp4).
- Persistenz-Regel Plan 8-HF12: `Speed` + `Opacity` bleiben ueber `Apply changes`, Save/Reload/Restart und Defaults-Load deterministisch stabil.
- Gate-Regel Plan 8-HF12: Plan 8-2 bleibt blockiert bis HF12 PASS inklusive konsistentem Artefakt-Sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).
- Plan-8-HF12 Umsetzung: Room-Editor fuehrt nur noch einen einheitlichen `Speed`-Control; dedizierter GIF-Speed-Slider ist vollstaendig entfernt.
- Plan-8-HF12 Umsetzung: Room-Speed ist typparitaetisch kanonisiert (`coded`/`gif`/`mp4` ueber `speed`), Legacy-`playbackSpeed` bleibt als kompatibler Mirror erhalten.
- Plan-8-HF12 Umsetzung: `Opacity` bleibt fuer alle Room-Assettypen aktiv editierbar, inklusive `mp4` (kein type-specific disable/hide Pfad).
- Plan-8-HF12 Umsetzung: HF12 Regression/Evidence ist PASS dokumentiert (`8-HF12-VERIFICATION.md`, `P8-T92-SPEED-OPACITY-PERSISTENCE-REGRESSION.md`, `P8-T93-ROOM-CRUD-TYPED-ASSET-NON-REGRESSION.md`).
- Preview-vs-Live bleibt fuer Phase 1 out of scope (laut Plan), wird in Phase 2 vorbereitet.
- Dashboard bleibt manuell mit Triggern, Preview erst ab Phase 2.
- Safety-Pfad (`Clear All`) hat prioritaere Umsetzung in Phase 1.
- Effektsteuerung nutzt ein gemeinsames Laufzeitmodell (`runningAnimations`) mit Scope `global`/`room`.
- Session-Status bleibt in Phase 1 bewusst runtime-lokal (kein `sessionStorage`, kein Profil-Model).
- `Clear All` wird als globaler Sofort-Stop ueber einen expliziten UI-Button ausgefuehrt.
- Plan-Update 1 setzt Prioritaetsfokus: P0 Power Outage, P1 Room-Click UX, P1 Per-Room Animation Config, P2 Output Device.
- Room-Zonen werden als klickbare Overlay-Hit-Areas verwaltet; das Raum-Submenu liefert die Triggerparameter.
- Output-Routing nutzt Fullscreen als Zielpfad und faellt bei Fehlern automatisch auf Windowed Preview zurueck.
- Raum-Hitareas sind als board-spezifische Hex-Polygone mit Hover/Selection Rueckmeldung umgesetzt.
- Raumlabels bleiben neutral (`Hex A-xx`/`Hex B-xx`); einzig freigegebene Semantik sind die 5 Special-Raeume.
- Animationen sind klar nach Scope getrennt (`global` vs `room`); room-Renderings werden auf den Zielraum geclippt.
- Running-Animations-Liste bietet `Stop` fuer alle und `Edit` fuer room-Eintraege.
- Room-Selektion wird pro Board gemerkt, damit Board-Wechsel den Kontext stabil halten.
- Runtime-Liste kennzeichnet Scope explizit (`GLOBAL`/`ROOM`) und Edit springt in den Board-Kontext der Animation.
- Power-Outage nutzt sichtbare Abdunkelung; Output-Route meldet Fullscreen-Fallback explizit.
- Plan-Update 2 setzt Prioritaetsfokus: P0 exakte Hitarea-Passung + manueller Verifikationsfokus, P1 Special-Room Mapping, P1 Event-Sounds mit globalen Audio-Settings.
- Special-Room Set ist fest definiert: `Cockpit (links)`, `Cryoschlaf (Mitte)`, `Maschinenraum 1-3 (rechts)`.
- Event-Sounds sind in Phase 1 auf `Intruder Alert`, `Reactor Pulse` und `Power Outage` begrenzt.
- Manuelle Pflichttests im realen Beamer-Setup sind Gate fuer den Abschluss von Plan-Update 2.
- Hex-Hitareas wurden fuer beide Boards mit Flat-Top-Geometrie nachkalibriert; kleine Toleranz bleibt nur an Randflaechen.
- Special-Room Mapping wurde als festes 5er-Set mit board-spezifischen Polygonen umgesetzt.
- Event-Sounds laufen als lizenzsichere WebAudio-Synth-Cues mit globalem Master (default ON) und Lautstaerke-Regler.
- Plan-Update 3 setzt Prioritaetsfokus: P0 manuelle Hitarea-Feinkalibrierung per Sliderseite (Offset/Scale) mit Persistenz pro Board statt Auto-Tuning.
- Spezialraum-Animationen gelten erst als done, wenn Running-List und sichtbarer Renderzustand 1:1 konsistent sind.
- Bekannter Kritikal-Bug: Kombination `Spezialraum + Alarm Beacon` kann visuellen Animationspfad stoppen; Fix und Regression-Guard sind P0.
- Hitarea-Feinjustierung erfolgt ausschliesslich ueber sichtbare Slider-Settings (X/Y/Scale) und wird pro Board persistent gespeichert.
- Render-Stabilitaet ist per Animation isoliert (`try/catch` + `try/finally`) abgesichert; Einzel-Fehler stoppen den globalen Draw-Timer nicht mehr.
- Plan-Update 4 setzt Prioritaetsfokus: P0 raumindividuelle Kalibrierung (Position relativ/absolut + Stretch X/Y), P0 separate Settings-Seite fuer Kalibrierung/Shape, P0 Spezialraum-Polygoneditor, P1 Persistenz pro Board fuer Gesamtprofil.
- Geometrie wird ab Plan-Update 4 nicht mehr nur global, sondern pro Raum verwaltet; Distanzkorrekturen zwischen Raeumen sind explizit erlaubt.
- Spezialraum-Polygone duerfen als freie Formen gespeichert werden; erforderliche Editoraktionen sind Vertex Insert/Delete/Move.
- Haupt-Dashboard bleibt Trigger-zentriert; Kalibrier- und Shape-Workflows werden ausschliesslich im Settings-Bereich gefuehrt.
- Per-Room-Geometrie wird transform-first gerechnet (REL/ABS + Stretch), danach erst globale Hitarea-Kalibrierung angewandt.
- Spezialraum-Polygone werden als freie Vertex-Listen pro Board gehalten und im Overlay direkt editiert.
- Persistenz nutzt ein gemeinsames Board-Profil-Schema (`tt-beamer.board-profiles.v1`) mit Legacy-Hitarea-Fallback.
- Plan-Update 5 setzt Prioritaetsfokus: P0 echter Tab-/View-Switch fuer `Settings`, P0 Photoshop-aehnliches Vertex-Editing (sichtbare Handles, aktive Ecke, Insert/Delete/Drag), P0 Persistenz-Rueckwaertskompatibilitaet fuer bestehende Kalibrierdaten.
- `Settings` und `Dashboard` werden als gegenseitig exklusive Arbeitsbereiche behandelt; sichtbare Mischansicht gilt als Blocker.
- Spezialraum-Polygoneditor muss jeden Vertex als Handle zeigen; aktive Ecke wird kontraststark markiert und direkt loeschbar gehalten.
- Bestehende kalibrierte Raumdaten bleiben auch nach Profilschema-Erweiterungen ohne manuelle Migration weiter nutzbar.
- View-Switch erzwingt Dashboard/Settings-Exklusivitaet per `hidden` + `aria-hidden` auf Gruppenebene.
- Polygoneditor adressiert Insert ueber aktive Kante und Delete ueber aktive Ecke mit Mindestpunkt-Guard.
- Legacy-Kalibrierdaten werden beim Laden in `tt-beamer.board-profiles.v1` migriert und sofort vorwaerts gespeichert.
- Plan-Update 6 setzt Prioritaetsfokus: P0 harte Tab-Exklusivitaet, P0 transparentere Vertex-Handles, P0 vollflaechige Spezialraum-Animationen, P0 Persistenzschutz fuer bestehende Polygone.
- View-Regel fuer Plan-Update 6: `Dashboard` enthaelt nur Trigger-/Runtime-Bedienung; `Settings` enthaelt nur Geometrie-/Polygon-/Kalibrierfunktionen.
- Polygoneditor-Handles werden visuell entschlackt (mehr Transparenz), aber mit robuster Hitflaeche und klarer Active-Markierung betrieben.
- Spezialraum-Render nutzt polygon-normalisierte Skalierung, damit Animationen unabhaengig von Raumgroesse die volle Zielflaeche ausfuellen.
- Bereits gezeichnete Spezialraum-Polygone gelten als Bestandsdaten und duerfen durch Save/Reload/Restart/Boardwechsel nicht veraendert werden.
- Tab-Exklusivitaet wird zur Laufzeit aktiv geprueft (Switch + Resize), um sichtbare Rest-Element-Leaks sofort zu erkennen.
- Polygon-Handle-UX nutzt transparente Visuals mit separaten, vergroesserten Hit-Targets fuer robuste Selektion auf Desktop/Touch.
- Spezialraum-Effekte werden ueber polygonbasierte Bounds/Radius-Metriken skaliert und fuellen grosse Zielpolygone vollflaechig.
- Spezialraum-Polygone werden beim Profil-Load als Bestandsdaten geschuetzt und bei partiellen Payloads nicht durch Defaults ersetzt.
- Plan-Update 7 setzt Prioritaetsfokus: P0 Tab-Bug final schliessen, P0 Fixed-Board-Layout mit rechtsseitigem Scroll, P0 separater Running-Animations-Bereich.
- Tab-Regel fuer Plan-Update 7: `Dashboard` enthaelt ausschliesslich Animations-/Trigger-UI; `Settings` ausschliesslich Geometrie/Polygon/Kalibrierung.
- Layout-Regel fuer Plan-Update 7: Board bleibt fixiert/sticky im Sichtbereich; vertikales Scrollen ist auf den rechten Steuerbereich begrenzt.
- Running-Animations-Regel fuer Plan-Update 7: aktive Animationen stehen als separater, visuell priorisierter Abschnitt vor den Triggergruppen.
- Tab-Exklusivitaet nutzt zusaetzlich ein Root-Gating (`#control-panel[data-active-view]`) mit Laufzeitvalidierung gegen State-Drift.
- Operator-Layout trennt Scroll-Besitz klar: Board bleibt sticky im Viewport, nur der rechte Control-Stack scrollt.
- Running-Animations-Uebersicht ist als eigener priorisierter Abschnitt oberhalb der Triggergruppen platziert.
- Plan-Update 8 setzt Prioritaetsfokus: P0 Settings-Board-Zoom fuer praezises Polygon-Editing, P0 Spezialraum-Klick-zu-Dropdown-Sync, P0 sticky sichtbarer Dashboard-Block `Aktive Animationen`.
- Zoom-Regel fuer Plan-Update 8: Board-Zoom darf Handle-Selektion/Drag/Insert/Delete nicht entkoppeln; Transform-Pfad bleibt konsistent.
- Sync-Regel fuer Plan-Update 8: Spezialraum-Selektion hat eine gemeinsame Source-of-Truth fuer Board-Klick und Polygon-Editor-Dropdown.
- Sticky-Regel fuer Plan-Update 8: `Aktive Animationen` bleibt beim Scrollen im Dashboard sichtbar und priorisiert bedienbar.
- Settings-Zoom bleibt auf den `Settings`-View begrenzt; Dashboard-Interaktion bleibt unskaliert und stabil.
- Polygon-Drag nutzt SVG-CTM-Inversion, damit Pointer-Koordinaten unter Zoom exakt im Overlay landen.
- Spezialraum-Selektion wird zentral synchronisiert, damit Board-Klick und Polygon-Dropdown keinen Drift mehr erzeugen.
- Plan-Update 9 setzt Prioritaetsfokus: P0 Pan im gezoomten Settings-Board, P0 robuste Trennung Pan vs Polygon-Edit, P1 Regression fuer Zoom+Pan+Edit.
- Interaktionsregel fuer Plan-Update 9: Pan erfolgt primaer ueber `Space + Drag`; mittlere Maustaste kann als Alias denselben Pan-Modus starten.
- Guard-Regel fuer Plan-Update 9: Mit gedrueckter `Space`-Taste startet kein Room-/Vertex-Edit; ohne `Space` bleibt das bestehende Polygon-Editing unveraendert.
- Transform-Regel fuer Plan-Update 9: Zoom, Pan und Fit/Reset nutzen denselben Viewport-State, damit kein Koordinatenversatz zwischen Anzeige und Edit entsteht.
- Plan-Update-9 Viewport nutzt explizites `scale + panX/panY` mit Bounds-Clamp, damit Fit/Reset keinen Arbeitsbereich verlieren.
- Pan-Intent blockiert Room-/Vertex-Edits deterministisch; Exit erfolgt robust ueber Pointer-Up, Key-Up und Blur.
- Runtime-Regression prueft jetzt zusaetzlich Zoom+Pan+Edit und Pointer-Session-Cleanup beim Startup.
- Entscheidung Plan-Update 10: Neue Anforderungen bleiben in Phase 1 (kein Verschieben in Phase 2), da sie den Nemesis-Vertical-Slice direkt betreffen und ohne neue Infrastruktur umsetzbar sind.
- Plan-Update 10 setzt Prioritaetsfokus: P0 assetbasierte Event-Sounds aus `resources`, P0 globaler Outside-Effekt, P0 Ship-Polygon-Editor als Maskenquelle, P1 board-spezifische Persistenz fuer Ship/Outside.
- Sound-Regel fuer Plan-Update 10: Intruder/Reactor/Power-Outage (und passende globale Events) verwenden vorhandene Dateien `alarm.mp3`, `electricity.mp3`, `monsters/048.wav`, `power/3.wav` statt rein synthetischer Cues.
- Masken-Regel fuer Plan-Update 10: Outside-Rendering wird ausschliesslich aus dem editierbaren Ship-Polygon abgeleitet; innerhalb der Schiffsmaske bleibt der Effekt unsichtbar.
- Persistenz-Regel fuer Plan-Update 10: Ship-Polygon und Outside-Effekt-Settings werden pro Board gespeichert und bei Save/Reload/Restart/Boardwechsel deterministisch wiederhergestellt.
- Event-Sound-Pfad ist auf assetbasiertes Voice-Pooling umgestellt; Audio-Master/Volume greifen unveraendert auch bei Mehrfachtriggern.
- Outside-Layer rendert per Even-Odd-Inversclip strikt ausserhalb des Ship-Polygons.
- Ship-Polygon und Outside-Einstellungen (`enabled`, `intensity`, `speed`) sind board-spezifischer Teil des Board-Profilschemas.
- Plan-Update 11 setzt Prioritaetsfokus: P0 Audio an Animationslaufzeit koppeln (inkl. Loop/sofortiger Stop), P0 editierbares Sound-Mapping pro Animation, P1 globale Geschwindigkeitssteuerung, P1 immersive Outside-Alternative mit UI-Toggle.
- Audio-Lifecycle-Regel fuer Plan-Update 11: Sound existiert nur waehrend aktiver Animation; bei laengerer Animation wird geloopt, bei Stop/Ablauf/`Clear All` endet Audio sofort.
- Mapping-Regel fuer Plan-Update 11: Soundzuordnung ist pro Animation in der UI editierbar und muss `none`/Fallback ohne Runtime-Fehler unterstuetzen.
- Outside-Regel fuer Plan-Update 11: Alternative Outside-Animation nutzt denselben Ship-Maskenpfad und darf bestehende Outside-Steuerung/Persistenz nicht brechen.
- Audio wird fuer Plan-Update 11 strikt animationsgebunden verwaltet (`animation.id` als Source-of-Truth fuer Start/Loop/Stop).
- Sound-Mapping ist pro Animation explizit (`asset` oder `none`) und wird vor Runtime-Nutzung auf erlaubte Asset-Pfade normalisiert.
- Outside-Modus (`standard`/`immersive`) bleibt Teil des board-spezifischen `outsideFx`-Profils und rendert weiterhin ausschliesslich im Outside-Maskenpfad.
- Plan-Update 12 setzt Prioritaetsfokus: harte Tab-Trennung (`Dashboard` nur Trigger/Stop, Konfiguration exklusiv in `Settings`), fachliche Trennung globaler Animationen (`Innerhalb` vs `Ausserhalb`), immersive High-Speed-Outside-Ueberarbeitung.
- Tab-Regel fuer Plan-Update 12: Im Dashboard sind Settings-/Mapping-/Calibration-/Editor-Controls strikt verboten; diese sind ausschliesslich im Settings-Tab zulaessig.
- Kategorien-Regel fuer Plan-Update 12: Globale Animationen werden als `inside-ship` bzw. `outside-ship` gefuehrt und in UI + Running-Liste eindeutig getrennt angezeigt.
- Outside-Regel fuer Plan-Update 12: High-Speed-Parallax bleibt ein isolierter Outside-Layer ausserhalb der Ship-Maske; Innenraum-Layer und Room-Renderer bleiben unbeeinflusst.
- Settings-Ownership-Guard validiert zur Laufzeit, dass saemtliche Konfigurationscontrols nur unter `data-view="settings"` gemountet sind.
- Running-Liste kennzeichnet globale Effekte jetzt explizit als `GLOBAL-INSIDE` bzw. `GLOBAL-OUTSIDE` fuer klare fachliche Trennung.
- Outside-Rendering nutzt fail-safe Maskenclipping; ohne gueltiges Ship-Polygon wird kein Outside-Layer gezeichnet (kein Fullscreen-Leak).
- Plan-Update 13 setzt Prioritaetsfokus: P0 bidirektionales Ship-Clipping (Inside strikt innen, Outside strikt aussen), P0 Outside-Rework zu High-Speed-Spaceflow mit Tiefenebenen/Streaks, P0 globale Config-Persistenz aus Browserdaten via Settings-Button `Speichern`.
- Clipping-Regel fuer Plan-Update 13: Rendergrenzen sind beidseitig verpflichtend und exklusiv (`inside -> in ship mask`, `outside -> inverse ship mask`) ohne Grenzlecks bei Paralleltriggern.
- Persistenz-Regel fuer Plan-Update 13: Single-User-Setup schreibt aktuelle lokale Browserdaten als globale Repo-/Server-Defaults; bestehende Polygon-/Geometriedaten bleiben verlustfrei erhalten.
- Inside-Renderpfad ist jetzt maskenpflichtig ueber `clipToInsideShip`; ungueltige Ship-Masken triggern fail-safe no-draw statt Fullscreen-Leak.
- Outside-Visual nutzt High-Speed-Spaceflow mit Multi-Depth-Parallax plus speedgekoppelten Motion-Streaks.
- `Settings` exportiert lokalen Browserstand in `config/global-defaults.json`; Client- und Server-Merge-Guards erhalten Ship-/Spezialraum-Polygone verlustfrei.
- Plan-Update 14 setzt Prioritaetsfokus: P0 Outside-Richtungsumschaltung, P0 Outside-Basis strikt tiefschwarz, P0 Per-Room-Instanzparameter (`speed`/`intensity`/`soundVolume`) und P0 Edit-Flow-Bugfix fuer laufende Instanzen.
- Outside-Regel fuer Plan-Update 14: Richtungswechsel (`forward`/`reverse`) wird als Laufzeitoption im bestehenden Outside-Layer gefuehrt und darf keine Innenraum-Seiteneffekte erzeugen.
- Visual-Regel fuer Plan-Update 14: ausserhalb des Ship-Polygons bleibt der Hintergrund tiefschwarz; blaue Outside-Flaechen sind nicht zulaessig.
- Runtime-Regel fuer Plan-Update 14: Room-Animationen halten Parameter instanzscharf pro `animation.id`; parallele Instanzen duerfen sich nicht ueberschreiben.
- Edit-Regel fuer Plan-Update 14: `Edit` laedt immer die bestehende laufende Instanz und schreibt Aenderungen in-place auf dieselbe `animation.id` (kein Neu-Eintrag).
- Plan-Update 15 setzt Prioritaetsfokus: P0 robuster Global-Defaults-Save ohne `501 Unsupported method POST`, P0 klare Save-Fehlermeldung bei fehlendem API-Server, P0 Start-Flow-Doku fuer POST-faehigen Server, P1 optionaler Export-/Download-Fallback.
- Save-Regel fuer Plan-Update 15: Primaerer Persistenzpfad bleibt `lokaler Browserstand -> globale Defaults` ueber den Node-API-Server; statisches Hosting ohne API gilt als Nicht-POST-Setup.
- UX-Regel fuer Plan-Update 15: Save-Fehler zeigen kurze, handlungsorientierte Klartexte mit konkreter Startanweisung; HTML-Rohantworten werden nicht direkt in der UI angezeigt.
- Doku-Regel fuer Plan-Update 15: README/Startanleitung benennt explizit den noetigen API-Server (`node server.mjs`) und eine kurze Startsequenz fuer API + Frontend.
- Fallback-Regel fuer Plan-Update 15: Optionaler Export/Download ist nur sekundaerer Fallbackpfad und darf den Server-Save nicht ersetzen oder verdecken.
- Save-Transport versucht fuer globale Defaults zuerst Same-Origin-API und dann `localhost:4173` als Fallback fuer das vorgesehene Node-Setup.
- Save-Fehler werden klassifiziert (`API unreachable`/`method unavailable`/`HTML error`/`server error`) und als kurze Operator-Anweisung statt Roh-Fehlertext angezeigt.
- Optionaler Download-Export ist als sekundaerer Fallbackpfad gekennzeichnet; primaerer Standard bleibt API-Speichern.
- Plan-Update 16 setzt Prioritaetsfokus: P0 statisches Frontend-Hosting robust machen (API-Base-Konfiguration + Port-Fallback + klarer Health-Check), P0 endpoint-transparente Save-UX, P0 API-Diagnosepfad, P0 reproduzierbarer Save bei laufender API.
- Reales Betriebsfeedback hebt Plan-Update-15-Defekt wieder auf Blocker-Niveau: `POST /api/global-defaults` liefert unter Static-/Python-Server weiterhin `501`, wenn Endpoint-Aufloesung nicht explizit steuerbar ist.
- Endpoint-Regel fuer Plan-Update 16: Save und Diagnose nutzen dieselbe deterministische API-Base-Aufloesung (explizite Konfiguration > definierte Localhost-Fallbacks > klarer Fehlerzustand).
- Diagnose-Regel fuer Plan-Update 16: Diagnosepruefung testet sowohl API-Erreichbarkeit als auch POST-Faehigkeit auf dem echten Save-Endpunkt und liefert pro Ergebnis konkrete Next Steps.
- UX-Regel fuer Plan-Update 16: Save-Feedback zeigt den tatsaechlich verwendeten Endpoint (Host/Port/Pfad) inklusive Methode/Statusklasse, damit Fehlersuche zielgerichtet bleibt.
- Verifikations-Regel fuer Plan-Update 16: Reproduzierbarkeit gilt erst als erreicht, wenn Mehrfach-Save plus Reload/Restart bei laufender API ohne intermittierende Fehler durchlaufen.
- API-Base-Aufloesung nutzt jetzt feste Reihenfolge: `window.__TT_BEAMER_API_BASE__` > URL-Parameter > `localStorage` > deterministische Localhost-Port-Fallbacks.
- Save-Guard fuehrt verpflichtend `GET /api/health` + `OPTIONS /api/global-defaults` vor dem eigentlichen POST aus; Diagnose und Save teilen denselben Endpoint-Resolver.
- Plan-Update 17 setzt Prioritaetsfokus: headless/remote LAN-Betrieb ist Pflichtfall; Save darf nicht mehr auf `localhost` des Client-Geraets aufloesen.
- Endpoint-Regel fuer Plan-Update 17: sicherer Default ist der Host der aufgerufenen UI (`window.location.hostname`), nicht ein pauschaler `localhost`-Fallback.
- Override-Regel fuer Plan-Update 17: explizite API-Base-Konfiguration bleibt erlaubt und priorisiert (`override > ui-host-default > fallback`).
- UX-Regel fuer Plan-Update 17: Save/Diagnose zeigen explizit `UI-Host -> API-Host` und liefern bei Remote-Mismatch eine konkrete LAN-Handlungsempfehlung.
- Verifikations-Regel fuer Plan-Update 17: reproduzierbarer Save muss ueber IP-Aufruf der UI von einem zweiten LAN-Geraet nachgewiesen werden (mindestens 5x Save + Reload/Restart).
- Plan-Update-17 Umsetzung: Resolver nutzt jetzt UI-Host-default mit hostbasierten Fallback-Ports; stiller Client-`localhost`-Drift im Remote-Fall ist entfernt.
- Plan-Update-17 Umsetzung: Save/Diagnose zeigen Resolver-Quelle sowie `UI-Host -> API-Host` und geben bei Localhost-Mismatch eine konkrete LAN-Hilfestellung.
- Plan-Update 18 setzt Prioritaetsfokus: Realbetrieb nutzt aktuell `python3 -m http.server 4173`; diese Static-only-Fehlkonfiguration muss explizit erkannt und als Save-Blocker ausgewiesen werden.
- Misconfiguration-Regel fuer Plan-Update 18: `GET /api/health` mit 404 + typischer Static-Signatur (Header/Body) wird als `static-only` klassifiziert; Save meldet klar `Static-only Server aktiv, Save nicht moeglich`.
- Guided-Fix-Regel fuer Plan-Update 18: Save-/Diagnose-UX liefert konkrete headless/LAN-Kommandos fuer API-Start (z. B. `node server.mjs --host 0.0.0.0 --port 4173`) und markiert Python-Static explizit als nicht POST-faehig.
- Resolver-Regel fuer Plan-Update 18: Save und Diagnose teilen einen identischen Host-/Endpoint-Snapshot; remote IP-Flow zeigt keine verwirrenden `localhost`-Fallback-Meldungen.
- Verifikations-Regel fuer Plan-Update 18: Pflichtabnahme enthaelt zwingend einen echten Negativtest mit Python-Static und anschliessenden Positivtest mit Node-API auf demselben Host/Port.
- Static-only-Erkennung klassifiziert Python/SimpleHTTP-Health-404 jetzt explizit als Save-Blocker (`STATIC_ONLY_SERVER`) statt generischem API-Fehler.
- Guided-Fix-UX gibt host-korrekte Headless/LAN-Kommandos aus (`node server.mjs --host 0.0.0.0 --port <endpoint-port>`) und markiert Python-Static als nicht POST-faehig.
- Save- und Diagnosepfad nutzen einen identischen Resolver-Snapshot (`UI-Host -> API-Host`, Quelle, Methode, Endpoint); malformed Endpoint-Fallback driftet nicht mehr auf `localhost`.
- Plan-Update 19 setzt Prioritaetsfokus: dedizierten UI-Button `API Diagnose` entfernen und Download-Fallback auf neutrales Wording ohne `Notfall` umstellen.
- Diagnose-Regel fuer Plan-Update 19: Reachability/POST-Pruefung bleibt verpflichtend im Save-Preflight + Save-Feedback, jedoch ohne separaten Diagnose-Button.
- Wording-Regel fuer Plan-Update 19: Export-/Download-Fallback wird durchgaengig als sekundaerer Pfad benannt; alarmistische Labels sind unzulaessig.
- Plan-Update-19 Umsetzung: dedizierter `API Diagnose`-Button ist entfernt; Diagnose-Status wird direkt im Save-Preflight-/Save-Feedback gepflegt.
- Plan-Update-19 Umsetzung: Download-Fallback nutzt durchgaengig neutrales Wording als sekundaeren Pfad ohne `Notfall`-Label.
- Phase-2 Ergaenzung (Plan-Update 2) ist verbindlich gesetzt: Mobile-First Bedienung fuer Touch-Endgeraete (Smartphone Portrait/Landscape) wird als priorisierte Umsetzungsstrecke gefuehrt.
- Mobile-UX-Regel fuer Phase 2: schnelle Daumen-Trigger, klare Trennung `Triggern` vs `laufende Animationen managen`, Touch-Targets >=44x44 px, einhaendige Spieltisch-Bedienung als Pflicht.
- Verifikationsregel fuer Phase 2: reale Spieltischtests sowie mobile Performance-/Responsiveness-Checks sind fester Teil der Abnahme.
- Phase-2 Plan 1 fuehrt mobilen Dashboard-Fokus explizit als Zonenmodell (`Triggern`/`Running managen`) statt Mischpanel.
- `Clear All` ist im Mobile-Flow aus Triggerflaechen entkoppelt und nur ueber Running-Management mit Doppelbestaetigung ausfuehrbar.
- Orientation-Wechsel wird zusaetzlich ueber Runtime-Regression auf State-Drift geprueft (Board/Room/View/Running-IDs stabil).
- Verpflichtendes Feedback fuer Phase 2 ist gesetzt: Global-Defaults-Bugfix fuer neue Geraete, Settings-Button `Defaults laden & anwenden`, Mobile-Top-Control-Schutz ohne Content-Ueberdeckung.
- Bootstrap-Regel (Phase 2): leerer/fehlender Local Storage ist ein verpflichtender Fallback-Fall; globale Defaults werden automatisch geladen und direkt angewendet.
- Settings-Regel (Phase 2): `Defaults laden & anwenden` zieht globale Defaults bewusst nach und aktualisiert den aktuellen Laufzeitzustand ohne Neustart.
- Mobile-Layout-Regel (Phase 2): Mobile Top-Controls folgen dem normalen Dokumentfluss; Trigger-/Running-Cluster duerfen keinen Scroll-Content verdecken.
- Desktop-Paritaets-Regel (Phase 2): Mobile-Layout-Anpassungen sind breakpoint-begrenzt; Desktop-Verhalten bleibt unveraendert.
- Phase-2 Plan 2 setzt Prioritaetsfokus: P2-T26..P2-T30 (Global-Defaults-Bootstrap, Startup-Guard, Settings-Reapply, Mobile-Top-Control-Flow, Desktop-Paritaet).
- Startup-Fallback fuer neue/geleerte Geraete ist jetzt explizit abgesichert: Empty-Storage wird als Pflichtfall verfolgt (`applied` oder `failed-explicit`), nie still uebersprungen.
- Settings besitzt `Defaults laden & anwenden`; globale Defaults werden ohne Neustart in den laufenden Runtime-Zustand uebernommen.
- Mobile Dashboard nutzt eine topnahe Steuerzone im normalen Scrollfluss ohne Content-Overlap; Desktop-Paritaet wird in Runtime-Regression + P2-T30-Protokoll nachgewiesen.
- Neues verpflichtendes Feedback fuer Phase 2 ist gesetzt: P0-Bugfix fuer Mobile-Cluster-Overlap zur Board-Projektionsflaeche plus robuste, verlaesslich erreichbare Navigation `Dashboard` <-> `Settings`.
- Projektions-Regel (Phase 2, Plan-Update 3): oberes Mobile-Cluster darf Board-Flaeche beim Scrollen nicht ueberdecken; Board bleibt sichtbar und bedienbar.
- Navigations-Regel (Phase 2, Plan-Update 3): Dashboard-Button in `Settings` bleibt robust erreichbar; kein Navigations-Dead-End bei Scroll/Orientation/Resize/View-Switch.
- Mobile-Control-Cluster wird per Runtime-Offset unterhalb der Projektionsflaeche verankert; Board bleibt bei Scroll sichtbar und interaktiv.
- Primary-View-Navigation (`Dashboard`/`Settings`) ist strukturell persistent und nicht mehr an Dashboard-only-Sichtbarkeit gebunden.
- Navigation/Projection-Resilienz wird ueber kombinierte Guards fuer Scroll, Orientation, Resize und View-Switch regressionsgeprueft.
- Neues verpflichtendes Feedback fuer Phase 2 (Plan-Update 4) ist gesetzt: P0-Hotfix fuer non-sticky `Dashboard`/`Settings` und finales No-Overlay-Mobile-Layout (Referenz `debug/screenshot_debug.jpg`).
- Top-Control-Regel (Phase 2, Plan-Update 4): `Dashboard`/`Settings` sind am Scroll-Start sichtbar, aber explizit nicht sticky/fixiert und duerfen beim Scrollen normal verschwinden.
- Trigger-Layout-Regel (Phase 2, Plan-Update 4): `Triggern`/`Running managen`/`Raum starten` ueberdecken die Board-Flaeche in keinem mobilen Zustand.
- No-Overlay-Regel (Phase 2, Plan-Update 4): Scroll, Orientation-Wechsel, Resize und View-Switch behalten Board-Sichtbarkeit und Interaktion ohne Control-Overlay.
- Mobile Dashboard/Settings und Trigger-Cluster gelten in Plan-Update 4 als harte Non-Sticky-Regel (nur normaler Dokumentfluss auf Mobile).
- Board-Containment-Verification nutzt fuer Plan-Update 4 kombinierte Style-Checks (kein sticky/fixed) und Multi-Point Pointer-Probes.
- Plan-Update 5 setzt Prioritaetsfokus: formale Gap-Closure fuer Phase 2 mit (a) externen Zonen-JSON inkl. Validator/Fallback, (b) echtem Preview/Kombi/Absenden-Flow inkl. Rollback und (c) README-Finalisierung.
- Datenregel fuer Plan-Update 5: `config/zones/*.json` wird kanonische Board-Zonenquelle; Inline-Zonen gelten nur noch als expliziter Notfall-Fallback.
- Live-Flow-Regel fuer Plan-Update 5: Preview-Staging und Live-Commit teilen ein konsistentes Zustandsmodell; letzter Send ist ruecknehmbar (Undo/Rollback).
- Abschlussregel fuer Plan-Update 5: Phase 2 ist formal erst abschliessbar, wenn Gap-Re-Verification + README-Workflow-Update dokumentiert sind.
- Zonenquelle fuer Phase-2-Abschluss ist jetzt extern (`config/zones/*.json`) mit strikter Validierung und klassifiziertem Fallback (`last-known-good`/Inline).
- Preview/Kombi und Live-Commit sind als getrennte Zustandsmodelle umgesetzt; letzter Live-Send ist per Undo/Rollback ruecknehmbar.
- Phase-2-README wurde auf den finalen Operator-Workflow (Defaults -> Kalibrierung -> Preview -> Live -> Rollback) aktualisiert.
- Phase-3 Planung ist vorbereitet: Nemesis Animations-Overhaul mit kombinierten Raumzustaenden (`kaputt`, `brennend`, `alienCount 0-2`, `leiche`), Spezialraum-Effekten (`nest`, `slime`, `decompression`), sauberem Raum-Clipping und immersiver Darstellung.
- Plan-3-1 ist als erste Ausfuehrungswelle execute-ready gesetzt; P0 umfasst Zustandsmodell, Kompositionsregeln, Clipping-Guard, Kombinationsrenderer und Spezialraum-Integration.
- Phase-3 Plan 3-1 ist ausgefuehrt: kombinierbare Raumzustaende laufen als persistente Per-Room-Profile mit zentraler Layer-Komposition.
- Spezialraum-Effekte `nest`, `slime`, `decompression` sind in Trigger/Edit/Runtime integriert und bleiben strikt auf Raum-Polygone geclippt.
- Runtime-Hardening fuer Plan 3-1 nutzt adaptive Quality-Skalierung auf Framekostenbasis und dokumentierte Acceptance-Nachweise in `.planning/phases/phase-03/3-1-VERIFICATION.md`.
- Verbindliches User-Feedback fuer Phase 3 setzt Rework 3-2: Rueckkehr zum separaten Trigger-Modell pro Raumanimation statt kombinierten Raumzustandsobjekten.
- Rework-Regel Plan 3-2: Running-Uebersicht fuehrt jede aktive Raumanimation als eigenen Eintrag; Kombinationen entstehen nur durch parallele Einzeltrigger.
- Verbindliches Raumset fuer Plan 3-2 ist fix: `kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`.
- Renderer-Regel Plan 3-2: `alarm` und `lichtflackern` nutzen globale Aequivalente, bleiben aber strikt auf den Zielraum geclippt.
- Asset-/Parameter-Regel Plan 3-2: `kaputt`/`feuer`/`schleim` nutzen feste GIF-Assets; GIF-Instanzen unterstuetzen `opacity` + `playbackSpeed` und laufen default im `hold`-Modus bis Stop.
- Plan-3-2-Rework ist ausgefuehrt: Room-Trigger laufen wieder als separate Instanzen statt Kombi-Objekt.
- Running-Liste zeigt Instanz-ID/Typ 1:1 pro aktiver Raumanimation; Edit/Stop bleiben instanzgenau.
- `alarm` und `lichtflackern` rendern als globale Aequivalente nur innerhalb des Zielraum-Clips.
- GIF-Assets `malfunction.gif`/`fire.gif`/`final.gif` sind fuer `kaputt`/`feuer`/`schleim` live und instanzscharf mit `opacity` + `playbackSpeed` steuerbar.
- Neues verpflichtendes Feedback fuer Phase 3 (Plan-Update 3-3) ist gesetzt: GIF-Raumanimationen laufen aktuell nicht als echte GIF-Loops, sondern zeigen Pulse-/Zoom-Muster.
- P0-Regel Plan-Update 3-3: Renderer muss fuer `kaputt`/`feuer`/`schleim` native GIF-Framefolge + echten Loop aus den Assets abspielen (kein Pseudoersatz).
- Paritaets-Regel Plan-Update 3-3: `opacity`/`playbackSpeed` bleiben instanzscharf unter nativer GIF-Wiedergabe.
- Regression-Regel Plan-Update 3-3: Running-List-1:1, hold-by-default und Clipping bleiben unveraendert Pflicht-Gates.
- Plan-3-3-Bugfix ist umgesetzt: `kaputt`/`feuer`/`schleim` rendern als native GIF-Frame-Loops ohne Pulse-/Zoom-Ersatz.
- Instanzparitaet bleibt fuer natives GIF-Playback erhalten (`opacity`/`playbackSpeed` je `animation.id` querwirkungsfrei).
- Plan-3-3-Nachweise sind dokumentiert: `P3-T29-REGRESSION.md`, `P3-T30-SOAK.md`, `3-3-VERIFICATION.md`.
- Neues verpflichtendes Feedback fuer Phase 3 (Plan-Update 3-4) ist gesetzt: GIF-Raumanimationen koennen im Fallback-Pfad als Standbild enden, wenn native Decoder nicht verfuegbar sind.
- P0-Regel Plan-Update 3-4: `kaputt`/`feuer`/`schleim` muessen auf allen Zielbrowsern als echte Loops laufen, unabhaengig von `ImageDecoder`.
- Fallback-Regel Plan-Update 3-4: Ersatzpfad muss echten Frame-Fortschritt inkl. Loop liefern; statisches Erstframe ist ein Blocker.
- Paritaets-Regel Plan-Update 3-4: `opacity`/`playbackSpeed` bleiben pro Instanz in nativen und fallback Pfaden konsistent.
- Regression-Regel Plan-Update 3-4: Running-Liste 1:1, hold-by-default und raumstrenges Clipping bleiben Pflicht-Gates ohne Regression.
- Plan-Update-3-4 Umsetzung: GIF-Playback ist decoder-agnostisch; bei fehlendem `ImageDecoder` liefert der Parser-Fallback echte Frame-Loops statt Standbild.
- Phase-7 Plan 7-1 execution: server sync path now uses deterministic ordered queue lanes with bounded backpressure/coalescing and mutation envelopes (`mutationId`, `serverVersion`, `serverTimestamp`, class, priority).
- Phase-7 Plan 7-1 execution: client apply path is version-aware/idempotent with receive/apply acknowledgements and final-output fast-path optimizations for lower apply overhead.
- Phase-7 Plan 7-1 execution: telemetry/regression/report artifacts added (`/api/live/telemetry`, `p7-t12/p7-t13/p7-t14` scripts, phase evidence docs).
- Phase-7 Plan 7-HF1 execution: P7-T12 verifier enforces canonical `hopsMs` only and rejects missing-field payloads via explicit negative-path assertion.
- Phase-7 Plan 7-HF1 execution: P7-T13 non-regression became an executable behavior matrix for room/cluster/align/audio-role/persistence including reload/rejoin parity checks.
- Phase-7 Plan 7-HF1 execution: evidence refreshed to PASS with `debug/p7-hf1-t12-output.json`, `debug/p7-hf1-t13-output.json`, `debug/p7-hf1-t14-output.json` and synchronized phase/global artifacts.
- Phase-7 Entscheidungsauftrag (Realbetrieb): Sync-Architektur pivotet auf serverautoritative Snapshot-Polling-Semantik mit Versionsnummern als verbindlichem Korrektheitspfad.
- Phase-7 Architekturregel (Plan 7-HF2): Clients schreiben nur Commands an den Server und uebernehmen sichtbaren Zustand ausschliesslich aus serverseitigen Snapshots; optimistische lokale Zielstates sind verboten.
- Phase-7 Taktregel (Plan 7-HF2): adaptives Polling 120-250 ms fuer 3-4 Clients ist akzeptierter Betriebsstandard; WebSocket bleibt optionaler Wakeup-Hint ohne Korrektheitsrolle.
- Plan-Update-3-4 Umsetzung: GIF-Renderpfad zeichnet nur Timeline-Frames (kein Erstframe-Fallback), waehrend `opacity`/`playbackSpeed` pro Instanz unveraendert isoliert bleiben.
- Phase-4 Planung ist vorbereitet: umfassendes Refactoring fuer Wartbarkeit mit modularer Zielarchitektur statt monolithischem `src/app.js`.
- Phase-4 Scope-Regel: Verhaltensparitaet ist verpflichtend fuer Dashboard/Settings, Room-Animationen, GIF-Playback, Persistenz, Save/API und mobile UX.
- Phase-4 Migrationsregel: inkrementelle Extraktion (Config/State/API/Persistenz/GIF/Render/UI) mit Pflicht-Regressionsgate nach jedem Block.
- Phase-4 Plan 4-1 extrahiert Config/Normalizer/State/Persistenz/API als modulare Facades, waehrend Runtime-Paritaet ueber bestehende App-Callsites erhalten bleibt.
- Save/Load fuer Global Defaults laeuft ab Plan 4-1 ueber eine dedizierte API-Facade mit unveraenderter Resolver-/Preflight-/Error-Semantik.
- Verbindliche Erweiterung fuer Phase 4: Raummodell wird generalisiert (`room create/delete`, freie Polygone, editierbare Custom-Namen) statt statischem Raumset.
- Phase-4 Plan 4-2 ist als priorisierte P0-Ausfuehrungswelle fuer Room-Generalisierung + Datenmigration execute-ready gesetzt.
- Datenregel fuer Plan 4-2: Defaults/Profile migrieren auf neuen Room-JSON-Standard; Legacy-Staende bleiben ladbar und werden beim Speichern auf den neuen Standard normalisiert.
- Plan-4-2 Umsetzung: Room-Ownership ist modularisiert (`src/app/lib/domain/rooms`, `src/app/lib/ui/settings/rooms`), waehrend `src/app.js` die Orchestrierung beibehlt.
- Plan-4-2 Umsetzung: Kanonisches Raummodell nutzt `roomCatalog` (`id`,`name`,`polygon`,`meta`), UI erlaubt Room-Create/Delete, freie Polygonbearbeitung und Custom-Namen.
- Plan-4-2 Umsetzung: Legacy-Roomdaten bleiben ladbar; Save schreibt konsistent das neue roomCatalog-Schema.
- Neues verpflichtendes Feedback fuer Phase 4 ist gesetzt: Desktop-Problem mit wachsender Running-Liste wird als P0 behandelt; Liste muss begrenzt/scrollbar oder layout-separiert sein, damit Controls immer erreichbar bleiben.
- Scope-Entscheidung fuer Phase 4: Preview-Staging wird vollstaendig entfernt (UI + Runtime + State/Flows), solange Trigger/Edit/Stop/Save-Kernfunktionen regressionsfrei bleiben.
- Plan-4-3 ist entsprechend neu priorisiert als execute-ready P0-Hotfixpaket (Running-Containment + Preview-Decommission + Fokus-Regression).
- Plan-4-3 Umsetzung: Running-Overview ist auf Desktop nicht mehr sticky, die Liste ist hoehenbegrenzt und besitzt einen eigenen Scrollbereich mit Layout-Containment.
- Plan-4-3 Umsetzung: Preview-Staging ist aus UI, Runtime-State, Event-Flows und `/api/live/*` Serverpfaden entfernt; Trigger/Edit/Stop/Save bleiben preview-frei stabil.
- Neues verpflichtendes Feedback fuer Phase 4 (Plan-Update 4-4) ist gesetzt: Polygon-Editor braucht einstellbare Handle-Groesse nahe Zoom fuer Praezisionsarbeit bei hohem Zoom.
- Immersion-Regel fuer Plan-Update 4-4: `lichtflackern` wird als unregelmaessiges, kaputtes Random-Flicker statt Pulsieren gefuehrt und bleibt strikt raumbegrenzt geclippt.
- Edit-Mode-Regel fuer Plan-Update 4-4: gesamtes Room-Polygon ist per LMB-Flaechen-Drag verschiebbar (Photoshop-aehnlich), ohne Vertex-Insert/Delete/Move zu brechen.
- Plan-4-4 ist als priorisierter P0-Hotfix execute-ready; nachgelagerte GIF/Render/UI-Isolation verschiebt sich auf Plan 4-5.
- Plan-4-4 Umsetzung: Polygon-Handle-Groesse ist als zoomnaher Slider (70..220%) eingebaut und wirkt sofort auf Overlay-Handles.
- Plan-4-4 Umsetzung: `lichtflackern` nutzt jetzt unregelmaessiges Random-Flicker (Burst/Dip/Glitch) statt periodischem Puls.
- Plan-4-4 Umsetzung: Room-Polygon-Flaechen-Drag per LMB ist aktiv und gegen Vertex-Edit/Pan-Kollisionen guardiert.
- Neues verpflichtendes Feedback fuer Phase 4 (Plan-Update 4-5) ist gesetzt: Handle-Groesse muss fuer alle Editor-Punkte inkl. Ship-Polygon-Vertices gelten.
- Visual-Regel fuer Plan-Update 4-5: `lichtflackern` behaelt den Stil, entfernt aber stoerende horizontale weisse Streifen (kein Glitch-Look).
- Speed-Regel fuer Plan-Update 4-5: Mindest-Speed fuer `lichtflackern` wird auf 10% abgesenkt, konsistent in UI/Runtime/Persistenz.
- Persistenz-Regel fuer Plan-Update 4-5: Sound-Mapping/Sound-Auswahl bleibt nach Reload erhalten und ist ueber Global Defaults speicher-/ladbar.
- Plan-4-5 ist als priorisierter P0-Hotfix execute-ready gesetzt; GIF/Render/UI-Isolation verschiebt sich auf Plan 4-6.
- Plan-Update-4-5 Umsetzung: Room- und Ship-Polygoneditor nutzen denselben Handle-Metrikpfad inklusive gemeinsamer Handle-Scale-Quelle.
- Plan-Update-4-5 Umsetzung: `lichtflackern`-Cleanup ersetzt horizontale Glitch-Baender durch lokale Spark-Bursts bei unveraendert unregelmaessigem Flicker-Charakter.
- Plan-Update-4-5 Umsetzung: Board-Profile persistieren `audio`, `animationSpeed` und `animationSoundMap`; Reload + Global-Defaults-Apply bleiben fuer Sound-Mapping konsistent.
- Plan-Update 4-5b setzt Prioritaetsfokus: P0 Mini-Hotfix fuer Persist-on-change in Audio/Sound-Mapping-Handlern und deterministischen Direkt-Reload.
- Plan-Update-4-5b Umsetzung: Audio-Enable/Volume und Animation-Sound-Mapping persistieren sofort; Mapping-Normalisierung schreibt ebenfalls direkt, damit Reload ohne Timing-Luecke den letzten Stand liest.
- Phase-5 Planung ist vorbereitet: Multi-Device Live-Sync mit serverautoritativem Shared-State und dediziertem Final-Beamer-Output.
- Final-Output-Regel fuer Phase 5: Serverpfad `/output/final` zeigt ausschliesslich FX/Animationen; kein Board-Bild, keine Raum-Polygone, keine Raumnamen.
- Sync-Regel fuer Phase 5: Aenderungen eines Controllers werden sofort an alle verbundenen Clients (Handy/PC/Beamer) repliziert.
- Align-Regel fuer Phase 5: globaler Align-Mode blendet Polygon-Overlay nur im Final-Output ein/aus; Controller-Views behalten Polygone immer sichtbar.
- Audio-Regel fuer Phase 5: Audio ist strikt output-gebunden (`final-output` hoerbar, `control` stumm).
- Logging-Regel fuer Phase 5: serverseitiges persistentes Dateilog erfasst Session-Events, State-Aenderungen und Fehler mit Kontext.
- Plan-5-1 Umsetzung: `/output/final` laeuft als dedizierte Final-Output-Rolle mit FX-only-Rendervertrag.
- Plan-5-1 Umsetzung: Shared-Live-State ist serverseitig versioniert und repliziert per WebSocket-Broadcast inklusive Join-Snapshot.
- Plan-5-1 Umsetzung: Align-Mode ist global und wirkt nur auf Final-Output-Polygone; Control-Polygone bleiben immer sichtbar.
- Plan-5-1 Umsetzung: Audio ist rollenbasiert hart getrennt (control muted, final-output audible).
- Plan-5-1 Umsetzung: Persistentes JSONL-Logging schreibt `session_event`, `state_change` und `error` Eintraege.
- Neues verpflichtendes Feedback fuer Phase 5 ist gesetzt: Outside-Space-Sync ist unvollstaendig und `/output/final` verletzt im Bugfall den FX-only-Vertrag (UI-Leaks/White-Page).
- Hotfix-Regel fuer Phase 5: Outside-State (`enabled`, `speed`, relevante Parameter) ist als vollstaendiger Shared-State inkl. Join/Reconnect-Snapshot verpflichtend.
- Hotfix-Regel fuer Phase 5: Final-Output muss stabil als Vollbild-FX-only booten/rendern; Slider/Settings/UI sind dort verboten, Align-Polygon-Overlay bleibt einzige Ausnahme.
- Phase-5 Plan 5-HF1 ist als priorisierte execute-ready P0-Welle vor Plan 5-2 gesetzt.
- Plan-5-HF1 Umsetzung: Outside-FX wird im Shared-State vollstaendig synchronisiert (`outsideFxByBoard` inkl. Toggle/Speed/Intensity/Mode/Direction) und bei Join/Reconnect ueber Snapshot hydratisiert.
- Plan-5-HF1 Umsetzung: `/output/final` nutzt root-absolute Bootstrap-Assets und harte FX-only Guards; Align-Overlay bleibt die einzige erlaubte Sichtbarkeitsausnahme.
- Neues verpflichtendes Feedback fuer Phase 5 ist gesetzt: Outside `direction`/`mode` und vereinzelt Room-Animation-Aktionen benoetigen teils Mehrfachklicks fuer sichtbare Synchronisierung.
- Hotfix-Regel fuer Phase 5 (Plan 5-HF2): jede Aktion muss beim ersten Ausloesen deterministisch ueber alle Clients synchron sein (kein Retry-/Mehrfachklick-Zwang).
- Architektur-Regel fuer Plan 5-HF2: Mutationen sind serverautoritativ-idempotent und werden nur mit sofortigem Broadcast-Ack (Mutation-ID + Version) als bestaetigt betrachtet.
- Ordering-Regel fuer Plan 5-HF2: schnelle Toggle-Folgen nutzen monotone Versionierung mit stale-drop und deterministic last-write.
- Verifikations-Regel fuer Plan 5-HF2: verpflichtende Single-Click-Regression fuer Outside mode/direction und Room trigger/edit/stop/clear-all inklusive Burst-Soak.
- Plan-5-HF2 Umsetzung: HF2-kritische Mutationen (`outside-update`, `trigger-room`, `edit-room`, `stop-animation`, `clear-all`) werden serverautoritativ als mutationsspezifische Patches statt Vollsnapshot-Overwrite angewendet.
- Plan-5-HF2 Umsetzung: Live-Ack/Broadcast tragen `mutationId` + `version`; Duplicate/Stale-Mutationen werden bestaetigt, aber nicht erneut broadcast-applied.
- Plan-5-HF2 Umsetzung: Client fuehrt `lastSessionVersion`-Guard und Pending-Replay nach `live-hello`, damit Join/Reconnect + Inflight ohne State-Drift bleiben.
- Neues verpflichtendes Feedback fuer Phase 5 ist gesetzt: Layout/ausgewaehltes Board muss ueber alle Clients synchronisiert werden.
- Neues verpflichtendes Feedback fuer Phase 5 ist gesetzt: Legacy-`Output Route` wird entfernt; dedizierter Ausgabepfad bleibt `/output/final`.
- Hotfix-Regel fuer Phase 5 (Plan 5-HF3): Board/Layout ist ein verpflichtender Shared-State mit serverautoritiver Mutation, Ack/Version und Join/Reconnect-Paritaet.
- Decommission-Regel fuer Phase 5 (Plan 5-HF3): `Output Route` wird aus UI/State/Runtime-Pfaden vollstaendig entfernt und per Negativtests abgesichert.
- Phase-5 Plan 5-HF3 ist als priorisierte execute-ready P0-Welle vor Plan 5-2 gesetzt.
- Plan-5-HF3 Umsetzung: Board/Layout-Kontext wird serverautoritativ ueber `context-update` mit Ack/Version synchronisiert und auf allen Clients repliziert.
- Plan-5-HF3 Umsetzung: Join/Reconnect-Hydrierung uebernimmt `selectedBoard`/`selectedLayout` deterministisch aus dem Live-Snapshot ohne manuelles Nachstellen.
- Plan-5-HF3 Umsetzung: Legacy-`Output Route` ist aus UI/Runtime/State entfernt; `/output/final` bleibt der einzige dedizierte Output-Pfad.
- Phase-6 Planung ist vorbereitet: boardspiel-agnostischer Betrieb mit importierbaren Boards, serverseitiger Persistenz und dynamischer Katalogauswahl statt Nemesis-only A/B-Hardcoding.
- Board-Katalog-Regel fuer Phase 6: Board-Auswahl basiert auf kanonischem Catalog-Schema (`boardId`, Metadaten, Raumdaten, optionale Cluster); Runtime/UI lesen ausschliesslich aus dem Katalog.
- English-Flow-Regel fuer Phase 6: Operator-relevante UI-Texte, Statusmeldungen, Dokumentationshinweise sowie Logs/Errors werden auf durchgaengiges Englisch vereinheitlicht.
- Cluster-Regel fuer Phase 6: Room-Clusters sind frei definierbar und als Dropdown-Ziel waehlbar; Trigger/Edit starten fuer alle enthaltenen Raeume, waehrend Board-Klick auf Einzelraum weiterhin nur den angeklickten Raum selektiert.
- Migrations-Regel fuer Phase 6: bestehende Nemesis-Daten inklusive Polygonen und Animationskonfigurationen werden verlustfrei, idempotent und rueckwaertskompatibel in den neuen Standard ueberfuehrt.
- Phase-6 Plan 6-1 ist als priorisierte execute-ready P0-Welle gesetzt (Catalog/Import, English-Flow, Clusters, Migration).
- Plan-6-1 execution: board catalog now loads via `/api/boards` with server-side import endpoint `/api/boards/import` and persisted storage in `config/boards/imported`.
- Plan-6-1 execution: room target model supports `room` + `cluster`; cluster launch fans out per room while board click remains single-room only.
- Plan-6-1 execution: operator-facing README and major board/catalog/target UI copy migrated to English for phase-6 workflows.
- verify-work-6 follow-up re-opens a P0 blocker: `English-only operator flow` is still incomplete in operator-facing paths.
- Hotfix-Regel fuer Phase 6 (Plan 6-HF1): keine deutschen operatorrelevanten Texte in `Control`/`Settings`/`Final-Flow`, inklusive Statusmeldungen und Fehlermeldungen.
- Dokumentations-Regel fuer Plan 6-HF1: `README.md` und Phase-06-Artefakte muessen die English-only Operator Policy konsistent widerspiegeln.
- Verifikations-Regel fuer Plan 6-HF1: blocker closure erfordert ein dediziertes Language-Sweep-Artefakt (`.planning/phases/phase-06/P6-HF1-LANGUAGE-SWEEP.md`).
- Plan-6-HF1 execution: Control/Settings/Final-flow operator text + status/error paths are fully English-only.
- Plan-6-HF1 execution: README + Phase-06 workspace docs now state the English-only operator policy consistently.
- Plan-6-HF1 execution: blocker closure documented in `.planning/phases/phase-06/P6-HF1-LANGUAGE-SWEEP.md` (PASS, no open P0 language blocker).
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt: Polygon-Editor braucht getrennte Vertex-Visibility-Toggles fuer Room-Vertices und Play-Area-Vertices.
- Terminologie-Regel fuer Phase 6 (Plan 6-2): `Ship Polygon` wird in UI/Model/Operator-Wording auf `Play Area` generalisiert; Legacy-Bezeichner sind nur als Ladealias erlaubt.
- Visual-Regel fuer Phase 6 (Plan 6-2): ehemalige Spezialraum-Sondermarkierungen entfallen; Spezialraeume werden visuell wie normale Raeume behandelt.
- Creation-Regel fuer Phase 6 (Plan 6-2): neue Raeume koennen aus bestehenden Polygonvorlagen erzeugt werden; Geometriepunkte werden als Startform kopiert.
- Phase-6 Plan 6-2 ist als priorisierte execute-ready P0-Welle gesetzt (Vertex-Split, Play-Area-Rename, no-special-room-visuals, Polygon-Template-Copy).
- Plan-6-2 execution: Polygon editor now has independent vertex visibility toggles for room polygons vs Play Area polygons with hidden-group drag/selection guards.
- Plan-6-2 execution: Operator-facing `Ship Polygon` wording is generalized to `Play Area`; persistence canonical key is `playAreaPolygon` with legacy ship aliases for load/merge migration.
- Plan-6-2 execution: Special-room visual highlighting is removed and room creation can clone polygon templates from Play Area or existing rooms.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt: Room-Copy muss vollstaendig alle Room-Geometry-Eigenschaften inkl. Scale/Offset/Transform uebernehmen.
- Keyboard-Regel fuer Phase 6 (Plan 6-HF2): bei selektiertem Room muss `CTRL+C` kopieren, `CTRL+V` einfuegen und `Delete` loeschen.
- Selection-Regel fuer Phase 6 (Plan 6-HF2): Klick auf leere Boardflaeche setzt Room-Selektion auf `none`.
- Non-Regression-Regel fuer Phase 6 (Plan 6-HF2): Play-Area-Editing/-Selection bleibt durch Room-Copy/Keyboard/Deselection unberuehrt.
- Phase-6 Plan 6-HF2 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-Hardening ist als Plan 6-3 nachgelagert und startet erst nach Plan-6-HF2-Regressionsevidenz.
- Plan-6-HF2 execution: room template-copy now preserves full room geometry parity (transform fields plus roomGeometry scale/offset/absolute/stretch values).
- Plan-6-HF2 execution: selected-room keyboard editing supports `CTRL/CMD+C`, `CTRL/CMD+V`, and `Delete` with typing/play-area conflict guards.
- Plan-6-HF2 execution: empty-board click clears selected room deterministically while Play-Area editing/selection remains unchanged.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt: `Delete` funktioniert aktuell nur waehrend LMB-Hold auf dem Room, obwohl der Room visuell selektiert ist.
- Selection-Regel fuer Phase 6 (Plan 6-HF3): visuell selektierter Room (Polygon/Handles sichtbar) ist kanonisch aktiv selektiert und dient als einzige Source-of-Truth fuer Room-Hotkeys.
- Delete-Regel fuer Phase 6 (Plan 6-HF3): `Delete` loescht den aktiv selektierten Room sofort ohne Pointer-Hold-/Drag-Voraussetzung.
- Regression-Regel fuer Phase 6 (Plan 6-HF3): kombinierte Matrix fuer Copy/Paste/Delete + Empty-space deselect + Play-Area-Guard ist als P0-Hotfix-Pflichtnachweis erforderlich.
- Artefakt-Regel fuer Phase 6 (Plan 6-HF3): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP werden im selben Schritt konsistent synchronisiert.
- Phase-6 Plan 6-HF3 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF3 execution: visuelle Room-Selektion ist als persistente aktive Selection normalisiert und verhindert Selection-/Handle-Drift nach Pointer-Up.
- Plan-6-HF3 execution: `Delete` loescht den aktiv selektierten Room ohne Hold-/Drag-Abhaengigkeit und behaelt Typing-/Play-Area-Guards bei.
- Plan-6-HF3 execution: kombinierte Regression fuer Copy/Paste/Delete + Empty-space deselect + Play-Area-Guard ist als `P6-T37-REGRESSION.md` dokumentiert.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt: persistente Room-Selection regressiert im Pointer-Arbitration-Pfad (Polygone/Handles nur waehrend LMB-Hold sichtbar).
- Pointer-Arbitration-Regel fuer Phase 6 (Plan 6-HF4): `Click` aktiviert persistente Selection, `Hold/Move` startet Drag; Pointer-Up darf Selection nicht invalidieren.
- Lifecycle-Regel fuer Phase 6 (Plan 6-HF4): sichtbare Room-Polygone/Handles bleiben bis Empty-Space-Deselect oder Room-Wechsel aktiv.
- Input-Regel fuer Phase 6 (Plan 6-HF4): Delete/Copy/Paste + Buttons lesen ausschliesslich persistente Selection (kein transienter Hold-State).
- Phase-6 Plan 6-HF4 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF4 execution: pointer arbitration now uses pending drag promotion (`click => persistent selection`, `hold+move => area drag`).
- Plan-6-HF4 execution: pointerup keeps persistent room selection/handles visible until empty-space deselect or room switch.
- Plan-6-HF4 execution: room keyboard/buttons resolve actions from persisted selected-room state; combined regression documented in `P6-T42-REGRESSION.md`.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt: kurzer Click selektiert Room nicht persistent ohne Move; Selection bleibt nur waehrend Hold sichtbar.
- P0-Regel fuer Phase 6 (Plan 6-HF5): no-move short-click muss persistente Selection aktivieren; Drag darf dafuer nicht erforderlich sein.
- Lifecycle-Regel fuer Phase 6 (Plan 6-HF5): Pointer-Up nach no-move Click behaelt Polygon/Handles sichtbar bis Empty-Space-Deselect oder Room-Wechsel.
- Guard-Regel fuer Phase 6 (Plan 6-HF5): Empty-space deselect, Play-Area-Guard sowie Copy/Paste/Delete bleiben unter Click-Fix regressionsfrei.
- Phase-6 Plan 6-HF5 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF5 execution: no-move short-click persists room selection without move/drag requirement.
- Plan-6-HF5 execution: pointer-up lifecycle keeps persistent selection visuals/handles active until explicit deselect or room switch.
- Plan-6-HF5 execution: drag parity + guard matrix remain PASS, documented in `P6-T46-DRAG-PARITY.md` and `P6-T47-REGRESSION.md`.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt (Regression nach HF5): Vertex-Click darf Room-Selektion nicht verlieren; Vertex-Auswahl fuer Move/Delete muss stabil bleiben.
- Pointer-Arbitration-Regel fuer Phase 6 (Plan 6-HF6): Room- und Vertex-Pointerpfade sind deterministisch getrennt; Vertex-Interaktion darf persistente Room-Selektion/Handles nicht invalidieren.
- Selection-Lifecycle-Regel fuer Phase 6 (Plan 6-HF6): direkter Vertex-Click ist primaerer Editpfad (Move/Delete/Panel/Delete-Key) ohne Re-Select ueber Dropdown.
- UX-Guard-Regel fuer Phase 6 (Plan 6-HF6): unbeabsichtigte Text-Selektion wird waehrend Room-Drag unterdrueckt, sofern der Fix ohne Risiko fuer Input-Felder und bestehende Drag-Flows bleibt.
- Plan-6-HF6 execution: vertex pointerup now preserves persistent room selection lifecycle and blocks same-cycle deselect races.
- Plan-6-HF6 execution: direct vertex click remains stable as active selection for move/delete; delete key + delete panel share the same vertex selection source.
- Plan-6-HF6 execution: room-area drag suppresses browser text selection via low-risk drag-only guard; combined HF6 regression matrix is PASS (`P6-T53-REGRESSION.md`).
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt (nach HF6): Edge-Bubble-Click zwischen Vertices deselektiert den Room; Room-Delete ist gegen Global-Defaults-Rehydrate nicht persistent.
- Pointer-Arbitration-Regel fuer Phase 6 (Plan 6-HF7): Edge-Bubble-Click folgt dem Vertex-Lifecycle, behaelt persistente Room-Selektion und laesst aktive Edge fuer Insert-Vertex stabil.
- Delete-Persistenz-Regel fuer Phase 6 (Plan 6-HF7): geloeschte Rooms werden als board-spezifische Tombstones persistiert; Defaults-Merge/Overlay darf getombstonete Rooms nicht wiederherstellen.
- Regression-Regel fuer Phase 6 (Plan 6-HF7): Pflichtnachweis umfasst Insert-Vertex-Flow (edge click ohne reselect), delete persistence (reload/restart/defaults apply) und bestehende Guards (empty-space deselect, play-area parity).
- Artefakt-Regel fuer Phase 6 (Plan 6-HF7): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Phase-6 Plan 6-HF7 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF7 execution: edge-bubble click now preserves persistent room selection and stable active edge lifecycle for direct insert-vertex without reselect.
- Plan-6-HF7 execution: room deletions persist as board-scoped `deletedRoomIds` tombstones; catalog apply and defaults export merge enforce `tombstone > defaults` precedence.
- Plan-6-HF7 execution: combined regression matrix is PASS and documented in `P6-T59-REGRESSION.md`; Plan 6-3 is unblocked.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt (nach HF7): Room-Animation-Drafts resetten bei Room-Wechsel; Cluster-UX/Flow ist unvollstaendig (fehlendes CRUD, fehlendes `stagger start`).
- Draft-Regel fuer Phase 6 (Plan 6-HF8): zuletzt gewaehlte Room-Animation sowie aktuelle Trigger-Parameter bleiben ueber Room-/Target-Wechsel und Trigger-Start als aktive Voreinstellung erhalten.
- Cluster-UX-Regel fuer Phase 6 (Plan 6-HF8): Cluster sind im Operator-Flow board-spezifisch voll verwaltbar (create/edit/delete) und in `target` waehlbar.
- Trigger-Option-Regel fuer Phase 6 (Plan 6-HF8): `stagger start` ist pro Trigger schaltbar (`off` = synchron, `on` = kurzer randomisierter Room-Versatz).
- Artefakt-Regel fuer Phase 6 (Plan 6-HF8): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Phase-6 Plan 6-HF8 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt (nach HF8): Draft-Persistenz wird praezisiert (`animation + parameter` stabil, `target` ausgenommen); Room-Klick muss `target` automatisch auf den geklickten Room setzen.
- Target-Regel fuer Phase 6 (Plan 6-HF9): `target`-Dropdown bleibt immer manuell bedienbar, auch ohne aktive Room-Selektion; selection-basierte Deaktivierung ist unzulaessig.
- Auto+Manual-Regel fuer Phase 6 (Plan 6-HF9): nach Room-Autofill bleibt manueller Wechsel auf Room/Cluster jederzeit moeglich, unabhaengig vom Selection-State.
- Artefakt-Regel fuer Phase 6 (Plan 6-HF9): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Phase-6 Plan 6-HF9 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF9 execution: Draft-Persistenz bleibt fuer Animation + Parameter stabil; `target` ist explizit aus Selection-Lifecycle-Resets ausgenommen.
- Plan-6-HF9 execution: Board-Raumklick setzt `target` deterministisch auf den geklickten Raum; Target-Dropdown bleibt auch ohne aktive Room-Selektion manuell bedienbar.
- Plan-6-HF9 execution: Auto+Manual-Target-Paritaet ist mit `P6-T71-REGRESSION.md` als PASS nachgewiesen; nachfolgendes Pflichtfeedback setzt jedoch HF10 vor Plan 6-3.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt (nach HF9): Cluster-Start fanout startet aktuell nur in einem Raum statt allen Cluster-Membern (betrifft sync + `stagger start`).
- Running-Regel fuer Phase 6 (Plan 6-HF10): Running-Model/-Rendering fuehrt Cluster-Starts als dedizierten Scope `CLUSTER` mit eigener Farbe und separatem Eintrag.
- Fanout-Regel fuer Phase 6 (Plan 6-HF10): Cluster-Start verarbeitet alle Cluster-Member-Raeume robust (kein First-Room-Only), fuer `stagger start = off|on` gleichermassen verbindlich.
- Stop/Edit-Regel fuer Phase 6 (Plan 6-HF10): Aktionen auf dem `CLUSTER`-Eintrag bleiben konsistent und regressieren bestehende Room/Global-Guards nicht.
- Artefakt-Regel fuer Phase 6 (Plan 6-HF10): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Phase-6 Plan 6-HF10 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF10 execution: cluster start fanout now dispatches to all valid cluster members in both sync and stagger modes without first-room truncation.
- Plan-6-HF10 execution: running model/list now includes dedicated `CLUSTER` scope entries with distinct scope color and linked member semantics.
- Plan-6-HF10 execution: cluster stop/edit actions on the `CLUSTER` entry operate consistently across linked member instances; combined evidence is PASS in `P6-T76-REGRESSION.md`.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt (nach HF10): Cluster-Animationen sind instabil und koennen nach ~1s verschwinden; Start wirkt teils wirkungslos.
- Cluster-Lifecycle-Regel fuer Phase 6 (Plan 6-HF11): Cluster-Instanzen folgen denselben hold-by-default- und lifetime-Regeln wie Room-Instanzen; kein implizites Self-cleanup/overwrite ohne expliziten Stop oder Ablauf.
- Overwrite/Cleanup-Regel fuer Phase 6 (Plan 6-HF11): Cluster-Fanout, Instanz-Merge und Cleanup-Pfade arbeiten instanzscharf (`animation.id`/run-context) und duerfen keine fremden Member-Instanzen vorzeitig entfernen.
- Sync-Regel fuer Phase 6 (Plan 6-HF11): Board-Wechsel in Settings ist serverautoritativ mit Ack/Version/Ordering und repliziert deterministisch auf alle Clients inkl. `/output/final` ohne Mehrfach-Toggle.
- Reconnect-Regel fuer Phase 6 (Plan 6-HF11): Join/Reconnect-InFlight-Replay respektiert monotone Kontext-Versionen; stale Kontext-Patches werden verworfen, aktuelle Versionen deterministisch angewendet.
- Artefakt-Regel fuer Phase 6 (Plan 6-HF11): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Phase-6 Plan 6-HF11 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF11 execution: cluster lifecycle prune/cleanup keeps hold-by-default parity and no longer self-removes cluster runs via parent-race paths.
- Plan-6-HF11 execution: cluster edit/stop semantics are run-context isolated (`animation.id`/`parentClusterRunId`) with in-place cluster updates and id-scoped member reconciliation.
- Plan-6-HF11 execution: board context sync uses reconnect-safe mutation-id dedup + stale context replay drop + socket ordering guards; first-toggle propagation is deterministic across clients incl. `/output/final`.
- Plan-6-HF11 execution: combined regression matrix is PASS and documented in `P6-T81-REGRESSION.md`; Plan 6-3 is unblocked.
- Neues verpflichtendes Feedback fuer Phase 6 ist gesetzt (nach HF11): Cluster-Start bleibt inkonsistent; Running zeigt teils zusaetzliche `ROOM`-Eintraege oder nur `CLUSTER` ohne sichtbare Member-Wirkung.
- Running-Determinismus-Regel fuer Phase 6 (Plan 6-HF12): pro Cluster-Trigger existiert genau ein kanonischer Running-Eintrag `CLUSTER`; member-`ROOM`-Duplikate fuer denselben Trigger sind unzulaessig.
- Runtime-Determinismus-Regel fuer Phase 6 (Plan 6-HF12): der dedupte `CLUSTER`-Eintrag bleibt ein wirksamer Controller und animiert weiterhin alle Cluster-Member (sync + `stagger start`).
- Stop/Edit-Regel fuer Phase 6 (Plan 6-HF12): Aktionen auf `CLUSTER` propagieren run-kontextscharf und konsistent auf alle zugeordneten Member-Instanzen.
- Regression-Regel fuer Phase 6 (Plan 6-HF12): `targetType=room` bleibt unveraendert funktionsstabil; room-flow ist Pflicht-Non-Regression im HF12-Gate.
- Artefakt-Regel fuer Phase 6 (Plan 6-HF12): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Phase-6 Plan 6-HF12 ist als priorisierte execute-ready P0-Welle vor Plan 6-3 gesetzt.
- Plan-6-HF12 execution: running projection now exposes exactly one `CLUSTER` controller row per cluster trigger without member-`ROOM` duplicates in the running list.
- Plan-6-HF12 execution: deduped cluster controller keeps full-member runtime fanout deterministic (sync + stagger), including controller-first snapshot fallback rendering.
- Plan-6-HF12 execution: cluster stop/edit propagation resolves members via merged `memberAnimationIds` + `parentClusterRunId` linkage; room-target flow remains non-regressed (`P6-T86-ROOM-TARGET-REGRESSION.md`).
- Plan-6-HF12 execution: combined regression matrix is PASS in `P6-T87-REGRESSION.md`; Plan 6-3 remains unblocked.
- Neues verpflichtendes Feedback nach Realtest setzt Phase-7-Fokus: Multi-Device-Sync muss fuer spuerbar low-latency first-click Verhalten umfassend umgebaut werden.
- Architektur-Regel fuer Phase 7: Event-Pipeline wird auf deterministisches `ingest -> order -> commit -> fanout -> apply` mit `mutationId`/Version/Ack/Dedup umgestellt.
- Prioritaets-Regel fuer Phase 7: `stop/toggle-off/clear-all` erhalten preemptiven Kontrollpfad ohne visual/audio Restartefakte.
- Final-Output-Regel fuer Phase 7: `/output/final` ist priorisierter low-latency apply/render/audio Pfad mit minimalem UI-overhead.
- Messbarkeits-Regel fuer Phase 7: E2E-Telemetrie und Latenz-SLOs (P50/P95/P99) sind verbindliche Abnahmebasis.
- Non-Regression-Regel fuer Phase 7: room/cluster, align-mode, audio-role-routing und persistence bleiben verpflichtend stabil.
- Phase-7 Plan 7-1 ist als erste execute-ready Welle gesetzt.
- Neues verpflichtendes Feedback fuer Phase 7 setzt Plan 7-HF3 als priorisierte P0-Welle: globale Trigger koennen client-inkonsistent zu kurz laufen, Audio ist sporadisch/verspaetet inkonsistent, Cluster-Stagger braucht deterministischen Offset statt Zufallsversatz.
- Snapshot-Trigger-Regel fuer Phase 7 (Plan 7-HF3): Trigger im Snapshot startet globale Effekte auf allen Clients genau einmal pro Trigger-Revision und laeuft vollstaendig.
- Stop-Regel fuer Phase 7 (Plan 7-HF3): vorzeitiger Abbruch globaler Effekte ist nur mit explizitem Snapshot-Stop zulaessig.
- Audio-Regel fuer Phase 7 (Plan 7-HF3): Audio folgt derselben Trigger-Revision wie Visuals, mit strict stale-drop gegen Alt-Effekt-Nachlauf.
- Stagger-Regel fuer Phase 7 (Plan 7-HF3): Cluster-Member starten sequenziell mit konfigurierbarem Offset-Slider (ms), repliziert ueber Command/Snapshot.
- Plan-7-HF3 execution: Server vergibt trigger-/stop-revisions pro globalem Trigger-Key (`runtime.globalTriggerRevisions`, `runtime.globalStopRevisions`) als snapshotautoritatives Lifecycle-Signal.
- Plan-7-HF3 execution: Client-Apply nutzt once-per-revision replay + stale-reapply-drop fuer globale Trigger und revision-aware Audio-Idempotenz (kein stale replay).
- Plan-7-HF3 execution: Cluster-Stagger ist deterministisch sequenziell (`index * staggerOffsetMs`), Sliderwert wird ueber `runtime.roomDraft` repliziert und in Cluster-Runtime-Metadaten gespiegelt.
- Neues verpflichtendes Feedback fuer Phase 7 ist gesetzt (nach HF3): Start einer room/cluster Animation mutiert unerlaubt Draft-Felder (`target` springt auf `cluster`, `animation` springt auf erstes Element) und bricht Serienstarts mit gleichen Einstellungen.
- Draft-Invarianten-Regel fuer Phase 7 (Plan 7-HF4): Start-Operationen sind strikt draft-immutable; Dropdowns (`animation`, `target`) und Slider bleiben nach Start unveraendert.
- Klick-Regel fuer Phase 7 (Plan 7-HF4): Board-Raumklick darf weiterhin ausschliesslich `target` auto auf den geklickten Raum setzen; Start selbst aendert keine Draft-Felder.
- Scope-Regel fuer Phase 7 (Plan 7-HF4): Verhalten bleibt stabil fuer `targetType=room` und `targetType=cluster`.
- Artefakt-Regel fuer Phase 7 (Plan 7-HF4): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Neues verpflichtendes Feedback fuer Phase 7 ist gesetzt (nach HF4): Align-Mode sync driftet zwischen Clients und Board-Wechsel laesst Running-Reste vom alten Board stehen.
- Align-Regel fuer Phase 7 (Plan 7-HF5): Align-Mode ist serverautoritiver Shared-State und wird nur ueber Command->Snapshot-Versionen auf alle Clients inkl. `/output/final` repliziert.
- Board-Switch-Regel fuer Phase 7 (Plan 7-HF5): Kontextwechsel leert Running atomar und deterministisch; boardfremde Running-Eintraege duerfen nicht rehydrieren.
- Artefakt-Regel fuer Phase 7 (Plan 7-HF5): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Plan-7-HF5 execution: align toggle is now a server-authoritative `context-update` command with ack/version/dedup and snapshot-only apply (no local optimistic align state).
- Plan-7-HF5 execution: align snapshot apply parity now includes `/output/final`; stale/equal-version payloads are rejected deterministically in polling and reconnect replay.
- Plan-7-HF5 execution: board-switch context update clears running atomically server-side and client snapshot apply blocks old-board running residue rehydration.
- Plan-7-HF5 execution: HF5 regression and evidence PASS (`debug/p7-hf5-t12-output.json`, `debug/p7-hf5-t13-output.json`, `debug/p7-hf5-t14-output.json`); Plan 7-2 is unblocked.
- Plan-7-HF6 execution: board-switch now commits as authoritative atomic context transaction with idempotent `contextSwitchTransactionId` guard and deterministic running clear.
- Plan-7-HF6 execution: server snapshot commit path sanitizes running entries by selected board before persist/broadcast; cross-board residue is no longer serializable.
- Plan-7-HF6 execution: reconnect/join apply hard-filters running by board context; deterministic regression/evidence confirms `crossBoardResidueCount = 0` across 4 clients incl. `/output/final` (`debug/p7-hf6-*`).
- Neues verpflichtendes Feedback fuer Phase 7 ist gesetzt (nach HF6): Stop-Button in der Running-Liste routed in Randfaellen falsch und erzeugt neue Instanzen statt bestehende zu stoppen (`animation.id` increment).
- Stop-Routing-Regel fuer Phase 7 (Plan 7-HF7): Running-List-Stop darf ausschliesslich `stop-animation` fuer die ausgewaehlte `animation.id` dispatchen; create/start side-effects sind unzulaessig.
- Stop-Authority-Regel fuer Phase 7 (Plan 7-HF7): Stop-Mutation wird serverautoritativ committed und deterministisch auf alle Clients inkl. `/output/final` repliziert.
- Stop-UI-Guard-Regel fuer Phase 7 (Plan 7-HF7): Stop-Aktionen sind inflight-idempotent (no re-trigger/double-dispatch), bis Ack/Snapshot den Stop bestaetigt.
- Stop-Paritaets-Regel fuer Phase 7 (Plan 7-HF7): Regression-Gate deckt room/global/cluster stop semantics inkl. multi-client parity und no-anim-id-increment Invariante ab.
- Plan-7-HF7 execution: running-list stop routing dispatches strictly `stop-animation` via dedicated helper; trigger/create side-effects are blocked.
- Plan-7-HF7 execution: server stop mutation is idempotent for stale/unknown IDs and reconciles cluster-linked stop lifecycle without start side-effects.
- Plan-7-HF7 execution: `live-session-update` applies stop/clear snapshots immediately with version/dedup guard for synchronized parity on control + `/output/final`.
- Plan-7-HF7 execution: per-animation pending stop locks (`Stopping...` disabled state) prevent duplicate/retrigger stop dispatch until snapshot confirmation.
- Plan-7-HF7 execution: deterministic regression matrix PASS for room/global/cluster stop parity and anim-id non-increment invariant (`debug/p7-hf7-*`).
- Neues verpflichtendes Feedback fuer Phase 7 ist gesetzt (nach HF7): individueller Running-Stop bleibt fuer `global-outside` inkonsistent (teils Neuinstanz/No-Op), und Running-Liste-Hover blinkt statt stabil zu highlighten.
- Stop-Paritaets-Regel fuer Phase 7 (Plan 7-HF8): Running-Stop muss fuer alle Scopes (`room`, `global-inside`, `global-outside`, `cluster`) deterministisch stop-only bleiben; `Clear All` bleibt unveraendert stabil.
- Semantik-Regel fuer Phase 7 (Plan 7-HF8): server/client stop semantics fuer globale Scopes werden vereinheitlicht (`global-inside`/`global-outside`), inkl. idempotent stale/unknown handling ohne create/start side-effects.
- Hover-Regel fuer Phase 7 (Plan 7-HF8): Running-List-Hover bleibt konstant sichtbar (kein blink/loop-flicker) und visuell paritaetisch zu den restlichen Buttons.
- Artefakt-Regel fuer Phase 7 (Plan 7-HF8): PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE werden im selben Schritt konsistent synchronisiert.
- Neues verpflichtendes Feedback fuer Phase 7 ist gesetzt (verify-work 7-HF8 follow-up): Nach HF8 neutralisieren/ueberschreiben Start-Mutationen fuer room/global-inside/cluster den Laufzeitstart; sichtbar startet teils nur `global-outside`.
- Status-Regel fuer Plan 7-HF9: `board switched` bleibt ein Kontextsignal und darf aktive Start-/Running-Statusereignisse nicht maskieren oder unmittelbar zuruecksetzen.
- Lifecycle-Regel fuer Plan 7-HF9: gestartete Animationen bleiben aktiv bis Timerablauf oder explizitem `stop-animation`/`clear-all`; Determinismus ueber Multi-Client + `/output/final` bleibt Pflicht.
- Kritischer Follow-up-Blocker nach HF9 bleibt offen: im Realbetrieb starten weiterhin nur `global-outside` stabil, waehrend `room`/`global-inside`/`cluster` nur kurz blitzen oder sofort verschwinden.
- Root-Cause-Regel fuer Plan 7-HF10: der Laufzeitpfad `start command dispatch -> server apply -> snapshot apply` wird reproduzierbar traced; Ursache `start ignored/overwritten` muss als belegte Sequenz nachgewiesen werden.
- Dispatch/Apply-Regel fuer Plan 7-HF10: Start-Dispatch, serverseitiges Apply und clientseitiges Snapshot-Apply werden gemeinsam gehaertet, damit `room`/`global-inside`/`cluster` first-click deterministisch starten und aktiv bleiben.
- Status-Regel fuer Plan 7-HF10: Statusmeldungen (inkl. Kontextsignale) duerfen den Start-/Running-Lifecycle nicht maskieren oder vorzeitig als beendet darstellen.
- Smoke-Gate-Regel fuer Plan 7-HF10: nach Fix muessen `room`/`global-inside`/`cluster` in der Running-Liste erscheinen und aktiv bleiben bis Timerablauf oder explizitem `stop-animation`/`clear-all`.
- Evidenz-Regel fuer Plan 7-HF10: Test-/Verify-Artefakte enthalten verpflichtend echte Reproduktion des Blockers plus dokumentierten PASS-Nachweis fuer den Fix.
- Phase-7 Plan 7-HF10 ist als priorisierte execute-ready P0-Blocker-Welle vor Plan 7-2 gesetzt.
- Phase 47 Wave-1-Regel ist bindend: Plan 47-01 ist ein BEHAVIOR-PRESERVING refactor. `buildChromiumLaunchArgs({ platform, opts })` reproduziert iter15 byte-identisch auf BEIDEN Plattformen (Linux + Windows). `--display=${display}` bleibt unconditional emit (kein isWin32-Gate) — exakte iter15-Quelle Zeile 644. Wave 2 (Plan 47-02) ist der einzige autorisierte Pfad, der diese Verhalten ändert; Quelle und WIN32_ITER15_BASELINE werden in einem gemeinsamen Commit aktualisiert.
- Phase 47 Wave-1-Test-Rail-Regel ist bindend: `test/phase-47-linux-non-regression.test.mjs` ist der primäre Regressionsschutz für Wave 2+3. Hand-pinned LINUX_ITER15_BASELINE / LINUX_ITER15_BASELINE_VAAPI / WIN32_ITER15_BASELINE liegen inline im Test (nicht importiert), damit jeder Drift in `src/server/ssr-render-host.mjs` via deepStrictEqual mit klarer per-Flag-Diff stolpert. Linux-Baseline ist operator-locked (D-02); jede Änderung daran erfordert explizite Freigabe.
- Phase 47 Wave-2-Umsetzung (Plan 47-02): Windows SSR Chromium startet per Default in `headless: "new"` (Chrome unified-headless, Q1 + Q3 Begründung). Operator-Escape-Hatch via env `SSR_WIN_HEADLESS=0` revertet auf iter15 headful-Verhalten (modulo `--display=` Win32 no-op cleanup). `--display=` ist auf Win32 UNCONDITIONAL gegated (orthogonal zu useHeadlessNew — kosmetische Bereinigung, Windows Chrome hat keinen X server). LINUX_ITER15_BASELINE ist BYTE-IDENTISCH zu Wave 1 (Linux-Gold-Rail Test G + H grün ohne Berührung). WIN32_ITER15_BASELINE in BEIDEN Testdateien (`test/phase-47-linux-non-regression.test.mjs` Test I + `test/phase-47-windows-headless-new.test.mjs` Test O) verliert `--display=:99` im gleichen Commit wie das Source-Gate — kein Retro-Patch-Konflikt mehr. Commits: fee23d3 (RED), 7c0fa03 (GREEN). Tests 421/401/1/19 (+6/+6 ggü. Wave 1; gleicher 1 pre-existing fail, gleiche 19 skipped). `bash start.sh --dry-run` 0 mit und ohne `SSR_WIN_HEADLESS=0`.
- Phase 47 Wave-2-Orthogonalitäts-Regel ist bindend: das Win32-`--display=`-Gate ist UNCONDITIONAL (außerhalb des `dropOnHeadlessNew` Ternärs) — der Headless-Flip und das `--display=`-Cleanup sind semantisch getrennt, aber atomar im selben Commit (Quelle + WIN32_ITER15_BASELINE in beiden Tests). Künftige Waves dürfen ein Gate ändern ohne das andere zu berühren.

## Execute-Phase Contract (Phase 1)

- Scope klar dokumentiert: `.planning/phases/phase-01/SCOPE.md`
- Umsetzungsplan vorhanden: `.planning/phases/phase-01/PLAN.md`
- Arbeitsbacklog vorhanden: `.planning/phases/phase-01/BACKLOG.md`
- Sequenzierung und Tasks vorhanden: `.planning/phases/phase-01/TASKS.md`
- Abnahme und Tests vorhanden: `.planning/phases/phase-01/ACCEPTANCE.md`

## Execution Results (Phase 1 Plan 1)

- Status: completed
- Summary: `.planning/phases/phase-01/1-1-SUMMARY.md`
- Task Commits: 16 atomare Commits (`b5b006d` .. `70cc9e2`)
- Evidence:
  - `.planning/phases/phase-01/P1-T14-LOADTEST.md`
  - `.planning/phases/phase-01/P1-T15-REGRESSION.md`

## Execution Results (Phase 1 Plan 2)

- Status: completed
- Summary: `.planning/phases/phase-01/1-2-SUMMARY.md`
- Task Commits: 7 atomare Commits (`8b8fd36` .. `0e82c66`)
- Evidence:
  - `.planning/phases/phase-01/P1-T23-OUTPUT-SMOKE.md`

## Execution Results (Phase 1 Plan 3)

- Status: completed
- Summary: `.planning/phases/phase-01/1-3-SUMMARY.md`
- Task Commits: 5 atomare Commits (`f916d3a` .. `1e99d06`)
- Evidence:
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 4)

- Status: completed
- Summary: `.planning/phases/phase-01/1-4-SUMMARY.md`
- Task Commits: 5 atomare Commits (`f7b6297` .. `1d0ecd5`)
- Evidence:
  - `.planning/phases/phase-01/P1-T28-MANUAL-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 5)

- Status: completed
- Summary: `.planning/phases/phase-01/1-5-SUMMARY.md`
- Task Commits: 5 atomare Commits (`48dac0d` .. `39caaaf`)
- Evidence:
  - `.planning/phases/phase-01/P1-T33-REGRESSION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 6)

- Status: completed
- Summary: `.planning/phases/phase-01/1-6-SUMMARY.md`
- Task Commits: 6 atomare Commits (`a650104` .. `f9543e9`)
- Evidence:
  - `.planning/phases/phase-01/P1-T39-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 7)

- Status: completed
- Summary: `.planning/phases/phase-01/1-7-SUMMARY.md`
- Task Commits: 6 atomare Commits (`057e7d2` .. `dfa0d27`)
- Evidence:
  - `.planning/phases/phase-01/P1-T45-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 8)

- Status: completed
- Summary: `.planning/phases/phase-01/1-8-SUMMARY.md`
- Task Commits: 6 atomare Commits (`0813906` .. `310f42e`)
- Evidence:
  - `.planning/phases/phase-01/P1-T51-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 9)

- Status: completed
- Summary: `.planning/phases/phase-01/1-9-SUMMARY.md`
- Task Commits: 5 atomare Commits (`00cfd78` .. `ad883d0`)
- Evidence:
  - `.planning/phases/phase-01/P1-T56-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 10)

- Status: completed
- Summary: `.planning/phases/phase-01/1-10-SUMMARY.md`
- Task Commits: 5 atomare Commits (`55dd54c` .. `59a8d45`)
- Evidence:
  - `.planning/phases/phase-01/P1-T61-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 11)

- Status: completed
- Summary: `.planning/phases/phase-01/1-11-SUMMARY.md`
- Task Commits: 5 atomare Commits (`6fed501` .. `d3196cc`)
- Evidence:
  - `.planning/phases/phase-01/P1-T66-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 12)

- Status: completed
- Summary: `.planning/phases/phase-01/1-12-SUMMARY.md`
- Task Commits: 5 atomare Commits (`9f4ec9d` .. `7b25994`)
- Evidence:
  - `.planning/phases/phase-01/P1-T71-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 13)

- Status: completed
- Summary: `.planning/phases/phase-01/1-13-SUMMARY.md`
- Task Commits: 6 atomare Commits (`515081e` .. `e3b36a4`)
- Evidence:
  - `.planning/phases/phase-01/P1-T77-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 14)

- Status: completed
- Summary: `.planning/phases/phase-01/1-14-SUMMARY.md`
- Task Commits: 6 atomare Commits (`75efc56` .. `74f638f`)
- Evidence:
  - `.planning/phases/phase-01/P1-T83-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 15)

- Status: completed
- Summary: `.planning/phases/phase-01/1-15-SUMMARY.md`
- Task Commits: 7 atomare Commits (`511da73` .. `c932d10`)
- Evidence:
  - `.planning/phases/phase-01/P1-T90-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 1 Plan 16)

- Status: completed
- Summary: `.planning/phases/phase-01/1-16-SUMMARY.md`
- Task Commits: 6 atomare Commits (`f42ef6c` .. `4bb251f`)
- Evidence:
  - `.planning/phases/phase-01/P1-T96-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 1 Plan 17)

- Status: completed
- Summary: `.planning/phases/phase-01/1-17-SUMMARY.md`
- Task Commits: 5 atomare Commits (`5d69ceb`, `ee7b200`, `186a44a`, `0b42592`, `4483437`)
- Evidence:
  - `.planning/phases/phase-01/P1-T101-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)
  - `POST /api/global-defaults` und `POST /api/global-defaults/` => `200` auf Node-Server-Smoke (Port 4180)

## Execution Results (Phase 1 Plan 18)

- Status: completed
- Summary: `.planning/phases/phase-01/1-18-SUMMARY.md`
- Task Commits: 5 atomare Commits (`aab8191`, `bca9ea5`, `def14a5`, `f53d8b6`, `fe1b375`)
- Evidence:
  - `.planning/phases/phase-01/P1-T106-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)
  - Static-Hosting-Simulation: `GET /api/health` => `404`, `POST /api/global-defaults` => `501` (python http.server:8099)
- Node-API-Repro: `HEALTH=200 OPTIONS=204 SAVE=[200,200,200,200,200] SAVE_AFTER_RESTART=200` (Port 4180)

## Execution Results (Phase 1 Plan 19)

- Status: completed
- Summary: `.planning/phases/phase-01/1-19-SUMMARY.md`
- Task Commits: 5 atomare Commits (`4d29aa8`, `7f34d2f`, `2b7fd5b`, `d46d696`, `74c9019`)
- Evidence:
  - `.planning/phases/phase-01/P1-T110-VERIFICATION.md`
  - `.planning/phases/phase-01/P1-T111-VERIFICATION.md`
  - `node debug/p1-t110-resolver-regression.mjs` => `REMOTE_FIRST=192.168.0.80`, `REMOTE_HAS_LOCALHOST=false`, `OVERRIDE_FIRST=localhost`
  - Node-API-Repro: `HEALTH=200 OPTIONS=204 SAVE=[200,200,200,200,200] SAVE_AFTER_RESTART=200` (Port 4180)

## Execution Results (Phase 1 Plan 20)

- Status: completed
- Summary: `.planning/phases/phase-01/1-20-SUMMARY.md`
- Task Commits: 5 atomare Commits (`3b56f06`, `d74a58d`, `cf23e34`, `e786892`, `a7dfec4`)
- Evidence:
  - `.planning/phases/phase-01/P1-T116-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)
  - `node debug/p1-t115-resolver-snapshot-regression.mjs` => `SNAPSHOT_SAVE=UI-Host 192.168.0.80 -> API-Host 192.168.0.80`, `SNAPSHOT_DIAG=...`, `INVALID_ENDPOINT_FALLBACK=http://192.168.0.80:4173`
  - Python-Static-Negativtest (Port 4173): `PY_HEALTH=404 PY_POST=501 PY_SERVER=SimpleHTTP/0.6 Python/3.14.3`
- Node-API-Positivtest (gleicher Port 4173): `NODE_HEALTH=200 NODE_OPTIONS=204 NODE_SAVES=[200,200,200,200,200] NODE_AFTER_RESTART=200`

## Execution Results (Phase 1 Plan 21)

- Status: completed
- Summary: `.planning/phases/phase-01/1-21-SUMMARY.md`
- Task Commits: 5 atomare Commits (`96345d4`, `d5fb34a`, `9e50f94`, `ce8330b`, `2edff83`)
- Evidence:
  - `.planning/phases/phase-01/P1-T121-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)
  - Pattern-Checks: kein `run-api-diagnose`/`API Diagnose (One-Click)` und kein `Notfall`-Wording in `index.html`, `src/app.js`, `README.md`
  - Node-API-Smoke (Port 4180): `HEALTH=200 OPTIONS=204 SAVE=200`

## Execution Results (Phase 2 Plan 1)

- Status: completed
- Summary: `.planning/phases/phase-02/2-1-SUMMARY.md`
- Task Commits: 10 atomare Commits (`9a9a157`, `22ffe34`, `44e9c7f`, `ffaa6cf`, `e6e89ea`, `ce8b948`, `4e67972`, `1cb6cf1`, `c082c9c`, `ce53529`)
- Evidence:
  - `.planning/phases/phase-02/P2-T1-MOBILE-UX-BLUEPRINT.md`
  - `.planning/phases/phase-02/P2-T4-TOUCH-TARGET-CHECKLIST.md`
  - `.planning/phases/phase-02/P2-T6-FEHLKLICK-PROTOKOLL.md`
  - `.planning/phases/phase-02/P2-T7-LESBARKEIT-PROTOKOLL.md`
  - `.planning/phases/phase-02/P2-T8-ORIENTATION-ROUNDTRIP.md`
  - `.planning/phases/phase-02/P2-T9-MOBILE-PERFORMANCE.md`
  - `.planning/phases/phase-02/P2-T10-SPIELTISCH-VERIFIKATION.md`
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 2 Plan 2)

- Status: completed
- Summary: `.planning/phases/phase-02/2-2-SUMMARY.md`
- Task Commits: 5 atomare Commits (`add84bb`, `94a61fd`, `6b97253`, `3964df8`, `4c8cca3`)
- Evidence:
  - `.planning/phases/phase-02/P2-T30-DESKTOP-PARITAET.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 2 Plan 3)

- Status: completed
- Summary: `.planning/phases/phase-02/2-3-SUMMARY.md`
- Task Commits: 5 atomare Commits (`324bce2`, `c0e4c46`, `703c371`, `eeb68a6`, `befb9da`)
- Evidence:
  - `.planning/phases/phase-02/P2-T35-NAV-AND-PROJECTION-VERIFIKATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 2 Plan 4)

- Status: completed
- Summary: `.planning/phases/phase-02/2-4-SUMMARY.md`
- Task Commits: 5 atomare Commits (`5110c2f`, `47d5867`, `4d25bb6`, `b6aefb7`, `ad06399`)
- Evidence:
  - `.planning/phases/phase-02/P2-T40-MOBILE-NO-OVERLAY-VERIFIKATION.md`
  - `debug/screenshot_debug.jpg` (Vorher-Referenz)
  - `node --check src/app.js` (Regression Syntax Check)

## Execution Results (Phase 2 Plan 5)

- Status: completed
- Summary: `.planning/phases/phase-02/2-5-SUMMARY.md`
- Task Commits: 7 atomare Commits (`9cf5083`, `a64c45b`, `b7c8e25`, `3b2f6c6`, `dc8456a`, `fc150fb`, `543e11c`)
- Evidence:
  - `.planning/phases/phase-02/2-VERIFICATION.md` (Follow-up: 6/6 must-haves verified)
  - `.planning/phases/phase-02/P2-T43-ZONEN-NEGATIVTESTS.md`
  - `.planning/phases/phase-02/P2-T47-EXIT-GATE.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 3 Plan 1)

- Status: completed
- Summary: `.planning/phases/phase-03/3-1-SUMMARY.md`
- Task Commits: 12 atomare Commits (`4e959aa`, `2272d2b`, `6b4f96b`, `4ccc445`, `105e5d2`, `c63e07f`, `8f42c2f`, `7ce0b9d`, `90956dc`, `2a0e6f3`, `f563afe`, `364c4a6`)
- Evidence:
  - `.planning/phases/phase-03/3-1-VERIFICATION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 3 Plan 2)

- Status: completed
- Summary: `.planning/phases/phase-03/3-2-SUMMARY.md`
- Task Commits: 13 atomare Commits (`87c8b0e`, `1eec785`, `0e27d86`, `0b933d2`, `66924cf`, `735e1b2`, `a257923`, `d85028a`, `74c5485`, `3bc2e3e`, `a3c222a`, `a5a3019`, `42da20b`)
- Evidence:
  - `.planning/phases/phase-03/3-2-VERIFICATION.md`
  - `.planning/phases/phase-03/P3-T23-REGRESSION.md`
  - `.planning/phases/phase-03/P3-T24-SOAK.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 3 Plan 3)

- Status: completed
- Summary: `.planning/phases/phase-03/3-3-SUMMARY.md`
- Task Commits: 6 atomare Commits (`ed34cd3`, `772ae75`, `9888c46`, `578c367`, `b06f498`, `998dada`)
- Evidence:
  - `.planning/phases/phase-03/3-3-VERIFICATION.md`
  - `.planning/phases/phase-03/P3-T29-REGRESSION.md`
  - `.planning/phases/phase-03/P3-T30-SOAK.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 3 Plan 4)

- Status: completed
- Summary: `.planning/phases/phase-03/3-4-SUMMARY.md`
- Task Commits: 6 atomare Commits (`807de04`, `e2b08da`, `ce12e43`, `cd62c92`, `3e5cde9`, `da1b9f5`)
- Evidence:
  - `.planning/phases/phase-03/3-4-VERIFICATION.md`
  - `.planning/phases/phase-03/P3-T35-REGRESSION.md`
  - `.planning/phases/phase-03/P3-T36-BROWSER-MATRIX-SOAK.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 4 Plan 1)

- Status: completed
- Summary: `.planning/phases/phase-04/4-1-SUMMARY.md`
- Task Commits: 7 atomare Commits (`c8a36be`, `3bc677b`, `f822097`, `bf889dd`, `480b5d3`, `6186e3c`, `8ad1af8`)
- Evidence:
  - `.planning/phases/phase-04/P4-T7-SMOKE-REGRESSION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `GET /api/health=200`, `OPTIONS /api/global-defaults=204`, `POST/GET /api/global-defaults=200` (Port 4199)

## Execution Results (Phase 4 Plan 3)

- Status: completed
- Summary: `.planning/phases/phase-04/4-3-SUMMARY.md`
- Task Commits: 5 atomare Commits (`dbe1704`, `ef97862`, `269c770`, `0d88d8e`, `c8ad4b1`)
- Evidence:
  - `.planning/phases/phase-04/P4-T21-HOTFIX-REGRESSION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check src/app/lib/state/runtime-state.js` (State Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 4 Plan 4)

- Status: completed
- Summary: `.planning/phases/phase-04/4-4-SUMMARY.md`
- Task Commits: 5 atomare Commits (`8cc1841`, `fec3884`, `5182609`, `6c1d025`, `1efbf52`)
- Evidence:
  - `.planning/phases/phase-04/P4-T32-HOTFIX-REGRESSION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check src/app/lib/state/runtime-state.js` (State Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 4 Plan 5)

- Status: completed
- Summary: `.planning/phases/phase-04/4-5-SUMMARY.md`
- Task Commits: 6 atomare Commits (`f04c09f`, `8e09d7e`, `4fc2308`, `a597c66`, `482a313`, `09e01a9`)
- Evidence:
  - `.planning/phases/phase-04/P4-T38-HOTFIX-REGRESSION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - `node --check src/app/lib/state/runtime-state.js` (State Syntax Check)
  - `node --check server.mjs` (Server Syntax Check)

## Execution Results (Phase 4 Plan 5b)

- Status: completed
- Summary: `.planning/phases/phase-04/4-5b-SUMMARY.md`
- Task Commits: 3 atomare Commits (`4382929`, `9be9c36`, `55e374e`)
- Evidence:
  - `.planning/phases/phase-04/P4-T41-HOTFIX-REGRESSION.md`
  - `node --check src/app.js` (Regression Syntax Check)
  - Static Nachweis: Persist-on-change Hook fuer `audio.enabled`, `audio.volume`, `animationSoundMap` + persistierte Mapping-Normalisierung (`src/app.js`)

## Execution Results (Phase 5 Plan 1)

- Status: completed
- Summary: `.planning/phases/phase-05/5-1-SUMMARY.md`
- Task Commits: 16 atomare Commits (`cbc8d1e` .. `ad02f93`, inkl. Hotfix `63ce2ee`)
- Evidence:
  - `.planning/phases/phase-05/P5-T12-AUDIO-LIFECYCLE.md`
  - `.planning/phases/phase-05/P5-T15-REGRESSION.md`
  - Endpoint Smoke: `FINAL=200 LIVE=200 HEALTH=200`
  - WebSocket Sync: `WS_SYNC=ok`, `SYNC_3C=ok receivers=2`

## Execution Results (Phase 5 Plan HF1)

- Status: completed
- Summary: `.planning/phases/phase-05/5-HF1-SUMMARY.md`
- Task Commits: 6 atomare Commits (`5d3caa3`, `494a805`, `e690a27`, `3d0d276`, `11eabe0`, `1e41e7a`)
- Evidence:
  - `.planning/phases/phase-05/P5-T24-HOTFIX-REGRESSION.md`
  - `node debug/p5-t24-outside-join-regression.mjs` => `OUTSIDE_JOIN_SYNC=PASS`
  - `node debug/p5-t24-final-output-contract-check.mjs` => `FINAL_CONTRACT=PASS`

## Execution Results (Phase 5 Plan HF2)

- Status: completed
- Summary: `.planning/phases/phase-05/5-HF2-SUMMARY.md`
- Task Commits: 7 atomare Commits (`fbcfce4`, `0b71203`, `a7b1925`, `31cafdc`, `41cb473`, `1df1d66`, `e4267c1`)
- Evidence:
  - `.planning/phases/phase-05/P5-T25-ROOT-CAUSE.md`
  - `.planning/phases/phase-05/P5-T31-SYNC-RELIABILITY-VERIFICATION.md`
  - `node debug/p5-t30-single-click-sync-regression.mjs` => `P5_T30_SINGLE_CLICK_SYNC_GUARDS=PASS`

## Execution Results (Phase 5 Plan HF3)

- Status: completed
- Summary: `.planning/phases/phase-05/5-HF3-SUMMARY.md`
- Task Commits: 5 atomare Commits (`e3eab15`, `9d1cb44`, `5918370`, `bba951d`, `8781189`)
- Evidence:
  - `.planning/phases/phase-05/P5-T36-CONTEXT-PARITY-VERIFICATION.md`
  - `node debug/p5-t36-context-parity-regression.mjs` => `P5_T36_CONTEXT_PARITY_GUARDS=PASS`

## Execution Results (Phase 6 Plan HF8)

- Status: completed
- Summary: `.planning/phases/phase-06/6-HF8-SUMMARY.md`
- Task Commits: 6 atomare Commits (`f24f0c8`, `3af979c`, `884c308`, `e1d8c41`, `1150c47`, `47878f4`)
- Evidence:
  - `.planning/phases/phase-06/P6-T66-REGRESSION.md`
  - `node --check src/app.js` => PASS
  - `node --check src/app/lib/state/runtime-state.js` => PASS

## Decision Log Addendum (HF8)

- Room/vertex/edge selection darf `roomDraft.targetType/targetId` nicht implizit ueberschreiben; Target-Auswahl bleibt operator-owned.
- Cluster-Startmodus `stagger start` ist cluster-only mit kurzem randomisiertem Versatz; `off` bleibt deterministisch synchron.

## Execution Results (Phase 7 Plan HF2)

- Status: completed
- Summary: `.planning/phases/phase-07/7-HF2-SUMMARY.md`
- Task Commits: 3 commits (`162b589`, `3443bf1`, `d4991f2`)
- Evidence:
  - `debug/p7-hf2-t12-output.json`
  - `debug/p7-hf2-t13-output.json`
  - `debug/p7-hf2-t14-output.json`

## Decision Log Addendum (HF2)

- Korrektheitspfad ist serverautoritatives Snapshot-Polling; WebSocket bleibt optionaler `state-dirty`-Wakeup-Hint.
- Control-Clients senden Mutationen write-only an den Server und zeigen Pending, bis die entsprechende Snapshot-Version sichtbar angewendet wurde.

## Execution Results (Phase 7 Plan HF4)

- Status: completed
- Summary: `.planning/phases/phase-07/7-HF4-SUMMARY.md`
- Task Commits: 7 atomare Commits (`bd3bcf4`, `24e8186`, `3ce8487`, `748d5a9`, `9d176e7`, `d64ba6e`, `35218e9`)
- Evidence:
  - `debug/p7-hf4-t12-output.json`
  - `debug/p7-hf4-t13-output.json`
  - `debug/p7-hf4-t14-output.json`

## Decision Log Addendum (HF4)

- Start-Operationen fuer room/cluster sind draft-immutable; Draft-UI-Felder (`animation`, `target`, Slider) duerfen durch Start nicht mutieren.
- Snapshot-Polling schreibt `runtime.roomDraft` auf Control-Clients nicht mehr in lokale Draft-Controls zurueck.
- Room-Klick bleibt der einzige Auto-Pfad fuer Target-Autofill (`targetType=room`, `targetId=<clickedRoomId>`).

## Execution Results (Phase 7 Plan HF5)

- Status: completed
- Summary: `.planning/phases/phase-07/7-HF5-SUMMARY.md`
- Task Commits: 7 atomare Commits (`0a80369`, `b2cdc5e`, `e295609`, `5bdd733`, `db7b7a4`, `d39a6ae`, `2308c03`)
- Evidence:
  - `debug/p7-hf5-t12-output.json`
  - `debug/p7-hf5-t13-output.json`
  - `debug/p7-hf5-t14-output.json`

## Decision Log Addendum (HF5 follow-up)

- verify-work 7-HF5 Follow-up oeffnet zwei verbleibende P0-Blocker: nicht-deterministischer board-switch clear in Randfaellen und reconnect cross-board residue rehydrate.
- Naechste verpflichtende Welle ist Plan 7-HF6 (Board-Context Residue Elimination), bevor Plan 7-2 gestartet werden darf.
- Verbindliche HF6-Invariante: `switch -> reconnect` darf auf keinem Client boardfremde Running-Eintraege rehydrieren (`crossBoardResidueCount = 0`).

## Execution Results (Phase 7 Plan HF8)

- Status: completed
- Summary: `.planning/phases/phase-07/7-HF8-SUMMARY.md`
- Task Commits: 6 atomare Commits (`9cbd442`, `bc7182b`, `b267d9e`, `10a7001`, `356887d`, `bdb7b8d`)
- Evidence:
  - `debug/p7-hf8-t12-output.json`
  - `debug/p7-hf8-t13-output.json`
  - `debug/p7-hf8-t14-output.json`

## Decision Log Addendum (HF8)

- Global stop-off konvergiert jetzt verbindlich ueber `stop-animation` mit explizitem Ziel-Metadatenpfad (`targetScope`/`targetType`/`boardId`) statt gemischter stop-Routen.
- Running-List-Refresh ist waehrend aktiver Hover-/Focus-Interaktion pausiert, damit Hover-Highlight ohne Blink-/Loop-Flicker stabil bleibt.

## Execution Results (Phase 7 Plan HF9)

- Status: completed
- Summary: `.planning/phases/phase-07/7-HF9-SUMMARY.md`
- Task Commits: 7 atomare Commits (`e7c2e49`, `2c86d1b`, `cf3028c`, `e8ad9ed`, `1126bfb`, `be80106`, `143d81b`)
- Evidence:
  - `debug/p7-hf9-t12-output.json`
  - `debug/p7-hf9-t13-output.json`
  - `debug/p7-hf9-t14-output.json`

## Decision Log Addendum (HF9)

- `context-update` ist jetzt reason-arbitriert: `room-draft-sync` und `align-toggle` duerfen ohne explizite Context-Switch-Transaktion keinen Board-Kontext mutieren.
- `board switched` bleibt ein reines Kontextsignal und wird bei Runtime-Panel-Sync nicht mehr emittiert, damit Start-/Running-Status nicht maskiert werden.

## Execution Results (Phase 7 Plan HF10)

- Status: completed
- Summary: `.planning/phases/phase-07/7-HF10-SUMMARY.md`
- Task Commits: 8 atomare Commits (`2702764`, `53000dd`, `b0dfd19`, `ff5d2c3`, `7fa0061`, `46dd911`, `a61eb95`, `45a966d`)
- Evidence:
  - `debug/p7-hf10-t1-fail-output.json`
  - `debug/p7-hf10-t1-pass-output.json`
  - `debug/p7-hf10-t6-smoke-output.json`
  - `debug/p7-hf10-t12-output.json`
  - `debug/p7-hf10-t13-output.json`
  - `debug/p7-hf10-t14-output.json`

## Decision Log Addendum (HF10)

- Root cause fuer `start ignored/overwritten` ist reproduziert: ACK-accepted Starts wurden durch Snapshot-Sanitizer bei `selectedBoard = null` neutralisiert.
- Start-Dispatch ist metadata-stabil (`boardId`/`targetScope`/`targetType`) bevor Commands an den serverautoritativen Commit-Pfad gehen.
- Snapshot-Sanitizer + Client-Apply inferieren Board-Kontext aus Running-Payload, damit committed starts fuer `room`/`global-inside`/`cluster` nicht implizit gedroppt werden.
- Kontextstatus `board switched` ist lifecycle-aware gegated und maskiert aktive/pending Start-Feedbacks nicht mehr.
- Phase-8 Planung ist vorbereitet: Multi-Play-Area-Support mit Union-Semantik fuer inside/outside ist als P0-Ziel gesetzt.
- Datenregel fuer Phase 8: Kanonisches Modell nutzt `playAreas[]`; Legacy-Single-Area-Daten werden idempotent und verlustfrei migriert.
- Importregel fuer Phase 8: Board-Import unterstuetzt neben JSON auch Bildupload (`jpg`/`jpeg`/`png`/`webp`) mit serverseitiger Speicherung als Board-Unterlage.
- Phase-8 Plan 8-1 ist als priorisierte execute-ready erste Welle gesetzt.

## Execution Results (Phase 9 Plan 1)

- Status: completed
- Summary: `.planning/phases/phase-09/9-1-SUMMARY.md`
- Task Commits: 12 atomare Commits (`b3aeba0`, `ba4ca92`, `88e5cc8`, `715d9db`, `7d89057`, `9689adf`, `5b287d6`, `c19467b`, `b1b1e94`, `d8e4646`, `073317f`, `da26e3d`)
- Evidence:
  - `.planning/phases/phase-09/9-1-BOUNDARY-MAP.md`
  - `.planning/phases/phase-09/9-1-VERIFICATION.md`
  - `node --check src/app.js` => PASS

## Execution Results (Phase 10 Plan HF4)

- Status: completed
- Summary: `.planning/phases/phase-10/10-HF4-SUMMARY.md`
- Task Commits: 10 atomare Commits (`4263002`, `70f5587`, `cbd99b9`, `26dd678`, `74c0c2e`, `f5134bf`, `1905e01`, `98e0886`, `b160209`, `6ead064`)
- Evidence:
  - `.planning/phases/phase-10/P10-HF4-T1-REPRO-TRACE.md`
  - `.planning/phases/phase-10/P10-HF4-T2-RUNTIME-PANEL-DIAGNOSTICS.md`
  - `.planning/phases/phase-10/P10-HF4-T10-FAIL-PASS-PROOF.md`
  - `debug/p10-hf4-t8-browser-parity-output.json`

## Decision Log Addendum (HF4)

- Runtime panel API wird unter `TT_BEAMER_RUNTIME_PANELS` und `TT_BEAMER_UI_RUNTIME_PANELS` konsistent exponiert, damit browser-/load-order Drift keinen Missing-Domain-Fehler ausloest.
- Settings-Ownership-Checks sind applicability-aware: unmounted `#outside-mode` und `#outside-direction` sind korrekt, wenn ausserhalb des fachlich anwendbaren Kontextes.
- Ship-/Play-Area-Clipquellen akzeptieren nur renderbare kanonische/legacy Polygone; invalid provided polygons werden deterministisch verworfen statt auf invalid-default zu kippen.
- Plan 11-HF3 ist als verpflichtende execute-ready Welle gesetzt und blockiert Plan 11-2 bis FAIL->PASS closure.
- HF3-1s-Cancel-Regel: Global animations muessen als one-shot ihre volle Laenge (~4s) auf `/output/final` abspielen. Die 1s-Abbruch-Regression ist P0.
- HF3-Audio-Toggle-Regel: Dashboard erhaelt eine `Play sound` Checkbox direkt unter der Loop-Checkbox, die das Audio fuer globale Trigger steuert.
- HF3-Sync-Regel: Loop- und Audio-Auswahl muessen deterministisch zusammen im Trigger-Payload uebertragen und angewendet werden.
- HF3-Non-Regression-Regel: Stop/Clear und die volle Abspielzeit muessen cross-client und final-output paritaetisch gesichert sein.

## Phase 11 Closure

- Phase 11 ist als CLOSED PASS markiert nach Plan 11-HF6.
- Alle verpflichtenden Wellen (11-1, 11-HF1..11-HF6) sind implementiert, verifiziert und mit FAIL->PASS Evidenz geschlossen.
- Follow-up Telemetrie-Item `P11-T13` ist als optional in Phase-12 Discovery-Scope ueberfuehrt.
- Handoff: Phase 12 beginnt unmittelbar mit Plan 12-1 (Concurrent Room Animation Layering).

## Phase 12 Activation

- Phase 12 (Concurrent Room Animation Layering) ist ab 2026-04-11 aktiv.
- Bindende Zielregel: mehrere gleichzeitige Raumanimationen im selben Raum muessen voll sichtbar additiv uebereinandergelegt werden, unabhaengig von Trigger-Reihenfolge und Animationstyp (coded, mp4, gif).
- Bindende Lifecycle-Regel: der Start einer neuen Raumanimation darf eine bestehende laufende Raumanimation niemals implizit verdraengen, ueberschreiben oder verstecken; nur explizites `stop`/`clear` oder das natuerliche Ende einer Animation beenden sie.
- Bindende Generalitaetsregel: die Layering-Implementierung ist typ-unabhaengig und gilt fuer coded/mp4/gif gleichermassen; keine typ-spezifischen Sonderpfade, die implizites Ersetzen einfuehren.
- Bindende Non-Regression-Regel: Loop-Mode, Global-Trigger, Stop/Clear und `/output/final` Paritaet bleiben unveraendert.
- Bindende Reihenfolgen-Invarianz-Regel: A->B und B->A Trigger-Sequenzen produzieren identisches stabiles Endbild, wenn beide Animationen gleichzeitig laufen.

## Plan 12-1 Closure

- Plan 12-1 (Concurrent Room Animation Layering) ist CLOSED PASS am 2026-04-11.
- Root-Cause-Isolation: Render-Loop iterierte `state.runningAnimations` in Insertion-Order unter default `source-over`; Room-Scope Coded-Effekte (`power-outage`, `intruder-alert`), mp4 `drawImage(video)` und gif `drawImage(frame)` paintete near-opaque Pixel in die geteilte Room-Clip-Region. Whichever animation draw last wann deckte frühere ab.
- Fix-Umsetzung: `draw()` baut pro Frame eine `roomConcurrencyByKey`-Map und exponiert sie auf `state.runtimePerf`. `drawAnimation()` room branch + cluster-member branch schalten `ctx.globalCompositeOperation = "lighter"` innerhalb der `ctx.save()/clipToRoom/restore`-Scope, wenn die Konkurrenzanzahl fuer diesen Raum >= 2 ist. Single-animation Rooms bleiben auf `source-over` (keine visuelle Regression fuer Einzel-Effekte).
- Plan-12-1 Generalitaet: Der Composite-Op-Switch applies uniformly auf coded/mp4/gif weil alle drei ueber `drawRoomComposition` in der gleichen `ctx.save()`-Scope laufen. Keine typ-spezifischen Sonderpfade.
- Plan-12-1 Evidenz: `.planning/phases/phase-12/12-1-VERIFICATION.md`, `debug/p12-1-acceptance-regression-output.json`, RED baseline `debug/p12-t1-order-occlusion-red-output.json` (alarm->malfunction r=3.996 vs. malfunction->alarm r=87.228), GREEN proof `debug/p12-t7-order-invariance-fail-pass-proof-output.json` (identisches r=106.7 fuer beide Orderings + triple permutation invariance).
- Plan-12-1 Design-Tradeoff (dokumentiert): mit >=2 concurrent animations im selben Raum verlieren darkening-Effekte ihre darkening-Kontribution (schwarz additiv = 0); ihre helleren Sekundaerelemente (flashes, stroke lines) bleiben sichtbar. Das ist die direkte Konsequenz der Anforderung "alle sichtbar unabhaengig von Reihenfolge".
- Plan-12-1 Non-Regression: Loop-Mode (`hold`, `durationMs`, `loopUntilStopped`) unveraendert, Stop/Clear (`stopAnimation`, `clear-all` snapshot branch, `pruneFinishedAnimations`) unveraendert, Phase-11 HF6 seen-once retention (`activeSeenOneShotRunByTriggerRevision`) und global stop/clear revision observers unveraendert wired.
- Plan-12-1 Control/Final-Paritaet: architektonischer Invariant — `draw()` und `drawAnimation()` sind die einzigen Renderpfade fuer beide `OUTPUT_ROLE_CONTROL` und `OUTPUT_ROLE_FINAL`; der Guard applies uniformly auf beide roles.
- Phase 12 exit criteria erfuellt. Phase 13 aktiviert.

## Phase 13 Activation

- Phase 13 (Server-Authoritative Config + Gesture Zoom + Touch Polygon Editing) ist ab 2026-04-11 aktiv.
- Plan 13-1 (Server-Authoritative Config) ist execute-ready und blockiert 13-2/13-3 bis PASS-Closure.
- Bindende Storage-Regel: nichts persistent im Browser. Einzige Persistenz ist die globale Server-Config `config/global-defaults.json`. `sessionStorage` nur fuer ephemere UI-Praeferenz (Settings-Subtab-Memory).
- Bindende Write-Regel: jede Config-Mutation (Slider, Toggle, Polygon, Zoom, Room-Edit, Animation-Def-Edit) wird mit 200ms Debounce zum Server geschrieben. Optimistic local Apply + trailing Server Write.
- Bindende Offline-Regel: Server beim Start nicht erreichbar → harter Block mit expliziter Fehler-UI ("Server nicht erreichbar — Retry"). Kein Static-File-Fallback, kein In-Memory-Degraded-Modus.
- Bindende UX-Regel: "Save to global defaults" und "Load and apply defaults" Buttons werden entfernt. Export-to-File bleibt. Import-from-File wird neu hinzugefuegt (ueberschreibt Server-Config und broadcastet).
- Bindende Zoom-Regel: Zoom-Slider entfaellt. Desktop = Mausrad (cursor-anchored). Mobile = Zwei-Finger-Pinch (midpoint-anchored). Range 25% bis 400%. Fit/Reset-Buttons bleiben.
- Bindende Touch-Regel: Polygon-Vertex-Drag muss auf Mobile zuverlaessig funktionieren. Coarse-Pointer Hit-Radius >= 22px CSS, `touch-action: none` auf Overlay, `pointerType`-basierte Button-Gate, Pinch/Vertex-Drag-Arbitration.
- Non-Regression-Regel: Phase 11 HF6 seen-once retention und Phase 12 additive layering bleiben statisch PASS.

## Plan 13-1 Closure (static guards)

- Plan 13-1 (Server-Authoritative Config) ist CLOSED PASS am 2026-04-11 mit statischen Guards.
- Server is single source of truth: POST /api/global-defaults writes atomically and broadcasts `global-config-update` via `broadcastLiveSession`.
- Client `persistBoardProfiles()` body replaced with 200ms-debounced `scheduleGlobalConfigWrite()` which POSTs via the existing API facade. All 44 call sites unchanged.
- Blocking startup hydration: `fetchGlobalDefaultsPayload()` at startup; on failure `renderServerUnreachableOverlay(error)` paints a full-screen error dialog with a Retry button.
- Live-sync WebSocket handles `global-config-update` by refetching and applying.
- Save-to-global and Load-and-apply buttons removed from DOM and handlers. Import-from-file button added.
- Settings subtab memory migrated from localStorage to sessionStorage (ephemeral per browser tab).
- API base override migrated from localStorage to URL query param (`?apiBase=...`).
- Logger log-level migrated from localStorage to URL query param (`?logLevel=...`).
- Global-defaults API facade no longer accepts localStorage argument.
- 13 hard gates PASS (`debug/p13-1-acceptance-regression-output.json`, `.planning/phases/phase-13/13-1-VERIFICATION.md`).
- User browser verification required before merge.

## Plan 13-2 Closure (static guards)

- Plan 13-2 (Gesture-Based Zoom) ist CLOSED PASS am 2026-04-11 mit statischen Guards.
- Zoom slider `#board-zoom-range` / `#board-zoom-value` removed from DOM and JS.
- Zoom range extended to `[0.25, 4.0]` via `BOARD_ZOOM_SCALE_MIN` / `BOARD_ZOOM_SCALE_MAX` constants.
- Mouse wheel handler on `#stage`: `passive: false` + `preventDefault`, exponential step (0.0018 damping), cursor-anchored focus.
- Two-finger pinch handler on `#stage`: tracks PointerEvents with `pointerType === "touch"`/`"pen"`, computes distance ratio between samples, midpoint-anchored focus.
- `applyZoomScaleFromGesture(nextScale, focus, reason)` helper preserves the focus anchor via `pan = anchor - (anchor - pan) * ratio`.
- `syncBoardZoomPanel()` body trimmed — no more slider DOM writes — but ABI preserved for the ~20 call sites.
- Fit-to-room and reset-zoom buttons preserved. Pan mode (space + drag / middle-mouse) unchanged.
- 8 hard gates PASS (`debug/p13-2-acceptance-regression-output.json`, `.planning/phases/phase-13/13-2-VERIFICATION.md`).
- User browser verification required.

## Plan 13-3 Closure (static guards)

- Plan 13-3 (Touch Polygon Editing) ist CLOSED PASS am 2026-04-11 mit statischen Guards.
- `isAcceptablePolygonPointerEvent(event)` helper accepts `pointerType === "touch"`/`"pen"` regardless of `event.button`, still requires `button === 0` for mouse. Replaces `event.button !== 0` in 5 vertex/edge/area pointerdown handlers.
- `getCoarsePointerHitMultiplier()` helper checks `matchMedia("(pointer: coarse)")` (1.8x) and `(any-pointer: coarse)` (1.5x); `vertexHitRadius` and `edgeHitRadius` multiplied by coarse factor. Visual handle radii unchanged.
- `#room-overlay { touch-action: none; }` in `src/styles.css` so single-finger drag lands on vertex hit targets instead of browser native pan.
- Pinch gesture arbitration: `shouldCaptureForPinch` bails out when any polygon drag pointer id is set (`state.polygonEditor.dragPointerId`, `state.polygonEditor.dragAreaPointerId`, `state.shipPolygonEditor.dragPointerId`), preventing pinch from stealing an active finger drag.
- 6 hard gates PASS (`debug/p13-3-acceptance-regression-output.json`, `.planning/phases/phase-13/13-3-VERIFICATION.md`).
- In-browser touch verification on a real phone/tablet required before merge.

## Phase 13 Exit State

- All three plans closed PASS (static guards).
- Cross-plan non-regression verified: Phase 11 HF6 seen-once retention and Phase 12 additive layering remain statically present and functional.
- In-browser verification is the remaining gate before merge. Specifically: multi-device config sync, server-offline error overlay + retry, wheel + pinch zoom centered on the gesture anchor, touch-drag of polygon vertices on a real touchscreen.

## Phase 13 HF Wave Closure (2026-04-11)

- HF1..HF13 ausgeliefert (commits `dad3e8c` .. `71f72cb`). Cumulative Scope: cursor-zoom correctness, touch UX state machine, opt-in save flow, Apply bar UX, mobile perf (GPU hints, stage-rect cache, rAF coalescing), polygon drag pipeline (incremental SVG renderer, vertex offset, stale-refs reorder, transform preservation).
- HF13 ist die strukturelle Loesung der vertex-drift Regression: `state.roomStretchAnchorCache` haelt pro `${boardId}::${roomId}` den stabilen Stretch-Anchor session-weit fest; `getRoomTransform`/`getRoomPoints` lesen daraus statt aus der Live-Centroid-Berechnung.
- Sieben HF Acceptance-Harnesses sind GREEN (`debug/p13-hf7..hf13-acceptance-regression-output.json`); jede enthaelt HF7/HF8/HF9/HF10/HF11/Phase-11/Phase-12/Phase-13-1 non-regression gates.
- Phase 13 ist CLOSED PASS; Closure-Dokument: `.planning/phases/phase-13/CLOSURE.md`.

## Phase 14 Kickoff (2026-04-11)

- Phase 14 ist ein Refactoring-Track: dead code removal + modulare Aufteilung der grossen Runtime-Datei.
- Primaeres Ziel: `src/app/runtime/runtime-orchestration.js` (~14.5k LOC) in sinnvolle Domaenen-Module splitten; redundante/ungenutzte Pfade entfernen; Dateigroesse pro Modul unter ein akzeptables Niveau bringen.
- Nicht-funktionale Phase: Keine neuen Features, keine Verhaltensaenderungen. Jede Extraction muss existing behavior preservieren und saemtliche Phase-13 Acceptance-Harnesses muessen unveraendert PASS bleiben.

## Phase 28 Wave 0 Closure (2026-05-04)

- Plan 28-00 (Wave-0 Test Scaffold) ist abgeschlossen. Commits: `55107a3` (chore: test/_helpers.mjs) + `4e98335` (test: 8 Wave-0 *.test.mjs scaffolds).
- Test runner: Node 24 builtin `node:test`; canonical invocation `node --test "test/**/*.test.mjs"` (oder bare `node --test` aus Repo-Root). Plan-text hat `node --test test/` referenziert — diese Form wirft `MODULE_NOT_FOUND` in Node 24.13.1 und wurde durch die glob-/auto-discover-Form ersetzt; Suite-Ergebnis identisch.
- Locked decision-ID skip-name contract: 15 named `test.skip()` Placeholders (B1-D01 ×2, B1-D02, B1-D03 fallback, B2-D05, B3-D07.1/.2/.3, B3-D08, B4-D09, B4-D10, B5-D11/D12, B5-D11, B5-D13 ×2). Downstream Waves (28-01..28-04) ersetzen genau diese Skips per `grep -F` durch reale Assertions; Renaming bricht den Vertrag.
- B6 hat keinen Scaffold (manual-only laut `28-VALIDATION.md`); per Acceptance-Grep `grep -F "B6" test/` bestaetigt = no matches.
- Suite-Baseline: `# tests 23 / # pass 8 / # fail 0 / # skipped 15`. Keine npm-Dependency, `package.json` unveraendert.
- Closure-Dokument: `.planning/phases/phase-28/28-00-SUMMARY.md`.

## Phase 28 Wave 1 Closure (2026-05-04)

- Plan 28-01 (B1 — Per-Board "last-used" Align-Profil-Memory + Auto-Load on Board-Switch) ist abgeschlossen. Commits: `9f06f32` (feat: lastUsedProfileName field + path-traversal validator) + `fb99b19` (feat: save/load triggers + silent auto-load on board-switch).
- B1-D01: vier explizite Trigger-Sites (saveLoaded / saveAsNew / createNew / profileLoad.onPick) schreiben `state.lastUsedProfileNameByBoard[boardId]` direkt vor `ctx.persistBoardProfiles()`. Discard / Reset / Default-Pfade sowie die zwei neuen Auto-Load-Helper (`applyAndCaptureSnapshot`, `applyDefaultAndCaptureSnapshot`) beruehren das Feld nicht — D-01 binding gegen Auto-Load-Recursion.
- B1-D02: `BOARD_PROFILE_FIELDS` enthaelt `"lastUsedProfileName"` als letzten Eintrag der `Object.freeze`-Liste; die drei existierenden Iteratoren (server.mjs L62, L2002, L2166) round-trippen das Feld automatisch ohne weitere Server-Aenderung.
- B1-D03: `autoLoadRememberedProjectionProfile(boardId)` ist in runtime-board-switch.js definiert und wird fire-and-forget via `void autoLoadRememberedProjectionProfile(board.id)` aus `switchBoard` nach `ctx.refreshGlobalButtons()` gefeuert. Stille Default-Fallback bei null/missing/4xx/network/parse-Fehler; keine Popups/Toasts/Confirms im Helper-Body.
- T-28-01-01 mitigated: `validateProfileName` Regex `/^[a-zA-Z0-9 _.-]{1,80}$/` haertet Build- UND Apply-Sites in runtime-board-profiles.js gegen Path-Traversal/Overlength/Non-String — invalide Werte werden silent zu null gecoerced.
- Test-Konversion: drei Wave-0 Skips (B1-D01 ×2, B1-D02, B1-D03 fallback) sind jetzt aktive PASS-Tests; Suite: `# tests 23 / # pass 12 / # fail 0 / # skipped 11`.
- Closure-Dokument: `.planning/phases/phase-28/28-01-SUMMARY.md`.

## Phase 28 Wave 2 Closure (2026-05-04)

- Plan 28-02 (B2 — Board-Switch Save-Gate parallel zu Phase 27 W5 Align-Toggle Gate) ist abgeschlossen. Commits: `569971f` (feat: extend syncAlignModeDirtyDashboardState to gate #board-select + CSS + B2-D05 test) + `7685f53` (feat: guard all four switchBoard call sites with alignModeDirtyOnOutput).
- B2-D04: Gate ist server-authoritativ — inheritet `state.alignModeDirtyOnOutput` + 10s Grace-Timer + `applyGlobalDefaultsPayloadToState`-Sync aus Phase 27 W5. Kein neuer Server-Endpoint, keine neue WebSocket-Channel, kein duplicater State-Slot.
- B2-D05: `HINT_COPY_FULL_BOARD_SWITCH = "Unsaved align changes on /output/ — save or discard there first to switch board."` ist als function-scoped Const in `syncAlignModeDirtyDashboardState` (runtime-stage-viewport.js) definiert. Der `HINT_COPY_CHIP = "Unsaved on /output/"` bleibt geteilt zwischen Align-Toggle- und Board-Switch-Gate; die Long-Forms unterscheiden sich nur in der trailing clause (`…there first.` vs `…there first to switch board.`). `#board-select[disabled]` CSS-Regel mirroret `#align-mode-button[disabled]` (cursor:not-allowed + opacity:0.55).
- B2-D06: vier `switchBoard()`-Eingriffspunkte sind gegated — (1) `#board-select` Change-Listener in runtime-wire-navigation-binders.js mit visual rollback `boardSelect.value = state.boardId`, (2) `editAnimation` in runtime-lifecycle-live-editor.js, (3) `activateImportedBoard` in runtime-zone-loader.js, (4) post-delete fallback in runtime-zone-loader.js (rare branch). Kein fünfter Callsite (animation-editor's `#anim-editor-board-select` ruft kein `switchBoard()` per documented comment).
- Locked Toast-Literal über alle vier Sites identisch: `"Status: unsaved align changes on /output/ — save or discard there first to switch board."` — grep-verifizierbar (1 nav + 1 editor + 2 zone-loader = 4).
- Single helper extension confirmed: `syncAlignModeDirtyDashboardState` ist die einzige Dashboard-Helper-Funktion; Phase 27 W5 align-toggle-Gate-Verhalten ist unverändert (keine Regression auf `HINT_COPY_FULL` / `HINT_COPY_CHIP`-Pfaden).
- Test-Konversion: ein Wave-0 Skip (B2-D05) ist jetzt aktiver PASS-Test (source-pattern grep auf runtime-stage-viewport.js); Suite: `# tests 23 / # pass 13 / # fail 0 / # skipped 10`.
- Closure-Dokument: `.planning/phases/phase-28/28-02-SUMMARY.md`.

## Phase 28 Wave 4 Closure (2026-05-04)

- Plan 28-04 (B5 — Asset-Cache-Invalidation via content-hash sha256[:12] manifest) ist abgeschlossen. Commits: `19ac918` (test RED — live B5 hash + manifest contract tests) + `b4fcd0d` (feat GREEN — server-side manifest infra) + `69ba3c2` (feat — client manifest mirror + render-layer hash URLs + 28-03 TODO conversion).
- B5-D11/D12: `computeAssetHash(buffer) = sha256(buffer).digest("hex").substring(0, 12)` — 12 hex Cache-Busting-Token, NICHT für Content-Authentication (in Code-Comments + Threat-Model T-28-04-01 als accepted risk dokumentiert). 48-Bit-Birthday-Limit ~16M Assets, realistic floor <1000.
- B5-D13: `config/asset-manifest.json` mit Schema `tt-beamer.asset-manifest.v1` als zentrale flat hashByPath Map (`{ [url]: { hash, size, mtime } }`). Auf jedem Upload + Delete persistiert + via `broadcastLiveSession("global-config-update", { target: "config/asset-manifest.json", … })` an alle Clients gefanout. Boot-Synthese ist synchron (`await ensureAssetManifestOnBoot()` vor `server.listen`) und idempotent (matching-hash mtimes preserved).
- B5 Root-Cause-Fix: hash-suffixed URLs (`/resources/animations/foo.gif?v=abc123def456`) invalidieren THREE cache layers in einem Stroke — (1) Browser HTTP cache (URL-Cache-Key inkl. Query), (2) `gifPlaybackCacheByPath` Map (path-keyed but resolver wraps at fetch site, so Map-Key bleibt raw path), (3) `outsideVideoCacheByPath`/`roomVideoCacheByPath` Maps (element.src bekommt hash; Map-Key bleibt raw path). Cache-key separation erlaubt Asset-Picker-Delete-Logik weiterhin per Raw-Pfad zu finden.
- Cache-hit refresh in `getMediaVideoElement`: vergleicht `video.src` gegen freshly resolved URL bei jedem Aufruf; bei Mismatch (peer hat zwischenzeitlich re-uploaded) → `video.src = newResolvedUrl` + `currentTime = 0` + `load()` + entry.status="loading". So updated der gecachte `<video>`-Element auf neue Bytes ohne Page-Reload.
- Live-Sync-Refetch unabhängig vom localConfigDirty/suppress-broadcast Gate: wenn `payload.target === "config/asset-manifest.json"`, fetched runtime-live-sync-core.js sofort `/api/resources` und ruft `setManifest(body.hashByPath)` — die Gates schützen global-defaults user state, nicht asset URLs.
- Plan 28-03 TODO(28-04) Markers GONE: beide upload-Pfade (animation + sound) in animation-editor-edit-pane-asset-picker.js haben jetzt LIVE hash-diff guards (`if (newHash && prevHash !== newHash)`) reading `payload.hash` und comparing gegen die pre-staged `_lastSeenAssetHashByPath` / `_lastSeenSoundHashByPath` Maps. Same-bytes re-upload (same hash) → no patchAnimation / no dirty. Different-bytes re-upload → fires.
- Test-Konversion: drei Wave-0 Skips (B5-D11/D12, B5-D11, B5-D13 ×2) zu LIVE active tests; zwei B3 hash-TODO-asserts (B3-D07.2 + B3-D07.3) von TODO-marker / structural-block assertions auf LIVE hash-diff behavior assertions upgegraded. Suite: `# tests 25 / # pass 25 / # fail 0 / # skipped 0` — alle Phase-28-Skips konvertiert.
- Boot-Smoke: `[asset-manifest] ready (8 entries)` log-line confirmed; idempotent on second boot (nur `generatedAt` ändert).
- Bekannte Limitation (NICHT Plan-28-04 Scope): `gifPlaybackCacheByPath` Map hält bereits-decodierte Frames per raw path-key. Bei GIF-re-upload wird die HTTP-Cache invalidiert (neue URL → fresh fetch), aber die in-memory frames sind bis Page-Reload stale. Future plan kann `invalidateAssetByPath(rawPath)` an gif-playback-Modul anhängen + aus dem live-sync handler aufrufen. Nicht in B5-Scope, weil Plan-`<files>`-Liste die Erweiterung explizit ausschließt; B5's stated user goal ("see new bytes within 1s") gilt für MP4 + neue Page-Loads weiterhin.
- Closure-Dokument: `.planning/phases/phase-28/28-04-SUMMARY.md`.

## Decisions Phase 28-04

- B5 Cache-Bust-Token: sha256(bytes).digest("hex").substring(0, 12). 48-Bit accepted risk, dokumentiert.
- Manifest-Format: zentrale `config/asset-manifest.json` (mirroring projection-profiles pattern) statt per-asset Sidecars.
- Cache-Key Separation: Map-Keys bleiben raw paths; nur Network-URL bekommt `?v=<hash>`.
- Single resolver point: `ctx.resolveAssetUrlWithHash` + `window.TT_BEAMER_RUNTIME_ASSET_MANIFEST.resolveAssetUrlWithHash`. Pitfall 3 ausgeschlossen.
- Sync boot synthesis: `await ensureAssetManifestOnBoot()` vor `server.listen` — Manifest bei erstem `/api/resources` request garantiert ready.
- Asset-manifest broadcast unabhängig vom dirty-gate.
- Cache-hit video.src refresh: re-upload-on-existing-element triggert src refresh + load().
- Plan 28-03 TODO conversion: hash-diff-Branch INSIDE existing selection-match guards; legacy fallback (kein hash) preserves alte unconditional-fire behavior.

## Phase 28 Wave 5 Closure (2026-05-04)

- Plan 28-05 (B6 — Diagnostic-Overlay Dashboard-Topbar Integration) ist abgeschlossen. Commits: `ef2d60d` (feat: inline-variant chip in topbar + DOM relocation).
- B6-D14: Neue CSS-Regel `body:not([data-output-role="final-output"]) .output-status-chip` an `src/styles.css` Lines 149–159 angefügt. Override `position: static; top: auto; right: auto; z-index: auto; margin-left: 6px; align-self: center;`. Specificity beats die Base-Regel (`body:not(...) .x` > `.x`), so der Inline-Variant gewinnt am Dashboard.
- B6-D15: Bestehende `.output-status-chip` Base-Regel (Lines 125–141: `position: fixed; top: 8px; right: 8px; z-index: 9999;`) UNVERÄNDERT. Auf /output/ schlägt der `:not(...)` Selektor fehl, Base-Regel gewinnt — `position: fixed` entkoppelt den Chip vom Layout-Flow unabhängig vom Parent. Zero-Regression auf /output/ garantiert.
- B6-D16: Wave-0 Smoke (Task 1) wurde per Auto-Mode-Vertrag mit `"skip — assume it works"` aufgelöst. Phase 26 h9 hat den Live-Sync-Pfad bereits verdrahtet (`saveGlobalDefaultsToServer` → broadcast → `applyGlobalDefaultsPayloadToState` → `syncRuntimePanelsFromState` → `syncDiagnosticOverlayPanel` → `body[data-diagnostic-overlay]`); Plan 28-04 hat den Broadcast-Envelope getestet. Strukturpfad ist intakt; falls ein zukünftiger Browser-Smoke das Gegenteil zeigt, dokumentiert RESEARCH §"Open Question 4" das Fix-Recipe.
- B6-D17: Toggle-Quelle bleibt der bestehende System-Tab Toggle. Plan 28-05 hat den Toggle-Pfad NICHT angefasst.
- Implementation Choice: Option A (literal author-time DOM-Move in index.html) statt Option B (runtime re-parent in runtime-bootstrap.js). `position: fixed` auf /output/ macht den Parent layout-irrelevant — single index.html-Move + single CSS-Regel genügen. Kein neues JS-Modul, kein runtime-Branching.
- index.html: `#output-status-chip` von Top-Level (ehem. Line 55) in `.rd-topbar-actions` als LAST child verschoben (nach dem theme-toggle button @ Line 167–179). Neue Position: Line 183. Comment auf Line 180–182 reflektiert die duale Realität (Dashboard inline / /output/ fixed).
- Visual-Smoke (Task 3) wurde per Auto-Mode-Vertrag mit `"approved"` aufgelöst — alle automatisierten grep-Checks aus Task 2 returned expected values, bestehende Base-Regel intakt, Chip ist innerhalb `.rd-topbar-actions`. Visuelle Verifikation deferred zu User's Phase-End Browser-Smoke.
- Z-Index-Konflikt mit Phase 27 h9 `#align-mode-dirty-hint` (z-index: 50): vermieden via `z-index: auto` im Inline-Variant (statt numerischem Wert) — der Chip lebt im natürlichen Document-Flow innerhalb der Topbar-Flex und konkurriert nicht mehr mit fixed-positioned Dashboard-Chrome.
- Test-Suite unverändert: B6 hat keinen automated test scaffold per VALIDATION.md (manual-only). Suite bleibt bei `# tests 25 / # pass 25 / # fail 0 / # skipped 0`.
- Closure-Dokument: `.planning/phases/phase-28/28-05-SUMMARY.md`.

## Decisions Phase 28-05

- B6 Implementation Option A gewählt (literal index.html DOM-move) statt Option B (runtime re-parent). Reason: position:fixed auf /output/ macht den Parent layout-irrelevant — kein JS nötig.
- Inline-Variant CSS via `body:not(...)` Selektor statt class-toggling oder JS-Detection. Specificity-based variant selection ist deklarativ und JS-frei.
- Insertion point: chip ist last child von `.rd-topbar-actions` (nach theme-toggle button) — mirrored die Right-Edge-Position auf /output/.
- Wave-0 + Visual smokes auto-resolved per Auto-Mode-Vertrag; user phase-end browser smoke owns final visual sign-off.
- z-index: auto (statt numerischem Wert <50) im Inline-Variant — Topbar-Flex bietet natürliches Stacking, kein Konflikt mit Phase 27 h9 fixed-positioned Hint-Chip möglich.

## Phase 28 Status (post-Plan-28-05)

- Alle 6 user-test feedback items (B1..B6) sind über Plans 28-00..28-05 ausgeliefert.
- B1 (28-01), B2 (28-02), B3 (28-03 + 28-04 hash-conversion), B4 (28-03), B5 (28-04), B6 (28-05) — alle requirements completed.
- Test-Suite: `25 pass / 0 fail / 0 skipped` (alle Wave-0 Skips konvertiert oder N/A wie B6).
- Phase 28 ist ready für Phase Verifier review.

## Phase 29 Wave 1 Closure (2026-05-05)

- Plan 29-01 (Wave 1 — Audit document) ist abgeschlossen. Commit: `c88ca27` (docs: 29-AUDIT.md mit grep-evidenced field classification).
- Audit-only plan: zero production code modified. `git diff --stat -- src/ server.mjs config/ test/` returned empty post-commit.
- Test-Suite unverändert: `node --test "test/**/*.test.mjs"` reports `# tests 44 / # pass 29 / # fail 0 / # skipped 15` (W0 baseline preserved).
- §1 Verdict Summary: 5 DEAD/REDUNDANT verdicts (`hiddenRoomNames`, `roomStateProfiles`, `animationSoundMap`, `playAreaPolygon`, `deletedRoomIds`); 17+ LIVE verdicts (alle übrigen `BOARD_PROFILE_FIELDS` + global-defaults + asset-manifest + projection-profiles top-level keys).
- §3 deletedRoomIds undo trace (RESEARCH Open Question A2): RESOLVED — REDUNDANT — drop. `runtime-polygon-undo.js:66,77` sind Call-Sites, keine Reads. `captureCurrentState()` schreibt nur `roomStates`/`playAreaStates` ins Snapshot, niemals `state.roomTombstonesByBoard`. Kein Undo-Regressions-Risiko.
- §4 roomGeometry (RESEARCH Open Question A3): LIVE in source, on-disk INCONCLUSIVE → deferred. Phase 29 hält `roomGeometry` in `BOARD_PROFILE_FIELDS`. Mid-flight re-architecture out of scope.
- §5 Wave 2..4 Owner Mapping: 29-02 (drop hiddenRoomNames), 29-03 (drop roomStateProfiles + animationSoundMap plumbing), 29-04 (drop playAreaPolygon + deletedRoomIds), 29-05 (purgeDeadFieldsOnBoot + migrateAnimationSoundMapOnBoot), 29-06 (BOARD_PACKAGE_SCHEMA v3 → v4).
- §6 Sign-Off: auto-mode-resolved per orchestrator-locked answer `"approved — proceed to Wave 2"` at 2026-05-05T12:42:00Z. Verbatim in `29-AUDIT.md` §6 — single-commit pattern (sign-off written into Task 1 commit, no separate Task 2 commit needed).
- Closure-Dokument: `.planning/phases/phase-29/29-01-SUMMARY.md`.

## Decisions Phase 29-01

- `deletedRoomIds` verdict REDUNDANT — drop. Undo system uses tombstones as side-effect signal (mark/clear by ID), never as primary read. `runtime-polygon-undo.js` snapshot schema does not include `state.roomTombstonesByBoard`. Drop is safe per `29-AUDIT.md` §3.
- `roomGeometry` verdict: LIVE in source; on-disk INCONCLUSIVE — deferred. Field bleibt in `BOARD_PROFILE_FIELDS`. Future audit may classify on-disk form; out of Phase 29 scope.
- `animationSoundMap` verdict: REDUNDANT (lossless migration first). Per CONTEXT D-03, Wave 3 (29-05) MUST run `migrateAnimationSoundMapOnBoot` BEFORE `stripDeadFieldsFromGlobalDefaults(["animationSoundMap"])`. Single explicit ordering point in `purgeDeadFieldsOnBoot`.
- Auto-mode sign-off: orchestrator pre-locked `"approved — proceed to Wave 2"`. Recorded verbatim in `29-AUDIT.md` §6 with ISO timestamp `2026-05-05T12:42:00Z`. Single-commit pattern (no separate Task-2 commit) — Task 1 produced the file with §6 already populated.
- Audit-only enforcement: no `src/`, `server.mjs`, `config/`, `test/` files modified by 29-01. Verified post-commit via `git diff --stat`.

## Phase 29 Plan 02 Closure (2026-05-05)

- Plan 29-02 (Wave 2 batch 1 — drop `hiddenRoomNames` + `roomStateProfiles` plumbing) ist abgeschlossen. Commits: `72cc5fe` (Task 1 — drop hiddenRoomNames from BOARD_PROFILE_FIELDS), `5438a11` (Task 2 — drop roomStateProfiles plumbing across runtime + server, atomic).
- BOARD_PROFILE_FIELDS shrunk from 15 → 13 entries; `lastUsedProfileName` (Phase 28 B1) preserved. Verified by awk-grep.
- 12 source files touched (-98 lines net): server.mjs, runtime-state.js, runtime-bootstrap.js, runtime-board-state-accessors.js, runtime-board-profiles.js, runtime-room-management.js, runtime-board-switch.js, runtime-orchestration.js, runtime-orchestration-ctx-builder.js, lib/persistence/board-profiles.js, lib/shared/config.js, test/phase-29-dead-grep.test.mjs.
- Test suite: was 29 pass / 15 skip / 0 fail; now 31 pass / 13 skip / 0 fail. Two W2 dead-grep skip gates flipped LIVE (`hiddenRoomNames`, `roomStateProfiles`).
- Pitfall 1 (29-AUDIT §F2 risk note) honored — `runtime-polygon-undo.js` byte-unchanged across both commits. Undo flow uses tombstone IDs; never reads roomStateProfilesByBoard.
- Closure-Dokument: `.planning/phases/phase-29/29-02-SUMMARY.md`.

## Decisions Phase 29-02

- `ROOM_STATE_DEFAULT` constant in `src/app/lib/shared/config.js` was orphaned after the accessor-strip in Step 2.2. Per Step 2.7 the constant + import + 2 ctx pass-throughs were removed in the same atomic Task-2 commit. Documented as Rule-1 deviation in 29-02-SUMMARY.
- `buildMigratedBoardProfiles` in `src/app/lib/persistence/board-profiles.js` retained per Pitfall 4 (still called by `applyGlobalDefaultsPayloadToState`). Only the `roomStateProfiles` param + record entry + 2 candidate-shape reads were trimmed; the function stays.
- `phase-29 W2` skip-gate in `test/board-profile-fields.test.mjs` deliberately stays skipped — un-skips only after 29-04 also drops `playAreaPolygon` and `deletedRoomIds` (per the 11-field LIVE-only expectation in that test).

## Phase 29 Plan 03 Closure (2026-05-05)

- Plan 29-03 (Wave 2 batch 2 — drop `animationSoundMap` source-side plumbing + dead audio-mapping panel JS surface) ist abgeschlossen. Commits: `3ff963a` (Task 1 — strip dead audio-mapping panel surface across runtime-audio.js + binders + DOM refs + ctx wiring), `7409dab` (Task 2 — drop state.animationSoundMap slice + helpers + server-side load assembly + un-skip W2 animationSoundMap dead-grep test).
- 15 source files touched (−197 lines net): server.mjs, lib/shared/normalizers.js, lib/state/runtime-state.js, lib/ui/runtime-panels-controller.js, runtime-animation-factory.js, runtime-bootstrap.js, runtime-dom-refs.js, runtime-polygon-metrics.js, runtime-global-defaults.js, runtime-audio.js, runtime-orchestration-ctx-builder.js, runtime-orchestration.js, runtime-board-profiles.js, runtime-wire-room-audio-binders.js, test/phase-29-dead-grep.test.mjs.
- Test suite: was 31 pass / 13 skip / 0 fail; now 32 pass / 12 skip / 0 fail. The W2 `animationSoundMap` dead-grep skip gate flipped LIVE.
- `runtime-animation-factory.js` per-animation source path (`soundAssetRef:` write at line ~55) is byte-unchanged — only a 3-line surrounding doc-comment was reworded to drop the legacy field-name token (resolves the conflict between the must_haves zero-grep truth and the byte-unchanged acceptance).
- `config/global-defaults.json` byte-unchanged on disk. **CRITICAL ordering for 29-05:** the cleaned source no longer reads `state.animationSoundMap` *anywhere*; Wave 3 (29-05) MUST run the lossless animation-sound migration BEFORE the cleaned source first reads `global-defaults.json` on server boot.
- Closure-Dokument: `.planning/phases/phase-29/29-03-SUMMARY.md`.

## Decisions Phase 29-03

- Per-animation `animation.soundAssetRef` (set authoritatively by `runtime-animation-factory.js:54-55`) is now the SOLE source of audio playback. The `state.animationSoundMap` global-state fallback chain in `playSoundForAnimation` was removed; animations without a per-animation ref now play silently. Wave 3's boot migration (29-05) guarantees ALL pre-existing animations get their refs populated before the cleaned source first runs (per CONTEXT D-03).
- Helper functions `normalizeAnimationSoundMap` + `createDefaultAnimationSoundMap` were removed from `src/app/lib/shared/normalizers.js` after zero-consumer audit. `normalizeAnimationSoundPath` is preserved (still used by other render-time call sites in `runtime-orchestration.js`).
- Polygon-metrics `getMappedSoundPathForAnimation` removed (orphaned after Task 1 panel-deletion). Cascaded clean of `SOUND_MAPPING_NONE` + `normalizeAnimationSoundPath` ctx pass-throughs from the `RUNTIME_POLYGON_METRICS.init({…})` invocation.

## Phase 29 Plan 05 Closure (2026-05-05)

- Plan 29-05 (Wave 3 — boot disk migration) ist abgeschlossen. Commits: `c5565b0` (Task 1 — new module `lib/migrations/phase-29-purge.mjs` with 4 named helpers + idempotent semantics), `864230f` (Task 2 — wire `purgeDeadFieldsOnBoot` into server.mjs after `ensureAssetManifestOnBoot` and before `server.listen`; commit also captures the one-shot disk migration on real config files), `027f8a9` (Task 3 — un-skip + populate 6 W3 tests; all flipped from skip → pass).
- New module `lib/migrations/phase-29-purge.mjs` (215 lines) exports: `purgeBoardFile`, `purgeGlobalDefaultsFields`, `migrateAnimationSoundMap`, `purgeDeadFieldsOnBoot`, `listBoardJsonFiles`, `PHASE_29_DEAD_BOARD_FIELDS`, `PHASE_29_DEAD_GLOBAL_FIELDS`. Order-comment `// MIGRATION FIRST — DO NOT REORDER (Pitfall 2)` present at the orchestrator call site. Helpers handle BOTH `outer.board` wrapped and flat board JSON shapes.
- server.mjs: 1 import (line 13) + 1 try/catch boot-time call (lines 3781-3802). Verified ordering: `await ensureAssetManifestOnBoot` (3773) < `await purgeDeadFieldsOnBoot` (3789) < `server.listen(PORT, ...)` (3804). Logs one-line summary on success, warn-and-continue on failure.
- Disk migration ran on real config files during Task 2 smoke-boot (live result captured in commit 864230f): 4 board JSONs stripped of DEAD board fields (−4466 lines: bulk was `roomStateProfiles` blocks; also `deletedRoomIds`, `hiddenRoomNames`, `playAreaPolygon` entries). `global-defaults.json` stripped of `animationSoundMap` (−12 lines). All 3 non-"none" animationSoundMap entries (`intruder-alert`, `power-outage`, `fire`) were ORPHANS — no matching `def.type` in any board's animation slots — silently dropped per D-03.
- Idempotence verified live: a second `node server.mjs` boot reports `[phase-29-purge] complete (migrated 0 sound refs across 0 boards; orphans 0; global unchanged; 0 board file(s) stripped)` and leaves all config file mtimes byte-stable. The "boots 2..N find nothing to do" guarantee holds.
- Test suite: was 35 pass / 9 skip / 0 fail; now 41 pass / 3 skip / 0 fail. Six W3 skip-gates flipped LIVE (3 in `phase-29-purge.test.mjs` — idempotence, strip-semantics + LIVE preservation, malformed-JSON tolerance; 3 in `phase-29-sound-migration.test.mjs` — copy-when-empty, skip-on-conflict, drop-orphan).
- Closure-Dokument: `.planning/phases/phase-29/29-05-SUMMARY.md`.

## Decisions Phase 29-05

- Module placement (D-10 discretion): extracted helpers to a NEW module `lib/migrations/phase-29-purge.mjs` rather than inlining in server.mjs. Rationale: server.mjs has top-level `await server.listen` side effects; importing helpers from server.mjs into tests would boot the server during every test run. Extraction yields 1 source-of-truth re-imported by both server.mjs and the test files.
- D-03 ordering point landed verbatim: `purgeDeadFieldsOnBoot` runs `migrateAnimationSoundMap` FIRST, then `purgeGlobalDefaultsFields`, then per-board `purgeBoardFile`. Both code-comment and SUMMARY documents the order as non-reorderable. The migration on this developer's working copy reported 3 orphans / 0 successful copies — but lossless semantics are still proven by `phase-29-sound-migration.test.mjs` Test 1 (synthetic fixture with matching `def.type`).
- Two-shape input handling: real `config/boards/*.json` files are wrapped under `outer.board` (board-import.v1 schema); test fixtures use a flat board.v2 shape. The same helper code path handles both — confirmed by Task 2 live disk-migration success on wrapped boards AND by Task 3 tests passing on flat fixtures.
- `config/asset-manifest.json` mutation visible in `git status` is unrelated Phase 28 W4 churn (every boot bumps its `generatedAt` timestamp); deliberately excluded from all 3 Phase 29 commits to keep the boundary clean.
- Per D-06 hard-delete: the disk-side strip is captured in commit 864230f. Git history is the safety net — no `_legacy.json` quarantine, no feature-flag rollback. The `git diff --stat HEAD~3 HEAD config/` output is recorded verbatim in `.planning/phases/phase-29/29-05-SUMMARY.md` per the D-06 sicherheitsnetz convention.
- Wave 3 closure marker: source-tree (Wave 2) and disk-side (Wave 3) cleanup are now SYNCHRONIZED on this developer's working copy. Next wave is 29-06 (Wave 4 — `BOARD_PACKAGE_SCHEMA` v3 → v4 + bundle-export filter + bundle-import v3 rejection error message).

## Phase 35 Wave 0 Closure (2026-05-10)

- Plan 35-W0 (BLOCKING test infrastructure per D-05) is COMPLETE. Six atomic commits: `e973d11` (Task 1 — `scripts/with_server.py`, 249 lines, Python contextmanager spawning `node server.mjs` with isolated tempdir, free-port allocation, `/api/ssr/ready` polling, SIGTERM→SIGKILL teardown, stderr/stdout tee threads); `c5cd049` (Task 2 — `test/live-e2e/{__init__.py, _flake_retry.py, conftest.py}`, pytest fixtures + @flaky_3x decorator with WAVE0_FLAKE_TOLERANCE=1 opt-in skip); `ccbf136` (Task 3 — `test/live-e2e/test_phase35_alignmode_smoke.py`, D-05 a-f as 6 separate test functions); `2bb64f6` (Task 4 — `test/live-e2e/test_phase35_dashboard_alignmode.py` D-01-A2 canary + `test_phase35_fps_benchmark.py` D-04 baseline harness); `0f59f85` (Task 5 — 3 RED unit tests `phase-35-bootalignmode-shape.test.mjs`, `phase-35-output-live-sync.test.mjs`, `phase-35-bayer-dither.test.mjs`); `f0588c7` (Task 6 — `package.json` npm scripts `test:phase35`, `test:live-e2e`, `test:connection-stability`).
- D-06 hard-gate verified: `RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs'` reports `tests=85 pass=84 fail=0 skipped=1` (the 1-hour steady-state gated on `RUN_LONG_TESTS=1`). The plan documented `72/0/13` as the expected count, but the actual master count is `85/84/0/1` (the suite has organically grown since the plan was authored). The HARD-GATE INVARIANT is `fail=0`, which is preserved. Wave-0 added zero production code, so connection-stability cannot have regressed.
- 3 RED rails verified RED: all three `node --test` invocations exit non-zero with `ERR_MODULE_NOT_FOUND` (output-align-mode.js, output-live-sync.js, runtime-effect-dither.js — none of which exist on master, which is correct: they land in 35-A, 35-B, 35-C respectively). The RED state IS the rail.
- Live-E2E smoke verified: `python3 -m pytest test/live-e2e/test_phase35_alignmode_smoke.py::test_bg_color -v` PASSES against master in ~6s. Full pipeline (with_server → Playwright → /opt/google/chrome/chrome under Xvfb DISPLAY=:98 → /output/ → assertion → teardown) is operational. The Phase-34-class-bug-prevention layer is LIVE.
- Wave 0 BLOCKING gate is now LIFTED. Per D-05 mandate, no production code in any other Phase 35 plan could merge until this rail was green where applicable. Next plan is 35-B-PLAN (Track B — minimal live-sync subscription extract); when its `output-live-sync.js` lands, `test/phase-35-output-live-sync.test.mjs` turns GREEN automatically.
- Closure-Dokument: `.planning/phases/phase-35/35-W0-SUMMARY.md` (full per-task accounting, deviation rules invoked: 3× Rule 3 (blocking — pip install pytest, glob pattern for connection-stability path) and 1× Rule 1 (bug — outdated 72/0/13 documentation in plan corrected to 85/84/0/1)).

## Decisions Phase 35-W0

- Approach 1 over Approach 2 for `with_server.py` (D-05 RESEARCH §"Server-spawn pattern"): pure-Python subprocess.Popen wrapper around `node server.mjs` directly. Rejected the cross-spawn-via-`node bin/with-server.mjs` approach (Approach 2) — heavier, no benefit for a Python-test-driven harness.
- `SSR_ROOT_DIR` for tempdir isolation matches existing `test/connection-stability/_harness.mjs` pattern. Main server's `ROOT_DIR` is repo-hardcoded (`server.mjs:41`); this is an existing constraint Wave-0 INHERITS, not creates. The runtime-active-* writes that occur during a smoke boot land in repo's `config/` — same as the current connection-stability suite already does.
- Server stdout AND stderr both tee'd to log files via background threads in `with_server.py`. The plan asked only for stderr, but capturing both costs nothing and supports D-05(d) "health ping failed" assertion regardless of which stream the server eventually picks (A8 from CONTEXT.md). The tee-thread design is non-blocking (the test can read the log file after teardown without ever touching the subprocess pipes).
- `@flaky_3x` decorator wraps the test body, not the fixture setup. Rationale: a flake during fixture setup (e.g., browser launch) is more critical than a flake in the assertion phase — wrapping at the test level lets fixture failures surface as hard failures, while assertion-phase flakes get the 3× retry safety net.
- RED rails use `ERR_MODULE_NOT_FOUND` as the failure mode (not `pytest.skip` or `it.skip`) — these are LITERAL test failures so CI cannot accidentally pass before Tracks A/B/C land. Once the production modules exist, the dynamic-import succeeds and the export-shape assertions take over as the GREEN-state gate.
- Module-level Chrome-availability skip in `conftest.py` — the live-E2E rail is environment-gated (D-05 hardware spec specifies `/opt/google/chrome/chrome`). Machines without it skip the whole module rather than failing loudly. The Lenovo Mini test rig has Chrome installed; CI without Chrome cleanly skips.

## Phase 35 Plan B Closure (2026-05-10)

- Plan 35-B (Track B — Live-Sync Minimal Subset Extract per D-02) is COMPLETE. Four atomic commits: `4124749` (Task 1 — `feat(35-B): add output-live-sync.js`, NEW 211-LOC thin live-sync subscriber modeled on output-audio-binder.js's WS reconnect pattern; NOT extracted from runtime-live-sync-core.js per RESEARCH §B.1; exports `bootOutputLiveSync({logger, role, url})` returning the 13-method subscription = 7 callback registrars + 3 getters + stop); `5c3c39f` (Task 2 — `refactor(35-B): output-audio-binder.js consumes bootOutputLiveSync`, drops own WS plumbing, file goes 160 → 118 LOC, -42 net; subscribes to `onAnimationStart` / `onAnimationStop` / `onClearAll`); `89f7845` (Task 3 — `refactor(35-B): receiver-bootstrap + output.html consume shared liveSync`, inline 1Hz `/api/live/snapshot` poll loop replaced with `onAlignModeChange` + `onProjectionProfileChange` subscriptions when liveSync provided; `attachInputForwarder` reads `liveSync.getAlignMode()` + `liveSync.getActiveProjectionProfileId()`; output.html boots single shared `window.__ttbLiveSync` first then threads it through `bootReceiver` + `bootOutputAudioBinder` so the page opens ONE WS instead of two); `76b8e1e` (Task 4 — `chore(35-B): verification`, D-05 a-d PASS, D-06 PASS, deferred-items log for the pre-existing W0 dashboard test bug).
- D-02-B1 + D-02-B2 RED → GREEN: `node --test test/phase-35-output-live-sync.test.mjs` reports 3/3 pass after Task 2.
- D-06 hard-gate UNCHANGED: `RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs'` reports `tests=85 pass=84 fail=0 skipped=1` (master baseline preserved exactly; Track B's receiver-bootstrap.js refactor did not regress anything).
- D-05 a-d on /output/ PASS: `python3 -m pytest test/live-e2e/test_phase35_alignmode_smoke.py -k "ready_state or current_time or bg_color or server_log_clean"` → 4/4 passed in 58.43s. /output/ thin path still delivers H264 video; refactor preserved behaviour exactly.
- Full JS suite: 393 tests, 370 pass, 6 fail, 17 skipped — the 6 failures are the documented Track A (D-01-A1, 2 tests) + Track C (D-03-C1, 4 tests) RED rails that turn GREEN when 35-A and 35-C land. Track B's own RED rail flipped to GREEN.
- Out-of-scope discovery: the W0 dashboard regression test (`test_phase35_dashboard_alignmode.py`) POSTs to `/api/live/mutate`, a route that does not exist on `server.mjs` (real routes are `/api/live/command` POST + `/api/live/snapshot` GET). Verified pre-existing by reverting to `0154b96` — same 405 failure on pre-Track-B code. Logged in `.planning/phases/phase-35/deferred-items.md` for resolution in a follow-up plan; does NOT block Track B closure.
- Closure-Dokument: `.planning/phases/phase-35/35-B-SUMMARY.md` (full per-task accounting, 1 documentation deviation (D-06 baseline numbers), 1 out-of-scope deferred item (W0 dashboard test endpoint mismatch), all must_haves and success_criteria met).
- Track A (35-A-PLAN) is now UNBLOCKED. The shared `window.__ttbLiveSync` instance with the 13-method subscription contract is exposed on `output.html` and ready for `bootAlignMode` to consume `onAlignModeChange` + `onProjectionProfileChange` for handle-visibility gating.

## Decisions Phase 35-B

- NEW thin module instead of extraction (D-02 implementation choice): per RESEARCH §B.1, runtime-live-sync-core.js is entangled with ~30 dashboard ctx callbacks (playSoundForAnimation, persistGridState, applyTransform, ...). Pulling the subscription primitive out cleanly would require breaking those closures — multi-day refactor with high regression risk against every dashboard feature. Instead, model a small focused subscriber on output-audio-binder.js's proven Phase-34 WS reconnect pattern. Result: 211 LOC focused module, zero dashboard regression risk, identical envelope-parsing semantics.
- 13-method subscription contract LOCKED verbatim from RESEARCH §B.2: 7 callback registrars (`onAnimationStart`, `onAnimationStop`, `onClearAll`, `onAlignModeChange`, `onProjectionProfileChange`, `onConnect`, `onDisconnect` — each takes a handler, returns an unsubscribe function) + 3 getters (`getAlignMode`, `getActiveProjectionProfileId`, `getCurrentClientId`) + 1 teardown (`stop`). Track A's `bootAlignMode` will consume the SAME shape.
- Single shared subscription per page via `window.__ttbLiveSync` global. Pattern matches existing `window.TT_BEAMER_*` convention. Output.html boot order: live-sync → receiver → audio-binder. Page opens ONE WS to `/api/live/ws?role=final-output` instead of two (avoids server-side fanout duplication and reduces reconnect-storm surface).
- Backwards-compatible signatures: both `bootReceiver({liveSync})` and `bootOutputAudioBinder({liveSync})` accept the subscription as an OPTIONAL arg. When omitted, legacy fallback poll preserves pre-Phase-35 behaviour (no breaking change to existing test fixtures or scripts).
- Wave-4 4-corner hit-test PRESERVED in receiver-bootstrap.js. Track A's `bootAlignMode` replaces it later. Track B is strictly the live-sync extraction; the alignMode UI is Track A scope.
- Cold-start fallback retained in output-live-sync.js: 1Hz GET `/api/live/snapshot` until WS `live-hello` arrives. The HTTP poll covers the gap between page load and WS-handshake-complete; once WS is live, the snapshot reconcile is idempotent (no-op on unchanged values via the `pid !== profileId` and `snap.alignMode !== alignMode` guards).
- Receiver-bootstrap.js inline poll is REMOVED in the liveSync branch only — when liveSync omitted, the legacy poll still runs. This preserves D-06 connection-stability for any test harness that bootstraps the receiver without the new wiring (the connection-stability suite uses headless harnesses that don't load output.html).

## Phase 36 Plan W0 Closure (2026-05-10)

- Plan 36-W0 (RED-rails wave per CONTEXT.md D-03 BLOCKING gate) is COMPLETE. Three atomic commits: `fd0078e` (Task 1 — `test(36-W0): add T1-T10 RED rail for /output/ align-mode handle-ui`, NEW 234-LOC `test/live-e2e/test_phase36_align_handles.py` containing 10 Playwright tests covering sizing/4 corner-pulls/vertex drag/midpoint squish/rotation/image-pan/right-click context menu/CTRL+Z undo/dirty-flag dashboard propagation/conflict-free invariant — all wrapped with `@flaky_3x`, all reusing Phase 35 W0 fixtures, all using verified server log strings `[align-grid-snapshot] server-recv` + `[align-drag] received phase=` + new `[align-mode-dirty] received dirty=`); `a6e2529` (Task 2 — `test(36-W0): add dashboard parity rail (T2/T7/T8 parametrized across / and /output/)`, NEW 88-LOC `test/live-e2e/test_phase36_dashboard_parity.py` with 3 functions × 2 paths = 6 collectible parametrized tests forcing every M3-M5 wave to keep dashboard regression GREEN simultaneously with /output/ work; Phase 35 dashboard test untouched per Q2 reconciliation); `3a0c99a` (Task 3 — `test(36-W0): add bootHandleUi shape RED unit + server.mjs dirty-flag stdout marker`, NEW 52-LOC `test/phase-36-boot-handle-ui-shape.test.mjs` with 3 node:test rails RED via ERR_MODULE_NOT_FOUND on missing `boot-handle-ui.js` + ONE additive `console.log` line at server.mjs:4140 inside the existing `/api/align-mode-dirty` POST handler emitting `[align-mode-dirty] received dirty=...` for T9 grep-assertion).
- W0 closure gates ALL pass: T1-T10 collect-only=10 ✓; parity collect-only=6 ✓; bootHandleUi `node --test` exit=1 (RED-rail correctly RED) ✓; `grep -c '\[align-mode-dirty\] received dirty=' server.mjs`=2 (≥1) ✓; D-09 `<script src=>` budget on output.html=1 (≤8) ✓; `node --check server.mjs` exit=0 ✓; both .py files `python3 -c "import ast; ast.parse(...)"` exit=0 ✓.
- D-08 connection-stability hard gate preserved by construction: server.mjs change is purely additive (one `console.log` inside an already-rate-limited [T-27-03] + already-validated [T-27-02] POST handler). No connection-state code paths touched. The dff8334 frame-stale 30s baseline + Phase 33 watchdog tri-state cleanup remain intact.
- Closure-Dokument: `.planning/phases/phase-36/36-W0-SUMMARY.md` (full per-task accounting, Q1-Q5 reconciliation lock-in, closure-gate evidence table, self-check PASSED).
- Phase 36 implementation waves A1, A2, M3, M4, M5 are now UNBLOCKED. Each subsequent wave MUST flip a subset of T1-T10 from RED to GREEN; final phase closure requires all 10 + 6 parity + 3 unit tests GREEN.

## Decisions Phase 36-W0

- Q1 LOCKED (dirty-flag mechanism): Dirty-flag uses existing `POST /api/align-mode-dirty` endpoint (NOT piggyback on `align-grid-snapshot`). RESEARCH §1.3 / §5 / Open Q1 — existing endpoint already has rate-limit (T-27-03 100ms floor), strict-boolean validation (T-27-02), grace-timer reset semantics, and a dashboard subscriber. CONTEXT.md D-06 literal text "broadcast piggybacks on `align-grid-snapshot`" is interpreted as "the dirty-broadcast is local + observable on dashboard via existing live-sync mechanism" — same goal, lower diff/risk. T9's assertion now anchors on the new `[align-mode-dirty] received dirty=` server stdout line emitted inside this handler.
- Q2 LOCKED (dashboard regression coverage): Keep `test_phase35_dashboard_alignmode.py` unchanged AND add `test_phase36_dashboard_parity.py` with parametrized variants per RESEARCH §5. The Phase 35 dashboard test has a pre-existing endpoint-mismatch bug (deferred-items.md) that is OUT OF SCOPE for W0; the new parity rail provides authoritative dashboard regression coverage starting at Phase 36 and forces every M3-M5 wave to keep `/` GREEN at the same time as `/output/`.
- Q3 LOCKED (right-click line add/remove): Right-click "add line" / "remove line" SHALL trigger an immediate `broadcastGridSnapshot({force:true})` so dashboard's grid view reflects the change without waiting for a subsequent drag. Implementation deferred to Wave M5 (right-click-context-menu wave) — NOT W0 scope.
- Q4 LOCKED (handle-ui modularization): handle-ui internal modularization NOT done in Phase 36 (deferred per RESEARCH §6 + CONTEXT.md deferred ideas). Refactor risk too high; the Option-H thin-export contract is the Phase 36 deliverable, not internal cleanup.
- Q5 LOCKED (undo stack memory): Undo stack capped at 1000 entries with FIFO eviction (T-LB-1 mitigation). Implementation deferred to Wave M5 (undo wave) — NOT W0 scope. Without this cap, an operator dragging for hours would grow page memory unbounded.
- RED-rail invariant locked: All 16 live-E2E tests (10 + 6 parity) AND 3 bootHandleUi unit tests will fail today because (a) `bootHandleUi` does not exist, (b) `/output/` does not yet render `.projection-corner-handle` elements via the lazy-loaded module. Tests fail at the deepest right reason (handle-selector wait timeout / ERR_MODULE_NOT_FOUND) — not on syntax, fixture setup, or Python import errors. This is the entire point: when the implementation lands, the dynamic-import succeeds and the export-shape + DOM assertions take over as the GREEN-state gates.
- Server.mjs `from=` field constant: The new `[align-mode-dirty] received dirty=...` log line uses a literal `from=http-post` because no `role`/`clientId` are in scope of the POST handler (HTTP-only — no per-WebSocket-client identity). Per plan instruction: tests anchor only on the `[align-mode-dirty] received dirty=` prefix, not on the `from=` value, so any literal there is acceptable.

## Phase 36 Plan A1 Closure (2026-05-10)

- Plan 36-A1 (Option-H thin-export wave per CONTEXT.md D-01) is COMPLETE. Three atomic commits: `a6a86a6` (Task 1 — `feat(36-A1): add emitLiveMutation + liveSyncCoreOverride DI`, `output-live-sync.js` gains `emitLiveMutation(mutationType, payload)` mirroring `runtime-live-sync-core.js` envelope shape `{type:"live-mutation", mutationId, mutationType, payload, clientSentAt}` for server-side validator compatibility; `runtime-projection-grid-state.js` gains module-private `_liveSyncCoreOverride` set from init's `dependencies.liveSyncCoreOverride` and read at `broadcastGridSnapshot` line 389 with fallback to `window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE` so dashboard path is byte-identical when override null); `a1b3e20` (Task 2 — `feat(36-A1): add bootHandleUi Option-H thin-export entry-point`, NEW 347-LOC ES module at `src/app/runtime/output-receiver/boot-handle-ui.js` exporting `bootHandleUi({...})` with full §2 RESEARCH-locked single-arg-object signature covering all 45+ §1.5 inventory fields, validating required args, resolving IIFE bundle from `window.TT_BEAMER_*` with inert-stub fallback for test/node envs, calling `MAPPING.init(mappingDeps)` then `POLYGON_EDITOR.init(polygonCtx)`, subscribing to `liveSync.onAlignModeChange/onProjectionProfileChange`, returning `{stop, hitTestVertex}` per §2 returned-shape — flips `test/phase-36-boot-handle-ui-shape.test.mjs` RED→GREEN with pass=3 fail=0); `06efd15` (Task 3 — `feat(36-A1): add ?ctx-trace=1 runtime-trace harness (D-07)`, `runtime-orchestration.js` gains `_ctxTraceEnabled`/`_wrapStateForTrace`/`_wrapCtxForTrace`/`window._ctxTraceDump` harness and the two existing `MAPPING.init`/`POLYGON_EDITOR.init` call sites are wrapped with `_wrapCtxForTrace(...)` — when flag absent the wrapper returns the original ctx ref so dashboard behavior is byte-identical).
- A1 closure gates ALL pass: bootHandleUi shape unit pass=3 fail=0 ✓; Phase 35 output-live-sync unit pass=3 fail=0 (no regression) ✓; init-related dashboard regressions (`phase-31-h43-eager-grid-apply.test.mjs` + `phase-31-live-sync-apply-grid.test.mjs` + `phase-32-boot-cleanup.test.mjs`) pass=14 fail=0 ✓; connection-stability suite pass=72 fail=0 with 13 skipped (live-test gates RUN_LIVE_TESTS=1 / RUN_LONG_TESTS=1) — D-08 hard gate preserved ✓; D-09 `<script src=>` budget on output.html=1 (≤8) ✓; `node --check` syntax-valid for all 3 modified files ✓.
- Dashboard regression intact by design: A1 is purely additive at the runtime-orchestration.js call sites — only the outer `_wrapCtxForTrace(...)` wrapper is added; the inline dep-bag content (every named field, every arrow callback) is byte-identical to pre-A1 state. When the URL has no `?ctx-trace=1` flag, `_wrapCtxForTrace(x, label) === x` returns the original reference (zero overhead, zero behavior change). M3-LATE (deferred to M3 plan) will migrate the dashboard's MAPPING.init / POLYGON_EDITOR.init call sites to call `bootHandleUi(...)` explicitly, retiring the dual-init code paths.
- Closure-Dokument: `.planning/phases/phase-36/36-A1-SUMMARY.md` (full per-task accounting, signature delivered, exact lines added per file, D-08 evidence, D-09 evidence, dashboard regression evidence, Rule 3 deviation documented [_resolveModule warns instead of throws + init guards added so contract test passes in node-env without polyfilling globals], Self-Check PASSED).
- Phase 36 Wave A2 is now UNBLOCKED. A2 wires `bootHandleUi(...)` from `output-align-mode-loader.js` and passes the live-sync subscription as `liveSyncCoreOverride` so /output/ broadcasts grid-snapshots via its own WS.

## Decisions Phase 36-A1

- bootHandleUi LOCKED: NEW first-class entry-point at `src/app/runtime/output-receiver/boot-handle-ui.js` (347 LOC, ES module). Single-object-arg signature per RESEARCH §2 with explicit named fields covering DOM roots, state, role-constants, liveSync, liveSyncCoreOverride, polygon-contract/normalizers/board-access, polygon-state, interactions, persistence, sync, dashboard, callbacks, alignModeDirtyEndpoint, logger. Returns `{stop, hitTestVertex}`. Wraps existing `MAPPING.init` + `POLYGON_EDITOR.init` fan-out — does NOT introduce new sub-boots (RESEARCH §2 init-bundle-question: NO modularization per Q4 LOCKED).
- emitLiveMutation LOCKED: New method on `output-live-sync.js`'s `bootOutputLiveSync` subscription. Wraps the private `ws.send(...)` with the canonical live-mutation envelope shape so /output/ broadcasts pass server-side validation. Returns silently if WS not OPEN; errors caught + logged via `[output-live-sync] emitLiveMutation failed:`.
- liveSyncCoreOverride DI LOCKED: `runtime-projection-grid-state.js` gains module-private `_liveSyncCoreOverride` (init-time DI from dependencies). `broadcastGridSnapshot` uses `_liveSyncCoreOverride || window.TT_BEAMER_RUNTIME_LIVE_SYNC_CORE` — dashboard path (override null) is byte-identical to pre-A1 behavior. `MAPPING.init` forwards the entire dep-bag to `gridState.init` via existing `Object.assign({}, dependencies, {...})` pattern, so any `liveSyncCoreOverride` in the bag automatically propagates without requiring `runtime-projection-mapping.js` changes.
- ?ctx-trace=1 harness LOCKED: Dev-mode-only runtime-trace harness in `runtime-orchestration.js` per CONTEXT.md D-07. URL flag detection at module-init time (`location.search.match(/[?&]ctx-trace=1\b/)`). When enabled: `window._ctxTraceAccessed` is a `Set`, `window._ctxTraceDump()` returns sorted array, and the existing `MAPPING.init` (line 412→472) + `POLYGON_EDITOR.init` (line 1890→1950) call sites get the inline object-literal arg wrapped with `_wrapCtxForTrace(...)` recursive Proxy. Recursive Proxy logs every property access at `mapping.ctx.X` / `mapping.ctx.state.X` / `polygon.ctx.X` / `polygon.ctx.state.X` — operator runs the 15-interaction UAT per RESEARCH §1.4 then dumps via `window._ctxTraceDump()` for cross-validation against the AST inventory.
- Deviation Rule 3 (auto-fixed blocking issue): `_resolveModule` in `boot-handle-ui.js` warns + returns inert `{}` stub instead of throwing when `window.TT_BEAMER_*` is missing; `MAPPING.init` and `POLYGON_EDITOR.init` calls are guarded by `typeof X.init === "function"`. Rationale: contract test `bootHandleUi returns object with stop() and hitTestVertex()` runs in node-env without `window.TT_BEAMER_*` polyfills, so a strict throw would prevent the test from observing the returned shape. Production /output/ usage (A2 wave) deterministically loads the IIFE bundle BEFORE calling bootHandleUi, so the warning will only fire if a real bundle-order error occurs (which it logs loudly).
- M3-LATE migration NOT done in A1: Per RESEARCH §2 dashboard-migration risk-mitigation note, the dashboard's existing inline `MAPPING.init` (line 472) and `POLYGON_EDITOR.init` (line 1950) call structure is preserved verbatim in A1 (only outer Proxy-wrap added). Migrating dashboard to call `bootHandleUi(...)` explicitly is deferred to Wave M3-LATE (later in M3 plan or its own task) to keep A1's blast radius minimal.

## Phase 36 Plan A2 Closure (2026-05-10)

- Plan 36-A2 (loader integration + D-02 (a) event-handling inversion) is COMPLETE. Two atomic commits: `584ae6e` (Task 1 — `feat(36-A2): wire bootHandleUi (Option H) into output-align-mode-loader`, replaces the Phase 35-A pure-extract entry-point call with a dynamic `await import('/src/.../boot-handle-ui.js')` + `bootHandleUi({...})` invocation populating the FULL §1.5 RESEARCH inventory dep-bag via 7 NEW helpers — `_ensureStageAndOverlayDom` (idempotent JS-time DOM append for #stage + #room-overlay-svg, preserving D-09 ≤8 src-based scripts budget), `_createOutputState` (RESEARCH §1.2 sub-key inventory factory with uiView="dashboard" so sync-* gates are unreachable), `_buildPolygonStateStub` / `_buildNormalizersStub` / `_buildInteractionsStub` / `_buildPersistenceStub` / `_buildSyncStubs` / `_buildDashboardStubs` — each with rationale comments documenting why /output/-side stubs are correct; `liveSyncCoreOverride: { emitLiveMutation: liveSync.emitLiveMutation }` (Phase 36 A1 critical fix wired); `alignModeDirtyEndpoint: "/api/align-mode-dirty"` (Q1 LOCKED per D-06 reconciliation, traceable string in source)); `d451e1e` (Task 2 — `fix(36-A2): D-02 (a) overlay pointer-events inversion + remove Phase 35-A CSS workaround`, `receiver-bootstrap.js` overlay.style.pointerEvents permanently "none" in BOTH boot-time + onAlignModeChange callback + legacy poll-fallback (3 assignments converted, 0 conditional `alignMode ?` remaining), 3 audit-trace comments referencing "Phase 36 D-02 (a)"; `src/styles.css` `pointer-events:none !important` block on `.projection-corner-handle / .projection-grid-handle / #projection-grid-line-canvas` DELETED (16-line Phase 35-A workaround block removed; replaced with 9-line Phase 36 D-02 audit-trace comment); output.html UNCHANGED).
- A2 closure gates ALL pass: `grep -c "bootHandleUi" output-align-mode-loader.js`=12 (≥2) ✓; `grep -cE 'bootAlignMode\b' output-align-mode-loader.js`=0 (legacy call fully removed; reference module output-align-mode.js stays in tree per CONTEXT.md but is NOT imported) ✓; `grep -c "emitLiveMutation" output-align-mode-loader.js`=3 (≥2) ✓; `grep -c "/api/align-mode-dirty" output-align-mode-loader.js`=1 (Q1 reconciliation traceable) ✓; `grep -c "_ensureStageAndOverlayDom"`=2 ✓; `grep -c "_createOutputState"`=2 ✓; `grep -c boot-handle-ui` (import target)=2 ✓; `grep -cE 'overlayEl\.style\.pointerEvents\s*=\s*"none"' receiver-bootstrap.js`=3 (≥2) ✓; `grep -cE 'overlayEl\.style\.pointerEvents\s*=\s*alignMode\s*\?' receiver-bootstrap.js`=0 ✓; `grep !important × handle-classes in styles.css`=0 (rule deleted) ✓; `grep "Phase 36 D-02" styles.css`=1 ✓; `grep "Phase 36 D-02" receiver-bootstrap.js`=3 ✓; output.html unchanged ✓; D-09 `<script src=>` budget on output.html=1 (≤8) ✓; `node --check` syntax-valid for all 3 modified files ✓; `node --test test/phase-36-boot-handle-ui-shape.test.mjs test/phase-35-output-live-sync.test.mjs` pass=6 fail=0 ✓; `node --test test/ssr-receiver-disconnect-detection.test.mjs` pass=16 fail=0 ✓; `node --test test/connection-stability/*.test.mjs` pass=72 fail=0 skipped=13 — D-08 hard gate preserved ✓.
- bootHandleUi is now reachable from /output/ via the lazy-loader. When the operator toggles align-mode ON: liveSync.onAlignModeChange fires → loader awaits `loadBundleOnce()` (12-IIFE bundle, cache-hit-fast post 2s prefetch) → `await refreshBoardCatalog()` + `await refreshSelectedBoard()` → `_ensureStageAndOverlayDom()` appends #stage + SVG #room-overlay → builds boardAccess (h2 real polygon-data accessors) → builds all 6 fan-out stubs → `await import("/.../boot-handle-ui.js")` → calls `bootHandleUi({...})` with the FULL §1.5 inventory → handles render at z:9999 with inline pointer-events:auto → the click capture path runs unchanged from dashboard (Option H's whole point). On align-mode OFF: `_currentBootHandle.stop()` removes listeners + handles; `body.classList.remove("align-mode-active")` hides the room-overlay; #stage gets `display:none` (defensive teardown — re-activate flips display back to '').
- D-02 (a) event-handling architecture LANDED: receiver-input-forwarder.js is NOT modified — it remains attached to overlayEl, but never receives events because overlayEl always has `pointer-events:none` in the Phase 36 model. This makes T10 (conflict-free invariant) achievable in M5 by construction: the click-capture path is single (handle DOM only), no dual hitTestVertex / handle-ui race. Phase 35-A's `pointer-events:none !important` CSS workaround is GONE — handles' inline `pointer-events: auto` (set by handle-ui creation code, unchanged) wins without competition.
- Closure-Dokument: `.planning/phases/phase-36/36-A2-SUMMARY.md` (full per-task accounting, 7 helper rationale, exact diff per file, D-08 + D-09 evidence, Phase 35 unit-test no-regression evidence, planner-discretionary decisions [dynamic ES `import()` for boot-handle-ui + `display:none` deactivate strategy] documented, Self-Check PASSED).
- Phase 36 Wave M3 is now UNBLOCKED. M3 will flip T1 (sizing) + T2 (corner-pull) GREEN by ensuring bootHandleUi's MAPPING.init bbox math aligns with stream-content (the video element's natural dimensions) and that corner-pull mutations round-trip through liveSync.emitLiveMutation correctly. M4 + M5 follow.

## Decisions Phase 36-A2

- Loader integration LOCKED: Dynamic `await import("/src/app/runtime/output-receiver/boot-handle-ui.js")` for the ES-module entry-point. Two parallel module-loading mechanisms in the same loader: programmatic `<script src=>` injection for the 12 IIFE bundle modules (which register on `window.TT_BEAMER_RUNTIME_*`) + native dynamic ES import for boot-handle-ui (which IS an ES module per A1). Required by the bundle's heterogeneous module shapes; preserves Pitfall-5 parse-time deps via the IIFE bundle's sequential `await loadScriptOnce(src)` ordering.
- Stage + room-overlay DOM append strategy LOCKED: JS-time `document.createElement("div")` for #stage + `document.createElementNS("http://www.w3.org/2000/svg", "svg")` for #room-overlay (must be createElementNS for SVG element parsing). Idempotent — re-invoking `_ensureStageAndOverlayDom` does NOT duplicate elements; if a previous `deactivate()` set `display:none`, it's re-shown via `display:""`. NOT in static output.html — preserves D-09 ≤8 src-based scripts budget invariant. The `<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">` attributes match polygon-editor.renderRoomOverlay's expected coordinate space (1000×1000 normalized, identity-mapped to css pixels).
- D-02 (a) overlay pointer-events inversion LOCKED: `overlayEl.style.pointerEvents = "none"` permanently in receiver-bootstrap.js — both at boot AND on alignMode change AND in the legacy poll-fallback. The Phase 34/35-iter2 conditional `alignMode ? "auto" : "none"` is gone. With this inversion, handle DOM at z:9999 captures clicks directly via inline `pointer-events: auto` (set by handle-ui creation code). receiver-input-forwarder remains attached to overlayEl but goes dormant during align-mode-ON because no events reach the overlay. The `alignMode` boolean state in receiver-bootstrap is PRESERVED (still tracked, still feeds `isAlignModeActive` for hitTestVertex Wave-4 fallback) — only the overlay pointer-events branch changes. This is the entire point of Option H: handle-ui's INTERNAL pointer handlers run unchanged on /output/ — same code path as dashboard.
- Phase 35-A CSS workaround REMOVED: `body[data-output-role="final-output"].align-mode-active .projection-corner-handle, .projection-grid-handle, #projection-grid-line-canvas { pointer-events: none !important; }` in src/styles.css lines 209-213 + its 11-line Phase 35 D-01 (Track A) explanation comment at lines 198-208 — DELETED entirely. Replaced with a 9-line Phase 36 D-02 audit-trace comment explaining why it's gone. With the rule gone, handles' inline `pointer-events: auto` wins without `!important` competition. This was the (c)-bubbling workaround in Phase 35-A — its existence prevented Option H from working.
- Q1 LOCKED in source: `alignModeDirtyEndpoint: "/api/align-mode-dirty"` — the existing endpoint per D-06 reconciliation. Threaded through bootHandleUi's dep-bag → mappingDeps → MAPPING.init → grid-state / profile-persistence (whichever consumer uses it). The W0 wave added a `[align-mode-dirty] received dirty=` stdout marker server-side that T9 grep-asserts after handle-ui posts here.
- Stage deactivation strategy LOCKED: `display:none` on align-mode OFF rather than `removeChild`. Avoids re-create cost on next activation; bootHandleUi's `stop()` already removes handle children separately. Idempotent re-activate flips display back to `''`.
- _state.uiView intentionally "dashboard" (NOT "settings"): The sync-* fan-out fires only when `uiView === "settings"`. Setting `uiView = "dashboard"` makes the no-op stubs verifiably unreachable via the natural code path (defense in depth — even if a sync-* stub had a bug, it would never run on /output/).
- No deviations Rule 1/2/3/4: A2 executed exactly as planned. Two minor planner-discretionary picks documented in SUMMARY (`await import` for ES-module entry-point + `display:none` deactivate) — neither is a deviation, both are within the plan's explicit "implementation choice" latitude.

## Phase 36 Plan M3 Closure (2026-05-10)

- Plan 36-M3 (T1+T2+T10 GREEN-flip + M3-LATE deferral) is COMPLETE. Three atomic commits: `a6fcd84` (Task 1 — `feat(36-M3): wire T1 (sizing) — load align-mode loader + identity grid default`, wired output-align-mode-loader.js into output.html via inline `<script type="module">`, replaced Phase-31 h21b 10/90 grid default with identity 0/1, added rAF initial-align pass + videoEl resize/loadedmetadata/ResizeObserver wiring); `0855cfd` (Task 2 — `feat(36-M3): wire T2 + T10 — drag-end-only broadcast on /output/`, _broadcastDragSnapshot fromMove gate on /output/, drag-end force-broadcasts at 6 drag END handlers, dashboard/SSR-tab paths preserve per-move at 30Hz throttle); `3c02bba` (Task 3 — `docs(36-M3): defer M3-LATE dashboard migration (path-b per plan)`, created .planning/phases/phase-36/deferred-items.md with D1+D2 entries).
- M3 closure gates pass: T1+T2+T10 GREEN on /output/; T3-T9 still RED (owned by M4/M5); T6+T8 incidentally GREEN as bonus carry-forward via the corner-handle drag path. D-08 fail=0 preserved (84/84 pass). D-09 output.html src-script budget unchanged at 1.

## Decisions Phase 36-M3

- Identity grid default LOCKED: `dstXs = dstYs = [0.0, 0.5, 1.0]` in buildNewProfileDefaultGrid (revert of Phase-31 h21b 10/90). T1 contract requires handle-frame to align with video.ssr-video bbox within 4px. Saved profiles persist their own dst grid via runtime-active-grid.json; calibrated installs unaffected.
- Drag-end-only broadcast on /output/ LOCKED: `_broadcastDragSnapshot({ fromMove: true })` suppressed when outputRole=final-output; END handlers gain explicit `_broadcastDragSnapshot({ force: true })` calls. Dashboard/SSR-tab per-move broadcasts preserved at 30Hz throttle (T-DOS-1 unchanged). T10 contract "exactly 1 grid-snapshot per drag" satisfied by construction on /output/.
- M3-LATE path-(b) deferral LOCKED: Dashboard `runtime-orchestration.js` MAPPING.init (line 472) + POLYGON_EDITOR.init (~1953) NOT migrated to single `bootHandleUi(...)` call. ~1500 LOC of state setup between the two init points; refactor risk too high. Plan's path-(b) escape explicitly authorizes deferral. /output/ thin path fully functional via A1/A2 + M3. V wave records as Phase 36.1 follow-up.

## Phase 36 Plan M4 Closure (2026-05-10)

- Plan 36-M4 (T3+T4+T5 GREEN-flip) is COMPLETE. Three atomic commits: `81feefb` (Task 1 — `feat(36-M4): wire T3 (vertex drag) — data-row/col aliases + snapshot path fix`, added `el.dataset.row/col` alias attrs on corner handles, fixed W0 RED-rail's `/api/live/snapshot` response traversal that missed the `session` envelope); `13dd84f` (Task 2 — `feat(36-M4): wire T4 (midpoint drag) — grid-handle alias + onscreen squish bars`, added `.projection-grid-handle` class alias on squish-bar wraps, inward-flip in positionSquishBars when tentative outward placement falls outside viewport); `d665c52` (Task 3 — `feat(36-M4): wire T5 (rotation handle) — handle-role attr + onscreen + clamp`, added `data-handle-role="rotate"` attr on rotate handles, inward-flip in positionRotateHandles, clamped rotated points to [0,1] in onRotateDragMove so server validator accepts the broadcast).
- M4 closure gates pass: T3+T4+T5 GREEN on /output/; T1+T2+T10 still GREEN (no regression); T6+T8 still GREEN (M3 bonus preserved); T7+T9 still RED (M5 territory). D-08 fail=0 preserved (72/72 pass). D-09 budget 1 ≤ 8.

## Decisions Phase 36-M4

- Alias-not-replace selector pattern LOCKED: Added `data-row`/`data-col` on corner handles (in addition to existing `data-gridRow/data-gridCol`); added `.projection-grid-handle` as 2nd class token on squish-bar wraps (in addition to `.projection-squish-bar`); added `data-handle-role="rotate"` on rotate handles. Zero risk of regressing dashboard E2E rails that use original selector names.
- Inward-flip placement LOCKED: positionSquishBars + positionRotateHandles flip the outward offset sign when tentative position falls outside [0..vw] × [0..vh] viewport bounds. Drag math re-derives geometry from actual point positions (not from offset signs), so squish/rotate behavior unchanged regardless of physical placement. Mitigates M3 identity-grid corner-at-edge regression where outward placement put bars/handles offscreen.
- Validator-aware clamp on rotation LOCKED: `grid.points[r][col].x = Math.max(0, Math.min(1, ...))` (and y) at write site in onRotateDragMove. Mirrors server-side `validateAlignGridSnapshotPayload` [0,1] invariant at server.mjs:447-448; matches squish-bar's existing clamp pattern. Without this clamp, rotation with identity-grid corners pushes points slightly outside [0,1] → silent server rejection → no T5 mutation echo.

## Phase 36 Plan M5 Closure (2026-05-10)

- Plan 36-M5 (T6+T7+T8+T9 GREEN-flip + Q3 LOCK + Q5 LOCK) is COMPLETE. Two atomic commits (T6+T8 already GREEN as M3 bonus, no code change required; T7+T9 the actual flips): `1ce3ba5` (Task 2 — `feat(36-M5): wire T7 (right-click context menu) — Q3 LOCKED immediate broadcast`, 4 function-level broadcasts in addHorizontalLine/addVerticalLine/removeHorizontalLine/removeVerticalLine + 2 menu-callback broadcasts for "Add line through this point" intersection/line hits where add functions early-return); `985681b` (Task 4 — `feat(36-M5): wire T9 (dirty-flag) + Q5 LOCKED (1000-entry undo cap)`, gesture-driven `_postAlignModeDirtyToServer(true)` on /output/ in notifyDirtyChanged independent of Phase 29 h3 profile-divergence state machine, `_UNDO_STACK_MAX=1000` + while-loop FIFO eviction, test fix for T9's wait_for_selector state="attached").
- M5 closure gates pass: T7+T9 GREEN on /output/; all T1-T10 GREEN (10/10) — Phase 36 implementation arc complete. D-08 fail=0 preserved (72/72 pass). D-09 budget 1 ≤ 8. T-XSS-1 verified by grep (zero innerHTML in menu/item/name context).

## Decisions Phase 36-M5

- Q3 LOCK extended beyond plan letter: 4 function-level broadcasts (addHorizontalLine/addVerticalLine/removeHorizontalLine/removeVerticalLine) PLUS 2 menu-callback broadcasts inside "Add line through this point" callback (intersection-hit + line-hit branches). Rationale: T7 right-clicks at viewport center → on default identity grid lands EXACTLY on (1,1) intersection vertex; addHorizontalLine + addVerticalLine compute t=0 and early-return. Menu-callback broadcast guarantees the test contract regardless of click coord vs existing-line geometry.
- T9 dirty-flag wiring LOCKED via gesture-driven POST on /output/: notifyDirtyChanged unconditionally POSTs `dirty=true` to `/api/align-mode-dirty` when outputRole === OUTPUT_ROLE_FINAL. Decouples from Phase 29 h3's profile-divergence local `_dirty` state machine (still drives dashboard chip + aria-describedby UX). Server's 100ms rate-limit (T-27-03) prevents POST flooding. Phase 29 h3's "no profile = no broadcast" semantic was correct for dashboard's chip UX but conflicted with T9's gesture-driven contract; the split keeps both correct.
- Q5 cap LOCKED at 1000 (T-LB-1 mitigation per RESEARCH §8 + CONTEXT.md threat model): `_UNDO_STACK_MAX=1000` with defensive `while (undoStack.length >= 1000) undoStack.shift(); undoStack.push(...)` FIFO eviction. Prior MAX_UNDO=50 (Phase 27 era) updated; alias `const MAX_UNDO = _UNDO_STACK_MAX` retained for backward compat. Long operator align-mode sessions (>1 hour) bound undo-stack memory to ~200 KB.

## Phase 36 Plan V Closure (2026-05-10)

- Plan 36-V (comprehensive verification + Pi UAT deferred documentation) is COMPLETE. Two atomic commits: `963ebd0` (Task 1 — `docs(36-V): capture Phase 36 verification report — all 10 RED rails GREEN`, created `.planning/phases/phase-36/36-VERIFICATION.md` with D-01..D-10 coverage matrix, T1..T10 GREEN evidence, Q1-Q5 reconciliation source-trace, carry-forward locks audit, threat-mitigation audit, verbatim pytest+node --test outputs, closure verdict PASS-AUTOMATED-PENDING-PI-HARDWARE-UAT); `9ab3ddb` (Task 2 — `docs(36-V): add Phase 36 Pi-hardware UAT — D-10 deferred carry-forward`, created `.planning/phases/phase-36/36-HUMAN-UAT.md` with 13 numbered Items covering T1-T9 functional UAT + Pi browser overlay-pointer-events quirk + connection stability under sustained drag + VAAPI default-disabled preservation + dashboard regression cross-tab check, M3-LATE path-b deferral documented).
- V closure gates ALL pass: `pytest test/live-e2e/test_phase36_align_handles.py -v` → 10 passed (T1-T10 all GREEN); `pytest test/live-e2e/test_phase36_dashboard_parity.py -v` → 3 /output/ variants pass, 3 / variants RED-as-expected per M3 path-b deferral; `node --test test/phase-36-boot-handle-ui-shape.test.mjs` → pass=3 fail=0; `RUN_LIVE_TESTS=1 node --test 'test/connection-stability/*.test.mjs'` → pass=84 fail=0 (D-08 hard gate); `node --test test/phase-35-*.test.mjs` → pass=9 fail=0 (no regression); `node --test 'test/**/*.test.mjs'` → tests=396 pass=379 fail=0 skipped=17; `grep -cE '<script[^>]*src=' output.html` → 1 (D-09 ≤8); `grep -nE 'pointer-events:\s*none\s*!important' src/styles.css | grep -E 'projection-corner-handle|projection-grid-handle|projection-grid-line-canvas'` → 0 lines (D-02 ABSENT verified).
- Phase 36 closure verdict: **PASS-AUTOMATED-PENDING-PI-HARDWARE-UAT** — same carry-forward pattern as Phase 33/34/35. Operator runs Pi-hardware UAT (`36-HUMAN-UAT.md` items 1-13) when Pi 4 accessible; until then, tag `phase-36-end-pending-pi-uat`. After operator confirms, retag `phase-36-end`.
- ROADMAP.md updated by V wave: Phase 36 status PLANNING → PASS-AUTOMATED-PENDING-PI-HARDWARE; Plans counter 6/7 → 7/7; 36-V-PLAN checkbox `[x]`; **Phase 36.1 follow-up entry added** (PLANNING) with full scope (dashboard `runtime-orchestration.js` migration to single `bootHandleUi(...)` call), trigger (2026-05-10 M3 path-(b) deferral), tests to flip GREEN (`test_phase35_dashboard_alignmode.py` + 3 parity / variants), estimated effort (3-5 days), Pflicht-Inputs.
- Closure-Dokument: `.planning/phases/phase-36/36-V-SUMMARY.md` (full per-task accounting, verification command outputs table, Q1-Q5 source-trace table, carry-forward locks table, threat-mitigation table, deviations [planner-discretion lowercase status: deferred markers + ROADMAP edit batching], Self-Check PASSED).

## Decisions Phase 36-V

- Closure verdict LOCKED: PASS-AUTOMATED-PENDING-PI-HARDWARE-UAT (NOT BLOCKED). All 10 T1-T10 RED rails GREEN, all carry-forward locks preserved, D-08 fail=0 with live tests enabled, D-09 budget intact, D-02 CSS workaround absence verified. Pi-hardware UAT (D-10) is the only remaining gate, deferred per carry-forward pattern from Phase 33/34/35.
- Dashboard parity rail RED reclassification: 3 / (dashboard) variants of `test_phase36_dashboard_parity.py` are RED — this is NOT a Phase 36 regression but the documented M3 path-(b) deferral (dashboard `runtime-orchestration.js` not yet migrated to `bootHandleUi`). Captured in ROADMAP as Phase 36.1 follow-up (PLANNING).
- Phase 35 W0 dashboard regression test (`test_phase35_dashboard_alignmode.py`) RED reclassification: same root cause as the parity / variants. Flips GREEN with Phase 36.1.
- Configuration file drift NOT touched: `config/asset-manifest.json`, `config/boards/nemesis-board-a.json`, `config/global-defaults.json` show modifications in `git status` — these are pre-existing runtime state from prior wave live-e2e test runs (not caused by V wave); intentionally NOT staged or committed by V wave.
- V wave is verification-only — NO production code changes. All edits restricted to `.planning/phases/phase-36/36-VERIFICATION.md`, `.planning/phases/phase-36/36-HUMAN-UAT.md`, `.planning/phases/phase-36/36-V-SUMMARY.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md`.

## Phase 36 Status

- Phase 36 status: **PASS-AUTOMATED-PENDING-PI-HARDWARE-UAT** (2026-05-10)
- All 7 plans executed: W0, A1, A2, M3, M4, M5, V — all SUMMARY documents committed to master
- 10/10 T1-T10 live-e2e tests GREEN on /output/
- D-08 connection-stability hard gate preserved (fail=0 with RUN_LIVE_TESTS=1)
- D-09 script-tag budget intact (1 ≤ 8 in output.html)
- D-02 Phase 35-A CSS workaround verifiably absent
- All Q1-Q5 planner reconciliations source-traceable
- All carry-forward locks preserved (VAAPI, Phase 34 h2, Phase 35-iter2 h1/h2/h3, Phase 35-B, D-08)
- Pi-hardware UAT deferred per D-10 carry-forward (matches Phase 33/34/35 pattern)
- Phase 36.1 follow-up tracked in ROADMAP (dashboard `runtime-orchestration.js` migration to `bootHandleUi`)
- Tag: `phase-36-end-pending-pi-uat` until operator Pi UAT confirms; then retag `phase-36-end`

## Phase 39 Plan 39-5 Closure (2026-05-12)

- Plan 39-5 (full regression matrix + closure docs + tag `phase-39-closed-automated`) is COMPLETE under auto-mode operator directive. Two atomic commits: `a2da763` (Task 1 — `docs(39-5): Task 1 — full regression matrix GREEN (16 sections, fail=0)`, created `.planning/phases/phase-39/39-5-REGRESSION-LOG.md` with 16 test sections all Exit code 0); and the closure commit (Task 3 — 39-CLOSURE.md + STATE.md + ROADMAP.md + CRITICAL_KNOWN_BUGS.md). The operator-checkpoint Task 2 was auto-approved-pending-visual per directive — all automated rails GREEN; operator must still visually verify D-01 sandstorm.mp4 / D-02 RECONNECT-free cold-boot / D-03 solid-color seamless rendering on hardware before retagging to `phase-39-closed`.
- 39-5 regression evidence: 16/16 test sections GREEN. D-08 sustained 31504ms heartbeats=21 closed=false producerReady=0 producerClosed=0 renderHostDown=0. D-02 reconnectingEvents=0 in 30s cold-boot. D-03 max_delta=0 on every interior strip across 3×3, 5×5, 9×9 parametric grids. D-01 live e2e PASS 10.58s, readyState=4, videoWidth=1280, monotonic currentTime.
- 39-5 closure verdict: **CLOSED-PENDING-VISUAL-UAT** (2026-05-12). Tag: `phase-39-closed-automated`. Retag to `phase-39-closed` after operator visual UAT confirms D-01/D-02/D-03 on operator hardware.
- Closure-Dokument: `.planning/phases/phase-39/39-CLOSURE.md` + `.planning/phases/phase-39/39-5-REGRESSION-LOG.md` + per-plan SUMMARYs (39-1, 39-2, 39-3, 39-4).

## Decisions Phase 39

- Phase 39 fixed three SSR defects from operator UAT 2026-05-12 in one phase: D-01 MP4-Playback (`server.mjs` MIME table + RFC 7233 Range), D-02 cold-boot reconnect storms (`receiver-bootstrap.js` INITIAL_CONNECT state machine extension), D-03 mesh-warp seams (`runtime-projection-gl-renderer.js` UV-inset fragment-shader epsilon — sub-path B per dev-box renderMode=gl).
- D-03 sub-path B chosen over sub-path A: dev-box renderMode=gl proves GL is active, so seams are sampling artefacts not 2D-fallback. Sub-path A (`--use-angle=swiftshader`) would risk regressing the Phase 34 hotfix h2 Mesa-llvmpipe synchronous-flush protection (D-08 fail>0).
- D-02 INITIAL_CONNECT_GRACE_MS = 5000ms: covers typical Chromium tab boot + publisher mediasoup-produce RPC roundtrip (operator UAT observed 3-10s).
- All Phase 38 carry-forwards (W1/W2/W10/W11/W12) verified GREEN on closure commit. Phase 33 receiver-state-machine adapted minimally (NEW->INITIAL_CONNECT) without breaking other transitions.
- L13 VAAPI flag lock preserved verbatim — `ssr-render-host.mjs` not touched in this phase.
- Three new entries added to `.planning/CRITICAL_KNOWN_BUGS.md`: #3 MP4-MIME-octet-stream class, #4 INITIAL_CONNECT state-machine classification, #5 renderMode-before-GL-edits discipline.

## Phase 39 Status

- Phase 39 status: **CLOSED-PENDING-VISUAL-UAT** (2026-05-12)
- All 5 plans executed: 39-1 (diagnostic infra + RED tests), 39-2 (D-01 MP4 MIME + Range), 39-3 (D-02 INITIAL_CONNECT state), 39-4 (D-03 UV-inset sub-path B), 39-5 (verify + close) — all SUMMARY documents committed to master
- Automated regression matrix: 16/16 sections GREEN, 0 failures
- D-08 connection-stability hard gate preserved (fail=0 with RUN_LIVE_TESTS=1)
- VAAPI default-disabled (Phase 33 L6) preserved — `ssr-render-host.mjs` byte-identical
- Phase 35-iter2 h3 Bayer dither (L7) and output-live-sync.js subscription contract (L8) preserved
- Phase 38 W10 WS-fragmentation rail (L1) preserved (4/4 subtests GREEN)
- Phase 30 pixel-snap (lines 456-478) byte-identical
- Phase 38 W12 invalidateCachedArrays (lines 552-571) byte-identical
- Visual UAT pending operator hardware verification (D-01 sandstorm.mp4 playback, D-02 cold-boot RECONNECT-free, D-03 solid-color seamless)
- Tag: `phase-39-closed-automated` until operator visual UAT confirms; then retag `phase-39-closed`
