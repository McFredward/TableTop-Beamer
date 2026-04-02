# P9-HF3-T6 Control-View Responsiveness Guard

- Date: 2026-04-02T20:32:25Z
- Scope: Keep control views responsive while final-output-first policy is active.

## Runtime Changes

- Added control-side frame-yield guard for non-critical animation rendering when frame budget is reached.
- Introduced `controlFrameBudgetMs` and `controlFrameYieldCount` in runtime performance state.
- Integrated pressure-level policy to tighten control frame budget under high contention.

## Harness

- Script: `debug/p9-hf3-control-responsiveness.mjs`
- Command: `node debug/p9-hf3-control-responsiveness.mjs`

## Result

`PASS`

- `p95 input->visible latency`: `83.8ms` (threshold `<=120ms`)
- `max latency`: `98.2ms` (threshold `<=250ms`)
- `freeze windows >250ms`: `0`

## Conclusion

Control interactions retain a strict responsiveness floor while render pressure is shifted away from final-output continuity-critical work.
