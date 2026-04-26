# Phase 24 Wave 5 — Executable Plan: Module-Boundary Cleanup

**Wave:** 24-5
**Type:** Code-quality refactor (no behaviour change — module STRUCTURE only: header comments + one cycle resolution + one zero-reader alias removal)
**Inputs:** [ROADMAP.md](../ROADMAP.md), [RESEARCH.md](./RESEARCH.md), [Wave-1 PLAN](../wave-1/PLAN.md), [Wave-2 PLAN](../wave-2/PLAN.md), [Wave-3 PLAN](../wave-3/PLAN.md), [Wave-3 INVENTORY](../wave-3/INVENTORY.md), [Wave-4 PLAN](../wave-4/PLAN.md), [Wave-4 INVENTORY](../wave-4/INVENTORY.md)
**Slicing:** 7 sub-waves (W5.1–W5.7) with **9 atomic commits** total — 3 code-touching (1 mechanical 20-file header batch + 2 atomic SCC-resolution commits) + 6 docs-only INVENTORY commits. Every commit independently revertable. Last refactor wave before Wave 6 closure.
**Estimated wave length:** **~3–5 hours of executor work** + 10–15 min full ROADMAP regression at end of wave. Smallest code-touching wave of Phase 24 (net code delta: +50 to +110 lines, almost all comments).

---

## 1. Goal

Wave 5 is the **last refactor wave** of Phase 24 before Wave 6 (closure). It changes module-level STRUCTURE — header comments + one cycle resolution + one transitive re-export removal — without changing one line of behaviour, one identifier, or one function body. Three things land:

1. **The single non-trivial SCC in the runtime namespace graph is resolved.** RESEARCH §2.1 identifies exactly one SCC of size > 1 across the entire 101-file post-W4 tree: `runtime-bootstrap.js` ↔ `runtime-panels-controller.js`. The cycle is an algorithmic artefact of a defensive double-write (call-time `if (!window.X) window.X = …`) that can never actually fire under correct `<script>` load order. Resolution is mechanical: **drop the defensive write block** in `runtime-bootstrap.js:26–31`. After W5.3-C1 the namespace graph is acyclic (Tarjan SCC: 101 trivial SCCs).

2. **All 20 modules currently missing a header comment receive one.** RESEARCH §3.2 enumerates the 20 files: 17 in `src/app/lib/` (the entire `lib/` tree has no headers) plus 3 in `src/app/runtime/` (`runtime-utils.js`, `polygon-contract.js`, `runtime-orchestration.js`). For each, this PLAN proposes the **exact verbatim header text** in §5.2 — the executor copies it in with no thinking required. Diff per file is purely additive comment lines; no logic line moves.

3. **The single zero-reader transitive re-export (`window.TT_BEAMER_UI_RUNTIME_PANELS`) is removed.** RESEARCH §4.2 verifies by exhaustive grep that this legacy alias has zero external readers — it appears only in the two definer files (`runtime-panels-controller.js` writes it, `runtime-bootstrap.js` defensively re-writes it and reads it as a fallback). It is the textbook "transitive re-export nobody depends on" the ROADMAP §"Wave 5" deliverables list calls out. Net code delta: ~5 lines deleted across 2 files. The 100 remaining namespace keys are unchanged. This is W5.3-C2 — separated from C1 so each change is independently revertable.

Wave 5 changes module STRUCTURE only. No identifier renames (Wave 4 territory — closed). No function-body rewrites (Wave 3 territory — closed). No comment rewrites beyond the 20 header additions (Wave 2 territory — closed). No dead-code removal (Wave 1 territory — closed). No new files. The `<script>` order in `index.html` is not touched.

**Hard rules — non-negotiable:**

- **No behaviour change.** Bit-for-bit identical UX from the user's perspective. Every commit's diff is verifiable by `node --check` + namespace-key parity check + Tarjan SCC re-run. No function body is modified.
- **No identifier renames.** Wave 4 closed at `6cfc682`; W4 INVENTORY's 100-namespace-key surface (101 minus the W5.3-C2 removal of `TT_BEAMER_UI_RUNTIME_PANELS`) is otherwise locked.
- **No function decomposition.** Wave 3 closed at `c9038bc`; the 6 large files (`runtime-orchestration.js` 2965, `runtime-projection-handle-ui.js` 781, `animation-editor-edit-pane.js` 722, `runtime-draw-loop.js` 716, `runtime-room-management.js` 707, `runtime-room-dispatch.js` 659) stay at their current sizes.
- **The 836 ctx-arrow-callback patterns from W3 are explicitly OUT OF SCOPE.** RESEARCH §2.5 + §6.5 confirm these are forward-resolution aids inside orchestration's IIFE (not file-graph cycles). They are LOAD-BEARING — the engineering response to the `defer`-script + hub-and-spoke architecture's init-order requirements. Removing or refactoring them would require switching to ES modules or splitting orchestration's IIFE into multiple smaller IIFEs with explicit init-order chains. That is out of scope for Wave 5 and is a major re-architecture.
- **The 6 W3 shim modules' re-exports are KEPT.** RESEARCH §4.3 verifies that every shim's external surface (projection-mapping, animation-editor-view, animation-lifecycle, fx-panels, polygon-editor, draw-loop) is genuinely consumed by orchestration or by sibling shims. Removing any shim's parent namespace would break orchestration's destructure call sites. **No transitive re-exports beyond `TT_BEAMER_UI_RUNTIME_PANELS` are removed.** Negative results from the per-shim audit (W5.4) are the documented evidence that the ROADMAP §"Remove transitive re-exports nobody depends on" criterion is satisfied.
- **`<script>` order in `index.html` does NOT change.** No new files this wave; `index.html` is not edited. Verified post-commit via `git diff phase-24-w5-start..HEAD -- index.html` returning empty.
- **Per-commit primary gate (§7.1):** pre-edit grep proof, code edit, post-edit grep proof, `node --check` clean on every modified `.js`, namespace-key parity verified (101 → 100 only at W5.3-C2; 100 → 100 thereafter), `<script>` order unchanged, INVENTORY row appended.
- **One commit per logical change.** Each W5 commit is independently revertable: revert any one without disturbing the others.

**Stays unchanged:** every user-facing behaviour, every README-documented feature, every live-sync protocol field, every export-bundle JSON shape, every `localStorage` key, every dependency, the 6 W3 shim modules' re-exports, every comment that survived Wave 2, every Wave 4 rename, every function body. The 836 ctx-arrow-callback patterns inside orchestration's IIFE.

---

## 2. Acceptance Criteria

This wave is done when **all** of the following are true:

- [ ] **Tarjan SCC over the post-W5 namespace-graph: zero non-trivial SCCs.** The `madge`-equivalent gate from ROADMAP §"Wave 5 → Acceptance" → "`madge` / equivalent shows zero cycles in `src/app/runtime/`":
  ```bash
  node /tmp/w5/scc.cjs   # the §1.5 RESEARCH script + Tarjan loop
  # Expected output post-W5: "101 SCCs, all size 1" (note: 100 namespaces remain
  # post-W5.3-C2; the file count is still 101 since file removal is out of scope)
  ```
- [ ] **All 20 modules in `src/app/runtime/` and `src/app/lib/` that previously lacked a header now carry one.** Verified via grep that EVERY `.js` file in those trees has a non-empty comment block immediately above its IIFE wrapper or top-level statement:
  ```bash
  for f in $(find src/app/runtime src/app/lib -name "*.js" | sort); do
    head -10 "$f" | grep -E '^\s*(//|/\*)' >/dev/null || echo "MISSING HEADER: $f"
  done
  # Expected post-W5: empty output (all 101 files have a header).
  ```
- [ ] **The legacy alias `TT_BEAMER_UI_RUNTIME_PANELS` is fully removed.**
  ```bash
  grep -rn "TT_BEAMER_UI_RUNTIME_PANELS" src/   # expected post-W5.3-C2: 0 hits
  ```
- [ ] **All 100 production namespace keys (post-W5.3-C2) still resolve.** In a fresh `node server.mjs` boot, in DevTools console:
  ```javascript
  const ttKeys = Object.keys(window).filter(k => k.startsWith("TT_BEAMER_")).sort();
  console.log(ttKeys.length, JSON.stringify(ttKeys));
  // Expected post-W5: length === 100; the W4 lock-list pre-W5 (101 keys)
  // minus exactly TT_BEAMER_UI_RUNTIME_PANELS.
  ```
- [ ] **`node --check` clean for every modified `.js` file at every commit.** No regression at any HEAD between `phase-24-w5-start` and end-of-wave. Spot-check at end of wave on the 3 files touched by code commits (`runtime-utils.js`, `polygon-contract.js`, `runtime-orchestration.js`, `runtime-bootstrap.js`, `runtime-panels-controller.js`, plus the 16 lib files):
  ```bash
  while read f; do node --check "$f" || echo "FAIL: $f"; done <<EOF
  src/app/runtime/runtime-utils.js
  src/app/runtime/core/polygon-contract.js
  src/app/runtime/runtime-orchestration.js
  src/app/runtime/core/runtime-bootstrap.js
  src/app/lib/ui/runtime-panels-controller.js
  EOF
  ```
- [ ] **`<script>` order verified unchanged.** `git diff phase-24-w5-start..HEAD -- index.html` returns empty (no edits to `index.html` across the entire wave).
- [ ] **Public namespace count drops from 101 to 100, intentionally.** Wave 5 INVENTORY records this as a documented surface reduction (only consequence of ROADMAP §"Wave 5 → Remove transitive re-exports nobody depends on"). All 9 wire-protocol literals + 13 localStorage / JSON-schema literals from W4's 123-item lock-list remain BYTE-IDENTICAL (verified by §6.2 + §6.3 below):
  ```bash
  diff <(grep -rohE 'emitLiveMutation\("[a-z-]+"' src/app/runtime/ | sort -u) /tmp/w4/wire-pre.txt
  diff <(grep -rohE "['\"]tt-beamer[a-zA-Z0-9._-]+['\"]" src/ | sort -u) /tmp/w4/ls-pre.txt
  # Both diffs MUST be empty.
  ```
- [ ] **`git diff -w` per code commit shows ONLY the intended structural change.** For W5.2 (header batch): only additive comment lines — no logic line moved. For W5.3-C1 (defensive write removal): only deletion of `runtime-bootstrap.js` lines 26–31 + matching header-text update. For W5.3-C2 (alias removal): only the lines spelled out in §5.3-C2.
- [ ] **Full ROADMAP regression checklist passes** at end of wave (ROADMAP.md lines 203–275, ~10–15 min manual smoke pass on a fresh `node server.mjs` start).
- [ ] **`INVENTORY.md` exists** at `.planning/phases/phase-24/wave-5/INVENTORY.md`, updated incrementally per commit, with: per-commit table, cycle-resolution section (pre-W5 graph + post-W5 graph), header inventory section (20 files + their assigned headers), per-shim re-export audit section (6 shims + load-bearing justification), `<script>` load-order verification section, decision-log section. See §9.
- [ ] **Pre-execution rollback tag set.** `git tag phase-24-w5-start` lands on HEAD before W5.1-C1. INVENTORY.md records the tagged commit hash (`6cfc682`).
- [ ] **No stray side effects.** `git diff phase-24-w5-start..HEAD -- src/` post-wave shows ONLY: (a) the 20 header additions (purely additive comment lines); (b) the 6-line deletion in `runtime-bootstrap.js:26–31`; (c) the ~5-line deletions across `runtime-bootstrap.js` + `runtime-panels-controller.js` for the alias removal. Net code delta: +50 to +110 lines (~60–120 added comment lines minus ~10–15 deleted code lines). Total runtime LOC change tracked in INVENTORY.

---

## 3. Pre-Flight Checklist (before W5.1-C1)

Mechanical setup the executor performs **once** before opening the first commit:

- [ ] **Confirm `git status` working-tree state.** Expected pre-flight state at HEAD `6cfc682`:
  - `config/global-defaults.json` — pre-existing user edit, unrelated. Continues to surface in `git status`; do NOT bundle into Wave 5 commits.
  - `.planning/phases/phase-24/wave-5/RESEARCH.md` — committed during research phase.
  - `.planning/phases/phase-24/wave-5/PLAN.md` — this file, untracked at pre-flight; commit it together with W5.1-C1's INVENTORY-baseline commit (or in a separate `docs(24-5): plan` commit if the executor prefers — the choice is recorded in INVENTORY's "Decisions" section).
  - **No other unrelated edits in `src/`.** If found, stash as `phase-24-w5-prestart` before W5.1-C1 lands.
- [ ] **Set rollback tag:**
  ```bash
  git tag phase-24-w5-start    # lands on current HEAD (6cfc682, post-W4 closure)
  ```
  Record the tagged hash in INVENTORY.md "Tags" section.
- [ ] **Snapshot baseline metrics.** Re-run RESEARCH §1 + §3 grep commands fresh; record in INVENTORY.md "Baseline" section. Verify counts within ±2 % of RESEARCH:
  ```bash
  # Total .js files (expected: 101)
  find src/app/runtime src/app/lib -name "*.js" | wc -l

  # Files in src/app/runtime/ (expected: 84) and src/app/lib/ (expected: 17)
  find src/app/runtime -name "*.js" | wc -l
  find src/app/lib -name "*.js" | wc -l

  # Total namespace count (expected: 101)
  grep -rohE "window\.TT_BEAMER_[A-Z_]+\s*=" src/ | grep -oE "TT_BEAMER_[A-Z_]+" | sort -u | wc -l

  # Files MISSING header (expected: 20 — list verified against §5.2 below)
  for f in $(find src/app/runtime src/app/lib -name "*.js" | sort); do
    head -10 "$f" | grep -E '^\s*(//|/\*)' >/dev/null || echo "$f"
  done | sort > /tmp/w5/missing-headers-pre.txt
  wc -l /tmp/w5/missing-headers-pre.txt    # expected: 20

  # Per-file line count for the 20 header-missing files (baseline for W5.2 +X line delta)
  while read f; do wc -l "$f"; done < /tmp/w5/missing-headers-pre.txt > /tmp/w5/missing-headers-pre-lines.txt
  ```
  Compare `/tmp/w5/missing-headers-pre.txt` against the canonical 20-file list in §5.2 below — they MUST match exactly. If any file in §5.2 is no longer header-missing (someone added a header), drop it from W5.2's batch and record the deviation in INVENTORY's "Decisions" section. If a NEW file appears that isn't in §5.2, STOP and re-run RESEARCH §3 — do not invent a header without a verified RESEARCH entry.
- [ ] **Snapshot the 101 public namespace keys.** Same DevTools dump as W4 pre-flight (W4 INVENTORY §"Pre-W4 namespace snapshot"):
  ```javascript
  const ttKeys = Object.keys(window).filter(k => k.startsWith("TT_BEAMER_")).sort();
  console.log(JSON.stringify(ttKeys, null, 2));
  for (const k of ttKeys) {
    const ns = window[k];
    if (ns && typeof ns === "object") {
      console.log(k + ": " + JSON.stringify(Object.keys(ns).sort()));
    }
  }
  ```
  Paste the output into INVENTORY.md "Pre-W5 namespace snapshot" section. The expected post-W5 dump is byte-identical EXCEPT for the absence of `TT_BEAMER_UI_RUNTIME_PANELS` (W5.3-C2 removes it).
- [ ] **Snapshot the W4 lock-list literals (9 wire + 13 LS).** Wave 5 does NOT touch these; capture the pre-W5 output to enable byte-identical post-W5 verification:
  ```bash
  grep -rohE 'emitLiveMutation\("[a-z-]+"' src/app/runtime/ | sort -u > /tmp/w5/wire-pre.txt
  grep -rohE "['\"]tt-beamer[a-zA-Z0-9._-]+['\"]" src/ | sort -u > /tmp/w5/ls-pre.txt
  wc -l /tmp/w5/wire-pre.txt /tmp/w5/ls-pre.txt    # expected: 9 + 13
  ```
- [ ] **Snapshot the SCC count.** Run the §1.5 RESEARCH Node script + Tarjan over the file → file edge graph; record the output:
  ```bash
  # Save the §1.5 Node script to /tmp/w5/extract-graph.cjs first (paste from RESEARCH).
  # Save the Tarjan SCC harness to /tmp/w5/scc.cjs.
  node /tmp/w5/scc.cjs > /tmp/w5/scc-pre.txt
  cat /tmp/w5/scc-pre.txt
  # Expected: "1 non-trivial SCC of size 2: [runtime-bootstrap.js, runtime-panels-controller.js]"
  ```
- [ ] **User-decision items batch (already settled by orchestrator pre-flight — log as "confirmed" in INVENTORY.md "Decisions"):**
  - **ctx-arrow-callback patterns OUT OF SCOPE.** The 836 patterns documented in W3 INVENTORY are LOAD-BEARING (RESEARCH §2.5 + §6.5). Wave 5 does NOT refactor any arrow callback. Removing or untangling them would require switching to ES modules or splitting orchestration's IIFE, which is a major re-architecture and explicitly out of W5 scope.
  - **6 W3 shim re-exports KEPT.** RESEARCH §4.3 audit shows every shim's external surface is genuinely consumed (by orchestration or by sibling shims). Removing any shim's parent namespace would break orchestration's destructure call sites. W5 confirms-and-documents but does NOT remove.
  - **Only `TT_BEAMER_UI_RUNTIME_PANELS` is targeted for removal.** Zero external readers verified by exhaustive grep (RESEARCH §4.2). All 100 other namespaces have at least 1 external reader and are KEPT.
  - **W5.3 split into two atomic commits (C1 + C2).** C1 = drop the defensive write (resolves the SCC); C2 = drop the legacy alias (zero-reader removal). Each independently revertable. If only C1 lands, the SCC is broken but the alias stays as harmless dead surface area; if only C2 lands without C1, the SCC remains. Both are intended; the split is for revertability + bisect granularity.
  - **Documentation discrepancy on "cycles".** The ROADMAP imagines `madge` as a literal tool. `madge` parses ES module `import` syntax; this codebase uses IIFE-with-`window`-globals and has no `import` statements in its runtime tree. The "or equivalent" ROADMAP clause is honoured by the §1.5 RESEARCH Tarjan-SCC-over-namespace-graph script. INVENTORY records the discrepancy explicitly so future readers don't expect literal `madge` output.
  - **Orchestration shell header style (open question §9.2 RESEARCH): CONCISE.** The orchestration header (§5.2 row for `runtime-orchestration.js`) is a 4-line concise paragraph that points readers at `runtime-orchestration-ctx-builder.js`'s 95-key dep-bag and at the area-divider banners (`// ─── Area … ───`) inside the ctx-builder for the structural overview. NO 70-line "list of all 69 namespaces consumed".
  - **Tooling commit DEFERRED.** RESEARCH §9.3 asks if the §1.5 Node script should land as `scripts/dev/extract-module-graph.cjs`. Decision: **defer to Wave 6 closure.** The script remains in this RESEARCH (and reproducible from there) for Wave 5 verification.
- [ ] **Manually run an abbreviated boot smoke** on a fresh `node server.mjs`. Open `/`, switch a board, trigger one cluster-pad animation, open `/output`. Confirm dashboard loads, panels sync, no `runtime_panels_missing` warn fires. Note any pre-existing console oddities so they aren't blamed on Wave 5. Record in INVENTORY.md "Pre-flight smoke" section.
- [ ] **Initialize `INVENTORY.md`** with the template skeleton (see §9 below). Land a baseline section before W5.1-C1.

---

## 4. Sub-Wave Breakdown

Seven sub-waves, ordered baseline-first then code-first then docs-closure. Each sub-wave is at most 1–2 atomic commits; each commit is independently revertable.

| Sub-wave | Commits | Type | Goal |
|----------|--------:|------|------|
| W5.1 | 1 | docs | Module-graph baseline + INVENTORY initial |
| W5.2 | 1 | code | Header comments for the 20 missing-header modules |
| W5.3 | 2 | code | Drop the SCC: defensive write (C1) + legacy alias (C2) |
| W5.4 | 1 | docs | INVENTORY post-SCC-fix verification (Tarjan re-run) |
| W5.5 | 1 | docs | Per-shim re-export audit (6 shims documented as load-bearing) |
| W5.6 | 1 | docs | `<script>` load-order verification |
| W5.7 | 1 | docs | End-of-W5 INVENTORY closure + final verification |
| **Σ** | **9** | — | — |

**Risk ordering (low → high):** W5.1 (docs only) → W5.2 (mechanical, additive only, no logic touched) → W5.3-C1 (deletes 6 defensive lines, breaks the SCC; the deleted block is unreachable under correct load order, so removing it is a no-op) → W5.3-C2 (deletes ~5 alias references; the alias has zero external readers) → W5.4–W5.7 (docs only). Each W5.3 commit is independently revertable; if either misbehaves, `git revert` restores the prior state without affecting the headers from W5.2.

---

### W5.1 — Module-graph baseline INVENTORY (LOW risk, foundational)

**Goal:** Capture the post-W4 module dependency graph as the W5 baseline artifact. INVENTORY.md is created with the per-file table from RESEARCH §1.4, the SCC analysis from §2.1, and the 20-file header-missing list from §3.2. No code changes.

**Per-commit count:** 1.

**Estimated time:** 15–30 min.

**Commits:**

- [ ] **W5.1-C1 — Module-graph baseline + INVENTORY initial.**
  - **Files touched:** `.planning/phases/phase-24/wave-5/INVENTORY.md` (new file), `.planning/phases/phase-24/wave-5/PLAN.md` (this file, if not yet committed).
  - **What changes:** Land an initial INVENTORY.md with these sections populated from RESEARCH:
    - **Tags** section: record `phase-24-w5-start = 6cfc682`.
    - **Baseline** section: 101 .js files; 101 namespaces; 81 header-bearing + 20 header-missing; 1 non-trivial SCC of size 2 (bootstrap ↔ panels-controller); 836 ctx-arrow-callback patterns documented as out-of-scope; `<script>` count from `index.html` baseline.
    - **Per-file table** section: paste RESEARCH §1.4's 101-row table.
    - **Cycle resolution** section header (with the pre-W5 graph; post-W5 row to be filled in by W5.4).
    - **Header inventory** section header (with the 20 files listed; assigned headers from §5.2 of this PLAN to be confirmed by W5.2).
    - **Per-shim re-export audit** section header (the 6 shims listed; load-bearing justifications to be filled in by W5.5).
    - **`<script>` load-order verification** section header (to be filled in by W5.6).
    - **Decisions** section: record all 7 user-decision items from §3 above (ctx-arrows out of scope; shims kept; only UI_RUNTIME_PANELS removed; W5.3 split; cycles-discrepancy; orchestration-header concise; tooling deferred).
    - **Pre-flight smoke** section: record any pre-existing console oddities from §3 abbreviated boot.
    - **Per-commit progress table** skeleton (rows added per commit).
    - **Pre-W5 namespace snapshot** section: paste DevTools 101-key dump from §3.
    - **Public API lock-list — pre-flight snapshot** section: paste 9 wire-protocol literals + 13 localStorage literals from §3.
    - **W4 inheritance** note: the W4 INVENTORY's 100 PIN'd identifier-residual entries are not affected by W5 (W5 doesn't touch identifiers).
  - **Verification:** `git diff --stat HEAD~..HEAD` shows only `.planning/phases/phase-24/wave-5/INVENTORY.md` (and optionally PLAN.md) changes. No `src/` files touched. `find src/app/runtime src/app/lib -name "*.js" | wc -l` returns 101.
  - **Commit message:** `docs(24-5): module-graph baseline + W5 INVENTORY initial`

---

### W5.2 — Header comments for the 20 missing-header modules (LOW risk, mechanical, additive only)

**Goal:** Add a 1–4 line header comment to each of the 20 modules currently lacking one. Diff per file is purely additive comment lines immediately above the `(() =>` IIFE opener (or, for `runtime-orchestration.js` and `lib/api/global-defaults-api.js`, immediately above the first non-comment line — see §5.2 row notes below). No logic line moves. Single atomic commit (acceptable per ROADMAP because all 20 are the same logical change: add header comment).

**Per-commit count:** 1.

**Estimated time:** 45–90 min (~3–4 min per file: read, paste verbatim header from §5.2 below, save, verify; total includes the verification gate at the end).

**Commits:**

- [ ] **W5.2-C1 — Add header comments to 20 modules.**
  - **Files touched (20):** see §5.2 below for the canonical list and the EXACT verbatim header text per file.
  - **What changes:** For each of the 20 files, insert the §5.2-assigned header text immediately ABOVE the file's existing first `(() =>` opener line (or, for `runtime-orchestration.js` which has no IIFE wrapper, immediately above its first `const { … } = … ;` destructure block at line 1). The headers use only `//` line comments (no `/* */` block comments) to avoid accidental cross-IIFE boundary edge cases (RESEARCH §6.3 risk note). Each header ends with a blank line, then the existing first source-text line follows unchanged.
  - **What does NOT change:**
    - No existing comment is rewritten or removed.
    - No source-text line moves. The grep `grep -c "(() =>"` per file is unchanged (still 1 IIFE opener for the 19 IIFE-wrapped files; 0 for `runtime-orchestration.js`).
    - No identifier renamed.
    - No namespace surface changed: `Object.keys(window.TT_BEAMER_*)` per touched file is byte-identical pre/post.
  - **Pre-edit verification:** Re-confirm the 20-file list matches the pre-flight `/tmp/w5/missing-headers-pre.txt` snapshot exactly. If any deviation, stop and resolve before editing.
  - **Per-file edit pattern (mechanical):** Use the `Edit` tool per file with `old_string = "(() => {"` and `new_string = "<HEADER FROM §5.2>\n\n(() => {"` — but only IF the file has exactly one `(() =>` line (verify first via `grep -c "^(() => {"` per file). Files with shell IIFE structures other than `^(() => {` listed in §5.2 row notes; handle those per their note.
  - **Post-edit verification (per file, before committing the batch):**
    ```bash
    # 1. Header is present in the first 10 lines:
    head -10 "$f" | grep -E '^\s*(//|/\*)' >/dev/null || echo "MISSING: $f"

    # 2. IIFE-opener count unchanged (1 for IIFE-wrapped files; 0 for runtime-orchestration.js):
    grep -c "^(() => {" "$f"

    # 3. node --check passes:
    node --check "$f" || echo "PARSE FAIL: $f"
    ```
  - **Post-edit verification (batch, before committing):**
    ```bash
    # Aggregate: every .js file in src/app/runtime/ and src/app/lib/ has a header in the first 10 lines.
    for f in $(find src/app/runtime src/app/lib -name "*.js" | sort); do
      head -10 "$f" | grep -E '^\s*(//|/\*)' >/dev/null || echo "MISSING: $f"
    done
    # Expected: empty output (post-W5.2: 101/101 files have headers).

    # Namespace surface unchanged: 101 keys (pre-W5.3-C2 still has UI_RUNTIME_PANELS):
    diff <(grep -rohE "window\.TT_BEAMER_[A-Z_]+" src/ | sort -u) /tmp/w5/ttkeys-pre.txt
    # Expected: empty.

    # Wire + LS literals unchanged:
    diff <(grep -rohE 'emitLiveMutation\("[a-z-]+"' src/app/runtime/ | sort -u) /tmp/w5/wire-pre.txt
    diff <(grep -rohE "['\"]tt-beamer[a-zA-Z0-9._-]+['\"]" src/ | sort -u) /tmp/w5/ls-pre.txt
    # Both empty.

    # node --check across all 20 modified files:
    while read f; do node --check "$f" || echo "PARSE FAIL: $f"; done < /tmp/w5/missing-headers-pre.txt
    # Expected: empty.

    # <script> order unchanged (no edits to index.html):
    git diff HEAD~..HEAD -- index.html
    # Expected: empty.
    ```
  - **Per-line-delta accounting:** total lines added across the 20 files ≈ 60–120 (3–6 lines × 20 files, including a trailing blank line per header). Net code delta: +60 to +120 lines. Recorded in INVENTORY.
  - **Atomicity rationale (per ROADMAP §"Hard constraints" → "One commit per logical refactor"):** all 20 are the SAME logical change ("add a header comment"). The `git diff -w` per file is small (3–6 added lines, 0 removed). If any single file's header is contested post-commit, that file gets its own follow-up commit (revert this commit, rewrite the contested header, re-commit). Bisect-friendly granularity is preserved by file: any future bug bisects to W5.2-C1, then per-file inspection identifies the culprit (none expected; comment-only diffs cannot break parse or runtime).
  - **Commit message:** `refactor(24-5): add header comments to 20 modules without one`

---

### W5.3 — Drop the SCC: defensive write + legacy alias (MEDIUM risk, mechanical)

**Goal:** Resolve the single non-trivial SCC in the namespace graph and remove the only zero-reader transitive re-export. Two atomic commits, separately revertable per ROADMAP §"One commit per logical refactor".

**Per-commit count:** 2.

**Estimated time:** 30–60 min total (15–30 min per commit: edit, verify, manual browser smoke, commit).

**Commits:**

- [ ] **W5.3-C1 — Drop runtime-bootstrap defensive panels-namespace write (resolves SCC).**
  - **Files touched (1):** `src/app/runtime/core/runtime-bootstrap.js`.
  - **What changes:** Delete lines 26–31 (the `if (!window.TT_BEAMER_RUNTIME_PANELS) ... if (!window.TT_BEAMER_UI_RUNTIME_PANELS) ...` defensive-write block). The block is dead under correct `<script>` load order: `runtime-panels-controller.js` (`index.html:835`, `defer`) parses long before `runtime-bootstrap.js` (`index.html:907`, `defer`), so by the time `syncRuntimePanelsFromState` is called, both `window.TT_BEAMER_RUNTIME_PANELS` and `window.TT_BEAMER_UI_RUNTIME_PANELS` are already written by panels-controller's IIFE. The defensive write can never fire (RESEARCH §2.2).

    Exact pre-edit text in `src/app/runtime/core/runtime-bootstrap.js` (lines 16–32):
    ```js
      function syncRuntimePanelsFromState() {
        const runtimePanelsApi = window.TT_BEAMER_RUNTIME_PANELS ?? window.TT_BEAMER_UI_RUNTIME_PANELS ?? null;
        if (!runtimePanelsApi || typeof runtimePanelsApi.syncRuntimePanelsFromState !== "function") {
          ctx.logBootstrap.warn("runtime_panels_missing", {
            event: "runtime-panels-missing",
            hasCanonical: Boolean(window.TT_BEAMER_RUNTIME_PANELS),
            hasLegacy: Boolean(window.TT_BEAMER_UI_RUNTIME_PANELS),
          });
          return;
        }
        if (!window.TT_BEAMER_RUNTIME_PANELS) {
          window.TT_BEAMER_RUNTIME_PANELS = runtimePanelsApi;
        }
        if (!window.TT_BEAMER_UI_RUNTIME_PANELS) {
          window.TT_BEAMER_UI_RUNTIME_PANELS = runtimePanelsApi;
        }

        runtimePanelsApi.syncRuntimePanelsFromState({
    ```
    Exact post-edit text (lines 26–31 deleted; one blank line between the `return;` and `runtimePanelsApi.syncRuntimePanelsFromState({` retained):
    ```js
      function syncRuntimePanelsFromState() {
        const runtimePanelsApi = window.TT_BEAMER_RUNTIME_PANELS ?? window.TT_BEAMER_UI_RUNTIME_PANELS ?? null;
        if (!runtimePanelsApi || typeof runtimePanelsApi.syncRuntimePanelsFromState !== "function") {
          ctx.logBootstrap.warn("runtime_panels_missing", {
            event: "runtime-panels-missing",
            hasCanonical: Boolean(window.TT_BEAMER_RUNTIME_PANELS),
            hasLegacy: Boolean(window.TT_BEAMER_UI_RUNTIME_PANELS),
          });
          return;
        }

        runtimePanelsApi.syncRuntimePanelsFromState({
    ```
    The `runtime_panels_missing` warn at lines 19–25 is RETAINED — it is a genuine smoke probe that fires only if a future refactor breaks `<script>` load order. No comment is added to mark "we deleted defensive block here" (Wave 5 doesn't add explanatory in-body comments; the W5.2 header on `runtime-bootstrap.js` already carries the file-level intent).
  - **What does NOT change:**
    - The `??`-fallback expression at line 17 still resolves both keys (kept until W5.3-C2 drops the legacy half).
    - The `hasCanonical` / `hasLegacy` log fields at lines 21–22 stay (W5.3-C2 drops `hasLegacy`).
    - The W5.2 file-level header survives intact.
    - `runtime-panels-controller.js` is not touched in C1.
  - **Pre-edit verification:**
    ```bash
    grep -n "if (!window.TT_BEAMER_RUNTIME_PANELS)" src/app/runtime/core/runtime-bootstrap.js
    # Expected: line 26 hit.
    grep -n "if (!window.TT_BEAMER_UI_RUNTIME_PANELS)" src/app/runtime/core/runtime-bootstrap.js
    # Expected: line 29 hit.
    ```
  - **Post-edit verification:**
    ```bash
    # 1. The defensive block is gone:
    grep -n "if (!window.TT_BEAMER_RUNTIME_PANELS)" src/app/runtime/core/runtime-bootstrap.js
    # Expected: empty.
    grep -n "if (!window.TT_BEAMER_UI_RUNTIME_PANELS)" src/app/runtime/core/runtime-bootstrap.js
    # Expected: empty.

    # 2. node --check clean:
    node --check src/app/runtime/core/runtime-bootstrap.js

    # 3. The canonical TT_BEAMER_RUNTIME_PANELS namespace key is unchanged:
    diff <(grep -rohE "window\.TT_BEAMER_[A-Z_]+" src/ | sort -u) /tmp/w5/ttkeys-pre.txt
    # Expected: empty (still 101 keys; W5.3-C2 drops one).

    # 4. SCC re-check: bootstrap is now a pure consumer (no longer writes the namespace).
    node /tmp/w5/scc.cjs
    # Expected: 0 non-trivial SCCs (101 trivial SCCs).

    # 5. <script> order unchanged:
    git diff HEAD~..HEAD -- index.html
    # Expected: empty.

    # 6. git diff -w shows only the 6-line deletion:
    git diff -w HEAD~..HEAD -- src/app/runtime/core/runtime-bootstrap.js
    # Expected: 6 deletions, 0 additions.
    ```
  - **Manual browser smoke (between C1 and C2):** Boot fresh `node server.mjs`. Open `/`. Expected: dashboard loads, panels sync (room list, animation editor button, etc. all functional), no `runtime_panels_missing` warn fires. Open `/output`. Expected: animations render. Trigger one cluster-pad animation. Expected: works.
    - If the warn fires at boot: the `<script>` load order assumption is broken — STOP, do not commit C1, investigate `<script>` order in `index.html` (W5.6 verification gate would catch this; in C1 it's pre-empted).
    - If the warn does not fire: SCC is broken with no behavior change. Proceed.
  - **Net code delta:** −6 lines.
  - **Commit message:** `refactor(24-5): drop runtime-bootstrap defensive panels-namespace write (resolves SCC)`

- [ ] **W5.3-C2 — Drop legacy `TT_BEAMER_UI_RUNTIME_PANELS` alias (zero external readers).**
  - **Files touched (2):** `src/app/lib/ui/runtime-panels-controller.js`, `src/app/runtime/core/runtime-bootstrap.js`.
  - **What changes:**
    - In `src/app/lib/ui/runtime-panels-controller.js`: delete line 74 (`window.TT_BEAMER_UI_RUNTIME_PANELS = runtimePanelsApi;`). Update the comment at lines 71–72 to drop the "legacy UI key" claim:
      - **Pre-edit (lines 71–74):**
        ```js
          // Keep the canonical runtime key and the legacy UI key in sync so
          // bootstrap/load-order checks remain deterministic across browsers.
          window.TT_BEAMER_RUNTIME_PANELS = runtimePanelsApi;
          window.TT_BEAMER_UI_RUNTIME_PANELS = runtimePanelsApi;
        ```
      - **Post-edit (lines 71–73):**
        ```js
          // Expose the runtime panels API so bootstrap can read it and
          // sync via syncRuntimePanelsFromState during initial load.
          window.TT_BEAMER_RUNTIME_PANELS = runtimePanelsApi;
        ```
    - In `src/app/runtime/core/runtime-bootstrap.js`:
      - At line 17: drop the `?? window.TT_BEAMER_UI_RUNTIME_PANELS` half of the fallback chain. The expression becomes `const runtimePanelsApi = window.TT_BEAMER_RUNTIME_PANELS ?? null;`.
      - At line 22: drop the `hasLegacy: Boolean(window.TT_BEAMER_UI_RUNTIME_PANELS),` log field. The `hasCanonical` field at line 21 stays.
  - **What does NOT change:**
    - `runtime-bootstrap.js`'s `runtime_panels_missing` warn (lines 19–25, now 19–24) remains as the smoke probe.
    - The W5.2 file-level headers survive intact (with one allowed micro-edit: if the W5.2 header for `runtime-bootstrap.js` mentioned "canonical/legacy delegation", trim "/legacy" — see §5.2 row note for `runtime-bootstrap.js`).
    - The `runtime-panels-controller.js` IIFE wrapper, its function definitions, the `runtimePanelsApi` literal (line 67–69), and the canonical-namespace export (line 73 post-edit) are untouched.
  - **Pre-edit verification:**
    ```bash
    grep -rn "TT_BEAMER_UI_RUNTIME_PANELS" src/
    # Expected: 5–6 hits across 2 files (panels-controller line 74, bootstrap lines 17 + 22 +
    #   maybe a comment in the file's header). Confirm no hits in any other file.
    grep -l "TT_BEAMER_UI_RUNTIME_PANELS" src/ -r
    # Expected: exactly 2 files (panels-controller + bootstrap). If any 3rd file appears,
    # STOP and investigate — the RESEARCH §4.2 zero-reader claim must be re-validated.
    ```
  - **Post-edit verification:**
    ```bash
    # 1. The alias is fully gone:
    grep -rn "TT_BEAMER_UI_RUNTIME_PANELS" src/
    # Expected: 0 hits.

    # 2. node --check clean on both modified files:
    node --check src/app/lib/ui/runtime-panels-controller.js
    node --check src/app/runtime/core/runtime-bootstrap.js

    # 3. The canonical TT_BEAMER_RUNTIME_PANELS namespace is INTACT:
    grep -rn "TT_BEAMER_RUNTIME_PANELS" src/
    # Expected: 4–5 hits (panels-controller writer, bootstrap reader,
    #   src/app.js:7 smoke probe, runtime_panels_missing log payload).

    # 4. Namespace count drops from 101 to 100 (the documented reduction):
    grep -rohE "window\.TT_BEAMER_[A-Z_]+" src/ | sort -u | wc -l
    # Expected: 100 (post-W5.3-C2).

    # 5. SCC count unchanged (still 0 non-trivial SCCs from W5.3-C1):
    node /tmp/w5/scc.cjs
    # Expected: 0 non-trivial SCCs.

    # 6. Wire-protocol + localStorage literals UNCHANGED (W5 doesn't touch them):
    diff <(grep -rohE 'emitLiveMutation\("[a-z-]+"' src/app/runtime/ | sort -u) /tmp/w5/wire-pre.txt
    diff <(grep -rohE "['\"]tt-beamer[a-zA-Z0-9._-]+['\"]" src/ | sort -u) /tmp/w5/ls-pre.txt
    # Both empty.

    # 7. <script> order unchanged:
    git diff HEAD~..HEAD -- index.html
    # Expected: empty.

    # 8. git diff -w shows only the documented deletions + 1 comment update:
    git diff -w HEAD~..HEAD -- src/
    # Expected: ~5 deletions, ~2-line comment update (see §5.3-C2 above for the comment text).
    ```
  - **Manual browser smoke (after C2):** Boot fresh `node server.mjs`. Open `/`. Expected: dashboard loads, panels sync, no `runtime_panels_missing` warn fires. In DevTools console, run:
    ```javascript
    typeof window.TT_BEAMER_RUNTIME_PANELS         // "object"
    typeof window.TT_BEAMER_UI_RUNTIME_PANELS      // "undefined" — confirms removal
    Object.keys(window).filter(k => k.startsWith("TT_BEAMER_")).length    // 100
    ```
    Open `/output`. Trigger one cluster-pad animation. Trigger one room animation. Expected: all work, no console errors.
    - If any test fails: revert the commit (`git revert HEAD`), do NOT proceed to W5.4. The expected behavior is unchanged because the alias has zero external readers — any failure indicates the §4.2 grep audit missed a reader. Re-run `grep -l "TT_BEAMER_UI_RUNTIME_PANELS" src/` against the W5.2 HEAD (pre-C2), expand the search to include `index.html` and any test files, and resolve.
  - **Net code delta:** −5 to −7 lines (1 line in panels-controller + 1 line in bootstrap fallback + 1 line in bootstrap log + minor comment trim).
  - **Commit message:** `refactor(24-5): drop legacy TT_BEAMER_UI_RUNTIME_PANELS alias (zero external readers)`

---

### W5.4 — INVENTORY post-SCC-fix verification (LOW risk, docs-only)

**Goal:** Re-run the §1.5 RESEARCH Node script + Tarjan SCC over the post-W5.3 graph; confirm zero non-trivial SCCs; update INVENTORY's "Cycle resolution" section with the post-W5 graph diff.

**Per-commit count:** 1.

**Estimated time:** 15–30 min.

**Commits:**

- [ ] **W5.4-C1 — INVENTORY post-W5.3 — SCC eliminated.**
  - **Files touched:** `.planning/phases/phase-24/wave-5/INVENTORY.md`.
  - **What changes:** Re-run the §1.5 RESEARCH script + Tarjan over the post-W5.3 HEAD; capture the output. Update INVENTORY's "Cycle resolution" section:
    - **Pre-W5 graph:** 101 file-graph nodes, 134 directed edges, 1 non-trivial SCC of size 2 (bootstrap ↔ panels-controller).
    - **Post-W5.3 graph:** 100 namespace-graph nodes (file count is still 101; one namespace `TT_BEAMER_UI_RUNTIME_PANELS` was removed), N directed edges (re-counted post-W5.3), 0 non-trivial SCCs (101 trivial SCCs).
    - **`madge`-equivalent gate:** "ROADMAP §Wave 5 → Acceptance → `madge` / equivalent shows zero cycles in `src/app/runtime/`. Verified by Tarjan SCC over the file → file edge graph built from `window.TT_BEAMER_*` reads/writes; 0 non-trivial SCCs at HEAD post-W5.3-C2."
    - Note the `madge`-vs-Tarjan-SCC discrepancy explicitly (RESEARCH §6.2): `madge` parses ES module `import` syntax which this codebase doesn't use; the equivalent is the §1.5 script.
  - **Verification:** `git diff --stat HEAD~..HEAD` shows only INVENTORY.md changes. `find src/app/runtime src/app/lib -name "*.js" | wc -l` returns 101 (no file removal).
  - **Commit message:** `docs(24-5): INVENTORY post-W5.3 — SCC eliminated, 0 non-trivial SCCs`

---

### W5.5 — Per-shim re-export audit INVENTORY (LOW risk, docs-only)

**Goal:** For each of the 6 W3 shims, document the load-bearing justification for keeping its re-exports. The audit confirms (negative result): no transitive re-export beyond `TT_BEAMER_UI_RUNTIME_PANELS` is removable. This satisfies the ROADMAP §"Wave 5 → Remove transitive re-exports nobody depends on" deliverable by documented evidence.

**Per-commit count:** 1.

**Estimated time:** 30–45 min (audit each shim + write findings).

**Commits:**

- [ ] **W5.5-C1 — INVENTORY per-shim re-export audit (6 shims documented as load-bearing).**
  - **Files touched:** `.planning/phases/phase-24/wave-5/INVENTORY.md`.
  - **What changes:** Update INVENTORY's "Per-shim re-export audit" section. For each of the 6 W3 shims, document:
    1. The shim's namespace and the count of keys re-exported.
    2. The list of sub-modules whose namespaces are re-exported through the shim.
    3. The external readers of the SHIM's namespace (must be at least one — confirmed via grep).
    4. The external readers of EACH sub-namespace (independently, via grep).
    5. The load-bearing justification (which key would break which consumer if removed).

    The 6 shims:

    | # | Shim file | Shim namespace | Sub-modules re-exported | Why load-bearing |
    |--:|-----------|----------------|--------------------------|------------------|
    | 1 | `runtime/viewport/runtime-projection-mapping.js` | `TT_BEAMER_RUNTIME_PROJECTION_MAPPING` (15 keys) | grid-state, gl-renderer, 2d-fallback, handle-ui, profile-persistence | orchestration destructures ~15 keys from the shim; board-profiles reads `getCornersForPersistence`. Removing the shim would break orchestration + board-profiles. |
    | 2 | `runtime/ui/animation-editor-view.js` | `TT_BEAMER_ANIMATION_EDITOR_VIEW` (7 keys) | shell, library-list, edit-pane, live-preview | orchestration calls `init` + `isOpen`; runtime-runtime-controls reads `open`/`isOpen`. Sub-namespaces have no external readers (sole consumer is the shim). |
    | 3 | `runtime/animation/runtime-animation-lifecycle.js` | `TT_BEAMER_RUNTIME_ANIMATION_LIFECYCLE` (16 keys) | lifecycle-state, stop-pipeline, live-editor, cluster-pads, running-list | orchestration destructures `closeLiveEditor` + others. Sub-modules cross-read `LIFECYCLE_STATE` directly (intentional sibling read; documented in shim header per RESEARCH §4.4). |
    | 4 | `runtime/panels/runtime-fx-panels.js` | `TT_BEAMER_RUNTIME_FX_PANELS` (28 keys) | room (6 keys), inside-outside (21 keys) | orchestration destructures ~10 keys from the shim. Sub-namespaces have no external readers (only the shim reads them). |
    | 5 | `runtime/polygon-editor/runtime-polygon-editor.js` | `TT_BEAMER_RUNTIME_POLYGON_EDITOR` (24 keys) | polygon-editor-handles | orchestration destructures 22 keys from the shim. Sub-namespace `POLYGON_EDITOR_HANDLES` has no external readers (only the shim reads it). |
    | 6 | `runtime/render/runtime-draw-loop.js` | `TT_BEAMER_RUNTIME_DRAW_LOOP` (? keys) | draw-loop-cluster-pads | orchestration destructures ~5 keys from the shim. Sub-namespace `DRAW_LOOP_CLUSTER_PADS` has no external readers. |

    Plus the 2 single-cluster wire shims (RESEARCH §4.3 last 2 rows):

    | # | Shim file | Shim namespace | Sub-modules | Why load-bearing |
    |--:|-----------|----------------|-------------|------------------|
    | 7 | `runtime/wire/runtime-wire-room-audio-binders.js` | `TT_BEAMER_RUNTIME_WIRE_ROOM_AUDIO_BINDERS` | bundle | orchestration calls; sub-namespace has no external reader. |
    | 8 | `runtime/wire/runtime-wire-fx-panel-binders.js` | `TT_BEAMER_RUNTIME_WIRE_FX_PANEL_BINDERS` | outside | orchestration calls; sub-namespace has no external reader. |

    For each row, the executor runs:
    ```bash
    # Per-shim consumer count (external readers of the shim):
    grep -rn "TT_BEAMER_RUNTIME_PROJECTION_MAPPING" src/ | grep -v "src/app/runtime/viewport/runtime-projection-mapping.js" | wc -l
    # ... and so on per shim.

    # Per-sub-namespace consumer count (external readers other than the parent shim):
    grep -rn "TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE" src/ | grep -v "src/app/runtime/viewport/runtime-projection-grid-state.js" | grep -v "src/app/runtime/viewport/runtime-projection-mapping.js" | wc -l
    # ... and so on per sub-namespace.
    ```
    Record the actual counts in INVENTORY's audit table. The expected pattern: shim has ≥1 external reader (orchestration); sub-namespace has 0–1 external readers (parent shim, or a sibling sub-namespace in the case of `LIFECYCLE_STATE`).

    Add a **conclusion paragraph**: "Negative result confirmed. Of the 9 namespaces audited (8 shims + the now-removed `TT_BEAMER_UI_RUNTIME_PANELS`), exactly 1 had zero external readers and was removable (W5.3-C2). The other 8 have genuine external consumers. ROADMAP §Wave 5 → Remove transitive re-exports nobody depends on is satisfied."
  - **Verification:** `git diff --stat HEAD~..HEAD` shows only INVENTORY.md changes. No `src/` files touched.
  - **Commit message:** `docs(24-5): INVENTORY per-shim re-export audit (8 namespaces, 1 removed, 7 load-bearing)`

---

### W5.6 — `<script>` load-order verification INVENTORY (LOW risk, docs-only)

**Goal:** Confirm the post-W5 `<script>` order in `index.html` satisfies all observed namespace dependencies. For every file F, every namespace F externally reads must be defined by a file loaded earlier (or co-loaded under `defer` with a smaller index in document order). This is partial protection against future cycles being introduced accidentally.

**Per-commit count:** 1.

**Estimated time:** 30–45 min (run the verification script + record findings).

**Commits:**

- [ ] **W5.6-C1 — INVENTORY `<script>` load-order verification post-W5.**
  - **Files touched:** `.planning/phases/phase-24/wave-5/INVENTORY.md`.
  - **What changes:** Run a verification script that, for every `.js` file F under `src/app/runtime/` + `src/app/lib/`, checks that every namespace F externally reads is defined by a file whose `<script>` tag appears earlier in `index.html`. Update INVENTORY's "`<script>` load-order verification" section with:
    - The total `<script>` tag count touching `src/app/` files (verified unchanged from `phase-24-w5-start`).
    - The full ordered list of `<script>` tags from `index.html` lines 805–911 (paste verbatim — this is the load-order canonical source of truth).
    - For each of the 100 namespaces: which file defines it + which `<script>` line that file is loaded at + the maximum `<script>` line of any external reader (must be greater than the definer's line — confirmed for every namespace).
    - **Special verification for the post-W5.3 SCC fix:** confirm that `runtime-panels-controller.js` (line 835) loads before `runtime-bootstrap.js` (line 907). The SCC resolution depends on this ordering staying stable.
    - **Special verification for `runtime-utils.js`:** confirm it loads first (`index.html:805`) — every consumer reads `TT_BEAMER_RUNTIME_UTILS` and assumes it's available at parse time.

    Verification script (paste output into INVENTORY):
    ```bash
    # Build index.html script-line → file-path mapping:
    grep -nE '<script src="/src/app' index.html | sed -E 's/^([0-9]+):.*src="(\/src\/app[^"]+)".*$/\1 \2/' > /tmp/w5/script-order.txt
    wc -l /tmp/w5/script-order.txt    # expected: matches the count from pre-flight baseline

    # For every (file, external-namespace-read) pair, verify the namespace's definer
    # appears at a smaller <script> line:
    node /tmp/w5/verify-load-order.cjs > /tmp/w5/load-order-violations.txt
    cat /tmp/w5/load-order-violations.txt    # expected: empty (no violations)
    ```
    The `verify-load-order.cjs` script is a simple harness: parse `/tmp/w5/script-order.txt`, parse the post-W5 §1.5 file-table (defines + external-refs per file), for each external read look up the definer's `<script>` line, assert it's less than the reader's `<script>` line. Output any violations.

    Add a **conclusion paragraph**: "Load order verified. All 100 namespaces have their definer's `<script>` tag preceding every external reader's `<script>` tag (or co-loaded under the `defer`-script document-order guarantee). The SCC resolution from W5.3 is stable as long as `index.html:835` (panels-controller) precedes `index.html:907` (bootstrap). Wave 5 has not edited `index.html` — `git diff phase-24-w5-start..HEAD -- index.html` returns empty."
  - **Verification:** `git diff --stat HEAD~..HEAD` shows only INVENTORY.md changes. `git diff phase-24-w5-start..HEAD -- index.html` returns empty.
  - **Commit message:** `docs(24-5): INVENTORY <script> load-order verification post-W5`

---

### W5.7 — End-of-W5 INVENTORY closure (LOW risk, docs-only, final)

**Goal:** Final verification pass; aggregate row in per-commit table; reminder for ROADMAP regression checklist; record any deviations + the wave-closure smoke result. Wave 5 closes here.

**Per-commit count:** 1.

**Estimated time:** 30–45 min (full ROADMAP regression manual smoke + INVENTORY closure).

**Commits:**

- [ ] **W5.7-C1 — INVENTORY end-of-W5 + acceptance verification.**
  - **Files touched:** `.planning/phases/phase-24/wave-5/INVENTORY.md`.
  - **What changes:**
    - Aggregate row added to per-commit progress table: 9 commits, 3 code-touching, 6 docs, net code delta +50 to +110 lines (recorded actual).
    - **End-of-W5 acceptance verification** section: explicit pass/fail per §2 acceptance criterion:
      - 0 non-trivial SCCs (Tarjan output recorded).
      - 101/101 modules have headers (grep output recorded).
      - `TT_BEAMER_UI_RUNTIME_PANELS` fully removed (grep output recorded: 0 hits).
      - 100/100 remaining namespaces resolve (DevTools snapshot recorded).
      - `node --check` clean on every modified file (verbatim outputs).
      - `<script>` order unchanged (`git diff phase-24-w5-start..HEAD -- index.html` empty).
      - Wire-protocol + localStorage literals unchanged (diffs against /tmp/w5 baselines empty).
      - `git diff -w` per code commit shows only intended structural change.
    - **ROADMAP regression checklist** section: paste the ROADMAP.md lines 203–275 checklist; mark each row PASS/FAIL after the manual smoke. Goal: every row PASS. If any row FAILS, the wave is BLOCKED — do not commit W5.7-C1; investigate the failure (likely culprit: W5.3-C2 missed a reader; revert and re-audit). Record the `node server.mjs` start time and the ~10–15 min smoke duration.
    - **Final aggregate row** in per-commit table summarizing the wave: 9 commits, files touched (5: `runtime-utils.js`, `polygon-contract.js`, `runtime-orchestration.js`, `runtime-bootstrap.js`, `runtime-panels-controller.js`, plus 16 lib/ files = 21 unique files), net LOC delta (recorded), namespace count delta (101 → 100).
    - **Decision-log** section: record any deviations from this PLAN as commits landed. If none, write "No deviations — PLAN executed as written."
    - **Tag** the rollback target stays at `phase-24-w5-start` = `6cfc682`. Record optional `phase-24-w5-end` tag at HEAD if the user wants a closure tag (default: skip — Wave 6 will land its own closure work).
    - **Hand-off to Wave 6:** brief paragraph noting that W5 has produced the inputs Wave 6 closure needs:
      - 100 namespace lock-list with all keys having ≥1 external reader.
      - 0 non-trivial SCCs.
      - 101/101 module headers.
      - All 6 W3 shims documented as load-bearing.
      - Tooling commit deferred to W6 (RESEARCH §9.3): adding the §1.5 script as `scripts/dev/extract-module-graph.cjs` is a reasonable W6 task.
  - **Manual ROADMAP regression smoke:** Boot fresh `node server.mjs`. Run through ROADMAP §"Test plan" lines 203–275 — every section: Boards & rooms, Play areas + clusters, Animations + dispatch, Tap-Action, `/output`, Align Mode, Theme + UI, Sounds, Export / Import, Live-sync. Total ~10–15 min. Record per-section pass/fail in INVENTORY.
  - **Verification:**
    ```bash
    # Final aggregate gate:
    git log --oneline phase-24-w5-start..HEAD | wc -l    # expected: 9 commits
    git log --oneline phase-24-w5-start..HEAD            # all messages match §4 commit-message column

    # Final namespace count + SCC count:
    grep -rohE "window\.TT_BEAMER_[A-Z_]+" src/ | sort -u | wc -l    # expected: 100
    node /tmp/w5/scc.cjs                                              # expected: 0 non-trivial SCCs

    # Final header coverage:
    for f in $(find src/app/runtime src/app/lib -name "*.js" | sort); do
      head -10 "$f" | grep -E '^\s*(//|/\*)' >/dev/null || echo "MISSING: $f"
    done    # expected: empty
    ```
  - **Commit message:** `docs(24-5): INVENTORY end-of-W5 — 9 commits + W5 closure verification`

---

## 5. Per-Commit Detail (Code-Touching Commits)

### 5.1 W5.2-C1 — The 20 missing-header files: canonical list

The 20 files come from RESEARCH §3.2 (line counts re-verified at pre-flight `phase-24-w5-start`). Listed in the order the executor edits them (lib/ files alphabetical, runtime/ files by RESEARCH §3.4 row position):

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

If any file in this list is no longer header-missing at pre-flight (e.g., a header was added in some intervening commit between RESEARCH and execution), drop it from the batch and record the deviation in INVENTORY's "Decisions" section. If a NEW file appears at pre-flight that isn't in this list, STOP — do not invent a header without a verified RESEARCH entry; re-run RESEARCH §3.

### 5.2 W5.2-C1 — Verbatim header text per file

The executor copies these headers verbatim (no paraphrasing). Each header ends with a blank line, then the existing first source-text line follows unchanged. Headers use `//` line comments only (no `/* */` blocks) per RESEARCH §6.3.

**Style (from RESEARCH §3.4):** noun-phrase opening, then 1–2 sentences on responsibilities. Match the existing 81 header style observed in §3.3: "Owns X. Y. Z." pattern. Avoid parentheses inside header text (RESEARCH §6.3 risk note); use hyphens or `[brackets]` instead. Keep concise: 1–4 lines per header.

---

**1. `src/app/lib/api/global-defaults-api.js`** — top of file is `(() => {`:

```js
// Global-defaults HTTP API facade. Wraps fetch with timeout + base-URL
// discovery for the persisted-config endpoints. Pure transport — no
// state, no caching; consumers (runtime-global-defaults) handle merge
// + persistence.
```

---

**2. `src/app/lib/boot/app-composition.js`** — top of file is `(() => {`:

```js
// Bootstrap composition. Wires the app-shell initializer through
// TT_BEAMER_BOOT.run; tiny glue layer between index.html load and
// the main runtime IIFE.
```

---

**3. `src/app/lib/boot/runtime-bootstrap.js`** — top of file is `(() => {`:

```js
// Runtime-bootstrap factory. Creates the BOOT object whose run method
// invokes the app initializer; the smallest useful module in the tree.
```

---

**4. `src/app/lib/domain/event-lifecycle.js`** — top of file is `(() => {`:

```js
// Event-lifecycle domain. Pure helpers for animation lifecycle math —
// is-this-event-expired checks, start-time + duration arithmetic.
// Used by both the dashboard runtime and the live-sync receiver.
```

---

**5. `src/app/lib/domain/live-sync-domain.js`** — top of file is `(() => {`:

```js
// Live-sync domain. Pure helpers for normalising the live-sync envelope
// shape across emit and receive paths; no IO, no state.
```

---

**6. `src/app/lib/domain/rooms.js`** — top of file is `(() => {`:

```js
// Rooms domain. Pure helpers — normalizeBoard, normalizeRoom,
// mergeRoomCatalog — used by every client of the rooms data
// shape - runtime, settings, live-sync, and persistence.
```

---

**7. `src/app/lib/input/interaction-guards.js`** — top of file is `(() => {`:

```js
// Input guards. Shared rapid-tap and touch-suppression helpers used
// by runtime-runtime-controls and orchestration to debounce repeated
// pointer events.
```

---

**8. `src/app/lib/persistence/board-profiles.js`** — top of file is `(() => {`:

```js
// Board-profile persistence. localStorage read/write plus JSON-schema
// validation for the tt-beamer.board-profiles.v3 key. Pure storage
// layer; the projection-mapping module owns the in-memory profile state.
```

---

**9. `src/app/lib/render/viewport-lifecycle.js`** — top of file is `(() => {`:

```js
// Viewport lifecycle. Window resize and orientationchange handler
// factory used by runtime-stage-viewport; encapsulates the rAF-coalesced
// resize callback so the stage module stays focused on geometry.
```

---

**10. `src/app/lib/shared/config.js`** — top of file is `(() => {`:

```js
// Shared config constants. Board catalog, animation-type registry,
// localStorage-key literals, ROOMS defaults, sound-mapping presets.
// Loaded first within the lib block so every consumer can read
// TT_BEAMER_CONFIG at parse time.
```

---

**11. `src/app/lib/shared/logger.js`** — top of file is `(() => {`:

```js
// Logger factory. createLogger - scope, ctx - returns a tiny logger
// with info/warn/error methods that emit structured payloads to console
// and feed the live-sync log relay when one is wired.
```

---

**12. `src/app/lib/shared/normalizers.js`** — top of file is `(() => {`:

```js
// Shared normalizers. Pure data-shape helpers - normalizeAnimationSoundMap,
// normalizeQuickMode, normalizePerRoomOpacityMap, etc. - used by both
// runtime and any future test harness. Reads TT_BEAMER_CONFIG for
// canonical defaults.
```

---

**13. `src/app/lib/shared/runtime-env.js`** — top of file is `(() => {`:

```js
// Runtime-env constants. Output role detection - CONTROL vs FINAL -
// plus the OUTPUT_ROLE_FINAL string constant used by orchestration
// to gate output-only behaviour.
```

---

**14. `src/app/lib/state/live-sync-state.js`** — top of file is `(() => {`:

```js
// Live-sync state factory. createDefaultLiveSyncState builds the shape
// of state.liveSync used by runtime-live-sync-core to track connection
// status, retry timers, and the last-applied envelope.
```

---

**15. `src/app/lib/state/runtime-state.js`** — top of file is `(() => {`:

```js
// Runtime-state factory. createDefaultState composes the full per-board
// and per-room state maps that orchestration's bootstrap.init populates
// and that every sub-module reads via ctx.state.
```

---

**16. `src/app/lib/ui/runtime-panels-controller.js`** — top of file is `(() => {`. NOTE: this file is touched again by W5.3-C2 — the W5.2 header should NOT mention "legacy alias", since C2 will remove it:

```js
// Runtime-panels controller. Owns syncRuntimePanelsFromState which
// fans out to every panel-sync helper - room list, animation editor,
// align-mode panel, board zoom, dashboard-zone visibility, mobile
// performance status. Exposes TT_BEAMER_RUNTIME_PANELS for bootstrap
// to invoke during initial load.
```

---

**17. `src/app/lib/ui/settings/rooms.js`** — top of file is `(() => {`:

```js
// Settings/rooms UI helpers. Small DOM-side helpers used by the rooms
// settings subtab; kept under lib/ui/settings/ to mirror the directory
// shape of the settings pane.
```

---

**18. `src/app/runtime/core/polygon-contract.js`** — top of file is `(() => {`:

```js
// Polygon clip contract. Pure geometry helpers - clipPolygon,
// polygonBounds, normalizePolygonPoint, etc. - used by canvas-clip
// and gif-decoder for room-shaped masking. No runtime state.
// Reads TT_BEAMER_RUNTIME_UTILS.clamp01 for normalised-coord clamps.
```

---

**19. `src/app/runtime/runtime-orchestration.js`** — top of file is `const { … } = …` (NO IIFE wrapper). Header goes at the very top of the file, line 1:

```js
// Runtime orchestration shell. Wires every runtime sub-module together
// via the BOOTSTRAP.init dep-bag - see runtime-orchestration-ctx-builder.js
// for the 95-key bag and its 17 area-divider banners. Sanctioned
// residual size per ROADMAP exception. No public namespace; consumes
// the post-W5 set of 100 sibling namespaces via destructure.
```

---

**20. `src/app/runtime/runtime-utils.js`** — top of file is `(() => {`:

```js
// Runtime utilities. Shared helpers - clamp, clamp01, bboxOfPolygon -
// used by polygon, viewport, audio, gif, and editor modules. Pure
// functions, no state. Loaded first in the runtime block so every
// consumer can read TT_BEAMER_RUNTIME_UTILS at parse time.
```

---

### 5.3 W5.3-C1 — Defensive write removal (full diff specification)

**File:** `src/app/runtime/core/runtime-bootstrap.js`

**Pre-edit content (lines 16–32):**

```js
  function syncRuntimePanelsFromState() {
    const runtimePanelsApi = window.TT_BEAMER_RUNTIME_PANELS ?? window.TT_BEAMER_UI_RUNTIME_PANELS ?? null;
    if (!runtimePanelsApi || typeof runtimePanelsApi.syncRuntimePanelsFromState !== "function") {
      ctx.logBootstrap.warn("runtime_panels_missing", {
        event: "runtime-panels-missing",
        hasCanonical: Boolean(window.TT_BEAMER_RUNTIME_PANELS),
        hasLegacy: Boolean(window.TT_BEAMER_UI_RUNTIME_PANELS),
      });
      return;
    }
    if (!window.TT_BEAMER_RUNTIME_PANELS) {
      window.TT_BEAMER_RUNTIME_PANELS = runtimePanelsApi;
    }
    if (!window.TT_BEAMER_UI_RUNTIME_PANELS) {
      window.TT_BEAMER_UI_RUNTIME_PANELS = runtimePanelsApi;
    }

    runtimePanelsApi.syncRuntimePanelsFromState({
```

**Edit operation:** delete lines 26–31 (the two `if (!window.X) window.X = ...` blocks; the blank line at 32 stays). Use the `Edit` tool with:

- `old_string`:
  ```
      if (!window.TT_BEAMER_RUNTIME_PANELS) {
        window.TT_BEAMER_RUNTIME_PANELS = runtimePanelsApi;
      }
      if (!window.TT_BEAMER_UI_RUNTIME_PANELS) {
        window.TT_BEAMER_UI_RUNTIME_PANELS = runtimePanelsApi;
      }

  ```
- `new_string`: empty string (the trailing blank line of the deleted block is also removed; the blank line that followed the deleted block is preserved)

**Post-edit content (lines 16–26):**

```js
  function syncRuntimePanelsFromState() {
    const runtimePanelsApi = window.TT_BEAMER_RUNTIME_PANELS ?? window.TT_BEAMER_UI_RUNTIME_PANELS ?? null;
    if (!runtimePanelsApi || typeof runtimePanelsApi.syncRuntimePanelsFromState !== "function") {
      ctx.logBootstrap.warn("runtime_panels_missing", {
        event: "runtime-panels-missing",
        hasCanonical: Boolean(window.TT_BEAMER_RUNTIME_PANELS),
        hasLegacy: Boolean(window.TT_BEAMER_UI_RUNTIME_PANELS),
      });
      return;
    }

    runtimePanelsApi.syncRuntimePanelsFromState({
```

**Net delta:** −6 lines (two 3-line `if` blocks plus one blank line, minus the preserved trailing blank between the closing `}` of the warn-return block and the call). **`hasLegacy` stays in C1**; W5.3-C2 drops it.

### 5.4 W5.3-C2 — Legacy alias removal (full diff specification)

**File 1:** `src/app/lib/ui/runtime-panels-controller.js`

**Pre-edit content (lines 71–74):**

```js
  // Keep the canonical runtime key and the legacy UI key in sync so
  // bootstrap/load-order checks remain deterministic across browsers.
  window.TT_BEAMER_RUNTIME_PANELS = runtimePanelsApi;
  window.TT_BEAMER_UI_RUNTIME_PANELS = runtimePanelsApi;
```

**Edit operation:** replace the comment + delete the alias write. Use the `Edit` tool with:

- `old_string`:
  ```
    // Keep the canonical runtime key and the legacy UI key in sync so
    // bootstrap/load-order checks remain deterministic across browsers.
    window.TT_BEAMER_RUNTIME_PANELS = runtimePanelsApi;
    window.TT_BEAMER_UI_RUNTIME_PANELS = runtimePanelsApi;
  ```
- `new_string`:
  ```
    // Expose the runtime panels API so bootstrap can read it and
    // sync via syncRuntimePanelsFromState during initial load.
    window.TT_BEAMER_RUNTIME_PANELS = runtimePanelsApi;
  ```

**Net delta on this file:** −1 line (one comment line text changed; one alias-write line deleted). The 2-line comment text shifts from "canonical/legacy in sync" to "expose for bootstrap".

---

**File 2:** `src/app/runtime/core/runtime-bootstrap.js`

**Pre-edit content (lines 16–25 post-W5.3-C1):**

```js
  function syncRuntimePanelsFromState() {
    const runtimePanelsApi = window.TT_BEAMER_RUNTIME_PANELS ?? window.TT_BEAMER_UI_RUNTIME_PANELS ?? null;
    if (!runtimePanelsApi || typeof runtimePanelsApi.syncRuntimePanelsFromState !== "function") {
      ctx.logBootstrap.warn("runtime_panels_missing", {
        event: "runtime-panels-missing",
        hasCanonical: Boolean(window.TT_BEAMER_RUNTIME_PANELS),
        hasLegacy: Boolean(window.TT_BEAMER_UI_RUNTIME_PANELS),
      });
      return;
    }
```

**Edit operations (two atomic Edit-tool calls in the same commit):**

1. **Drop the `?? window.TT_BEAMER_UI_RUNTIME_PANELS` half of the fallback chain at line 17.** Use the `Edit` tool with:
   - `old_string`: `    const runtimePanelsApi = window.TT_BEAMER_RUNTIME_PANELS ?? window.TT_BEAMER_UI_RUNTIME_PANELS ?? null;`
   - `new_string`: `    const runtimePanelsApi = window.TT_BEAMER_RUNTIME_PANELS ?? null;`

2. **Drop the `hasLegacy` log field at line 22.** Use the `Edit` tool with:
   - `old_string`:
     ```
           hasCanonical: Boolean(window.TT_BEAMER_RUNTIME_PANELS),
           hasLegacy: Boolean(window.TT_BEAMER_UI_RUNTIME_PANELS),
     ```
   - `new_string`:
     ```
           hasCanonical: Boolean(window.TT_BEAMER_RUNTIME_PANELS),
     ```

**Optional W5.2 header micro-edit:** if the W5.2 header for `src/app/runtime/core/runtime-bootstrap.js` (which is one of the 81 files that ALREADY has a substantive header — pre-W5 line count 8 header lines per RESEARCH §1.4) mentions "canonical/legacy delegation" or similar, trim "/legacy" in the same C2 commit. Per W4-style precedent, header text that mechanically references a deleted construct is updated in the same commit. The pre-W5 header on `runtime-bootstrap.js` (lines 1–8 of that file) reads:

> `// application bootstrap module.`
> `//`
> `// Owns syncRuntimePanelsFromState (runtime panel wire-up via the`
> `// canonical/legacy TT_BEAMER_RUNTIME_PANELS delegation) and`

Update this text in C2. Use the `Edit` tool with:
   - `old_string`: `// Owns syncRuntimePanelsFromState (runtime panel wire-up via the`
                   `// canonical/legacy TT_BEAMER_RUNTIME_PANELS delegation) and`
   - `new_string`: `// Owns syncRuntimePanelsFromState (runtime panel wire-up via`
                   `// the TT_BEAMER_RUNTIME_PANELS namespace) and`

**Net delta on this file:** −2 lines (one fallback-chain trim; one `hasLegacy` log field deletion; the header micro-edit is line-neutral, just a 2-line text update).

---

**Aggregate net delta for W5.3-C2:** −3 to −4 lines across the 2 files plus ~2 lines of comment text updates.

---

## 6. Public-API Lock-List (carried forward from W4 INVENTORY, ADJUSTED for W5)

### 6.1 Top-level `window.TT_BEAMER_*` namespace keys

Pre-W5: 101 (W4 INVENTORY-recorded set).
Post-W5: **100** (101 minus `TT_BEAMER_UI_RUNTIME_PANELS` removed in W5.3-C2).

Verifier:

```bash
grep -rohE "window\.TT_BEAMER_[A-Z_]+" src/ | sort -u
```

**This is the only intentional namespace surface change in W5.** All 100 remaining keys are byte-identical to their W4 lock-list entries.

### 6.2 Wire-protocol message-type literals (LOCKED — UNCHANGED)

Verifier (must return identical output pre and post W5):

```bash
grep -rohE 'emitLiveMutation\("[a-z-]+"' src/app/runtime/ | sort -u
```

Expected pre/post W5: 9 literals — `clear-all`, `context-update`, `edit-room`, `outside-update`, `stop-animation`, `trigger-global`, `trigger-room`, `live-receive-ack`, `live-apply-ack` (W4 INVENTORY set).

**No W5 commit touches these strings.** W5 is structural-only; wire protocol is not in scope.

### 6.3 localStorage / JSON-schema string literals (LOCKED — UNCHANGED)

Verifier (must return identical output pre and post W5):

```bash
grep -rohE "['\"]tt-beamer[a-zA-Z0-9._-]+['\"]" src/ | sort -u
```

Expected pre/post W5: 13 literals (W4 INVENTORY set, exact list reproduced from W4 §6.3).

**No W5 commit touches these strings.**

### 6.4 Aggregate lock-list summary

| Category | Pre-W5 count | Post-W5 count | Verifier |
|----------|-------------:|--------------:|----------|
| Top-level `window.TT_BEAMER_*` namespace keys | 101 | **100** (−1: `TT_BEAMER_UI_RUNTIME_PANELS`) | §6.1 |
| Wire-protocol message-type literals | 9 | 9 (unchanged) | §6.2 |
| localStorage / JSON-schema string literals | 13 | 13 (unchanged) | §6.3 |
| **TOTAL** | **123** | **122** | — |

The single removal is documented in W5.3-C2 + W5.4 INVENTORY as the intentional surface reduction sanctioned by ROADMAP §"Wave 5 → Remove transitive re-exports nobody depends on".

---

## 7. Per-Commit Task Structure

### 7.1 Per-commit primary gate

Every W5 commit (code or docs) must pass the following gate before the executor commits:

| # | Gate | Command / Check | Applies to |
|--:|------|-----------------|------------|
| 1 | Pre-edit grep at affected target shows expected baseline | (per-commit verbatim — see §4 / §5) | code |
| 2 | Edit applied per §4 / §5 specification | (the change itself) | code + docs |
| 3 | Post-edit grep at affected target verifies the change took | (per-commit verbatim) | code |
| 4 | `node --check` clean for every modified `.js` | `node --check <each file>` exits 0 | code |
| 5 | Namespace-key parity holds | §6.1 verifier (101 pre-W5.3-C2; 100 post) | code |
| 6 | Wire-protocol literals unchanged | §6.2 verifier byte-identical | code |
| 7 | localStorage literals unchanged | §6.3 verifier byte-identical | code |
| 8 | `<script>` order unchanged | `git diff HEAD~..HEAD -- index.html` empty | code + docs |
| 9 | `git diff -w` shows only intended change | `git diff -w HEAD~..HEAD -- src/` matches §4 / §5 | code |
| 10 | INVENTORY row appended | edit `.planning/phases/phase-24/wave-5/INVENTORY.md` | all |
| 11 | Atomic commit with §4-spec message | `git commit -m "..."` | all |

**If any gate fails:** STOP. Investigate. The most common failure for code commits: gate 5 (namespace parity) — usually means a sed regex or Edit call accidentally modified the namespace export; revert and retry with the exact `Edit old_string`/`new_string` pairs from §5. For docs commits: gate 10 may be redundant (the docs commit IS the INVENTORY row); skip gracefully.

### 7.2 Per-sub-wave smoke

Browser-load smoke (manual, per W3/W4 norm):

- **End of W5.1:** N/A (docs only).
- **End of W5.2:** boot fresh `node server.mjs`. Confirm dashboard loads, `Status: Ready` appears, no new console errors. Trigger one cluster-pad animation. Comment-only diffs cannot break parse or runtime; this is a sanity check.
- **End of W5.3-C1:** see W5.3-C1 manual smoke in §4.
- **End of W5.3-C2:** see W5.3-C2 manual smoke in §4. This is the wave's most invasive moment (drops a namespace) and must verify the runtime still works.
- **End of W5.4–W5.6:** N/A (docs only).
- **End of W5.7 (wave closure):** full ROADMAP regression checklist (all 11 sections, ~10–15 min).

### 7.3 Why Wave 5 commits are SAFER than W3 / W4 commits

Wave 3 moved code between IIFEs (a missed export could leave a sub-module dangling). Wave 4 changed identifiers (a missed reference resolved `undefined` at call time → silent no-op). **Wave 5 changes module STRUCTURE only**:

- W5.2 (header batch) is **purely additive comment lines** — no logic line moves, no identifier renames, no namespace changes. Cannot break parse or runtime.
- W5.3-C1 (defensive write removal) deletes 6 lines that are **dead under correct `<script>` load order** — the deletion is a no-op at runtime. The block can never fire (RESEARCH §2.2 verified). The smoke probe at lines 19–25 stays as the load-order canary.
- W5.3-C2 (alias removal) deletes references to a namespace with **zero external readers** (RESEARCH §4.2 exhaustive grep). The `TT_BEAMER_UI_RUNTIME_PANELS` removal is mechanically safe.
- W5.4–W5.7 are docs-only.

The verification per code commit is mechanical: pre-edit grep matches RESEARCH; post-edit grep confirms the documented change. Bisect granularity is tight (1 file per code commit for W5.3; 20 files in 1 commit for W5.2 — but W5.2 cannot break anything).

---

## 8. End-of-Wave Gate

Wave 5 closure requires ALL of the following to be true at HEAD before the W5.7-C1 commit message references "W5 closure verification":

- [ ] **All 9 commits landed:** 1 baseline INVENTORY (W5.1-C1) + 1 header batch (W5.2-C1) + 2 SCC-resolution commits (W5.3-C1, W5.3-C2) + 1 SCC-fix INVENTORY (W5.4-C1) + 1 per-shim audit INVENTORY (W5.5-C1) + 1 `<script>` load-order INVENTORY (W5.6-C1) + 1 closure INVENTORY (W5.7-C1).
  ```bash
  git log --oneline phase-24-w5-start..HEAD | wc -l    # expected: 9
  ```
- [ ] **101/101 modules in `src/app/runtime/` and `src/app/lib/` have header comments:**
  ```bash
  for f in $(find src/app/runtime src/app/lib -name "*.js" | sort); do
    head -10 "$f" | grep -E '^\s*(//|/\*)' >/dev/null || echo "MISSING: $f"
  done
  # Expected: empty.
  ```
- [ ] **Tarjan SCC over the post-W5 namespace graph: 0 non-trivial SCCs:**
  ```bash
  node /tmp/w5/scc.cjs
  # Expected: "0 non-trivial SCCs (101 trivial SCCs)" or equivalent.
  ```
- [ ] **`TT_BEAMER_UI_RUNTIME_PANELS` is fully removed:**
  ```bash
  grep -rn "TT_BEAMER_UI_RUNTIME_PANELS" src/    # expected: 0 hits
  ```
- [ ] **Public namespace count is exactly 100:**
  ```bash
  grep -rohE "window\.TT_BEAMER_[A-Z_]+" src/ | sort -u | wc -l    # expected: 100
  ```
- [ ] **W4 lock-list (9 wire + 13 LS literals) BYTE-IDENTICAL pre/post W5:**
  ```bash
  diff <(grep -rohE 'emitLiveMutation\("[a-z-]+"' src/app/runtime/ | sort -u) /tmp/w5/wire-pre.txt
  diff <(grep -rohE "['\"]tt-beamer[a-zA-Z0-9._-]+['\"]" src/ | sort -u) /tmp/w5/ls-pre.txt
  # Both empty.
  ```
- [ ] **`node --check` clean across the 5 code-touching files** (W5.2 modifies 20 files; W5.3 modifies 2; some overlap):
  ```bash
  for f in src/app/runtime/runtime-utils.js \
           src/app/runtime/core/polygon-contract.js \
           src/app/runtime/runtime-orchestration.js \
           src/app/runtime/core/runtime-bootstrap.js \
           src/app/lib/ui/runtime-panels-controller.js \
           $(find src/app/lib -name "*.js"); do
    node --check "$f" || echo "FAIL: $f"
  done
  # Expected: empty.
  ```
- [ ] **`<script>` order verified unchanged:**
  ```bash
  git diff phase-24-w5-start..HEAD -- index.html    # expected: empty
  ```
- [ ] **Net code-line delta ~+50 to ~+110 lines:**
  ```bash
  git diff --stat phase-24-w5-start..HEAD -- src/ | tail -1
  # Expected: insertions in the +60..+120 range, deletions in the -10..-15 range,
  # net +50 to +110.
  ```
- [ ] **`git diff -w` per code commit shows ONLY intended structural change:**
  - W5.2-C1: 20 files, only additive comment lines.
  - W5.3-C1: 1 file (`runtime-bootstrap.js`), only the 6-line deletion.
  - W5.3-C2: 2 files, only the alias-write deletion + fallback trim + `hasLegacy` removal + 2-line comment update + (if applicable) header micro-edit.
- [ ] **`INVENTORY.md` complete:** baseline + per-commit table fully populated + cycle-resolution + header inventory + per-shim audit + `<script>` load-order verification + decision-log + final aggregate row.
- [ ] **Full ROADMAP regression checklist passes** (ROADMAP.md lines 203–275, ~10–15 min manual smoke on fresh `node server.mjs` start). The smoke pass result is recorded in INVENTORY's "End-of-W5 acceptance verification" → "ROADMAP regression checklist" section.

If any item fails: STOP. Investigate. Likely culprits: W5.2 added a header that overflows the 10-line head-grep window (unlikely — all §5.2 headers are ≤4 lines); W5.3-C2 missed a reader (re-audit `grep -l "TT_BEAMER_UI_RUNTIME_PANELS"` against pre-C2 HEAD, including `index.html` and any test files). Re-check with the per-commit gates from §7.1.

---

## 9. INVENTORY.md plan

`.planning/phases/phase-24/wave-5/INVENTORY.md` mirrors the W1/W2/W3/W4 INVENTORY format. Skeleton:

```markdown
# Phase 24 Wave 5 — INVENTORY

Tracks per-commit progress for Wave 5 module-boundary cleanup.

## Baseline (pre-flight, captured against `phase-24-w5-start`)

- **Tag:** `phase-24-w5-start` → `6cfc682` (commit `docs(24-4): INVENTORY end-of-W4 — 12 commits + W4 closure verification`).
- **Captured:** 2026-04-26.
- **Tree size:** 101 .js files (84 in src/app/runtime/, 17 in src/app/lib/); 101 namespaces.
- **Header coverage:** 81/101 with substantive header (≥1 line); 20/101 missing.
- **SCC count:** 1 non-trivial SCC of size 2 (`runtime-bootstrap.js` ↔ `runtime-panels-controller.js`).
- **`<script>` count:** (pasted from index.html lines 805–911 — exact count).

### Per-file table (RESEARCH §1.4)

(Paste 101-row file | lines | hdr | defines | external-refs table from RESEARCH §1.4.)

### Pre-W5 namespace snapshot

(101 keys; full DevTools `Object.keys(window).filter(k => k.startsWith("TT_BEAMER_")).sort()` dump captured at `phase-24-w5-start`. Plus per-namespace inner-key sets for the 8 audited shims + UI_RUNTIME_PANELS.)

### Public API lock-list — pre-flight snapshot

- 9 wire-protocol literals (paste from /tmp/w5/wire-pre.txt).
- 13 localStorage / JSON-schema literals (paste from /tmp/w5/ls-pre.txt).

### 20 missing-header files (pre-W5.2)

(Paste from /tmp/w5/missing-headers-pre.txt; verify matches §5.1 of PLAN.)

### Pre-flight smoke

(Record any pre-existing console oddities before W5.1-C1 lands; record `runtime_panels_missing` warn behavior — should not fire under correct load order.)

## Decisions (confirmed pre-flight)

- **ctx-arrow-callback patterns OUT OF SCOPE.** 836 patterns documented as load-bearing per RESEARCH §2.5 + §6.5.
- **6 W3 shim re-exports KEPT.** Audited as load-bearing per RESEARCH §4.3.
- **Only `TT_BEAMER_UI_RUNTIME_PANELS` targeted for removal.** Zero external readers (RESEARCH §4.2).
- **W5.3 split into C1 + C2** for revertability + bisect granularity.
- **`madge`-vs-Tarjan-SCC discrepancy** documented (this codebase has no ES module imports; `madge` cannot run; equivalent is RESEARCH §1.5 Tarjan over namespace graph).
- **Orchestration shell header style: CONCISE** (4 lines pointing to ctx-builder; not a 70-line "list of 69 namespaces").
- **Tooling commit DEFERRED to Wave 6** (the §1.5 Node script as `scripts/dev/extract-module-graph.cjs`).

## Per-commit progress

| Commit | Hash | Sub-wave | Type | Files | Lines (Δ) | Pre-grep | Edit | Post-grep | `node --check` | NS OK | `<script>` OK | Notes |
|--------|------|----------|------|------:|----------:|----------|------|-----------|----------------|-------|----------------|-------|
| W5.1-C1 | `<hash>` | W5.1 | docs | 1 (INVENTORY) | n/a | n/a | yes | n/a | n/a | yes (101) | yes | baseline + per-file table + decisions |
| W5.2-C1 | `<hash>` | W5.2 | code | 20 | +60..+120 | yes (20 missing) | yes | yes (0 missing) | yes | yes (101) | yes | header batch; comment-only diff |
| W5.3-C1 | `<hash>` | W5.3 | code | 1 (runtime-bootstrap) | -6 | yes (defensive block) | yes | yes (block gone) | yes | yes (101) | yes | SCC resolved; smoke pass clean |
| W5.3-C2 | `<hash>` | W5.3 | code | 2 (panels-controller + runtime-bootstrap) | -3..-4 | yes (5+ alias hits) | yes | yes (0 alias hits) | yes | yes (100) | yes | alias dropped; namespace count drops 101→100 (intentional) |
| W5.4-C1 | `<hash>` | W5.4 | docs | 1 (INVENTORY) | n/a | n/a | yes | n/a | n/a | yes (100) | yes | post-SCC graph + Tarjan re-run |
| W5.5-C1 | `<hash>` | W5.5 | docs | 1 (INVENTORY) | n/a | n/a | yes | n/a | n/a | yes (100) | yes | 8 shim re-export audit; load-bearing confirmation |
| W5.6-C1 | `<hash>` | W5.6 | docs | 1 (INVENTORY) | n/a | n/a | yes | n/a | n/a | yes (100) | yes | <script> order verified; 0 violations |
| W5.7-C1 | `<hash>` | W5.7 | docs | 1 (INVENTORY) | n/a | n/a | yes | n/a | n/a | yes (100) | yes | end-of-W5 closure + ROADMAP regression result |
| **Σ** | — | — | — | **21 unique** | **+50..+110** | — | — | — | all yes | yes (100) | all yes | — |

## Cycle resolution

### Pre-W5 graph

(101 file-graph nodes, 134 directed edges. 1 non-trivial SCC of size 2: bootstrap ↔ panels-controller. RESEARCH §2.1 details.)

### Post-W5.3 graph

(101 file-graph nodes, N edges (re-counted post-W5.3), 0 non-trivial SCCs, 101 trivial SCCs. The bootstrap → panels-controller edge becomes one-way after W5.3-C1.)

### `madge`-equivalent gate

(Tarjan output recorded; ROADMAP §"`madge` zero cycles" gate satisfied. Documented discrepancy: `madge` parses ES module syntax; this codebase uses IIFE-with-window-globals; the equivalent is RESEARCH §1.5 Tarjan SCC.)

## Header inventory

(20 files + their assigned headers from PLAN §5.2 — paste verbatim post-W5.2 to capture the exact text landed.)

## Per-shim re-export audit

(8 namespaces audited — 6 W3 shims + 2 wire shims + the now-removed UI_RUNTIME_PANELS. For each: shim namespace, sub-modules, external readers per shim/sub-namespace, load-bearing justification. PLAN §4 W5.5 table populated with actual grep counts.)

## `<script>` load-order verification

(Full ordered list from `index.html` lines 805–911. Per-namespace definer-line vs reader-max-line table. 0 violations confirmed.)

## Public API lock-list verification

### Pre-W5 vs Post-W5 namespace-key snapshot

```
$ diff /tmp/w5/ttkeys-pre.txt /tmp/w5/ttkeys-post.txt
< TT_BEAMER_UI_RUNTIME_PANELS
$ wc -l /tmp/w5/ttkeys-pre.txt /tmp/w5/ttkeys-post.txt
101 /tmp/w5/ttkeys-pre.txt
100 /tmp/w5/ttkeys-post.txt
```

(Documented intentional reduction.)

### Per-namespace inner-key set verification

(For each of the 100 remaining namespaces, `Object.keys(window.TT_BEAMER_…)` pre vs post — MUST be empty diff.)

### Wire-protocol literals verification (9 items)

```
$ diff <(grep -rohE 'emitLiveMutation\("[a-z-]+"' src/app/runtime/ | sort -u) /tmp/w5/wire-pre.txt
(empty)
```

### localStorage / JSON-schema literals verification (13 items)

```
$ diff <(grep -rohE "['\"]tt-beamer[a-zA-Z0-9._-]+['\"]" src/ | sort -u) /tmp/w5/ls-pre.txt
(empty)
```

## Decision-log

(Deviations from PLAN are recorded here as commits land. Format: per-deviation paragraph with PLAN-section / commit-hash / rationale.)

## Tags

- `phase-24-w5-start` (`6cfc682`) — set during pre-flight; rollback target.
- `phase-24-w5-end` (`<hash>`) — optional, set after W5.7-C1 if the user wants a wave-closure tag.

## End-of-W5 acceptance verification

(Filled in at end of wave with the gate checks from PLAN §8 passing/failing. Includes the full ROADMAP regression checklist results — every section pass/fail per ROADMAP.md lines 203–275 — and a note on any residual deviations.)

## Hand-off to Wave 6

(Brief paragraph confirming W5 has produced the inputs Wave 6 closure needs: 100-namespace lock-list, 0 SCCs, 101/101 module headers, 8 shim audits documented, tooling commit deferred.)

## Wave 5 commits

| Commit | Hash | Message |
|--------|------|---------|
| W5.1-C1 | `<hash>` | docs(24-5): module-graph baseline + W5 INVENTORY initial |
| W5.2-C1 | `<hash>` | refactor(24-5): add header comments to 20 modules without one |
| W5.3-C1 | `<hash>` | refactor(24-5): drop runtime-bootstrap defensive panels-namespace write (resolves SCC) |
| W5.3-C2 | `<hash>` | refactor(24-5): drop legacy TT_BEAMER_UI_RUNTIME_PANELS alias (zero external readers) |
| W5.4-C1 | `<hash>` | docs(24-5): INVENTORY post-W5.3 — SCC eliminated, 0 non-trivial SCCs |
| W5.5-C1 | `<hash>` | docs(24-5): INVENTORY per-shim re-export audit (8 namespaces, 1 removed, 7 load-bearing) |
| W5.6-C1 | `<hash>` | docs(24-5): INVENTORY <script> load-order verification post-W5 |
| W5.7-C1 | `<hash>` | docs(24-5): INVENTORY end-of-W5 — 9 commits + W5 closure verification |
```

---

## 10. Risks + Mitigations Specific to Wave 5

| # | Risk | Mitigation |
|---|------|------------|
| 1 | **Header text quality.** A poorly-written header is worse than none — it adds noise without orienting the reader. | This PLAN proposes the EXACT verbatim header text for each of the 20 files in §5.2. The executor copies them in with no rewriting. If a header is contested post-commit, that file gets its own follow-up commit (revert W5.2-C1, rewrite the contested file's header alone, re-commit). The §5.2 headers are styled to match the existing 81 substantive headers (RESEARCH §3.3 spot-check: "Owns X. Y. Z." pattern), so they read as a continuation of the existing house style. |
| 2 | **Dropping a re-export breaks something silently.** The W5.3-C2 alias removal is the wave's only "delete a public surface" operation; if RESEARCH §4.2's "zero external readers" claim missed a reader, removing the alias breaks that reader silently. | RESEARCH §4.2 was exhaustive: `grep -rn "TT_BEAMER_UI_RUNTIME_PANELS" src/` found 8 hits across exactly 2 files (both definers); `grep -l` of the same pattern returned the same 2 files. §3 pre-flight re-runs the same grep at HEAD `6cfc682` to re-verify. W5.3-C2's manual browser smoke specifically checks `typeof window.TT_BEAMER_UI_RUNTIME_PANELS === "undefined"` AFTER the deletion, so any silent reader would surface a `TypeError` or undefined-property access. C2 lands as its own atomic commit so revert is one `git revert HEAD`. |
| 3 | **Module-graph tool unavailable.** ROADMAP imagines `madge` as a literal tool. `madge` parses ES module syntax; this codebase uses IIFE-with-window-globals and has no `import` statements. | The ROADMAP's "or equivalent" clause is honoured by the §1.5 RESEARCH Node script + Tarjan-SCC-over-namespace-graph harness. Documented explicitly in INVENTORY's "Cycle resolution" section so future readers don't expect literal `madge` output. |
| 4 | **`<script>` load order assumption breaks.** W5.3-C1's defensive-write deletion depends on `runtime-panels-controller.js` (`index.html:835`, `defer`) parsing before `runtime-bootstrap.js` (`index.html:907`, `defer`). If a future refactor reorders these tags, the cycle could re-appear and the smoke probe at `runtime-bootstrap.js:19–25` would fire. | The `runtime_panels_missing` warn is the canary — it stays in the file and will fire at boot if load order breaks. W5.6 verifies the post-W5 load order has the panels-controller tag preceding the bootstrap tag and records this in INVENTORY. Wave 5 itself does NOT edit `index.html`. |
| 5 | **`runtime-orchestration.js` has no IIFE wrapper.** Unlike the other 19 header-missing files, `runtime-orchestration.js` is a top-level script (line 1 starts with `const { … } = …`). The `Edit` tool's standard "insert above `(() => {`" pattern does not apply. | §5.2 row 19 explicitly notes this: the header is inserted at the very top of the file (line 1), above the existing first non-comment line. The verification grep `head -10 "$f" | grep -E '^\s*(//|/\*)'` still works (header is in the first 10 lines). |
| 6 | **Header text contains parentheses → could trip a regex-based future scanner.** RESEARCH §6.3 risk note: a header like "BOOTSTRAP.init dep-bag (see ...)" might be mis-identified as an IIFE start by a regex `/^\(\(\)/`. | §5.2 headers avoid `(...)` in favor of hyphens or `[brackets]`. The post-edit verification `grep -c "^(() => {" "$f"` still returns the same count (1 for IIFE-wrapped files; 0 for `runtime-orchestration.js`) — header text on a line that starts with `//` won't match a regex anchored to `^(() => {`. |
| 7 | **W5.2 atomicity (20 files in one commit).** ROADMAP §"One commit per logical refactor" is satisfied because all 20 are the SAME logical change (add a header comment). But if any single file's header is contested, the whole batch is reverted and re-applied. | ROADMAP's "logical refactor" granularity is interpreted at the change-type level (one commit per kind of change, not per file when the change is identical). W5.2's per-file `git diff -w` is small (3–6 lines, all comment additions). If any single file's header is contested post-commit, that file gets its own follow-up commit (revert this commit, fix the contested file's header alone, re-commit the batch minus that file). The follow-up overhead is at most one extra commit; bisect-granularity is preserved per-file via reading the commit's diff. |
| 8 | **Build/test infra is manual.** Same as W1/W2/W3/W4: no CI yet. Browser-load smoke is by hand at end of W5.2, W5.3-C1, W5.3-C2, and W5.7. | Per-commit `node --check` is the cheap parse gate; per-sub-wave manual smoke catches namespace-load failures; full ROADMAP regression at W5.7 catches everything else. Same pattern as the prior 4 waves. The 836 ctx-arrow-callback patterns are tested by the live runtime, not by static analysis — the manual smoke is the test harness. |
| 9 | **Rollback fragility.** Wave 5's 9-commit sequence is small enough that a full revert via `git reset --hard phase-24-w5-start` is fast. Selective revert is also cheap (each commit is independently revertable). | Document in INVENTORY (Decision-log) any partial-revert scenarios. The W5.3 split into C1 + C2 is specifically designed to allow partial-revert: if W5.3-C2 (alias removal) misbehaves, revert it alone; the SCC stays broken from C1. The W5.2 header batch is line-additive, so reverting it is also safe (deletes the comment lines). |
| 10 | **Behaviour drift via "obvious cleanup".** The W5.3-C1 defensive-write deletion is a 6-line removal; under correct load order it's dead code. ROADMAP §"Risks" warns: "Inlining or deleting a guard that looked redundant can change behaviour under unusual states." | The smoke probe at lines 19–25 (`runtime_panels_missing` warn) STAYS as the canary. The deleted block was a fallback only for the case where panels-controller's parse-time write hadn't happened yet — verified impossible under defer-script ordering. C1's manual smoke specifically checks the `runtime_panels_missing` warn does NOT fire at boot. If it fires, the assumption is broken; STOP and investigate. |

---

## 11. Out of Scope for Wave 5 (explicit reaffirmation)

Reaffirmed from ROADMAP + RESEARCH §7 + pre-flight scope decisions. Wave 5 deliberately does NOT do:

- **No behaviour changes.** Every commit's diff is verifiable by `node --check` + namespace-key parity check + Tarjan SCC re-run. No function body is touched. No identifier is renamed. No call site is moved.
- **No new files created.** Wave 3 territory; W3 closed at `c9038bc`. No new sub-modules. No new `<script>` tags. `index.html` is not edited.
- **No naming changes.** Wave 4 territory; W4 closed at `6cfc682`. No identifier rename, no PIN pattern, no namespace-key change beyond the W5.3-C2 deletion.
- **No comment rewriting beyond the 20 header additions.** Wave 2 territory; W2 closed. The only comment edits in W5 are: (a) the 20 header additions per §5.2; (b) the comment update at `runtime-panels-controller.js` lines 71–72 (mechanically tied to W5.3-C2's alias deletion); (c) optionally, the header micro-edit at `runtime-bootstrap.js` if the W5.2-added header references "canonical/legacy" (mechanically tied to W5.3-C2). No reformatting, no rewriting of explanatory comments inside function bodies.
- **No dead-code removal beyond the W5.3-C1 defensive write block + W5.3-C2 alias references.** Wave 1 territory; closed.
- **No function decomposition.** Wave 3 territory. The 6 large files (`runtime-orchestration.js` 2965, `runtime-projection-handle-ui.js` 781, `animation-editor-edit-pane.js` 722, `runtime-draw-loop.js` 716, `runtime-room-management.js` 707, `runtime-room-dispatch.js` 659) stay at their current sizes.
- **No arrow-callback "cycle" untangling.** RESEARCH §2.5 + §6.5 confirm the 836 ctx-arrow-callback patterns are LOAD-BEARING. Refactoring them would require switching to ES modules or splitting orchestration's IIFE into multiple smaller IIFEs with explicit init-order chains. That is a major re-architecture and out of W5 scope.
- **No re-exports removed beyond `TT_BEAMER_UI_RUNTIME_PANELS`.** RESEARCH §4.3 audit: every other re-export has at least one external consumer. Removing any other shim's parent namespace would break orchestration's destructure call sites.
- **No `<script>` order changes.** No new files; `index.html` not edited.
- **No public-API changes** beyond the documented W5.3-C2 namespace removal (123 → 122 in the W4 lock-list).
- **No dependency changes.** Same Node version, same browser targets, same npm packages.
- **No test framework introduction.** Manual smoke pass only, per W1–W4 pattern.
- **No README rewrites.** Phase 23 territory.
- **No performance optimizations.**
- **No tooling commit.** RESEARCH §9.3's "add the §1.5 script as `scripts/dev/extract-module-graph.cjs`" is DEFERRED to Wave 6 closure.

---

## 12. Summary

**Total commits across the 7 sub-waves:** **9** (1 baseline INVENTORY + 1 header batch + 2 SCC-resolution + 4 docs INVENTORY + 1 closure INVENTORY = 9).

| Sub-wave | Commits | Type | Risk |
|----------|--------:|------|------|
| W5.1 baseline INVENTORY | 1 | docs | LOW |
| W5.2 header batch | 1 | code (additive only) | LOW |
| W5.3 SCC resolution | 2 | code | MEDIUM (C1 + C2 = wave's only "deletion" commits) |
| W5.4 post-SCC INVENTORY | 1 | docs | LOW |
| W5.5 per-shim audit INVENTORY | 1 | docs | LOW |
| W5.6 `<script>` order INVENTORY | 1 | docs | LOW |
| W5.7 end-of-W5 closure | 1 | docs | LOW |
| **Total** | **9** | **3 code + 6 docs** | — |

**Riskiest single commit:** **W5.3-C2** — drops the `TT_BEAMER_UI_RUNTIME_PANELS` namespace alias. Reduces the public namespace surface from 101 to 100 keys. The risk is "did RESEARCH §4.2 miss a reader?" — mitigated by exhaustive pre-flight grep re-validation, by the `Edit` tool's exact-match safety (each old_string MUST appear verbatim or the edit fails), by the manual browser smoke immediately after the commit, and by the small revert footprint (one `git revert HEAD` restores the alias). W5.3-C1 (defensive write removal) is logically simpler — the deleted block is dead under correct load order — but lands first to break the SCC; if C1 fails the wave halts before C2.

**Total estimated wave length:** **~3–5 hours of executor work** — smallest code-touching wave of Phase 24 (W4 was ~5–7h, W3 was ~10–14h). Distribution:

| Step | Time |
|------|------|
| Pre-flight (§3) — tag, snapshots, baseline metrics, abbreviated smoke | 30–45 min |
| W5.1-C1 INVENTORY baseline | 15–30 min |
| W5.2-C1 header batch (20 files, mechanical paste from §5.2) | 45–90 min |
| W5.3-C1 defensive write removal + manual smoke | 15–30 min |
| W5.3-C2 alias removal + manual smoke | 15–30 min |
| W5.4-C1 post-SCC INVENTORY | 15–30 min |
| W5.5-C1 per-shim re-export audit + INVENTORY | 30–45 min |
| W5.6-C1 `<script>` load-order verification + INVENTORY | 30–45 min |
| W5.7-C1 closure INVENTORY + full ROADMAP regression smoke | 30–45 min |
| **Total** | **~3–5 hours** |

Plus ~10–15 min full ROADMAP regression at W5.7 (manual browser smoke, ROADMAP.md lines 203–275).

**Baseline → target metric deltas:**

| Metric | Pre-W5 (post-W4) | Post-W5 target |
|--------|-----------------:|---------------:|
| Total `.js` files in `src/app/runtime/` + `src/app/lib/` | 101 | **101** (unchanged — no new files, no removed files) |
| Modules with substantive header comment | 81 / 101 | **101 / 101** |
| Modules missing header | 20 | **0** |
| Public IIFE namespace keys (`window.TT_BEAMER_*`) | 101 | **100** (−1: `TT_BEAMER_UI_RUNTIME_PANELS` removed in W5.3-C2; documented intentional reduction) |
| Tarjan SCC count (non-trivial) | 1 (size 2: bootstrap ↔ panels-controller) | **0** |
| Tarjan trivial SCCs (single-node) | 100 | **101** |
| Wire-protocol message-type literals | 9 | **9** (unchanged — LOCKED) |
| localStorage / JSON-schema literals | 13 | **13** (unchanged — LOCKED) |
| Total `.js` LOC in `src/app/runtime/` + `src/app/lib/` | (post-W4 baseline) | (baseline) **+50 to +110** (~60–120 added comment lines minus ~10–15 deleted code lines) |
| `<script>` tag count in `index.html` | (W4 baseline) | **(unchanged)** — `index.html` not edited |
| ctx-arrow-callback patterns inside orchestration's IIFE | 836 | **836** (unchanged — LOAD-BEARING, out of scope) |
| 6 W3 shim re-export surface | unchanged | **unchanged** (audited as load-bearing) |
| W4 100-PIN'd-identifier residual entries | (post-W4 100) | **unchanged** (W5 doesn't touch identifiers) |

**Path to PLAN.md:** `/home/claw/tt-beamer/.planning/phases/phase-24/wave-5/PLAN.md` (this file).
