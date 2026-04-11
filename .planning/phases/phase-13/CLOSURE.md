# Phase 13 — CLOSURE

Date: 2026-04-11
Status: **CLOSED PASS**

## Scope delivered

1. **Plan 13-1** — Server-authoritative config (browser persistence removed, 200ms debounced writes, server broadcast + refetch, blocking startup overlay + retry, Import-from-file button).
2. **Plan 13-2** — Gesture zoom (wheel + pinch, cursor/midpoint anchoring, range 25%-400%).
3. **Plan 13-3** — Touch polygon editing (pointer-agnostic acceptability, coarse-pointer hit radii, `touch-action: none`, pinch arbitration).

## Hotfix wave

Thirteen hotfixes addressed cumulative UX + correctness issues surfaced during iterative user testing:

| # | Subject | Commit |
|---|---|---|
| HF1 | Cursor-accurate zoom anchor | `dad3e8c` |
| HF2 | Touch UX — single-finger pan + pinch cancels drag | `19f5636` |
| HF3 | Opt-in save — Apply / Discard buttons + dirty flag | `0039aff` |
| HF4 | Cursor zoom + global Apply bar + touch gesture state machine | `745dca2` |
| HF5 | Hide Apply bar when clean + suppress mobile long-press + unlag pan/zoom | `4cdf2f9` |
| HF6 | Kill mobile pan/zoom lag via cached stage geometry + transition guard | `dca8cf4` |
| HF7 | Isolate + fix residual mobile pan/zoom lag (GPU hints, draw/poll pause) | `67fef9d` |
| HF8 | Polygon drag lag — HF7 pause pattern + rAF render coalescer | `a71ea57` |
| HF9 | Incremental SVG drag renderer + vertex grab offset | `6f66cda` |
| HF10 | HF9 stale-refs regression — render before begin | `44e1688` |
| HF11 | Polygon jump on vertex grab — restore transform in drag renderer | `3ad41e0` |
| HF12 | Freeze transform + clamp to board edge for vertex drag | `e56085a` |
| HF13 | Stable stretch anchor — remove drift at the structural source | `71f72cb` |

## Exit criteria (met)

- Zero `localStorage` / `indexedDB` function calls in `src/app/**` / `src/live/**` runtime code.
- Every config mutation roundtrips through the server within ~200ms + live-sync latency.
- Server-unreachable blocks app start with explicit Error UI + Retry button.
- Zoom slider removed; wheel + pinch produce identical 25%-400% zoom with correct anchoring.
- Mobile touch polygon drag works end-to-end (vertex + area), coarse hit radii applied.
- Room vertex edit on `stretch != 1` rooms holds non-dragged vertices completely still both during and after the drag (HF13 structural fix, not a workaround).
- Vertex drag beyond the board edge clamps to `[0, 1]` in display space.
- Phase 11-HF6 and Phase 12 contracts untouched (non-regression static guards pass in every HF harness).

## Non-regression evidence

- `debug/p13-1-acceptance-regression-output.json`
- `debug/p13-2-acceptance-regression-output.json`
- `debug/p13-3-acceptance-regression-output.json`
- `debug/p13-hf7..hf13-acceptance-regression-output.json` (seven GREEN harnesses)
- Every HF harness includes explicit HF7/HF8/HF9/HF10/HF11/Phase-11/Phase-12/Phase-13-1 non-regression gates.

## Known follow-ups (not phase blockers)

- In-browser real-device verification still recommended for multi-device config sync under flakey networks.
- HF13 save/reload discontinuity: after save, reloading a session picks the post-edit centroid as the new anchor. Theoretical drift ≤ `(1 − stretch) × Δcentroid_session` (~0.08% per edit in the worst observed case); not user-visible, but documented in `P13-HF13-T2-ROOT-CAUSE-ISOLATION.md`.
- `src/app/runtime/runtime-orchestration.js` has grown to ~14.5k lines through the HF wave and is the primary target for the next phase.
