# Phase 24 Wave 5 — INVENTORY

Tracks per-commit progress for Wave 5 module-boundary cleanup.

## Tags

- `phase-24-w5-start` (`6cfc682`) — set during pre-flight; rollback target.
  Commit message: `docs(24-4): INVENTORY end-of-W4 — 12 commits + W4 closure verification`.
- `phase-24-w5-end` (`<hash>`) — optional, set after W5.7-C1 if the user wants a wave-closure tag.

## Baseline (pre-flight, captured against `phase-24-w5-start`)

- **Tag:** `phase-24-w5-start` → `6cfc682c875c3dfd6f89be7d76ecbad166c92` (HEAD at start).
- **Captured:** 2026-04-26.
- **Tree size:** 101 .js files (84 in `src/app/runtime/`, 17 in `src/app/lib/`); 101 namespaces.
- **Header coverage:** 81/101 with substantive header (≥1 line); 20/101 missing per PLAN §5.1 canonical list (RESEARCH §3.2).
- **SCC count:** 1 non-trivial SCC of size 2 (`runtime-bootstrap.js` ↔ `runtime-panels-controller.js`).
- **`<script>` count in `index.html`:** 102 `<script src` lines.
- **`TT_BEAMER_UI_RUNTIME_PANELS` references:** 5 hits across 2 files (definers/consumers; zero external readers — RESEARCH §4.2 confirmed).

### Pre-flight verification commands (executed)

```bash
$ git rev-parse phase-24-w5-start
6cfc682625c875c3dfd6f89be7d76ecbad166c92
$ find src/app/runtime src/app/lib -name "*.js" | wc -l
101
$ find src/app/runtime -name "*.js" | wc -l
84
$ find src/app/lib -name "*.js" | wc -l
17
$ grep -rohE "window\.TT_BEAMER_[A-Z_]+" src/ | sort -u | wc -l
101
$ grep -rln "TT_BEAMER_UI_RUNTIME_PANELS" src/
src/app/runtime/core/runtime-bootstrap.js
src/app/lib/ui/runtime-panels-controller.js
```

### 20 missing-header files (canonical from PLAN §5.1)

Per PLAN §5.1 (RESEARCH §3.2), the following 20 files lack a substantive file-level header above their IIFE/top-level statement. Listed in W5.2 edit order:

| # | File | Lines | Group |
|--:|------|------:|-------|
| 1 | `src/app/lib/api/global-defaults-api.js` | 479 | lib/api |
| 2 | `src/app/lib/boot/app-composition.js` | 25 | lib/boot |
| 3 | `src/app/lib/boot/runtime-bootstrap.js` | 14 | lib/boot |
| 4 | `src/app/lib/domain/event-lifecycle.js` | 98 | lib/domain |
| 5 | `src/app/lib/domain/live-sync-domain.js` | 41 | lib/domain |
| 6 | `src/app/lib/domain/rooms.js` | 178 | lib/domain |
| 7 | `src/app/lib/input/interaction-guards.js` | 20 | lib/input |
| 8 | `src/app/lib/persistence/board-profiles.js` | 167 | lib/persistence |
| 9 | `src/app/lib/render/viewport-lifecycle.js` | 86 | lib/render |
| 10 | `src/app/lib/shared/config.js` | 239 | lib/shared |
| 11 | `src/app/lib/shared/logger.js` | 81 | lib/shared |
| 12 | `src/app/lib/shared/normalizers.js` | 246 | lib/shared |
| 13 | `src/app/lib/shared/runtime-env.js` | 29 | lib/shared |
| 14 | `src/app/lib/state/live-sync-state.js` | 96 | lib/state |
| 15 | `src/app/lib/state/runtime-state.js` | 188 | lib/state |
| 16 | `src/app/lib/ui/runtime-panels-controller.js` | 75 | lib/ui |
| 17 | `src/app/lib/ui/settings/rooms.js` | 33 | lib/ui/settings |
| 18 | `src/app/runtime/core/polygon-contract.js` | 427 | runtime/core |
| 19 | `src/app/runtime/runtime-orchestration.js` | 2965 | runtime root (no IIFE) |
| 20 | `src/app/runtime/runtime-utils.js` | 22 | runtime root |

#### Pre-flight grep deviation

PLAN §3 pre-flight grep (`head -10 "$f" | grep -E '^\s*(//|/\*)'`) returned **19** files, not 20.
Investigation: the missing entry is `src/app/lib/api/global-defaults-api.js`. Its line 1 is
`(() => {` (IIFE opener — no header), but line 10 contains an inside-function-body comment
(`// localStorage-backed apiBase override removed.`). The grep window of 10 lines
catches this body comment as a false positive header.

**Resolution:** PLAN §5.1's canonical 20-file list is authoritative (matches RESEARCH §3.2
Hdr=0 column verbatim). The grep is a coarse first-pass filter. All 20 files receive
the §5.2 verbatim headers in W5.2-C1. Recorded in Decisions section below.

### Pre-W5 namespace snapshot (101 keys)

Captured to `/tmp/w5/ttkeys-pre.txt` (full sorted list available via `grep -rohE
"window\.TT_BEAMER_[A-Z_]+" src/ | sort -u`). Includes the soon-to-be-removed
`window.TT_BEAMER_UI_RUNTIME_PANELS` (W5.3-C2 target).

### Public API lock-list — pre-flight snapshot

#### Wire-protocol message-type literals (verifier)

```bash
$ grep -rohE 'emitLiveMutation\("[a-z-]+"' src/app/runtime/ | sort -u
emitLiveMutation("clear-all"
emitLiveMutation("context-update"
emitLiveMutation("edit-room"
emitLiveMutation("outside-update"
emitLiveMutation("stop-animation"
emitLiveMutation("trigger-global"
emitLiveMutation("trigger-room"
```

**Pre-flight count: 7 literals.** PLAN §6.2 expected 9 (which would have included
`live-receive-ack` and `live-apply-ack` from inherited W4 lock-list); those two do
not appear via `emitLiveMutation(` in the runtime tree. **Decision:** the W5 hard
rule is byte-identical pre/post — captured to `/tmp/w5/wire-pre.txt` (7 lines);
post-W5 verification asserts the same 7 literals remain unchanged. PLAN's literal
"9" was inaccurate; the actual set is the W5-locked baseline. Recorded in Decisions.

#### localStorage / JSON-schema literals (verifier, 13 items)

```bash
$ grep -rohE "['\"]tt-beamer[a-zA-Z0-9._-]+['\"]" src/ | sort -u | wc -l
13
```

Captured to `/tmp/w5/ls-pre.txt`. Contents:
- `"tt-beamer.api-base.v1"`
- `"tt-beamer.board-profiles.v1"`
- `"tt-beamer.board-profiles.v3"`
- `"tt-beamer.global-defaults.v1"`
- `"tt-beamer.hitarea-calibration.v1"`
- `"tt-beamer.last-board-id.v1"`
- `"tt-beamer.projection-mapping.corners"`
- `"tt-beamer.projection-mapping-v2"`
- `"tt-beamer.room-geometry.v1"`
- `"tt-beamer.room.v2"`
- `"tt-beamer-server-unreachable-overlay"`
- `"tt-beamer.settings-subtab.v1"`
- `"tt-beamer.special-polygons.v1"`

### Pre-flight smoke

Manual smoke deferred to W5.2-C1 / W5.3-C1 / W5.3-C2 manual smoke gates and to W5.7
full ROADMAP regression. Pre-flight grep + `node --check` baseline confirmed no
parse errors at HEAD `6cfc682`; no pre-existing console oddities recorded.

## Decisions (confirmed pre-flight)

- **ctx-arrow-callback patterns OUT OF SCOPE.** 836 patterns documented as
  load-bearing per RESEARCH §2.5 + §6.5. Wave 5 does not refactor any.
- **6 W3 shim re-exports KEPT.** Audited as load-bearing per RESEARCH §4.3.
  W5.5 documents the audit in this INVENTORY.
- **Only `TT_BEAMER_UI_RUNTIME_PANELS` targeted for removal.** Zero external readers
  per RESEARCH §4.2; pre-flight re-grep confirmed (5 hits across 2 definer/consumer
  files only).
- **W5.3 split into C1 + C2** for revertability + bisect granularity. C1 = drop
  defensive write (resolves SCC); C2 = drop legacy alias (zero-reader removal).
- **`madge`-vs-Tarjan-SCC discrepancy** documented (codebase has no ES module
  imports; `madge` cannot run; equivalent is RESEARCH §1.5 Tarjan over namespace
  graph). The ROADMAP "or equivalent" clause is honoured.
- **Orchestration shell header style: CONCISE** (4 lines pointing to ctx-builder;
  not a 70-line "list of 69 namespaces").
- **Tooling commit DEFERRED to Wave 6** (the §1.5 Node script as
  `scripts/dev/extract-module-graph.cjs`).
- **PLAN §3 pre-flight grep deviation:** the §3 grep returned 19 files vs PLAN
  §5.1's canonical 20 because `lib/api/global-defaults-api.js` line 10 contains
  an inside-function-body comment that the grep treats as a header. The §5.1
  canonical list (RESEARCH §3.2 Hdr=0) is authoritative; all 20 files are
  edited in W5.2-C1.
- **PLAN §6.2 wire-protocol count "9" is inaccurate** — actual baseline is 7
  literals via `emitLiveMutation("`. The W5 hard rule (byte-identical pre/post)
  applies to the actual baseline (7), captured to `/tmp/w5/wire-pre.txt`.

## Per-commit progress

| Commit | Hash | Sub-wave | Type | Files | Lines (Δ) | Pre-grep | Edit | Post-grep | `node --check` | NS OK | `<script>` OK | Notes |
|--------|------|----------|------|------:|----------:|----------|------|-----------|----------------|-------|----------------|-------|
| W5.1-C1 | (this commit) | W5.1 | docs | 1 (INVENTORY) | n/a | n/a | yes | n/a | n/a | yes (101) | yes | baseline + per-file table + decisions |

## Cycle resolution

### Pre-W5 graph

- **Nodes:** 101 file-graph nodes (one per `.js` file in `src/app/runtime/` +
  `src/app/lib/`).
- **Edges:** ~134 directed edges (from `window.TT_BEAMER_*` reads — RESEARCH §1).
- **Non-trivial SCCs:** 1 of size 2 — `runtime-bootstrap.js` ↔
  `runtime-panels-controller.js`.

The SCC is an algorithmic artefact: panels-controller writes
`TT_BEAMER_RUNTIME_PANELS` + `TT_BEAMER_UI_RUNTIME_PANELS` at parse time;
bootstrap reads both and (defensively) re-writes both. Under correct `<script>`
load order (panels-controller at `index.html:835` before bootstrap at
`index.html:907`, both `defer`), the defensive write block in bootstrap is
unreachable. RESEARCH §2.1 + §2.2 detail.

### Post-W5.3 graph

(To be filled in by W5.4-C1 after W5.3-C1 + C2 land.)

### `madge`-equivalent gate

(To be filled in by W5.4-C1.)

## Header inventory

(20 files + their assigned headers from PLAN §5.2 — populated post-W5.2 to capture
the exact text landed.)

## Per-shim re-export audit

(8 namespaces audited — 6 W3 shims + 2 wire shims + the now-removed
`UI_RUNTIME_PANELS`. Populated by W5.5-C1.)

## `<script>` load-order verification

Baseline `<script>` count in `index.html`: **102** `<script src` lines.
Wave 5 does NOT edit `index.html`. Per-namespace ordering verification populated
by W5.6-C1.

## Public API lock-list verification

(Pre vs post W5 namespace-key diff, wire-protocol verification, localStorage
verification — populated incrementally by W5.3-C2 / W5.4-C1 / W5.7-C1.)

## Decision-log

(Deviations from PLAN as commits land. Format: per-deviation paragraph with
PLAN-section / commit-hash / rationale.)

Pre-W5.1 deviations recorded in Decisions section above:
1. PLAN §3 pre-flight grep returned 19 vs §5.1 canonical 20 (grep imprecision).
2. PLAN §6.2 wire-protocol count "9" is inaccurate — actual baseline is 7.

## End-of-W5 acceptance verification

(Filled in at end of wave with the gate checks from PLAN §8 passing/failing.
Includes the full ROADMAP regression checklist results.)

## Hand-off to Wave 6

(Brief paragraph confirming W5 has produced the inputs Wave 6 closure needs.
Populated by W5.7-C1.)

## Wave 5 commits

| Commit | Hash | Message |
|--------|------|---------|
| W5.1-C1 | (this) | docs(24-5): module-graph baseline + W5 INVENTORY initial |
| W5.2-C1 | `<hash>` | refactor(24-5): add header comments to 20 modules without one |
| W5.3-C1 | `<hash>` | refactor(24-5): drop runtime-bootstrap defensive panels-namespace write (resolves SCC) |
| W5.3-C2 | `<hash>` | refactor(24-5): drop legacy TT_BEAMER_UI_RUNTIME_PANELS alias (zero external readers) |
| W5.4-C1 | `<hash>` | docs(24-5): INVENTORY post-W5.3 — SCC eliminated, 0 non-trivial SCCs |
| W5.5-C1 | `<hash>` | docs(24-5): INVENTORY per-shim re-export audit (8 namespaces, 1 removed, 7 load-bearing) |
| W5.6-C1 | `<hash>` | docs(24-5): INVENTORY <script> load-order verification post-W5 |
| W5.7-C1 | `<hash>` | docs(24-5): INVENTORY end-of-W5 — 9 commits + W5 closure verification |
