# P11-HF6-T7 FAIL->PASS Proof (Initiator + Peer + `/output/final`)

## Goal
Prove deterministic polling-path closure for seen-once non-loop one-shots:
- once seen -> full local playback exactly once,
- no non-explicit polling cancellation,
- parity on initiator + peer + `/output/final`.

## Before (FAIL)
- Initiator remains visually near-full duration.
- Peer and `/output/final` can see trigger revision but terminate early under polling/hydration overwrite.

## After (PASS)
- Client runtime enforces revision-keyed seen one-shot retention and local start anchoring.
- Polling/hydration does not cancel active seen one-shots without explicit stop/clear authority.
- Server publishes `globalClearRevision` so explicit clear remains authoritative for polling-only paths.
- Initiator, peer, and `/output/final` all complete one full 4s run exactly once for a seen revision.

## Evidence Artifact
- Script: `debug/p11-hf6-t7-multiclient-polling-fail-pass-proof.mjs`
- Output: `debug/p11-hf6-t7-multiclient-polling-fail-pass-proof-output.json`

## Verdict
- **FAIL->PASS closed** for deterministic multi-client polling parity under seen-once full local playback contract.
