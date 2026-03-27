# Execute Phase 7

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution - Plan 7-1 (verbindlich, erste execute-ready Welle)
1. P0 zuerst: P7-T1 (mutation contract + priority/coalescing rules fixieren).
2. P0 danach: P7-T2..P7-T4 (server ordered commit/fanout + dedup/backpressure).
3. P0 danach: P7-T5..P7-T6 (client deterministic apply + reconnect replay guards).
4. P0 danach: P7-T7..P7-T8 (priority stop/toggle-off/clear-all mit sofortigem visual/audio clear).
5. P0 danach: P7-T9..P7-T10 (`/output/final` fast path + GIF trigger latency hardening).
6. P0 danach: P7-T11 (telemetry/tracing entlang E2E path).
7. P0 Abschluss: P7-T12..P7-T14 (regression matrix + non-regression + latency compliance report).
8. P0 Abschluss: P7-T15 (vollstaendiger Artefakt-Sync inkl. globaler Tracking-Dateien).

## Priority Execution - Plan 7-HF1 (verbindlich vor 7-2)
1. P0 zuerst: P7-HF1-T1 (telemetry schema verifier fix `hopsMs`).
2. P0 danach: P7-HF1-T2 (behavior-level non-regression matrix executable machen).
3. P0 danach: P7-HF1-T3 (evidence artefacts aus Hotfix-Checks aktualisieren).
4. P0 Abschluss: P7-HF1-T4 (phase/global artifacts konsistent synchronisieren).

## Priority Execution - Plan 7-HF2 (verbindlich vor 7-2)
1. P0 zuerst: P7-HF2-T1 (server snapshot als kanonische Read-Quelle mit monotoner Version).
2. P0 danach: P7-HF2-T2 (optimistische Client-States entfernen; command-write only).
3. P0 danach: P7-HF2-T3 (adaptiver Polling-Loop 120-250 ms + stale-drop/version-gate).
4. P0 danach: P7-HF2-T4 (WS nur als optionalen wakeup hint kapseln).
5. P0 danach: P7-HF2-T5 (telemetrie-gates `commandAccepted -> snapshotVisible -> applied`).
6. P0 danach: P7-HF2-T6 (regression matrix fuer ghost-state-elimination + multi-client burst/reconnect).
7. P0 Abschluss: P7-HF2-T7 (evidence + artefakt-sync komplett).

## Priority Execution - Plan 7-HF3 (verbindlich vor 7-2)
1. P0 zuerst: P7-HF3-T1 (snapshot-trigger-revision fuer globale Effekte, once-per-revision full-run auf allen Clients).
2. P0 danach: P7-HF3-T2 (explicit-stop-only lifecycle; kein vorzeitiger Abbruch ohne Snapshot-Stop).
3. P0 danach: P7-HF3-T3 (audio lifecycle strict an trigger revision + stale replay drop).
4. P0 danach: P7-HF3-T4 (trigger dedup/idempotenz fuer reconnect/repoll robust machen).
5. P0 danach: P7-HF3-T5 (cluster stagger sequenziell mit konfigurierbarem Offset statt random).
6. P0 danach: P7-HF3-T6 (stagger delay slider in ms, repliziert/persistiert in command+snapshot).
7. P0 Abschluss: P7-HF3-T7 (regression-evidence + artefakt-sync komplett).

## Priority Execution - Plan 7-2 (nach 7-HF3)
1. P1 zuerst: P7-T16 (adaptive coalescing tuning).
2. P1 danach: P7-T17 (queue fairness/starvation hardening).
3. P1 Abschluss: P7-T18 (long-run soak + jitter trend report).

## Priority Execution - Plan 7-3 (nach 7-2)
1. P1 zuerst: P7-T19 (realsetup multi-device SLO acceptance).
2. P1 Abschluss: P7-T20 (operator sign-off + rollout/fallback checklist).

## Gate-Regeln
- Kein Weitergehen zu P7-T2+, bevor P7-T1 den mutation contract verbindlich dokumentiert.
- Kein Weitergehen zu P7-T5+, bevor P7-T4 serverseitig ordering + dedup + bounded backpressure nachweist.
- Kein Weitergehen zu P7-T7+, bevor P7-T6 deterministic apply/replay auf Clientseite bestaetigt.
- Kein Weitergehen zu P7-T9+, bevor P7-T8 priority stop-path ohne visual/audio Reste bestaetigt.
- Kein Weitergehen zu P7-T11+, bevor P7-T10 final fast path + GIF latency improvement nachweist.
- Kein Weitergehen zu P7-T15+, bevor P7-T14 Regression + Non-Regression + Latency-Report als PASS dokumentiert.
- Kein Weitergehen zu Plan 7-2, bevor Plan 7-HF1 und Plan 7-HF2 vollstaendig PASS sind.
- Kein Weitergehen zu Plan 7-2, solange Polling-Determinism-Gate nicht PASS ist (server-only truth, no optimistic state, snapshot-version-gated apply, adaptive polling, WS-hint-only).
- Kein Weitergehen zu Plan 7-2, bevor Plan 7-HF3 vollstaendig PASS ist (snapshot trigger full-run parity, explicit-stop-only, audio stale-replay guard, sequential stagger offset parity).
- Kein Phase-7-Wellenabschluss ohne konsistenten Artefakt-Sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Update Rules
- Taskstatus in `TASKS.md` nach jedem abgeschlossenen Task aktualisieren.
- Relevante Architekturentscheidungen in `.planning/STATE.md` Decision Log erfassen.
- Bei Scope-Aenderungen `PLAN.md`, `BACKLOG.md` und `ACCEPTANCE.md` im selben Schritt synchronisieren.

## Execution Update 7-1
- P7-T1..P7-T15 completed.
- Regression and report artifacts are available in `debug/p7-t12-*`, `debug/p7-t13-*`, `debug/p7-t14-*` and phase docs.

## Follow-up Update (verify-work 7)
- Current result is PARTIAL PASS; Plan 7-HF1 is now a mandatory blocker-closure wave before Plan 7-2.

## Execution Update 7-HF1
- P7-HF1-T1..P7-HF1-T4 completed.
- Hotfix outputs recorded in `debug/p7-hf1-t12-output.json`, `debug/p7-hf1-t13-output.json`, `debug/p7-hf1-t14-output.json`.
- Next executable wave: Plan 7-HF2.

## Execution Update 7-HF2
- P7-HF2-T1..P7-HF2-T7 completed.
- Live correctness now follows server-authoritative snapshot polling (`/api/live/snapshot` + version gate) and command-write endpoint (`/api/live/command`).
- Client UI applies runtime state only from snapshots; command actions remain pending until snapshot confirmation.
- WebSocket is reduced to optional wake hint (`state-dirty`) and no longer used as correctness channel.
- HF2 evidence recorded in `debug/p7-hf2-t12-output.json`, `debug/p7-hf2-t13-output.json`, `debug/p7-hf2-t14-output.json`.

## New Mandatory Wave
- Next executable wave: Plan 7-HF3 (P0) before Plan 7-2.

## Execution Update 7-HF3
- P7-HF3-T1..P7-HF3-T7 completed.
- Global trigger lifecycle now uses snapshot trigger revisions for once-per-revision full-duration replay with explicit-stop-only gating (`runtime.globalTriggerRevisions` / `runtime.globalStopRevisions`).
- Audio lifecycle is revision-aware/idempotent (no stale replay, deterministic start/stop under polling snapshots).
- Cluster stagger start is deterministic sequential with configurable offset slider (`staggerOffsetMs`) and snapshot replication via `runtime.roomDraft` + cluster runtime metadata.
- HF3 evidence recorded in `debug/p7-hf3-t12-output.json`, `debug/p7-hf3-t13-output.json`, `debug/p7-hf3-t14-output.json`.

## Next Wave
- Plan 7-2 (P1 hardening) is now unblocked by HF3 gate closure.
