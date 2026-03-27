# Phase 7 Tasks

Statuslegende: TODO | IN-PROGRESS | DONE
Prioritaetslabel: [P0] kritisch | [P1] hoch | [P2] mittel

## Plan 7-1 - Sync Overhaul Core Wave (erste Ausfuehrungswelle, execute-ready)
- [x] DONE P7-T1 [P0] Mutation envelope und Event-Klassen verbindlich definieren (`mutationId`, `serverVersion`, `serverTimestamp`, priority/coalescing rules).
- [x] DONE P7-T2 [P0] Server-Ordered-Queue einfuehren: ingest -> order -> commit als deterministische Single-Writer-Pipeline.
- [x] DONE P7-T3 [P0] Fanout-Pipeline haerten: commit-gekoppelte Broadcast-Reihenfolge, dedup und stale-drop guards aktivieren.
- [x] DONE P7-T4 [P0] Backpressure-Mechanismen implementieren (bounded queues, overflow handling, safe coalescing nur fuer nicht-kritische Updates).
- [x] DONE P7-T5 [P0] Client-Apply-Engine auf version-aware idempotent apply umstellen (`appliedVersion`, duplicate guard, stale reject).
- [x] DONE P7-T6 [P0] Reconnect/Join snapshot+delta replay deterministisch machen (kein Zwischenzustands-Flackern, kein no-op override).
- [x] DONE P7-T7 [P0] Priority-Control-Path einfuehren: `stop`, `toggle-off`, `clear-all` preemptiv und first-click-deterministisch verarbeiten.
- [x] DONE P7-T8 [P0] Render/Audio teardown fuer stop-path haerten (sofortiger visual clear + audio hard-stop ohne Restartefakte).
- [x] DONE P7-T9 [P0] `/output/final` low-latency apply path priorisieren (final-first scheduling, minimal pre-render overhead).
- [x] DONE P7-T10 [P0] GIF trigger responsiveness verbessern (prewarm/decode readiness + reduced trigger-to-first-frame latency).
- [x] DONE P7-T11 [P0] E2E telemetry/tracing integrieren (ingest, commit, fanout, receive, apply, first-frame, audio-start/stop) mit mutation correlation.
- [x] DONE P7-T12 [P0] Sync regression suite erstellen (single-click, burst, reconnect, stale-order, stop/toggle determinism).
- [x] DONE P7-T13 [P0] Non-regression suite ausfuehren fuer room/cluster, align-mode, audio-role-routing, persistence.
- [x] DONE P7-T14 [P0] Plan-7-1 latency compliance report erstellen (P50/P95/P99 pro hop, target pass/fail inkl. Abweichungsanalyse).
- [x] DONE P7-T15 [P0] Artefakt-Sync abschliessen: PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE auf 7-1 Stand bringen.

## Plan 7-HF1 - Verification Integrity Hotfix (execute-ready, naechste Welle nach 7-1)
- [x] DONE P7-HF1-T1 [P0] P7-T12 Regression-Verifier auf kanonisches Telemetrie-Schema fixen (`hopsMs` statt `hops`) inkl. Negativfall fuer fehlendes Feld.
- [x] DONE P7-HF1-T2 [P0] P7-T13 Non-Regression als ausfuehrbare Behavior-Matrix erweitern: room/cluster, align-mode, audio-role-routing, persistence jeweils mit Start/Edit/Stop/Clear plus Reload/Rejoin-Paritaet.
- [x] DONE P7-HF1-T3 [P0] Evidenzartefakte neu erzeugen und aktualisieren (`P7-T12-REGRESSION.md`, `P7-T13-NON-REGRESSION.md`, `P7-T14-LATENCY-REPORT.md`, `debug/p7-hf1-*`).
- [x] DONE P7-HF1-T4 [P0] Phase- und globale Artefakte konsistent synchronisieren (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`) und Follow-up closure dokumentieren.

## Plan 7-HF2 - Polling Determinism Hotfix (execute-ready, verpflichtend vor 7-2)
- [x] DONE P7-HF2-T1 [P0] Architektur-Pivot umsetzen: Server-Snapshot als einzige kanonische Read-Quelle (`serverVersion` monoton, `serverTimestamp` vorhanden).
- [x] DONE P7-HF2-T2 [P0] Client-Optimismus entfernen: keine lokalen Zielstates; Mutationen nur Command-Write mit pending/ack-Indikator.
- [x] DONE P7-HF2-T3 [P0] Adaptiven Polling-Loop implementieren (120-250 ms, visibility-aware, backoff+jitter+recover) mit strict stale-drop.
- [x] DONE P7-HF2-T4 [P0] Optionalen WebSocket nur als Wakeup-Hint (`state-dirty`) kapseln; Snapshot-Polling bleibt alleinige Korrektheitsquelle.
- [x] DONE P7-HF2-T5 [P0] Telemetrie/Gates erweitern: `commandAccepted`, `snapshotVersionVisible`, `snapshotApplied` inkl. Ghost-State-Detektor.
- [x] DONE P7-HF2-T6 [P0] Regression-Suite erweitern: 3-4 Clients, Burst/Toggle/Reconnect, keine Ghost-States, kein second-click-Zwang.
- [x] DONE P7-HF2-T7 [P0] Evidenz + Artefakt-Sync abschliessen (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Plan 7-HF3 - Snapshot Trigger/Audio Consistency + Sequential Stagger Hotfix (execute-ready, verpflichtend vor 7-2)
- [x] DONE P7-HF3-T1 [P0] Snapshot-Trigger-Revision fuer globale Effekte einziehen: pro neuer Revision auf jedem Client genau ein Vollstart (kein 1s-Kurzlauf bei Fremdtrigger).
- [x] DONE P7-HF3-T2 [P0] Stop-Gating haerten: laufende globale Effekte enden vorzeitig ausschliesslich bei explizitem Stop im Snapshot.
- [x] DONE P7-HF3-T3 [P0] Audio-Lifecycle an Snapshot koppeln: pro Trigger-Revision genau ein Start, stale/replayed Audio strikt droppen, kein Alt-Effekt-Nachlauf.
- [x] DONE P7-HF3-T4 [P0] Snapshot-Dedup/Idempotenz fuer Trigger-Lifecycle erweitern (Trigger-Revision-Key, reconnect-safe reapply-guard).
- [x] DONE P7-HF3-T5 [P0] Cluster-`stagger start` erweitern: sequenzieller Member-Start mit konfigurierbarem Offset (ms) statt randomisiertem Versatz.
- [x] DONE P7-HF3-T6 [P0] UI-Controls fuer Stagger praezisieren: Delay-Slider (ms) + replizierte Persistenz in Command/Snapshot.
- [x] DONE P7-HF3-T7 [P0] Regression + Evidenz + Artefakt-Sync liefern (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`) inkl. Trigger-Dauerparitaet/Audionachlauf/Stagger-Offset-Matrix.

## Plan 7-HF4 - Draft-UI Immutability on Start Hotfix (execute-ready, verpflichtend vor 7-2)
- [x] DONE P7-HF4-T1 [P0] Start-Pfade fuer `targetType=room|cluster` so hardenen, dass Draft-Controls nach Start unveraendert bleiben (kein implizites Reset auf Animation/Target/Slider).
- [x] DONE P7-HF4-T2 [P0] Draft-State-Reducer/Setter guarden: Start darf nur runtime pending/ack/audit aktualisieren, nicht Draft-UI-Felder.
- [x] DONE P7-HF4-T3 [P0] Room-Klick-Verhalten absichern: nur `target` auto auf geklickten Room setzen; Start selbst bleibt strikt side-effect-frei fuer Drafts.
- [x] DONE P7-HF4-T4 [P0] Snapshot/Polling-Apply gegen Draft-Rueckschreiben absichern, damit Runtime-Updates keine Dropdown-/Slider-Drafts ueberschreiben.
- [x] DONE P7-HF4-T5 [P0] Regression-Matrix erweitern: mehrfache room/cluster Starts mit gleichen Einstellungen, kein Jump auf `cluster` oder `Malfunction`, Dropdown/Slider stabil.
- [x] DONE P7-HF4-T6 [P0] Non-regression absichern fuer bestehende target-auto-on-room-click Paritaet und Cluster-Start-Funktion.
- [x] DONE P7-HF4-T7 [P0] Evidenz + Artefakt-Sync abschliessen (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Plan 7-HF5 - Align Sync + Board-Switch Running-Clear Determinism Hotfix (execute-ready, verpflichtend vor 7-2)
- [x] DONE P7-HF5-T1 [P0] Align-Mode-Toggle serverautoritativ als Context-Command haerten (Ack + monotone Snapshot-Version + dedup), ohne lokalen Optimismus.
- [x] DONE P7-HF5-T2 [P0] Align-Mode-Snapshot-Apply auf allen Rollen vereinheitlichen; `/output/final` muss denselben Version-Apply-Pfad verpflichtend nutzen.
- [x] DONE P7-HF5-T3 [P0] Align-Mode stale/equal-version reject absichern (`incomingVersion <= appliedVersion => drop`) inkl. reconnect/replay-Paritaet.
- [x] DONE P7-HF5-T4 [P0] Board-Switch serverseitig atomar an Running-Clear koppeln, damit Running-Liste beim Kontextwechsel deterministisch geleert wird.
- [x] DONE P7-HF5-T5 [P0] Client-Apply fuer Board-Switch gegen boardfremde Running-Rehydrierung haerten (keine Alt-Reste nach Switch).
- [x] DONE P7-HF5-T6 [P0] Regression erweitern: Align-on/off Roundtrip ueber 3-4 Clients inkl. `/output/final` sowie Start->Board-Switch->Running-empty Matrix.
- [x] DONE P7-HF5-T7 [P0] Evidenz + Artefakt-Sync abschliessen (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Plan 7-HF6 - Board-Context Residue Elimination Hotfix (execute-ready, blocker vor 7-2)
- [x] DONE P7-HF6-T1 [P0] Board-Switch-Clear als authoritative Transaktion haerten: Context-Switch + Running-Clear als untrennbaren atomic commit mit idempotentem transaction guard ausfuehren.
- [x] DONE P7-HF6-T2 [P0] Server-Snapshot-Sanitizer einfuehren: vor Persist/Broadcast alle boardfremden Running-Eintraege strikt droppen, damit keine cross-board Residues serialisiert werden.
- [x] DONE P7-HF6-T3 [P0] Reconnect-Hydrierung board-kontextgebunden erzwingen: Snapshot-Apply filtert Running strikt auf `selectedBoard` und verwirft boardfremde Rehydrate-Payloads deterministisch.
- [x] DONE P7-HF6-T4 [P0] Deterministische Regression erweitern: Switch+Reconnect-Matrix mit harter Invariante `crossBoardResidueCount = 0` ueber 3-4 Clients inkl. `/output/final`.
- [x] DONE P7-HF6-T5 [P0] Evidenz + Artefakt-Sync abschliessen (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`) inkl. HF6-Output-Artefakten.

## Plan 7-HF7 - Stop-Action Routing + Deterministic Stop Propagation Hotfix (execute-ready, blocker vor 7-2)
- [x] DONE P7-HF7-T1 [P0] Stop-Action-Routing fuer Running-Liste haerten: dispatch ausschliesslich `stop-animation` fuer bestehende `animation.id`; keine create/start side-effects.
- [x] DONE P7-HF7-T2 [P0] Server-Stop-Mutation idempotent/serverautoritativ absichern: stale/unknown stop IDs werden ohne Start-Nebenwirkung verworfen oder sauber bestaetigt.
- [x] DONE P7-HF7-T3 [P0] Snapshot/Broadcast-Apply fuer Stop auf allen Rollen deterministisch machen (control + `/output/final`) inkl. strict version/dedup guard.
- [x] DONE P7-HF7-T4 [P0] UI-Action-Guard gegen versehentliche Stop-Re-Trigger einfuehren (per-run pending lock/debounce, no double-dispatch).
- [x] DONE P7-HF7-T5 [P0] Regression + Evidenz + Artefakt-Sync liefern: room/global/cluster stop parity, anim-id non-increment invariant, multi-client parity, `PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`.

## Plan 7-HF8 - Global-Outside Stop Parity + Running-Hover Stability Hotfix (execute-ready, blocker vor 7-2)
- [x] DONE P7-HF8-T1 [P0] Running-List-Stop fuer Scope `global-outside` strikt stop-only routen (`stop-animation` by existing `animation.id`) und Trigger-/Create-Fallbacks ausschliessen.
- [x] DONE P7-HF8-T2 [P0] Server-Stop-Semantik fuer globale Scopes vereinheitlichen (`global-inside` + `global-outside`) inkl. idempotent stale/unknown handling ohne no-op drift.
- [x] DONE P7-HF8-T3 [P0] Client-Snapshot-Apply fuer globale Stops paritaetisch haerten (identische ack/version/dedup semantics fuer inside/outside).
- [x] DONE P7-HF8-T4 [P0] Running-List-Hover-UX stabilisieren: konstanter Hover-Highlight-Zustand ohne Blink-/Loop-Flicker.
- [x] DONE P7-HF8-T5 [P0] Regression-Matrix erweitern: all-scope stop parity (`room`, `global-inside`, `global-outside`, `cluster`) + hover behavior parity ueber 3-4 Clients inkl. `/output/final`.
- [x] DONE P7-HF8-T6 [P0] Evidenz + Artefakt-Sync abschliessen (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Plan 7-HF9 - Start-Lifecycle Determinism + Board-Switch Status Arbitration Hotfix (execute-ready, blocker vor 7-2)
- [x] DONE P7-HF9-T1 [P0] Root-Cause-Fix umsetzen: Start-Mutationen (`trigger-room`, `trigger-global`, `trigger-cluster`) duerfen nicht unmittelbar durch nachlaufende Kontext-/Statusmutationen neutralisiert/ueberschrieben werden.
- [x] DONE P7-HF9-T2 [P0] Status-Arbitration korrigieren: `board switched` bleibt Kontextsignal und maskiert laufende Start-/Running-Statusereignisse nicht.
- [x] DONE P7-HF9-T3 [P0] Start/Stop-Paritaet fuer alle Scopes regressionsfest machen (`room`, `global-inside`, `global-outside`, `cluster`) inkl. strict stop-only semantics.
- [ ] TODO P7-HF9-T4 [P0] Lifecycle-/Persistenz-Guard haerten: gestartete Animationen bleiben aktiv bis Timerablauf oder explizitem `stop-animation`/`clear-all`; kein implizites Early-Cleanup durch Statusdrift.
- [ ] TODO P7-HF9-T5 [P0] Deterministische Multi-Client-Sync-Paritaet inkl. `/output/final` sichern (Polling/Version/Ack/Reconnect non-regression beibehalten).
- [ ] TODO P7-HF9-T6 [P0] Voller Funktionscheck als Pflichtmatrix ausfuehren: Start+Stop fuer room/global-inside/global-outside/cluster inkl. status arbitration checks.
- [ ] TODO P7-HF9-T7 [P0] Evidenz + Artefakt-Sync abschliessen (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Plan 7-2 - Hardening Wave (nach 7-HF9)
- [ ] TODO P7-T16 [P1] Adaptive coalescing tuning unter Last validieren (no critical-event merge).
- [ ] TODO P7-T17 [P1] Queue fairness und starvation guards fuer mixed load (control-critical vs noisy config updates) absichern.
- [ ] TODO P7-T18 [P1] Long-run soak und jitter trend analysis dokumentieren.

## Plan 7-3 - Production Gate Wave (nach 7-2)
- [ ] TODO P7-T19 [P1] Mehrgeraete-Realsetup-Abnahme (Handy + PC + `/output/final`) mit SLO-Protokoll durchfuehren.
- [ ] TODO P7-T20 [P1] Finale Betreiberabnahme + Rollout/Fallback-Checkliste dokumentieren.
