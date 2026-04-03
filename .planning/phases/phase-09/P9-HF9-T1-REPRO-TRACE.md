# P9-HF9-T1 Deterministic Repro Trace

## Goal

Reproduce the HF8 follow-up mismatch where stream/compositor are healthy but the strict gate expression can still evaluate to `compositorAlwaysOn=false`.

## Verification Run

- Script: `node debug/p9-hf9-t1-compositor-gate-repro.mjs`
- Output: `debug/p9-hf9-t1-compositor-gate-repro-output.json`
- Test base URL: `http://127.0.0.1:4211`

## Repro Mechanics

The old strict gate was:

`producer.running === true && frameId(after) > frameId(before)`

This expression is sampled in two windows:

1. **Short window (120ms)** near the producer tick boundary.
2. **Normal window (900ms)** for baseline comparison.

## Result

- PASS (`pass: true`)
- Short window reproduced mismatch:
  - `producer.running: true`
  - `health.healthy: true`
  - `frameId` unchanged (`5 -> 5`)
  - strict gate result: `false`
- Normal window confirms compositor continuity:
  - `frameId` progressed (`5 -> 9`)
  - strict gate result: `true`

## Conclusion

The failure path is deterministic and rooted in a brittle sampling gate, not in a stopped compositor. The lifecycle remains active while the strict short-window frame-delta check can still produce a false negative.
