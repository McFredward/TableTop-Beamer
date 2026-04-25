# Phase 24 — Code-quality refactor

## Goal

Bring the codebase up to a clean-code standard **without changing
any user-facing behaviour**. Every feature documented in the
README and tested manually before this phase must work identically
after every wave of this phase.

This is a maintenance phase. No new features, no UI changes, no
new dependencies. The deliverable is a leaner, more legible
codebase that future feature work can build on confidently.

## Why now

Across phases 1–23 the codebase grew organically — each feature
landed cleanly enough on its own, but the cumulative shape carries
the costs of fast iteration:

- **Oversized modules.** `runtime-orchestration.js` (3258 lines),
  `runtime-projection-mapping.js` (1952), `animation-editor-view.js`
  (1729), `runtime-animation-lifecycle.js` (1421). These are
  navigation hazards: a reader has to scroll past unrelated
  responsibilities to find the one they want.
- **Phase-marker comments everywhere.** `// Phase 22 W5 v3: …`
  was useful while the change was hot but is now archaeology that
  competes with the comments that explain WHY the code does what
  it does. Same for "v2", "v3", "HF7" markers.
- **Debug-only flags shipping in production.**
  `window.__TT_CLUSTER_DEBUG__`, `window.__TT_GL_DEBUG__`,
  `console.info("[cluster-pad] ...")` etc. are in 21 places.
- **Dead code.** Functions / branches / params that no caller
  references after a feature was removed or refactored away.
- **Inconsistent patterns.** `syncFooFromBar` vs `applyFoo` vs
  `renderFoo` for similar operations; some modules reach into
  `ctx.x` while others receive `x` as parameter.

Cleaning these up now (before the next big feature wave) keeps
future agents — human or AI — productive.

## Clean-code principles in scope

- **Comments document WHY, not WHAT.** Identifier names carry the
  "what". Comments explain hidden constraints, surprising
  invariants, workarounds, and reasons for non-obvious choices.
- **Function and module size** — favour under 200 lines per
  function, under 500 per module, where it doesn't fight the
  logical grouping.
- **Single responsibility per module.** A file's name should
  predict what it does; opening it should match that prediction.
- **Dead code goes.** No `// removed in Phase X` placeholders, no
  unused exports, no parameters nobody passes.
- **Naming consistency.** Same operation, same prefix. Same
  concept, same noun.
- **Error handling at boundaries.** Trust internal calls; validate
  at module / external boundaries.

## Hard constraints

- **No behaviour changes.** Bit-for-bit identical UX from the
  user's perspective.
- **No public-API changes** to the WebSocket / live-sync protocol,
  the export-bundle JSON schema, or `localStorage` keys.
- **No dependency changes.** Same Node version, same browser
  targets, same npm packages.
- **One commit per logical refactor.** No 50-file mega-commits;
  each commit must be revertable cleanly if it breaks something.
- **Full feature regression after every wave** — see Test plan
  below.

## Wave plan

Each wave produces a leaner, still-functional codebase. The order
is intentional: dead code first (so we refactor less of it),
comments second (so the smaller surface is what gets restructured),
file decomposition third, naming/API last.

### Wave 1 — Dead code + debug-log cleanup

**Deliverables**
- `INVENTORY.md` listing every unused export / function / module
  / asset / DOM ref / `state.*` field, with the evidence that it
  is unreferenced (grep counts, callgraph).
- Remove identified dead code in atomic commits, one logical group
  per commit.
- Strip every debug-only log: `window.__TT_*_DEBUG__` flags,
  `console.info("[cluster-pad] ...")`, `console.info("[cluster-
  pads] ...")`, etc. Real `console.warn` for genuine error paths
  stays.
- Strip placeholder comments like `// removed in Phase X`,
  `// Wave N: ...` markers that no longer point at active
  decisions.

**Acceptance**
- Zero `window.__TT_*_DEBUG__` references in `src/`.
- Zero `console.info(` calls in `src/` (only `warn` / `error` for
  genuine error paths).
- INVENTORY.md grep-line numbers for every removal can be re-run
  on the cleaned tree and return zero references.
- Full feature regression test passes.

### Wave 2 — Comment hygiene

**Deliverables**
- Inventory of every comment block longer than 3 lines. For each:
  decide keep-as-is (load-bearing why), shorten (kept the why,
  dropped the historical narrative), or delete (no longer carrying
  information).
- Replace phase-marker comments (`// Phase X W Y v Z: ...`) with
  comments that just state the WHY when there is one. Phase
  context can be recovered from `git log`/`git blame`; the comment
  in the file should explain the constraint, not the history.
- Remove redundant comments that paraphrase the code immediately
  beneath them.

**Acceptance**
- No comment block in `src/` references "Phase X" / "Wave Y" /
  "v2"/"v3" markers (except in test files that document a fix).
- Comment density (comment lines / total lines) drops from current
  baseline measured in Wave 1 inventory.
- Full feature regression test passes.

### Wave 3 — File / function decomposition

**Deliverables**
- Audit the ten largest modules and split them by responsibility
  (with explicit re-exports so import sites don't all change at
  once). Targets:
  - `runtime-orchestration.js` (3258) — split into per-area
    wiring modules (state/dom/render/lifecycle/wire/ui).
  - `runtime-projection-mapping.js` (1952) — split into
    grid-state, GL-renderer, 2D-fallback-renderer, handle-UI,
    profile-persistence.
  - `animation-editor-view.js` (1729) — split into editor-shell,
    library-list, edit-pane, live-preview.
  - `runtime-animation-lifecycle.js` (1421) — split out cluster
    rail, cluster dispatch, draft-promotion, prune, lifecycle
    state mgmt.
- Break down individual functions over ~150 lines into named
  helpers with single responsibilities.
- Move shared utility functions (e.g. polygon BBox, alpha clamp,
  `clamp(min, max, v)`) to a single `runtime-utils.js`.

**Acceptance**
- No module in `src/app/runtime/` exceeds 800 lines (excluding
  the orchestration wire-up which is allowed to be a re-export
  shell).
- No function exceeds 150 lines.
- Build / load smoke test passes.
- Full feature regression test passes.

### Wave 4 — Naming + API consistency

**Deliverables**
- Naming-convention audit document: chosen prefixes per operation
  type (`render*`, `apply*`, `sync*`, `update*`, `compute*`,
  `get*`, `set*`, `is*`, `has*`).
- Mass-rename pass aligning the codebase to the convention.
- Audit `ctx` object: every property that is a constant, every
  property that is a method, grouped by the area that owns it.
  Move ctx-wiring into per-area builders so `runtime-orchestration`
  doesn't list 200+ keys.
- Standardise option-bag arguments vs positional args.

**Acceptance**
- No two functions use different prefixes for the same operation
  (e.g. `syncRoomList` and `applyRoomList` cannot both exist).
- `ctx` keys grouped by area in the source, not alphabetised by
  accident.
- Full feature regression test passes.

### Wave 5 — Module-boundary cleanup

**Deliverables**
- Identify circular imports / spaghetti dependencies via a
  module-graph dump. Where two modules import each other, decide
  which direction is correct and lift the shared bits to a third
  module.
- Public surface per module documented at the top of the file
  (one-line description of what callers can rely on).
- Remove transitive re-exports nobody depends on.

**Acceptance**
- `madge` / equivalent shows zero cycles in `src/app/runtime/`.
- Each top-level module has a header comment summarising its role.
- Full feature regression test passes.

### Wave 6 — Closure

**Deliverables**
- Final regression test pass on dashboard + `/output` + RPi
  (if available).
- Architecture overview written to `docs/ARCHITECTURE.md`
  explaining the module map after the refactor.
- `SUMMARY.md` for Phase 24 listing every file changed, every
  module split, every dead-code removal.

**Acceptance**
- Every README-documented feature works.
- Architecture doc exists and is accurate.
- Phase closed.

## Test plan (run after every wave)

Manual smoke pass on a fresh `node server.mjs` start. Each item
is a check, not a "click through happy path" — verify the listed
behaviours specifically.

**Boards & rooms**
- [ ] Switch boards via the dropdown; outlines + animations refresh.
- [ ] Create a room, edit polygon (drag vertex, double-click edge,
      delete vertex), move it.
- [ ] Copy/paste a room with `Ctrl+C` / `Ctrl+V`.
- [ ] Freeze a room — drag is blocked.
- [ ] `Ctrl+Z` / `Ctrl+Shift+Z` undo / redo polygon edits.
- [ ] Room labels scale with handle slider AND polygon size.

**Play areas + clusters**
- [ ] Create a play area; "outside" effect renders against it.
- [ ] Create a cluster of N rooms; cluster pad appears in left rail.
- [ ] Cluster pad header reads "Cluster"; list scrolls if many
      clusters; touch-momentum works on phone.

**Animations + dispatch**
- [ ] Trigger a coded room animation (Solid color, Fire, Scanning,
      Alarm, Light flicker).
- [ ] Trigger a GIF animation (Slime, Malfunction).
- [ ] Trigger an MP4 animation.
- [ ] Trigger an outside animation (Space travel, Sandstorm).
- [ ] Stack multiple animations in one room — they overlay.
- [ ] Cluster pad: tap fires the armed animation across every room
      in the cluster + plays inside the pad itself.
- [ ] Cluster pad: type-aware toggle — tap fire toggles only fire,
      scanning keeps running.
- [ ] Cluster pad: Clear stops every cluster-scope animation.
- [ ] Live Editor on a running animation: opacity, intensity,
      speed, sound-volume, transform sliders all take effect.

**Tap-Action**
- [ ] Off — taps do nothing.
- [ ] Toggle — first tap starts, second tap stops (rooms AND
      cluster pads).
- [ ] Clear — taps stop every animation in the target.

**`/output`**
- [ ] Output renders animations.
- [ ] No black borders / seams (WebGL mesh warp active when grid
      has displacement).
- [ ] Identity grid: fx-canvas displays directly, no GL overlay.
- [ ] On RPi: still flüssig (Wave 3 perf gain preserved).

**Align Mode**
- [ ] Drag intersection / line / corner / rotate handles.
- [ ] Right-click context menu: add/remove line, save/load/delete
      profile, reset.
- [ ] `Ctrl+Z` undo across grid actions.
- [ ] Saved profiles persist across reload.

**Theme + UI**
- [ ] Light/dark theme toggle persists across reload.
- [ ] Topbar layout (brand row + actions row) doesn't clip on
      mobile or desktop.
- [ ] Settings ↔ Dashboard switch.

**Sounds**
- [ ] Animation with sound plays sound on start.
- [ ] Per-animation volume in Live Editor.
- [ ] Master volume + global enable in System.

**Export / Import**
- [ ] Export per-board bundle, re-import — no diff.
- [ ] Export global config, re-import — no diff.

**Live-sync**
- [ ] Two control clients open at once: trigger from one, see in
      the other within ~1 frame.

## Risks + mitigations

- **Hidden coupling.** Refactoring may surface a runtime cycle
  that worked only because of an init order. Mitigation: test
  pass after every wave; bisect via `git revert` if needed.
- **`ctx` deep-mutation.** Moving keys around the ctx object
  could break a forgotten reader. Mitigation: grep every key
  before moving, log all access during the test pass in a
  scratch branch if anything looks wrong.
- **Build/test infra is manual.** No CI yet — the test plan
  above is run by hand. Mitigation: keep the checklist tight
  enough to run in 10–15 minutes; use it after EVERY wave.
- **Behaviour drift via "obvious cleanup".** Inlining or
  deleting a guard that looked redundant can change behaviour
  under unusual states. Mitigation: when in doubt, keep the
  guard and add a one-line WHY comment.

## Dependencies

- None. This phase touches no external systems and no data
  formats.

## Out of scope

- Type-checking (TypeScript / JSDoc-typed). The codebase is
  vanilla JS; introducing types is its own future phase.
- Test framework introduction (Jest / Vitest). Test plan above
  is manual; an automated regression harness is separate work.
- Performance work beyond what falls out naturally from
  removing dead branches.
- New animation types, new boards, new control surfaces.
- README / docs rewrites (already done in Phase 23).

## Tracking

- Each wave has a single mergeable arc with its own atomic
  commits.
- Do not merge a wave whose test pass failed — fix in place,
  recheck.
- Phase closure SUMMARY.md after Wave 6 lists what every wave
  removed / split / renamed, with before/after metrics
  (line counts, file counts).
