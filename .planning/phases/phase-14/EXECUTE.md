# EXECUTE — Phase 14

## Execution order

1. **Plan 14-1** (inventory + dead-code purge) lands first. This reduces the surface area the module split has to move.
2. **Plan 14-2** (runtime module split) follows. Each extraction is its own commit.

## Per-commit contract

Every commit in this phase must:
1. Leave the tree buildable (`node --check` on every changed `.mjs`/`.js`).
2. Run the full harness suite and paste the passing lines into the commit message OR into the accompanying task-closure note.
3. Touch only one extraction (or one dead-code cluster). Mixing extractions is forbidden.

## Harness cheat sheet

```bash
node debug/p11-hf6-acceptance-regression.mjs
node debug/p12-1-acceptance-regression.mjs
node debug/p13-1-acceptance-regression.mjs
node debug/p13-2-acceptance-regression.mjs
node debug/p13-3-acceptance-regression.mjs
node debug/p13-hf7-acceptance-regression.mjs
node debug/p13-hf8-acceptance-regression.mjs
node debug/p13-hf9-acceptance-regression.mjs
node debug/p13-hf10-acceptance-regression.mjs
node debug/p13-hf11-acceptance-regression.mjs
node debug/p13-hf13-acceptance-regression.mjs
```

HF12 is superseded by HF13 (see `ACCEPTANCE.md`).

## Rollback protocol

Any commit that fails a harness after landing is reverted in the next commit. No "fix-forward" during the refactor unless the failing gate is itself a location-pinned grep that needs to be widened.

## Out-of-scope

- No UX changes.
- No Phase 11/12/13 feature additions.
- No HF14. If a bug is discovered during the refactor, it is filed as a known issue in `RISKS.md` and addressed in a dedicated hotfix commit outside the refactor sequence (to keep the extraction commits pure).
