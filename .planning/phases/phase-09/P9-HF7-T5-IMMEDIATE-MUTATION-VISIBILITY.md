# P9-HF7-T5 Immediate Mutation Visibility

## Goal

Guarantee accepted mutations are immediately visible in `/output/final` stream output without refresh.

## Verification

- Script: `node debug/p9-hf7-t5-immediate-mutation-visibility.mjs`
- Output: `debug/p9-hf7-t5-immediate-mutation-visibility-output.json`
- Covered mutations:
  - `start` / `stop` (global outside)
  - `align-on` / `align-off`
  - board switch (`nemesis-board-a` -> `nemesis-board-b`)
- PASS thresholds:
  - max ack latency `<= 700ms`
  - max stream propagation latency `<= 1500ms`

## Verdict

Mutation-to-output propagation is immediate and deterministic for control-critical and context mutations.
