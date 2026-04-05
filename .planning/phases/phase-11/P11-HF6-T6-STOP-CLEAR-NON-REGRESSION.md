# P11-HF6-T6 Stop/Clear Immediate-Authority Non-Regression

## Goal
Prove explicit stop and clear remain immediate and authoritative with HF6 retention logic enabled.

## Matrix
- global stop revision increments remain server-authoritative.
- retained seen one-shot runs are canceled when stop revision supersedes trigger revision.
- clear-all now advances server `globalClearRevision` for explicit cancellation authority.
- client observes clear revision and immediately clears retained one-shot runs.

## Evidence Artifact
- Script: `debug/p11-hf6-t6-stop-clear-non-regression.mjs`
- Output: `debug/p11-hf6-t6-stop-clear-non-regression-output.json`

## Verdict
- **PASS:** explicit stop/clear authority remains immediate and non-regressed.
