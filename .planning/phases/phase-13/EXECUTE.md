# Execute Phase 13

## Priority
- Phase 12 closed PASS at Plan 12-1.
- Plan 13-1 (server-authoritative config) is the execute-ready priority wave and blocks 13-2 / 13-3.
- Plan 13-2 (gesture zoom) starts after 13-1 PASS.
- Plan 13-3 (touch polygon editing) starts after 13-2 PASS.

## Input Pack
- Plan: `PLAN.md`
- Stories: `BACKLOG.md`
- Work Items: `TASKS.md`
- Quality Gate: `ACCEPTANCE.md`
- Risk Guide: `RISKS.md`

## Priority Execution — Plan 13-1 (binding)
1. P0: P13-1-T1 — RED inventory harness.
2. P0: P13-1-T2 — server write + broadcast path verified / extended.
3. P0: P13-1-T3 — debounced client write helper.
4. P0: P13-1-T4 — replace every localStorage-write call site with the helper.
5. P0: P13-1-T5 — blocking startup hydration with error banner.
6. P0: P13-1-T6 — remove Save + Load-and-apply buttons.
7. P0: P13-1-T7 — Import-from-file button.
8. P0: P13-1-T8 — settings subtab → sessionStorage.
9. P0: P13-1-T9 — api base → URL param.
10. P0: P13-1-T10 — FAIL→PASS verification + artifact sync.

## Priority Execution — Plan 13-2 (after 13-1 PASS)
1. P0: P13-2-T1 — remove slider DOM + handler.
2. P0: P13-2-T2 — extend zoom range.
3. P0: P13-2-T3 — wheel handler.
4. P0: P13-2-T4 — pinch handler.
5. P0: P13-2-T5 — CSS transition + pan non-regression.
6. P0: P13-2-T6 — verification closure.

## Priority Execution — Plan 13-3 (after 13-2 PASS)
1. P0: P13-3-T1 — relax pointer button check.
2. P0: P13-3-T2 — coarse-pointer hit radius.
3. P0: P13-3-T3 — `touch-action` CSS.
4. P0: P13-3-T4 — pinch/vertex arbitration.
5. P0: P13-3-T5 — verification closure.

## Gate Rules
- Do not close Plan 13-1 without static evidence of zero `localStorage`/`indexedDB` references in `src/app/**` and `src/live/**`.
- Do not close Plan 13-1 without proof that the server write path is atomic and broadcasts to live-sync peers.
- Do not close Plan 13-1 without blocking-startup error banner evidence.
- Do not close Plan 13-1 without export/import round-trip evidence.
- Do not close Plan 13-1 without Phase 11 HF6 + Phase 12 non-regression static evidence.
- Do not close Plan 13-2 without slider-removed + wheel + pinch + pan non-regression static evidence.
- Do not close Plan 13-3 without touch-friendly static evidence AND an explicit note requesting user verification in a live browser.
- No plan closure without full planning tracker synchronization.

## Update Rules
- Update task status in `TASKS.md` after each completed item.
- Capture binding decisions in `.planning/STATE.md`.
- Keep `PLAN.md`, `BACKLOG.md`, `ACCEPTANCE.md`, `RISKS.md` synchronized when scope changes.

## Execution Record
- Phase 13 activated 2026-04-11 after Phase 12 closure.
- Initial direction: three improvements requested by the user — server-authoritative config (removes all browser storage), gesture-based zoom (wheel + pinch, replaces slider), touch-friendly polygon editing (reliable on mobile).
- User decisions (2026-04-11): server-unreachable = hard block with error + Retry; write cadence = debounced 200ms; zoom range = 25%-400%; subtab memory = sessionStorage.
