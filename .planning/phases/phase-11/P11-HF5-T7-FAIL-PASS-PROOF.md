# P11-HF5-T7 FAIL->PASS Proof (Initiator + Peer + `/output/final`)

## Goal
Prove strict one-shot full-duration parity for non-loop globals across all clients after HF5 fixes.

## Before (FAIL)
- Initiator-only visible one-shot is reproducible baseline.
- Peer and `/output/final` miss the same one-shot event in the failure model.

## After (PASS)
- Server builds authoritative one-shot payload (`id`, `triggerRevision`, `startedAtEpochMs`) for fanout.
- Local optimistic one-shot start masking is removed from global trigger flow.
- Initiator, peer, and `/output/final` all receive exactly one one-shot run with full 4s duration.

## Evidence Artifact
- Script: `debug/p11-hf5-t7-multiclient-fail-pass-proof.mjs`
- Output: `debug/p11-hf5-t7-multiclient-fail-pass-proof-output.json`

## Verdict
- **FAIL->PASS closed** for strict multi-client non-loop one-shot parity.
