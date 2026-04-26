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
| W5.1-C1 | `da3a1ca` | W5.1 | docs | 3 (INVENTORY + PLAN + RESEARCH) | n/a | n/a | yes | n/a | n/a | yes (101) | yes | baseline + per-file table + decisions |
| W5.2-C1 | `c59f849` | W5.2 | code | 20 | +87 / -0 | yes (19 grep + 1 §5.1 audit) | yes | yes (101/101 files have headers) | yes | yes (101) | yes | header batch; comment-only diff |
| W5.3-C1 | `23e667f` | W5.3 | code | 1 (runtime-bootstrap) | +0 / -6 | yes (defensive block at lines 26-31) | yes | yes (block gone) | yes | yes (101) | yes | SCC resolved; bootstrap is now pure consumer |
| W5.3-C2 | `7c0778d` | W5.3 | code | 2 (panels-controller + runtime-bootstrap) | +5 / -7 (net -2 + ~2 comment update) | yes (3 alias hits) | yes | yes (0 alias hits) | yes | yes (100) | yes | alias dropped; namespace count 101→100 (intentional) |
| W5.4-C1 | `807420f` | W5.4 | docs | 1 (INVENTORY) | n/a | n/a | yes | n/a | n/a | yes (100) | yes | post-SCC graph + cycle-resolution evidence |
| W5.5-C1 | `2676f1f` | W5.5 | docs | 1 (INVENTORY) | n/a | n/a | yes | n/a | n/a | yes (100) | yes | 8 shim audit; 7 KEEP, 1 removed (UI_RUNTIME_PANELS) |
| W5.6-C1 | (this commit) | W5.6 | docs | 1 (INVENTORY) | n/a | n/a | yes | n/a | n/a | yes (100) | yes | <script> order verified; document-order defer guarantee |

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

After W5.3-C1 + C2 landed:

- **Nodes:** 101 file-graph nodes (file count unchanged — Wave 5 does not
  create or remove any `.js` file).
- **Namespace count:** 100 (was 101; `TT_BEAMER_UI_RUNTIME_PANELS`
  removed in W5.3-C2 — documented intentional reduction).
- **Edges:** the bootstrap ↔ panels-controller cycle is gone. Concretely:
  - `runtime-bootstrap.js` writes ONLY `window.TT_BEAMER_RUNTIME_BOOTSTRAP`
    (its own namespace at file line 303). It no longer writes
    `TT_BEAMER_RUNTIME_PANELS` or `TT_BEAMER_UI_RUNTIME_PANELS` (W5.3-C1
    deleted those defensive writes).
  - `runtime-bootstrap.js` reads `window.TT_BEAMER_RUNTIME_PANELS` (line 17,
    `?? null` fallback). One-way edge to panels-controller.
  - `runtime-panels-controller.js` writes ONLY `window.TT_BEAMER_RUNTIME_PANELS`
    (line 79). It does not read any other `TT_BEAMER_*` namespace at parse time.
  - `runtime-panels-controller.js` no longer writes
    `window.TT_BEAMER_UI_RUNTIME_PANELS` (W5.3-C2 deleted that line).
- **Non-trivial SCCs:** **0** (101 trivial SCCs).

The single non-trivial SCC of size 2 (bootstrap ↔ panels-controller) collapses
into two trivial SCCs because the back-edge (bootstrap → panels-controller via
namespace write) was the only edge in that direction; deleting it leaves the
forward edge (bootstrap reads panels-controller's namespace) intact and the
graph acyclic on this pair.

Per-file evidence:

```bash
$ grep -n "window\.TT_BEAMER_[A-Z_]\+\s*=" src/app/runtime/core/runtime-bootstrap.js
303:  window.TT_BEAMER_RUNTIME_BOOTSTRAP = {

$ grep -n "window\.TT_BEAMER_[A-Z_]" src/app/lib/ui/runtime-panels-controller.js
79:  window.TT_BEAMER_RUNTIME_PANELS = runtimePanelsApi;
```

### `madge`-equivalent gate

ROADMAP §"Wave 5 → Acceptance" → "`madge` / equivalent shows zero cycles
in `src/app/runtime/`": gate satisfied.

`madge` itself parses ES module `import` syntax. This codebase uses
IIFE-with-`window`-globals and has zero `import` statements in its runtime
tree; `madge` cannot run on it. The "or equivalent" clause is honoured
by reasoning over the file → file edge graph derived from `window.TT_BEAMER_*`
reads/writes (per RESEARCH §1.5 methodology):

- Pre-W5: 1 non-trivial SCC of size 2 (bootstrap ↔ panels-controller).
- Post-W5.3-C1+C2: 0 non-trivial SCCs (101 trivial SCCs over 101 files).

The discrepancy between ROADMAP's literal `madge` mention and the
graph-grep methodology actually used is documented here so future readers
don't expect literal `madge` output.

## Header inventory

Post-W5.2-C1: all 20 §5.1 files received their §5.2 verbatim header. Each header
is `//` line-comment style with a trailing blank line before the existing first
source-text line. No existing comment was removed; no source-text line moved.
IIFE-opener counts unchanged (1 per IIFE-wrapped file; 0 for `runtime-orchestration.js`).

Post-W5.2-C1 verification:

```bash
$ for f in $(find src/app/runtime src/app/lib -name "*.js" | sort); do
    head -10 "$f" | grep -E '^\s*(//|/\*)' >/dev/null || echo "MISSING: $f"
  done
(empty - all 101/101 files have headers)
$ git diff --stat HEAD~..HEAD -- src/ | tail -1
20 files changed, 87 insertions(+)
```

Header text per file (verbatim, as landed):

| # | File | Header lines | Style notes |
|--:|------|------:|-------------|
| 1 | `lib/api/global-defaults-api.js` | 4 | "Global-defaults HTTP API facade" |
| 2 | `lib/boot/app-composition.js` | 3 | "Bootstrap composition" |
| 3 | `lib/boot/runtime-bootstrap.js` | 2 | "Runtime-bootstrap factory" |
| 4 | `lib/domain/event-lifecycle.js` | 3 | "Event-lifecycle domain" |
| 5 | `lib/domain/live-sync-domain.js` | 2 | "Live-sync domain" |
| 6 | `lib/domain/rooms.js` | 3 | "Rooms domain" |
| 7 | `lib/input/interaction-guards.js` | 3 | "Input guards" |
| 8 | `lib/persistence/board-profiles.js` | 3 | "Board-profile persistence" |
| 9 | `lib/render/viewport-lifecycle.js` | 3 | "Viewport lifecycle" |
| 10 | `lib/shared/config.js` | 4 | "Shared config constants" |
| 11 | `lib/shared/logger.js` | 3 | "Logger factory" |
| 12 | `lib/shared/normalizers.js` | 4 | "Shared normalizers" |
| 13 | `lib/shared/runtime-env.js` | 3 | "Runtime-env constants" |
| 14 | `lib/state/live-sync-state.js` | 3 | "Live-sync state factory" |
| 15 | `lib/state/runtime-state.js` | 3 | "Runtime-state factory" |
| 16 | `lib/ui/runtime-panels-controller.js` | 5 | "Runtime-panels controller" — does NOT mention legacy alias (W5.3-C2 will remove the alias) |
| 17 | `lib/ui/settings/rooms.js` | 3 | "Settings/rooms UI helpers" |
| 18 | `runtime/core/polygon-contract.js` | 4 | "Polygon clip contract" |
| 19 | `runtime/runtime-orchestration.js` | 5 | "Runtime orchestration shell" — concise per pre-flight decision; inserted at line 1 (no IIFE wrapper) |
| 20 | `runtime/runtime-utils.js` | 4 | "Runtime utilities" |

## Per-shim re-export audit

Per RESEARCH §4.3, the post-W3 tree contains 8 shim-style namespaces that
re-export sub-namespaces. The W5.5 audit confirms by exhaustive grep that
each shim's parent namespace has at least one external reader (orchestration
in every case, plus a sibling consumer in some), and each sub-namespace
has 0–1 external readers (parent shim, or a sibling sub-namespace in the
case of `LIFECYCLE_STATE`).

Methodology per shim:
```bash
# External readers of the shim (excluding the shim file itself):
grep -rln "<SHIM_NAMESPACE>" src/ | grep -v "<shim file>"

# External readers of each sub-namespace (excluding the sub-namespace
# definer file and the shim file):
grep -rln "<SUB_NAMESPACE>" src/ | grep -v "<sub-namespace file>" | grep -v "<shim file>"
```

### Shim 1: `runtime/viewport/runtime-projection-mapping.js` (`TT_BEAMER_RUNTIME_PROJECTION_MAPPING`, 15 keys)

External readers of the shim namespace (2 files):
- `src/app/runtime/runtime-orchestration.js` — destructures ~15 keys.
- `src/app/runtime/state/runtime-board-profiles.js` — reads `getCornersForPersistence`.

Sub-namespaces (5 sub-modules: grid-state, gl-renderer, 2d-fallback,
handle-ui, profile-persistence): each is read ONLY by its own definer
file and by `runtime-projection-mapping.js` (the shim). 0 external readers
per sub-namespace.

**Load-bearing:** removing the shim breaks orchestration's destructure
+ board-profiles' single-key read. KEEP.

### Shim 2: `runtime/ui/animation-editor-view.js` (`TT_BEAMER_ANIMATION_EDITOR_VIEW`, 7 keys)

External readers of the shim namespace (2 files):
- `src/app/runtime/runtime-orchestration.js` — calls `init` + `isOpen`.
- `src/app/runtime/animation/runtime-runtime-controls.js` — reads `open` / `isOpen`.

Sub-namespaces (4 sub-modules: shell, library-list, edit-pane, live-preview):
each is read by its own definer file and by `animation-editor-view.js`
(the shim). One internal sibling read: `animation-editor-edit-pane-asset-picker.js`
reads `TT_BEAMER_RUNTIME_ANIMATION_EDITOR_EDIT_PANE` — sub-cluster
internal coupling, not an external surface.

**Load-bearing:** removing the shim breaks orchestration's `init` call +
runtime-controls' open-state read. KEEP.

### Shim 3: `runtime/animation/runtime-animation-lifecycle.js` (`TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE`, 16 keys)

External readers of the shim namespace (1 file):
- `src/app/runtime/runtime-orchestration.js` — destructures `closeLiveEditor` +
  several others.

Sub-namespaces (5 sub-modules): each is read by its own definer file and
by the shim. The `LIFECYCLE_STATE` sub-namespace is also read by
`runtime-lifecycle-live-editor.js` and `runtime-lifecycle-running-list.js`
— intentional sibling-cluster reads documented in shim header per
RESEARCH §4.4.

**Load-bearing:** removing the shim breaks orchestration's destructure.
KEEP. Sub-namespace `LIFECYCLE_STATE` cannot be removed either — it's a
shared state object across the lifecycle cluster.

### Shim 4: `runtime/panels/runtime-fx-panels.js` (`TT_BEAMER_RUNTIME_FX_PANELS`, 28 keys)

External readers of the shim namespace (1 file):
- `src/app/runtime/runtime-orchestration.js` — destructures ~10 keys.

Sub-namespaces (2 sub-modules: room with 6 keys, inside-outside with 21 keys):
each is read by its own definer file and by `runtime-fx-panels.js`
(the shim). 0 external readers beyond the shim pattern.

**Load-bearing:** removing the shim breaks orchestration's destructure.
KEEP.

### Shim 5: `runtime/polygon-editor/runtime-polygon-editor.js` (`TT_BEAMER_RUNTIME_POLYGON_EDITOR`, 24 keys)

External readers of the shim namespace (1 file):
- `src/app/runtime/runtime-orchestration.js` — destructures 22 keys.

Sub-namespace (`POLYGON_EDITOR_HANDLES`, 1 sub-module): read by its own
definer file and by `runtime-polygon-editor.js` (the shim). 0 external
readers beyond the shim pattern.

**Load-bearing:** removing the shim breaks orchestration's destructure.
KEEP.

### Shim 6: `runtime/render/runtime-draw-loop.js` (`TT_BEAMER_RUNTIME_DRAW_LOOP`)

External readers of the shim namespace (1 file):
- `src/app/runtime/runtime-orchestration.js` — destructures ~5 keys.

Sub-namespace (`DRAW_LOOP_CLUSTER_PADS`, 1 sub-module): read by its own
definer file and by `runtime-draw-loop.js` (the shim). 0 external
readers beyond the shim pattern.

**Load-bearing:** removing the shim breaks orchestration's destructure.
KEEP.

### Shim 7: `runtime/wire/runtime-wire-room-audio-binders.js` (`TT_BEAMER_RUNTIME_WIRE_ROOM_AUDIO_BINDERS`)

External readers of the shim namespace (1 file):
- `src/app/runtime/runtime-orchestration.js`.

Sub-namespace (`WIRE_ROOM_AUDIO_BINDERS_BUNDLE`, 1 sub-module): read by
its own definer file and by `runtime-wire-room-audio-binders.js` (the
shim). 0 external readers beyond the shim pattern.

**Load-bearing:** removing the shim breaks orchestration. KEEP.

### Shim 8: `runtime/wire/runtime-wire-fx-panel-binders.js` (`TT_BEAMER_RUNTIME_WIRE_FX_PANEL_BINDERS`)

External readers of the shim namespace (1 file):
- `src/app/runtime/runtime-orchestration.js`.

Sub-namespace (`WIRE_FX_PANEL_BINDERS_OUTSIDE`, 1 sub-module): read by
its own definer file and by `runtime-wire-fx-panel-binders.js` (the
shim). 0 external readers beyond the shim pattern.

**Load-bearing:** removing the shim breaks orchestration. KEEP.

### Removed shim: `TT_BEAMER_UI_RUNTIME_PANELS` (W5.3-C2)

Pre-W5: read defensively in `runtime-bootstrap.js` (?? fallback chain +
`hasLegacy` log field) and written in `runtime-panels-controller.js`.
Both definer/consumer; **zero external readers** per RESEARCH §4.2 +
pre-flight grep + post-W5.3-C1 verification (the only fallback consumer
was bootstrap itself, and bootstrap's read-via-fallback is a no-op once
the canonical `TT_BEAMER_RUNTIME_PANELS` is guaranteed by load order).

Removed in W5.3-C2 (commit `7c0778d`): namespace count 101 → 100.

### Conclusion

Negative result confirmed. Of the 9 namespaces audited (8 shims + the
now-removed `TT_BEAMER_UI_RUNTIME_PANELS`), exactly 1 had zero external
readers and was removable (W5.3-C2). The other 8 have genuine external
consumers — at minimum, `runtime-orchestration.js` destructures from each
shim's parent namespace, and several shims are also read by sibling-cluster
modules. ROADMAP §"Wave 5 → Remove transitive re-exports nobody depends on"
is satisfied: the only such transitive re-export was `UI_RUNTIME_PANELS`,
and it is gone.

## `<script>` load-order verification

Baseline `<script>` count in `index.html`: **102** `<script src` lines.
Wave 5 does NOT edit `index.html`. Verified across the full wave:

```bash
$ git diff phase-24-w5-start..HEAD -- index.html
(empty)
```

### Document-order load semantics

All `<script src="/src/app/...">` tags use the `defer` attribute, so the
browser executes them in document order after the HTML parse completes.
Document order = HTML line order, which is what RESEARCH §2.2 + PLAN §10
risk-row 4 rely on for the SCC fix.

### Critical orderings (post-W5)

#### SCC fix dependency (W5.3-C1)

W5.3-C1's defensive-write deletion depends on
`runtime-panels-controller.js` parsing before `runtime-bootstrap.js`
(the runtime/core variant). Verified at HEAD post-W5:

```bash
$ grep -nE 'runtime-panels-controller|runtime/core/runtime-bootstrap' index.html
835:  <script src="/src/app/lib/ui/runtime-panels-controller.js" defer></script>
907:  <script src="/src/app/runtime/core/runtime-bootstrap.js" defer></script>
```

panels-controller at line 835 → bootstrap at line 907. With both `defer`,
panels-controller's IIFE writes `window.TT_BEAMER_RUNTIME_PANELS` long
before bootstrap's `syncRuntimePanelsFromState` is called from
orchestration's `init`. The SCC fix is stable.

#### Runtime-utils first-load contract

`runtime-utils.js` (defines `TT_BEAMER_RUNTIME_UTILS` — clamp, clamp01,
bboxOfPolygon) loads at the very top of the runtime block:

```bash
$ grep -nE 'runtime-utils' index.html
805:  <script src="/src/app/runtime/runtime-utils.js" defer></script>
```

Every runtime consumer (polygon-contract, viewport, audio, gif, editor
modules — see §1.4 RESEARCH external-refs column) reads
`TT_BEAMER_RUNTIME_UTILS`; the line-805 first-position load guarantees
parse-time availability across the rest of the runtime block.

#### Two `runtime-bootstrap.js` files — intentional naming

There are two files named `runtime-bootstrap.js`:

- `lib/boot/runtime-bootstrap.js` — line 830 in `index.html`. Defines
  `TT_BEAMER_BOOT` (the small BOOT factory whose `run` method invokes
  the app initializer). Loads before the lib block proper.
- `runtime/core/runtime-bootstrap.js` — line 907. Defines
  `TT_BEAMER_RUNTIME_BOOTSTRAP` (the large application bootstrap with
  syncRuntimePanelsFromState + initializeApplication). Loads after every
  runtime module it consumes.

Both load before `runtime-orchestration.js` (line 910) which depends on
both `TT_BEAMER_BOOT` and `TT_BEAMER_RUNTIME_BOOTSTRAP`.

#### Final orchestration load

`runtime-orchestration.js` is the last runtime-namespace consumer (line
910), followed only by `app.js` (line 911) which kicks off
`TT_BEAMER_BOOT.run` against the assembled orchestration ctx. This means
every namespace orchestration destructures has its definer's `<script>`
tag at a smaller line number — the document-order guarantee that
RESEARCH §1.5's verify-load-order harness would assert.

### Conclusion

Load order verified. All 100 namespaces have their definer's `<script>`
tag preceding every external reader's `<script>` tag (or co-loaded under
the `defer`-script document-order guarantee). The SCC resolution from
W5.3 is stable as long as `index.html:835` (panels-controller) precedes
`index.html:907` (bootstrap). Wave 5 has not edited `index.html`; the
guarantee is preserved.

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
