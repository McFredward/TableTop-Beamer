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
- [ ] TODO P7-HF3-T2 [P0] Stop-Gating haerten: laufende globale Effekte enden vorzeitig ausschliesslich bei explizitem Stop im Snapshot.
- [ ] TODO P7-HF3-T3 [P0] Audio-Lifecycle an Snapshot koppeln: pro Trigger-Revision genau ein Start, stale/replayed Audio strikt droppen, kein Alt-Effekt-Nachlauf.
- [ ] TODO P7-HF3-T4 [P0] Snapshot-Dedup/Idempotenz fuer Trigger-Lifecycle erweitern (Trigger-Revision-Key, reconnect-safe reapply-guard).
- [ ] TODO P7-HF3-T5 [P0] Cluster-`stagger start` erweitern: sequenzieller Member-Start mit konfigurierbarem Offset (ms) statt randomisiertem Versatz.
- [ ] TODO P7-HF3-T6 [P0] UI-Controls fuer Stagger praezisieren: Delay-Slider (ms) + replizierte Persistenz in Command/Snapshot.
- [ ] TODO P7-HF3-T7 [P0] Regression + Evidenz + Artefakt-Sync liefern (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`) inkl. Trigger-Dauerparitaet/Audionachlauf/Stagger-Offset-Matrix.

## Plan 7-2 - Hardening Wave (nach 7-HF3)
- [ ] TODO P7-T16 [P1] Adaptive coalescing tuning unter Last validieren (no critical-event merge).
- [ ] TODO P7-T17 [P1] Queue fairness und starvation guards fuer mixed load (control-critical vs noisy config updates) absichern.
- [ ] TODO P7-T18 [P1] Long-run soak und jitter trend analysis dokumentieren.

## Plan 7-3 - Production Gate Wave (nach 7-2)
- [ ] TODO P7-T19 [P1] Mehrgeraete-Realsetup-Abnahme (Handy + PC + `/output/final`) mit SLO-Protokoll durchfuehren.
- [ ] TODO P7-T20 [P1] Finale Betreiberabnahme + Rollout/Fallback-Checkliste dokumentieren.
