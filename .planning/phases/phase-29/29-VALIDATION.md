---
phase: 29
slug: persistence-audit-legacy-cleanup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-04
---

# Phase 29 — Validation Strategy

> Per-phase validation contract. Builds on Phase 28 W0 test infrastructure
> (`node --test`, builtin Node 24).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node --test` (Node 24 builtin) — already established |
| **Config file** | none |
| **Quick run command** | `node --test test/` |
| **Full suite command** | `node --test "test/**/*.test.mjs"` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- After every task commit: `node --test "test/**/*.test.mjs"`
- After every wave: full suite + manual smoke from `29-VERIFICATION.md`
- Before `/gsd-verify-work`: full suite green + bundle-roundtrip smoke
- Max feedback latency: ~5 seconds

---

## Per-Task Verification Map

| Task ID | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|-------------|-----------|-------------------|--------|
| 29-W0-01 | 0 | scaffolds | unit | `node --test test/phase-29-dead-grep.test.mjs` | ⬜ pending |
| 29-W0-02 | 0 | scaffolds | unit | `node --test test/phase-29-purge.test.mjs` | ⬜ pending |
| 29-W0-03 | 0 | scaffolds | unit | `node --test test/phase-29-sound-migration.test.mjs` | ⬜ pending |
| 29-W0-04 | 0 | scaffolds | unit | `node --test test/bundle-schema.test.mjs` | ⬜ pending |
| 29-01-T1 | 1 | audit doc | manual | review `29-AUDIT.md` table completeness | ⬜ pending |
| 29-02 | 2 | DEAD-field source cleanup | unit | dead-grep test asserts 0 hits per dropped field | ⬜ pending |
| 29-03 | 2 | animationSoundMap migration logic | unit | sound-migration test verifies copy + drop semantics | ⬜ pending |
| 29-04 | 3 | boot-migration purge | unit | purge test asserts idempotent disk strip | ⬜ pending |
| 29-05 | 4 | bundle schema v3→v4 | unit | bundle-schema test asserts v3 import rejected, v4 roundtrip OK | ⬜ pending |
| 29-cross | all | Phase 27/28 acceptance non-regressed | unit | existing 25 tests stay green | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `test/phase-29-dead-grep.test.mjs` — asserts every DEAD field has 0 hits in `src/` post-cleanup
- [ ] `test/phase-29-purge.test.mjs` — asserts boot migration is idempotent + atomic on disk
- [ ] `test/phase-29-sound-migration.test.mjs` — covers D-03 algorithm: copy, skip-on-conflict, drop-orphans
- [ ] `test/bundle-schema.test.mjs` — covers D-04: v3 → 400, v4 → 200 + roundtrip preserved
- [ ] Extend `test/board-profile-fields.test.mjs` — assert dropped fields are no longer in BOARD_PROFILE_FIELDS

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| Bundle export → re-import roundtrip with v4 schema | Multi-step browser flow | Export Nemesis B → re-import as "Nemesis Test 29" → verify all fields land correctly |
| /output/ playback non-regressed after disk migration | Browser + visual | Start server post-cleanup → open /output/ → verify outside-fx, room animations, default animations all play |
| Animation Editor still resolves sound paths post sound-map drop | UI binding | Open animation editor → trigger animation with sound → verify sound plays |
| Phase 28 B1/B2/B5 still functional | Multi-window | Repeat key Phase 28 manual smoke (per-board profile auto-load, board-switch save-gate, asset cache invalidation) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity OK
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < ~5s
- [ ] `nyquist_compliant: true` after Wave 0 completes

**Approval:** pending
