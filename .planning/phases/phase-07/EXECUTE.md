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

## Priority Execution - Plan 7-2 (nach 7-1)
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
- Kein Phase-7-Wellenabschluss ohne konsistenten Artefakt-Sync (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE/STATE/ROADMAP/CURRENT_PHASE`).

## Update Rules
- Taskstatus in `TASKS.md` nach jedem abgeschlossenen Task aktualisieren.
- Relevante Architekturentscheidungen in `.planning/STATE.md` Decision Log erfassen.
- Bei Scope-Aenderungen `PLAN.md`, `BACKLOG.md` und `ACCEPTANCE.md` im selben Schritt synchronisieren.

## Execution Update 7-1
- P7-T1..P7-T15 completed.
- Regression and report artifacts are available in `debug/p7-t12-*`, `debug/p7-t13-*`, `debug/p7-t14-*` and phase docs.
