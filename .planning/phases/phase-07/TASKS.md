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

## Plan 7-2 - Hardening Wave (nach 7-HF1)
- [ ] TODO P7-T16 [P1] Adaptive coalescing tuning unter Last validieren (no critical-event merge).
- [ ] TODO P7-T17 [P1] Queue fairness und starvation guards fuer mixed load (control-critical vs noisy config updates) absichern.
- [ ] TODO P7-T18 [P1] Long-run soak und jitter trend analysis dokumentieren.

## Plan 7-3 - Production Gate Wave (nach 7-2)
- [ ] TODO P7-T19 [P1] Mehrgeraete-Realsetup-Abnahme (Handy + PC + `/output/final`) mit SLO-Protokoll durchfuehren.
- [ ] TODO P7-T20 [P1] Finale Betreiberabnahme + Rollout/Fallback-Checkliste dokumentieren.
