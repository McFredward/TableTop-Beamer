# P9-HF9-T2 Root Cause Isolation

## Problem Statement

HF8 follow-up reported `compositorAlwaysOn=false` although stream frames were still delivered and runtime behavior remained functional.

## Evidence Inputs

- `debug/p9-hf8-t7-parity-matrix-output.json` (historical fail sample)
- `debug/p9-hf9-t1-compositor-gate-repro-output.json` (deterministic mismatch repro)

## Isolated Root Cause

The failing gate was derived from a **narrow frame-delta sampling expression**:

`producer.running === true && frameId(after) > frameId(before)`

This expression conflates two different concerns:

1. **Lifecycle state** (producer is running and healthy)
2. **Short-window frame progression** (frame increment in one fixed interval)

With a 250ms producer cadence, short windows can legitimately show no frame increment even while the producer is continuously running and healthy. This creates a deterministic false-negative path.

## Why This Is a Normal Runtime Sequence

- Producer remains `running: true`
- Health remains `healthy: true`
- Watchdog and timer remain active
- The no-delta sample simply lands inside one cadence bucket

Therefore, the gate failure can occur without any lifecycle outage.

## Closure Direction

Introduce an explicit lifecycle/reporting signal for always-on state that is cadence-aware and not dependent on one short frame-delta sample, then update parity verification to consume that signal while preserving all stream-only and non-regression guarantees.
