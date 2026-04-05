# P11-HF6-T3 Seen-Revision Full-Duration Exactly-Once Contract

## Goal
Implement client-local one-shot contract: once a non-loop global trigger revision is seen, local playback starts from seen moment and runs exactly once for full configured duration.

## Implementation
- Added seen one-shot registry keyed by `triggerKey#triggerRevision`.
- On first seen revision, runtime stores local start timestamps (`startedAtEpochMs` / `startedAt`) and duration.
- For same revision snapshots, runtime reuses stored local start to prevent replay/short-run drift.

## Determinism Contract
- Local full-duration start is anchored to first local observation, not snapshot age.
- Same revision remains idempotent via revision-keyed seen registry.
- Exactly-once behavior is preserved by revision identity and existing trigger revision monotonicity.

## Evidence Artifact
- Script: `debug/p11-hf6-t3-seen-revision-full-duration-exactly-once.mjs`
- Output: `debug/p11-hf6-t3-seen-revision-full-duration-exactly-once-output.json`

## Verdict
- **PASS:** seen-revision local one-shot full-duration exactly-once contract is enforced.
