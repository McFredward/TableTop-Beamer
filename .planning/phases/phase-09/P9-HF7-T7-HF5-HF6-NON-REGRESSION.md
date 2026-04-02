# P9-HF7-T7 HF5/HF6 Non-Regression

## Goal

Confirm HF7 keeps HF5 stream purity and HF6 transport/apply/ack behavior fully intact.

## Verification

- Script: `node debug/p9-hf7-t7-hf5-hf6-non-regression.mjs`
- Output: `debug/p9-hf7-t7-hf5-hf6-non-regression-output.json`

### HF5 checks

- Stream frame payload scan for forbidden diagnostics/overlay markers:
  - `SERVER STREAM ACTIVE`
  - `roomLabel`
  - `final-stream-meta`
  - non-visual `mode` payload fields in visual contract

### HF6 checks

- Start/stop commands require immediate applied acknowledgements.
- Version-correlated stream frame updates must arrive within deterministic latency bounds.

## Verdict

HF5 visual-only purity and HF6 transport/apply/ack parity remain PASS with HF7 fixes active.
