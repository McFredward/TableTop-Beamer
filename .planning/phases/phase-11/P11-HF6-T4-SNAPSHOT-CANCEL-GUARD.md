# P11-HF6-T4 Snapshot Cancellation Guard (Explicit Stop/Clear Only)

## Goal
Ensure polling/hydration snapshot reconciliation cannot cancel active seen one-shot runs unless explicit stop/clear authority is observed.

## Implementation
- Client now observes `globalClearRevision` and clears retained one-shots only on explicit clear revision advance.
- Seen one-shot retention path already enforces per-trigger explicit stop revision precedence (`stopRevision >= triggerRevision`).
- Server now increments and publishes `runtime.globalClearRevision` on `clear-all` to provide explicit cancellation authority to polling-only clients.

## Authority Semantics
- **No explicit stop/clear revision:** retain active seen one-shot until local full-duration completion.
- **Explicit stop revision:** cancel immediately for matching trigger revision.
- **Explicit clear revision:** cancel immediately for all retained one-shots.

## Evidence Artifact
- Script: `debug/p11-hf6-t4-no-premature-snapshot-cancel.mjs`
- Output: `debug/p11-hf6-t4-no-premature-snapshot-cancel-output.json`

## Verdict
- **PASS:** snapshot cancellation is guarded and explicit stop/clear authority remains authoritative.
