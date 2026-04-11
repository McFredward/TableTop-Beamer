# Phase 12 Workspace

Planning and execution workspace for **Concurrent Room Animation Layering** — multiple simultaneous room animations of any type (coded, mp4, gif) must render fully visible on top of each other regardless of trigger order.

- `PLAN.md`: objective, binding decisions, scope, milestones, and DoD.
- `BACKLOG.md`: epics and story mapping.
- `TASKS.md`: execute-ready worklist for Plan 12-1.
- `ACCEPTANCE.md`: hard gates and regression matrix.
- `RISKS.md`: critical execution risks and mitigations.
- `EXECUTE.md`: binding run order and closure gates.

## Status
- Phase 12 is active.
- Plan 12-1 is execute-ready.
- Previous phase (Phase 11) closed PASS at 11-HF6.

## Problem Statement (binding)
When two or more room animations (e.g. `alarm`, `malfunction`) are triggered in the same room, only the last-triggered animation remains visible for certain trigger orders. Specifically:
- `malfunction` -> `alarm`: both visible (PASS-looking state).
- `alarm` -> `malfunction`: alarm disappears (FAIL — regression symptom).

This is order-dependent and type-independent in intent. The fix must make concurrent room animations always layer additively and never implicitly replace a running animation in the same room. It must work generically for coded, mp4, and gif animations.
