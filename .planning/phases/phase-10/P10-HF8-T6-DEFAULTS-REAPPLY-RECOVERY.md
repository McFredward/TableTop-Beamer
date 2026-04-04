# P10-HF8-T6 — `Load global defaults` board-specific reapply recovery

- Script: `node debug/p10-hf8-t6-defaults-reapply-recovery.mjs`
- Output: `debug/p10-hf8-t6-defaults-reapply-recovery-output.json`
- Result: **PASS**

`nemesis-lockdown-a` now reapplies canonical defaults (`bunker` + `play-area-1`) instead of staying on stale fallback-only geometry.
