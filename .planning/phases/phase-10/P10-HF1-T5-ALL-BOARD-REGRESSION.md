# P10-HF1-T5 All-Board Final-Render Regression Matrix

## Command
```bash
node debug/p10-hf1-all-board-final-render-regression.mjs
```

## Result
- Output artifact: `debug/p10-hf1-all-board-final-render-regression-output.json`
- Suite: `p10-hf1-all-board-final-render-regression`
- Result: **PASS**
- Boards covered: `nemesis-board-a`, `nemesis-board-b`, `nemesis-lockdown-a`
- Explicit mp4 outside-background board coverage: `nemesis-lockdown-a` (`outside-sandstorm` -> `sandstorm.mp4`)

## Assertions
1. No board can force outside clip path into compositor-blocking state.
2. MP4 outside board (`nemesis-lockdown-a`) is explicitly present in matrix.
3. Degenerate play-area polygon input fails open (no black-frame collapse).
4. Degenerate room polygon input fails open (co-render survivability).

## Artifact Snapshot
- `boardCount`: 3
- `mp4OutsideBoards`: [`nemesis-lockdown-a`]
- `checks`: all PASS
