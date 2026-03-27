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

## Priority Execution - Plan 7-HF4 (verbindlich vor 7-2)
1. P0 zuerst: P7-HF4-T1 (start path draft-immutable fuer room/cluster machen; keine auto-resets von animation/target/slidern).
2. P0 danach: P7-HF4-T2 (draft reducer/setter guards; start darf nur runtime pending/ack updaten).
3. P0 danach: P7-HF4-T3 (room-click-only target autofill absichern; start bleibt side-effect-frei).
4. P0 danach: P7-HF4-T4 (snapshot/polling apply von draft-controls entkoppeln).
5. P0 danach: P7-HF4-T5 (regression matrix fuer multi-start same settings + no jump auf `cluster`/`Malfunction`).
6. P0 danach: P7-HF4-T6 (non-regression fuer room-click target autofill + cluster target stability).
7. P0 Abschluss: P7-HF4-T7 (evidence + artefakt-sync komplett).

## Priority Execution - Plan 7-HF5 (verbindlich vor 7-2)
1. P0 zuerst: P7-HF5-T1 (Align-Mode als serverautoritative Context-Mutation mit Ack/Version/Dedup haerten).
2. P0 danach: P7-HF5-T2..P7-HF5-T3 (Align-Snapshot-Apply auf allen Rollen inkl. `/output/final`, strict stale/equal-version reject).
3. P0 danach: P7-HF5-T4..P7-HF5-T5 (Board-Switch atomar mit Running-Clear verknuepfen und clientseitige no-residue Guards setzen).
4. P0 danach: P7-HF5-T6 (Regression-Matrix fuer Align-Roundtrip + Board-Switch-Running-empty inkl. Reload/Reconnect).
5. P0 Abschluss: P7-HF5-T7 (evidence + artefakt-sync komplett).

## Priority Execution - Plan 7-HF6 (verbindlich vor 7-2)
1. P0 zuerst: P7-HF6-T1 (Board-Switch-Clear als authoritative atomare Transaktion absichern: context switch + running-clear in einem Commit).
2. P0 danach: P7-HF6-T2 (server snapshot sanitizer vor Persist/Broadcast verpflichtend aktivieren; boardfremde Running-Eintraege droppen).
3. P0 danach: P7-HF6-T3 (reconnect/join snapshot apply strikt auf `selectedBoard` filtern; cross-board rehydrate verwerfen).
4. P0 danach: P7-HF6-T4 (deterministische switch+reconnect regression mit Invariante `crossBoardResidueCount = 0` fuer 3-4 Clients inkl. `/output/final`).
5. P0 Abschluss: P7-HF6-T5 (evidence + artefakt-sync komplett).

## Priority Execution - Plan 7-HF7 (verbindlich vor 7-2)
1. P0 zuerst: P7-HF7-T1 (Stop-Action-Routing strikt auf `stop-animation` fuer bestehende `animation.id` haerten; create/start side-effects verbieten).
2. P0 danach: P7-HF7-T2 (serverautoritative/idempotente Stop-Mutation absichern; stale/unknown stop darf keinen Startpfad triggern).
3. P0 danach: P7-HF7-T3 (stop snapshot/broadcast apply deterministisch auf allen Rollen inkl. `/output/final` versionieren).
4. P0 danach: P7-HF7-T4 (UI inflight guard/debounce pro run-id gegen Re-Trigger und double-dispatch).
5. P0 Abschluss: P7-HF7-T5 (regression-evidence + artefakt-sync komplett).

## Priority Execution - Plan 7-HF8 (verbindlich vor 7-2)
1. P0 zuerst: P7-HF8-T1 (`global-outside` stop-routing strikt stop-only machen; create/start/no-op drift ausschliessen).
2. P0 danach: P7-HF8-T2..P7-HF8-T3 (server/client globale stop semantics fuer `global-inside` + `global-outside` vereinheitlichen, inkl. ack/version/dedup parity).
3. P0 danach: P7-HF8-T4 (Running-List-Hover-Highlight stabilisieren; kein blink/loop-flicker bei hover).
4. P0 danach: P7-HF8-T5 (all-scope stop parity + hover behavior regression matrix ueber 3-4 Clients inkl. `/output/final`).
5. P0 Abschluss: P7-HF8-T6 (evidence + artefakt-sync komplett).

## Priority Execution - Plan 7-HF9 (verbindlich vor 7-2)
1. P0 zuerst: P7-HF9-T1 (Root-Cause-Fix fuer sofort neutralisierte Start-Mutationen in room/global/cluster Startpfaden).
2. P0 danach: P7-HF9-T2 (Status-Arbitration fixieren: `board switched` darf Start-/Running-Status nicht maskieren).
3. P0 danach: P7-HF9-T3..P7-HF9-T4 (all-scope start/stop parity + lifecycle persistence bis Timerablauf oder explizitem Stop/Clear).
4. P0 danach: P7-HF9-T5..P7-HF9-T6 (multi-client deterministic parity inkl. `/output/final` + voller Funktionscheck fuer room/global-inside/global-outside/cluster).
5. P0 Abschluss: P7-HF9-T7 (evidence + artefakt-sync komplett).

## Priority Execution - Plan 7-HF10 (verbindlich vor 7-2)
1. P0 zuerst: P7-HF10-T1 (reproduzierbare Root-Cause-Analyse fuer `start command ignored/overwritten` im Pfad `dispatch -> server apply -> snapshot apply`).
2. P0 danach: P7-HF10-T2 (Start-Dispatch hardenen: idempotentes, metadata-stabiles Start-Routing fuer room/global-inside/cluster bis Commit).
3. P0 danach: P7-HF10-T3 (Server-Apply hardenen: commiteter Start darf nicht durch Kontext-/Status-Folgepatches neutralisiert werden).
4. P0 danach: P7-HF10-T4 (Snapshot-Apply hardenen: committed Start wird deterministisch uebernommen, ohne statusgetriebene Ruecknahme).
5. P0 danach: P7-HF10-T5 (Status-Arbitration non-masking absichern; Kontextstatus darf Lifecycle nicht ueberschreiben).
6. P0 danach: P7-HF10-T6 (harte Smoke-Gates: `room`/`global-inside`/`cluster` in Running sichtbar und aktiv bis Timer/Stop/Clear).
7. P0 Abschluss: P7-HF10-T7 (FAIL+PASS Verify-Evidenz + voller Artefakt-Sync komplett).

## Priority Execution - Plan 7-2 (nach 7-HF10)
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
- Kein Weitergehen zu Plan 7-2, bevor Plan 7-HF4 vollstaendig PASS ist (start mutiert keine Draft-UI; room-click-only target autofill; room+cluster draft stability).
- Kein Weitergehen zu Plan 7-2, bevor Plan 7-HF5 vollstaendig PASS ist (align-mode serverautoritativ auf allen Clients inkl. `/output/final`; board-switch running-clear ohne Alt-Reste).
- Kein Weitergehen zu Plan 7-2, bevor Plan 7-HF6 vollstaendig PASS ist (authoritative atomic switch-clear transaction, sanitize-before-persist/broadcast, reconnect board-context filter, residue-zero regression).
- Kein Weitergehen zu Plan 7-2, bevor Plan 7-HF7 vollstaendig PASS ist (stop-only routing ohne create/start side-effects, serverautoritative stop propagation inkl. `/output/final`, UI re-trigger guard, room/global/cluster stop parity).
- Kein Weitergehen zu Plan 7-2, bevor Plan 7-HF8 vollstaendig PASS ist (`global-outside` stop parity, global stop semantics unification, running-list hover flicker elimination).
- Kein Weitergehen zu Plan 7-2, bevor Plan 7-HF9 vollstaendig PASS ist (Root-Cause-Fix gegen Start-Neutralisierung, `board switched` maskiert nicht, all-scope start/stop parity + lifecycle persistence, deterministic multi-client `/output/final` parity).
- Kein Weitergehen zu Plan 7-2, bevor Plan 7-HF10 vollstaendig PASS ist (reproduzierbare Root-Cause `start ignored/overwritten`, dispatch+server-apply+snapshot-apply fix, status non-masking, harte running smoke-gates fuer room/global-inside/cluster, FAIL+PASS verify artifacts).
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
- Next executable wave: Plan 7-HF4 (P0) before Plan 7-2.

## Execution Update 7-HF4
- P7-HF4-T1..P7-HF4-T7 completed.
- Room/cluster start path is draft-immutable (no start-side reset/jump of animation, target, or slider drafts).
- Control snapshot apply no longer back-writes runtime roomDraft into local draft controls.
- HF4 evidence recorded in `debug/p7-hf4-t12-output.json`, `debug/p7-hf4-t13-output.json`, `debug/p7-hf4-t14-output.json`.

## Next Wave
- Next executable wave: Plan 7-HF5 (P0) before Plan 7-2.

## Execution Update 7-HF5
- P7-HF5-T1..P7-HF5-T7 completed.
- Align toggle command path is now context-authoritative (`context-update`) with ack/version/dedup and snapshot-only UI apply.
- Snapshot apply parity incl. `/output/final` is enforced, and stale/equal-version payloads are dropped in polling + reconnect replay.
- Board-switch context mutation now clears running atomically; client apply blocks old-board residue rehydration.
- HF5 evidence recorded in `debug/p7-hf5-t12-output.json`, `debug/p7-hf5-t13-output.json`, `debug/p7-hf5-t14-output.json`.

## Next Wave
- Next executable wave: Plan 7-HF8 (P0) before Plan 7-2.

## New Blocking Wave
- Neues verpflichtendes Feedback meldet zwei P0-Blocker: Running-Stop fuer `global-outside` ist nicht paritaetsstabil und Running-List-Hover blinkt visuell.
- Next executable wave is now Plan 7-HF8 (P0) before Plan 7-2.

## New Blocking Wave
- Neues verpflichtendes Feedback meldet einen P0-Regression-Blocker: Running-List-Stop routed in Randfaellen als Start/Neuinstanz statt deterministic stop.
- Next executable wave is now Plan 7-HF7 (P0) before Plan 7-2.

## New Blocking Wave (verify-work 7-HF5 follow-up)
- Two P0 blockers remain open (non-deterministic board-switch clear, reconnect cross-board residue rehydrate).
- Next executable wave is now Plan 7-HF6 (P0) before Plan 7-2.

## Execution Update 7-HF6
- P7-HF6-T1..P7-HF6-T5 completed.
- Board switch now commits as an authoritative atomic context transaction with idempotent transaction guards (`contextSwitchTransactionId`) and deterministic running clear.
- Server snapshot state is sanitized before persist/broadcast so only running entries matching `selectedBoard` survive serialization/fanout.
- Reconnect/join hydration now hard-filters running entries by board context; foreign-board entries are rejected deterministically.
- HF6 deterministic matrix now enforces `crossBoardResidueCount = 0` for switch+reconnect across 4 polling clients including `/output/final`.
- HF6 evidence recorded in `debug/p7-hf6-t12-output.json`, `debug/p7-hf6-t13-output.json`, `debug/p7-hf6-t14-output.json`.

## Execution Update 7-HF7
- P7-HF7-T1..P7-HF7-T5 completed.
- Running-list stop path is hardened to stop-only dispatch (`stop-animation`) with explicit helper guard against trigger/create side effects.
- Server `stop-animation` mutation is idempotent for stale/unknown IDs and reconciles cluster-linked stop lifecycle deterministically.
- Stop/clear `live-session-update` snapshots now apply immediately on clients for synchronized stop behavior including `/output/final`.
- UI stop controls use per-animation inflight locks and `Stopping...` disable state until snapshot confirms stop.
- HF7 evidence recorded in `debug/p7-hf7-t12-output.json`, `debug/p7-hf7-t13-output.json`, `debug/p7-hf7-t14-output.json`.

## Next Wave
- Next executable wave: Plan 7-2 (P1 hardening).

## New Blocking Wave (verify-work 7-HF9 follow-up)
- Kritischer P0-Blocker bleibt: `room`/`global-inside`/`cluster` starten nicht deterministisch stabil; Statusfeedback blitzt nur kurz.
- Next executable wave is now Plan 7-HF10 (P0) before Plan 7-2.

## Execution Update 7-HF10
- P7-HF10-T1..P7-HF10-T7 completed.
- Root-cause FAIL timeline captured: accepted `trigger-room`/`trigger-global`/`trigger-cluster` commands were overwritten by snapshot board-context sanitization when `selectedBoard` was null (`debug/p7-hf10-t1-fail-output.json`).
- Start dispatch is now metadata-stable (`boardId`, `targetScope`, `targetType`, trace metadata) before command commit for room/global-inside/cluster.
- Server apply + snapshot sanitizer now infer/persist authoritative board context and no longer neutralize committed starts.
- Client snapshot apply now uses board-context inference fallback for running payload parity; contextual `board switched` feedback no longer masks lifecycle/pending start feedback.
- Hard smoke gate PASS: room/global-inside/cluster start and remain active until explicit stop/clear (`debug/p7-hf10-t6-smoke-output.json`).
- Verify outputs synchronized: `debug/p7-hf10-t12-output.json`, `debug/p7-hf10-t13-output.json`, `debug/p7-hf10-t14-output.json`.

## Gate Closure
- Plan 7-HF10 is PASS; Plan 7-2 is now the next executable hardening wave.

## Execution Update 7-HF9
- P7-HF9-T1..P7-HF9-T7 completed.
- Root-cause fix: context-update commands for draft/align no longer overwrite board context and cannot neutralize freshly started room/global/cluster runs.
- Status arbitration fix: `board switched` is emitted only for explicit board switch flow and no longer masks start/running feedback during runtime sync.
- Deterministic all-scope parity and lifecycle persistence are verified for `room`, `global-inside`, `global-outside`, `cluster` across 4 polling clients including `/output/final`.
- HF9 evidence recorded in `debug/p7-hf9-t12-output.json`, `debug/p7-hf9-t13-output.json`, `debug/p7-hf9-t14-output.json`.

## Next Wave
- Next executable wave: Plan 7-2 (P1 hardening).

## New Blocking Wave (verify-work 7-HF8 follow-up)
- Kritischer P0-Regression-Blocker: Start-Mutationen werden durch nachlaufende Status-/Kontextupdates neutralisiert, wodurch room/global-inside/cluster nicht mehr stabil starten.
- `board switched` maskiert Startstatus und ueberschreibt Running-nahe Statusmeldungen unmittelbar.
- Next executable wave is now Plan 7-HF9 (P0) before Plan 7-2.

## Execution Update 7-HF8
- P7-HF8-T1..P7-HF8-T6 completed.
- Running-list stop for `global-outside` now stays on stop-only command routing with explicit target metadata (`targetScope`/`targetType`/`boardId`) and no trigger/create fallback.
- Server/client global stop semantics for `global-inside` + `global-outside` are aligned on `stop-animation` lifecycle (ack/version/dedup/idempotent stale handling), including authoritative outside disable convergence.
- Running-list hover remains stable under periodic runtime refresh (interaction guard + non-transform hover behavior for running action buttons).
- HF8 evidence recorded in `debug/p7-hf8-t12-output.json`, `debug/p7-hf8-t13-output.json`, `debug/p7-hf8-t14-output.json`.

## Next Wave
- Next executable wave: Plan 7-2 (P1 hardening).
