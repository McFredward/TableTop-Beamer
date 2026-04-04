# P11-HF6-T1 Polling/Hydration Premature-Cancel RED Repro

## Goal
Capture a deterministic RED baseline where a client has already seen a non-loop trigger revision, but polling/hydration reconciliation can still terminate local playback before full visible duration.

## RED Model
- A client observes trigger revision `r` for a non-loop global one-shot.
- Before local full duration completes, polling snapshot reconciliation applies a running list that no longer contains this one-shot.
- No explicit stop/clear revision has been observed for `r`.

## Deterministic Baseline Finding
- Runtime snapshot apply currently rehydrates from snapshot running entries and replaces local running state.
- No explicit seen-once retention guard exists for already-started non-loop one-shots.
- Therefore active one-shot playback can be canceled by polling/hydration without explicit stop/clear authority.

## Evidence Artifact
- Script: `debug/p11-hf6-t1-polling-premature-cancel-red.mjs`
- Output: `debug/p11-hf6-t1-polling-premature-cancel-red-output.json`

## Verdict
- **RED FAIL captured**: premature cancellation path exists and must be closed in HF6.
