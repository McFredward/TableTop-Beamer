---
phase: 39
plan: 5
type: execute
wave: 3
depends_on: [39-2, 39-3, 39-4]
files_modified:
  - .planning/STATE.md
  - .planning/ROADMAP.md
  - .planning/phases/phase-39/39-CLOSURE.md
autonomous: false
requirements:
  - D-01-MP4-PLAYBACK
  - D-02-COLD-START-STABILITY
  - D-03-NO-SEAMS
must_haves:
  truths:
    - "All three D-01 / D-02 / D-03 acceptance criteria from ROADMAP Phase 39 are demonstrably met"
    - "All Phase 38 carry-forward LOCKED items are still green (WS-fragmentation, align-off teardown, GL cache invalidation, 10/90 inset, all W1-W9 fixes)"
    - "VAAPI default-disabled (Phase 33 L6) preserved"
    - "Phase 35-iter2 h3 Bayer dither (L7) and output-live-sync.js subscription contract (L8) preserved"
    - "D-08 connection-stability fail=0 (L9) preserved"
    - "Operator-checkpoint passes: visual UAT of sandstorm.mp4 + cold-boot + warped solid-color animation"
    - "Phase 39 is tagged `phase-39-closed` at the final commit"
  artifacts:
    - path: ".planning/phases/phase-39/39-CLOSURE.md"
      provides: "Phase closure document summarizing diffs, evidence, and carry-forward verification"
    - path: ".planning/STATE.md"
      provides: "Updated current-phase + last-execution-summary fields"
    - path: ".planning/ROADMAP.md"
      provides: "Phase 39 status updated to CLOSED with closure-date"
  key_links:
    - from: "39-CLOSURE.md"
      to: "39-1-SUMMARY.md, 39-2-SUMMARY.md, 39-3-SUMMARY.md, 39-4-SUMMARY.md"
      via: "evidence consolidation"
      pattern: "SUMMARY"
    - from: "git tag phase-39-closed"
      to: "final commit on master"
      via: "git tag annotation"
      pattern: "phase-39-closed"
---

<objective>
Phase 39 verification and closure. Confirms all three defect fixes (D-01, D-02, D-03) hold together with no regressions in any Phase 30/31/32/33/34/35/36/37/38 carry-forward rail. Operator UAT checkpoint validates the visual results. Phase is then tagged closed.

Purpose: One last sanity sweep before the operator runs the fixed system. Phase 38 W10 spent 9 weeks behind a localhost-invisible bug because the carry-forward rail discipline was loose. Phase 39 will not close until every documented carry-forward is demonstrably green on a fresh boot.

Output:
- Full regression run across the carry-forward matrix
- Operator UAT checkpoint (human-verify) confirming visual results
- 39-CLOSURE.md with consolidated evidence
- STATE.md + ROADMAP.md updated
- Tag `phase-39-closed`
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/CRITICAL_KNOWN_BUGS.md
@.planning/phases/phase-39/39-RESEARCH.md
@.planning/phases/phase-39/39-1-PLAN.md
@.planning/phases/phase-39/39-2-PLAN.md
@.planning/phases/phase-39/39-3-PLAN.md
@.planning/phases/phase-39/39-4-PLAN.md
@.planning/phases/phase-39/39-1-SUMMARY.md
@.planning/phases/phase-39/39-2-SUMMARY.md
@.planning/phases/phase-39/39-3-SUMMARY.md
@.planning/phases/phase-39/39-4-SUMMARY.md
@.planning/phases/phase-38/38-CLOSURE.md

<interfaces>
<!-- The carry-forward test matrix this plan must verify GREEN. -->

From .planning/phases/phase-39/39-RESEARCH.md §"Carry-forward test rails that MUST stay green":
| Test file | Source phase | What it locks |
|-----------|-------------|---------------|
| test/phase-38-w10-ws-frame-fragmentation.test.mjs | Phase 38 W10 | WS framing contract — L1 |
| test/connection-stability/live-fixture-smoke.test.mjs | D-08 | Connection-stability hard gate — L9 |
| test/connection-stability/*.test.mjs (all) | D-08 | fail=0 invariant — L9 |
| test/phase-35-bayer-dither.test.mjs | Phase 35 | Bayer dither math invariant — L7 |
| test/static-resource-headers.test.mjs | Phase 31 h15 | connection: close on /resources/animations/ |
| test/live-e2e/test_phase38_ssr_grid_state_cdp.py | Phase 38 W1 | CDP-diag endpoints still work |
| test/live-e2e/test_phase38_w11_align_off_overlay_disappears.py | Phase 38 W11 | Align-off teardown |
| test/live-e2e/test_phase38_w12_invalidate_cache.py | Phase 38 W12 | GL cache invalidation on grid replace |
| test/phase-38-pi-ssr-sync-enforcement (live-e2e/test_phase38_pi_ssr_sync_enforcement.py) | Phase 38 W2 | Pi /output/ thin sync apply-path |

From .planning/ROADMAP.md §"Phase 39 Exit Criteria":
- D-01: MP4-Animation aus Nemesis Lockdown A spielt sichtbar im SSR-Stream (CDP-Screenshot zeigt Frame-Wechsel zwischen t=0s und t=2s; operator-UAT confirm)
- D-02: 30s cold-start reconnect-stability test zeigt < 2 RECONNECT-Events; oder root-cause-Erklärung dass es kein echter Reconnect ist
- D-03: Solid-color-Animation im SSR-Stream zeigt keine sichtbaren Streifen bei 3×3, 5×5 und 9×9 Grid
- All Phase 38 Carry-Forwards bleiben grün
- D-08 connection-stability fail=0
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Run the full Phase 39 + carry-forward regression matrix on a clean boot</name>
  <read_first>
    - .planning/phases/phase-39/39-RESEARCH.md §"Carry-forward test rails that MUST stay green" (full list)
    - .planning/phases/phase-39/39-RESEARCH.md §"Sampling Rate / Phase gate" — the exact command sequence the phase gate requires
    - All four prior plans' SUMMARY files to know which tests turned GREEN in each plan
    - test/connection-stability/_harness.mjs — to confirm RUN_LIVE_TESTS env flag is required for the connection-stability suite
  </read_first>
  <files>.planning/phases/phase-39/39-5-REGRESSION-LOG.md</files>
  <behavior>
    - All Phase 39 new tests PASS:
      - test/phase-39-d01-mime-and-range.test.mjs
      - test/phase-39-d02-state-machine.test.mjs
      - test/phase-39-d03-render-mode-probe.test.mjs
      - test/connection-stability/phase-39-cold-boot.test.mjs (RUN_LIVE_TESTS=1)
      - test/live-e2e/test_phase39_d01_mp4_in_ssr.py
      - test/live-e2e/test_phase39_d03_no_seams.py (grid_size 3, 5, 9)
    - All Phase 38 carry-forward rails PASS:
      - test/phase-38-w10-ws-frame-fragmentation.test.mjs
      - test/connection-stability/live-fixture-smoke.test.mjs (RUN_LIVE_TESTS=1)
      - test/phase-35-bayer-dither.test.mjs
      - test/static-resource-headers.test.mjs
      - test/live-e2e/test_phase38_ssr_grid_state_cdp.py
      - test/live-e2e/test_phase38_w11_align_off_overlay_disappears.py
      - test/live-e2e/test_phase38_w12_invalidate_cache.py
      - test/live-e2e/test_phase38_pi_ssr_sync_enforcement.py
    - All Phase 32/33 reconnect rails PASS:
      - test/connection-stability/receiver-state-machine.test.mjs
      - test/phase-32-cold-boot-reconnect-repro.test.mjs
    - Regression log is written to .planning/phases/phase-39/39-5-REGRESSION-LOG.md with exit code and key output line for each test
  </behavior>
  <action>
1. Start from a clean working tree state:
   ```bash
   cd /home/claw/tt-beamer
   git status
   # Confirm no unrelated dirty files (config/runtime-active-* are runtime artifacts, ignore them)
   ```

2. Run each test and capture its output. Build the regression log file as you go:
   ```bash
   LOG=.planning/phases/phase-39/39-5-REGRESSION-LOG.md
   echo "# Phase 39 Plan 39-5 Task 1 — Full regression matrix" > "$LOG"
   echo "**Run date:** $(date -Iseconds)" >> "$LOG"
   echo "**Commit:** $(git rev-parse HEAD)" >> "$LOG"
   echo "" >> "$LOG"
   echo "## Phase 39 new tests" >> "$LOG"
   for T in test/phase-39-d01-mime-and-range.test.mjs test/phase-39-d02-state-machine.test.mjs test/phase-39-d03-render-mode-probe.test.mjs; do
     echo "### $T" >> "$LOG"
     RUN_LIVE_TESTS=1 node --test "$T" > /tmp/out.txt 2>&1
     CODE=$?
     echo "**Exit code:** $CODE" >> "$LOG"
     echo "\`\`\`" >> "$LOG"
     tail -20 /tmp/out.txt >> "$LOG"
     echo "\`\`\`" >> "$LOG"
   done
   echo "### test/connection-stability/phase-39-cold-boot.test.mjs" >> "$LOG"
   RUN_LIVE_TESTS=1 node --test test/connection-stability/phase-39-cold-boot.test.mjs > /tmp/out.txt 2>&1
   echo "**Exit code:** $?" >> "$LOG"
   grep -E "reconnectingEvents|fail|pass|ok " /tmp/out.txt | head -10 >> "$LOG"
   echo "### test/live-e2e/test_phase39_d01_mp4_in_ssr.py" >> "$LOG"
   python3 -m pytest test/live-e2e/test_phase39_d01_mp4_in_ssr.py -v > /tmp/out.txt 2>&1
   echo "**Exit code:** $?" >> "$LOG"
   tail -10 /tmp/out.txt >> "$LOG"
   echo "### test/live-e2e/test_phase39_d03_no_seams.py" >> "$LOG"
   python3 -m pytest test/live-e2e/test_phase39_d03_no_seams.py -v > /tmp/out.txt 2>&1
   echo "**Exit code:** $?" >> "$LOG"
   tail -15 /tmp/out.txt >> "$LOG"

   echo "" >> "$LOG"
   echo "## Phase 38 carry-forward rails" >> "$LOG"
   for T in test/phase-38-w10-ws-frame-fragmentation.test.mjs test/phase-35-bayer-dither.test.mjs test/static-resource-headers.test.mjs; do
     echo "### $T" >> "$LOG"
     node --test "$T" > /tmp/out.txt 2>&1
     echo "**Exit code:** $?" >> "$LOG"
     tail -10 /tmp/out.txt >> "$LOG"
   done
   echo "### test/connection-stability/live-fixture-smoke.test.mjs" >> "$LOG"
   RUN_LIVE_TESTS=1 node --test test/connection-stability/live-fixture-smoke.test.mjs > /tmp/out.txt 2>&1
   echo "**Exit code:** $?" >> "$LOG"
   grep -E "sustained|fail|producerReady|renderHostDown" /tmp/out.txt | head -10 >> "$LOG"
   for T in test/live-e2e/test_phase38_ssr_grid_state_cdp.py test/live-e2e/test_phase38_w11_align_off_overlay_disappears.py test/live-e2e/test_phase38_w12_invalidate_cache.py test/live-e2e/test_phase38_pi_ssr_sync_enforcement.py; do
     echo "### $T" >> "$LOG"
     python3 -m pytest "$T" -v > /tmp/out.txt 2>&1
     echo "**Exit code:** $?" >> "$LOG"
     tail -8 /tmp/out.txt >> "$LOG"
   done

   echo "" >> "$LOG"
   echo "## Phase 32/33 reconnect rails" >> "$LOG"
   for T in test/connection-stability/receiver-state-machine.test.mjs test/phase-32-cold-boot-reconnect-repro.test.mjs; do
     echo "### $T" >> "$LOG"
     RUN_LIVE_TESTS=1 node --test "$T" > /tmp/out.txt 2>&1
     echo "**Exit code:** $?" >> "$LOG"
     tail -10 /tmp/out.txt >> "$LOG"
   done
   ```

3. Validate every exit code in 39-5-REGRESSION-LOG.md is 0:
   ```bash
   grep "Exit code:" .planning/phases/phase-39/39-5-REGRESSION-LOG.md | grep -v "Exit code: 0"
   # → Must return empty (every test exited 0)
   ```

4. If ANY test failed:
   - Print the failing test name(s) + tail of its output
   - DO NOT proceed to Task 2 (operator checkpoint)
   - Hand the failure list to the orchestrator for triage
   - If the failure is in D-03 and Plan 39-4 SUMMARY's "Plan 39-5 hand-off" noted that the OTHER sub-path may need to be layered: trigger a Plan 39-4 follow-up wave with the other sub-path. Otherwise, escalate to the orchestrator.

5. If all exit 0: append the final block to 39-5-REGRESSION-LOG.md:
   ```markdown
   ## Result

   **All regression tests PASS.** Phase 39 is gate-green and ready for operator UAT (Task 2).
   ```

DO NOT modify any production code, tests, or planning files except .planning/phases/phase-39/39-5-REGRESSION-LOG.md.
  </action>
  <verify>
    <automated>grep -c "Exit code: 0" .planning/phases/phase-39/39-5-REGRESSION-LOG.md ; grep "Exit code:" .planning/phases/phase-39/39-5-REGRESSION-LOG.md | grep -v "Exit code: 0" | wc -l | grep -q "^0$" && echo "ALL_GREEN"</automated>
  </verify>
  <acceptance_criteria>
    - File exists: .planning/phases/phase-39/39-5-REGRESSION-LOG.md
    - grep -c "Exit code:" 39-5-REGRESSION-LOG.md ≥ 13 (at least 13 distinct test sections)
    - grep "Exit code:" 39-5-REGRESSION-LOG.md | grep -v "Exit code: 0" returns empty (zero non-green exits)
    - grep -q "sustained >=30000ms" 39-5-REGRESSION-LOG.md (D-08 smoke output captured)
    - grep -qE "reconnectingEvents=[01]" 39-5-REGRESSION-LOG.md (D-02 cold-boot result captured, value 0 or 1)
    - grep -q "All regression tests PASS" 39-5-REGRESSION-LOG.md
    - No production code or test files modified by this task: `git status --porcelain | grep -vE "^.. \.planning/phases/phase-39/"` returns empty
  </acceptance_criteria>
  <done>All Phase 39 new tests AND all Phase 38 / 32 / 33 carry-forward rails are green on a clean run. The regression log captures evidence for every gate. Phase 39 is ready for the operator UAT.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Operator UAT — visually confirm all three defects are fixed</name>
  <what-built>
    Phase 39 ships three fixes:
    1. **D-01 MP4 playback** — server.mjs MIME table extended with video/* types and Range-request support; SSR Chromium can now decode and seek `<video>`-element media.
    2. **D-02 INITIAL_CONNECT state** — receiver-bootstrap.js distinguishes cold-boot first-attempts from real reconnects; the "RECONNECTING — Xs (attempt N)" banner no longer flashes during the legitimate 3-10s publisher-boot race window.
    3. **D-03 seam fix** — either ssr-render-host.mjs Chrome flag swap (sub-path A) or runtime-projection-gl-renderer.js fragment-shader UV-inset (sub-path B), determined by 39-1-DIAG.md's renderMode telemetry; mesh-warp triangle boundaries no longer produce 1-px ridges in solid-color animations.

    All Phase 38 / 33 / 30 carry-forward rails verified green in Task 1's regression log.
  </what-built>
  <how-to-verify>
    Run the system end-to-end on the operator's hardware:

    1. **Boot:**
       ```bash
       cd /home/claw/tt-beamer
       SSR_RENDER_HOST=1 SSR_PUBLISH=1 node server.mjs
       ```
       Open the operator's /output/ URL on the projector device. Open the dashboard on the operator's control device.

    2. **D-02 cold-boot UAT:**
       - Hard-refresh /output/ (clear cache or use a fresh incognito window).
       - Watch the splash screen during the first 5-10 seconds.
       - **EXPECTED:** "Connecting to render server…" splash (or equivalent CONNECTING-state UI) stays visible until the stream connects. NO red "RECONNECTING — Xs (attempt N)" banner appears during the first 5 seconds.
       - **FAIL signal:** If a RECONNECTING banner flashes within the first 5 seconds, D-02 is incomplete.
       - Confirm the stream connects within ~10 seconds (normal cold-boot duration).

    3. **D-01 MP4 UAT:**
       - In the dashboard, load the **Nemesis Lockdown A** board profile.
       - Confirm the outside region is configured to play **sandstorm.mp4** (it is by default).
       - Trigger any room animation (or just rest on the default state — the outside sandstorm autoplays).
       - **EXPECTED:** The sandstorm MP4 plays visibly in the streamed video (storm clouds animate, frame visibly advances over 2-3 seconds).
       - **FAIL signal:** Outside region shows a black or static frame; sandstorm doesn't animate.

    4. **D-03 seam UAT:**
       - Switch to a clean board profile (e.g. the default 3×3 grid configuration) and apply non-identity projection warp via the align-mode handles (drag a few interior grid points).
       - Trigger a solid-color animation (e.g. red fill, 60% alpha) over the warped grid.
       - Compare to a reference image (or to the operator's memory of pre-Phase-30 seams).
       - **EXPECTED:** The solid color renders uniformly across cell boundaries. NO visible 1-pixel-wide ridges or seams along grid-cell edges.
       - **FAIL signal:** Faint or visible vertical/horizontal lines along the warped cell boundaries.
       - Optionally repeat with 5×5 and 9×9 grid configurations.

    5. **Carry-forward sanity:**
       - During the UAT, perform the usual operator actions (load a different profile, trigger room animations, ESC reset, drag handles in align mode).
       - **EXPECTED:** All work as before. The Phase 38 W10 WS-fragmentation fix means complex profiles (9×9) sync reliably. The Phase 38 W11 align-off fix means align-off cleanly removes overlay. No new regressions.

    6. **Connection stability:**
       - Leave the system running for 1+ minutes after the initial connect.
       - **EXPECTED:** The stream stays connected. No spontaneous RECONNECTING events. Frame rate steady.

    Provide feedback on any failure observed in any of the 6 steps above.
  </how-to-verify>
  <resume-signal>
    Reply with one of:
    - **"approved"** — All three defects visually verified fixed; no carry-forward regressions observed. Proceed to Task 3 (close phase).
    - **"D-01 still broken: <details>"** — MP4 doesn't play.
    - **"D-02 still broken: <details>"** — RECONNECTING banner still flashes during cold-boot.
    - **"D-03 still broken: <details>"** — Seams still visible. (If so, Plan 39-4 may need to layer the other sub-path — Task 3 will be paused and a follow-up wave triggered.)
    - **"regression: <which Phase 38 / 33 / 30 behavior broke>"** — A carry-forward broke; do NOT close phase, escalate.
  </resume-signal>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Write 39-CLOSURE.md, update STATE.md + ROADMAP.md, tag phase-39-closed</name>
  <read_first>
    - .planning/phases/phase-38/38-CLOSURE.md — template for closure document structure
    - .planning/phases/phase-39/39-1-SUMMARY.md, 39-2-SUMMARY.md, 39-3-SUMMARY.md, 39-4-SUMMARY.md — source material for the consolidated closure
    - .planning/phases/phase-39/39-5-REGRESSION-LOG.md — evidence of all gates green
    - .planning/STATE.md (current state — to update lifecycle section)
    - .planning/ROADMAP.md lines 869-915 (Phase 39 entry — to update status to CLOSED)
  </read_first>
  <files>.planning/phases/phase-39/39-CLOSURE.md, .planning/STATE.md, .planning/ROADMAP.md</files>
  <behavior>
    - 39-CLOSURE.md is created with this structure:
        - Frontmatter (phase: 39, slug, status: CLOSED, closed: <ISO date>, predecessor: phase-38-closed)
        - TL;DR (3-5 line summary of what shipped)
        - The three defect fixes, each with: root cause one-liner + file edited + LOC + test that locks it
        - Carry-forward verification (the 13+ tests that ran green)
        - The Phase-39 contribution to .planning/CRITICAL_KNOWN_BUGS.md (if any new bug-class was learned — e.g. "always test MP4 over HTTP, not file://", "always probe renderMode before touching GL")
        - What stays locked going forward (additions to the L-list)
        - Recommendation: tag `phase-39-closed` at the final commit
    - STATE.md is updated:
        - `current_phase` → next planned phase (likely 40 or whatever follows)
        - `previous_phase` → "39 (CLOSED)"
        - `last_executed_plan` → "39 (D-01 MP4 + D-02 INITIAL_CONNECT + D-03 seams)"
        - `last_execution_summary` → 1-2 sentence summary
        - `progress.completed_phases` incremented
    - ROADMAP.md Phase 39 entry header changes from "(PLANNING)" to "(CLOSED, <ISO date>)" and a closing paragraph is appended referencing 39-CLOSURE.md
    - Git tag `phase-39-closed` is created on the current HEAD
  </behavior>
  <action>
1. Read all four plan SUMMARYs + the regression log.

2. Write `.planning/phases/phase-39/39-CLOSURE.md`. Use this template:

```markdown
---
phase: 39
slug: ssr-stabilization-round-2
status: CLOSED
closed: <ISO date>
predecessor: phase-38-closed (commit e881a83)
---

# Phase 39 — SSR Stabilization Round 2: MP4 Playback, Reconnect Storms, Mesh-Warp Seams

## TL;DR

Phase 38 closed with operator UAT 2026-05-12 reporting three remaining SSR defects:
D-01 (MP4 doesn't play), D-02 (cold-boot reconnect storms), D-03 (mesh-warp seams).
All three closed in Phase 39 with one localized fix per defect, no architecture changes,
no rewrites of WS / WebRTC / GL contracts. All Phase 38 carry-forwards remain green.

## The three fixes

### D-01 — MP4 playback in SSR (Plan 39-2)

**Root cause:** server.mjs MIME_TYPES table had no `.mp4` entry. Chromium 131 refused
to decode media served as `application/octet-stream`.

**Fix:** server.mjs:1968 — extended MIME_TYPES with `.mp4`, `.webm`, `.m4v`, `.mov`,
`.ogg`, `.aac`, `.m4a`. server.mjs:3545 — added Range-request support (206 +
content-range) to handleStaticFile for seek-heavy media use cases.

**Locks:**
- test/phase-39-d01-mime-and-range.test.mjs (unit)
- test/live-e2e/test_phase39_d01_mp4_in_ssr.py (live)

### D-02 — Cold-boot reconnect storms (Plan 39-3)

**Root cause:** receiver-bootstrap.js's `LEGAL_TRANSITIONS` had no state distinguishing
first-attempt cold-boot from steady-state reconnect. Every pre-CONNECTED failure routed
to RECONNECTING, firing the visible "RECONNECTING — Xs (attempt N)" banner during the
legitimate 3-10s publisher-boot race.

**Fix:** receiver-bootstrap.js — added `ConnectionState.INITIAL_CONNECT` enum entry +
LEGAL_TRANSITIONS for it; tryConnect() routes first call through INITIAL_CONNECT;
handleConnectFailure() helper silently retries during INITIAL_CONNECT_GRACE_MS (5s)
then escalates to RECONNECTING. shouldGiveUp() does not count INITIAL_CONNECT
attempts against the capped-retry budget. receiver-status-ui.js renders the existing
CONNECTING splash for INITIAL_CONNECT — no banner during grace.

**Locks:**
- test/phase-39-d02-state-machine.test.mjs (unit)
- test/connection-stability/phase-39-cold-boot.test.mjs (integration)

### D-03 — Mesh-warp seams (Plan 39-4)

**Root cause:** <fill from 39-4-SUMMARY.md — either "SSR Chromium tab fell to 2D fallback,
bypassing Phase 30 pixel-snap" (sub-path A) or "GL rasterizer/sampling at triangle
boundaries produced 1-px ridges on this Chromium GL implementation" (sub-path B)>

**Fix:** <if sub-path A: `--use-angle=default` → `--use-angle=swiftshader` in
ssr-render-host.mjs; if sub-path B: 0.5-texel UV-inset epsilon + uTexSize uniform in
runtime-projection-gl-renderer.js fragment shader>

**Locks:**
- test/phase-39-d03-render-mode-probe.test.mjs (integration)
- test/live-e2e/test_phase39_d03_no_seams.py (live, grid_size 3/5/9)

## Carry-forward verification

All gates GREEN on commit `<HEAD>` per 39-5-REGRESSION-LOG.md:

| Test | Source | Status |
|------|--------|--------|
| test/phase-38-w10-ws-frame-fragmentation.test.mjs | Phase 38 W10 | PASS |
| test/connection-stability/live-fixture-smoke.test.mjs | D-08 | PASS (sustained >=30000ms, fail=0) |
| test/phase-35-bayer-dither.test.mjs | Phase 35 | PASS |
| test/static-resource-headers.test.mjs | Phase 31 h15 | PASS |
| test/live-e2e/test_phase38_ssr_grid_state_cdp.py | Phase 38 W1 | PASS |
| test/live-e2e/test_phase38_w11_align_off_overlay_disappears.py | Phase 38 W11 | PASS |
| test/live-e2e/test_phase38_w12_invalidate_cache.py | Phase 38 W12 | PASS |
| test/live-e2e/test_phase38_pi_ssr_sync_enforcement.py | Phase 38 W2 | PASS |
| test/connection-stability/receiver-state-machine.test.mjs | Phase 33 | PASS |
| test/phase-32-cold-boot-reconnect-repro.test.mjs | Phase 32 | PASS |

## What stays locked

Add to .planning/CRITICAL_KNOWN_BUGS.md (Phase 39 contribution):

- **#3 — MP4 served as `application/octet-stream` causes silent decode failure** in Chromium 131. Always verify `Content-Type: video/<format>` is set; never rely on browser MIME-sniffing for media elements.
- **#4 — Cold-boot reconnect storms are a state-machine classification artifact, not a reliability bug.** Always distinguish first-attempt from steady-state in WebRTC state machines.
- **#5 — Mesh-warp seams in SSR are sensitive to Chromium GL backend selection.** Always read `[ssr-stats] renderMode=` from server logs before touching GL code — the renderMode determines whether the fix path is a Chrome flag swap or a shader edit.

## Operator UAT confirmation

<paste verbatim resume-signal from Task 2 — should be "approved">

## Recommendation

Tag `phase-39-closed` at commit `<HEAD>`.
```

3. Update `.planning/STATE.md`. Find the `Lifecycle` section and update:
   - `Current Phase:` → 40 (or next planned phase number — leave as is if not known yet, just remove "39")
   - `Previous Phase:` → "39 (CLOSED)"
   - `Last Executed Plan:` → "39 (D-01 MP4 MIME + D-02 INITIAL_CONNECT state + D-03 seam fix)"
   - `Last Execution Summary:` → "Phase 39 closed three SSR defects from 2026-05-12 UAT: MP4 MIME table extension, INITIAL_CONNECT state in receiver, mesh-warp seam fix (sub-path <A|B>). All Phase 38 carry-forwards green; D-08 fail=0 preserved."
   - `progress.completed_phases:` → increment by 1
   - `last_updated:` → current ISO timestamp

4. Update `.planning/ROADMAP.md` Phase 39 entry (around line 869). Change the header line:
   ```
   ## Phase 39 - SSR Stabilization Round 2: MP4 Playback, Reconnect Storms, Mesh-Warp Seams (PLANNING)
   ```
   to:
   ```
   ## Phase 39 - SSR Stabilization Round 2: MP4 Playback, Reconnect Storms, Mesh-Warp Seams (CLOSED, <ISO date>)
   ```
   Append a closing paragraph at the end of the Phase 39 section (before the next phase or before EOF):
   ```
   **Closure:** All three defects fixed in one wave each (39-1 diagnostic + 39-2 D-01 +
   39-3 D-02 + 39-4 D-03 + 39-5 verify). See `.planning/phases/phase-39/39-CLOSURE.md`
   for evidence. All Phase 38 carry-forwards GREEN. Tag: `phase-39-closed`.
   ```

5. Update `.planning/CRITICAL_KNOWN_BUGS.md` by appending the three new bug-class entries (#3, #4, #5) per the 39-CLOSURE.md content. Match the style of the existing #1 and #2 entries (Discovery / What it was / Why it happened / The fix / Future discipline sub-sections). Keep each entry to 30-60 lines.

6. Commit all the .planning/ changes:
   ```bash
   git add .planning/phases/phase-39/39-CLOSURE.md .planning/phases/phase-39/39-5-REGRESSION-LOG.md .planning/STATE.md .planning/ROADMAP.md .planning/CRITICAL_KNOWN_BUGS.md
   git commit -m "docs(phase-39): close phase — D-01 MP4, D-02 INITIAL_CONNECT, D-03 seams; all carry-forwards green"
   ```

7. Tag the closure:
   ```bash
   git tag -a phase-39-closed -m "Phase 39 closed — SSR Stabilization Round 2"
   ```

8. Verify the tag and state:
   ```bash
   git tag -l "phase-39-closed"      # → phase-39-closed
   git log --oneline -5              # → most recent commit is the closure commit
   grep -E "Phase 39.*CLOSED" .planning/ROADMAP.md
   ```
  </action>
  <verify>
    <automated>git tag -l "phase-39-closed" | grep -q "phase-39-closed" && test -f .planning/phases/phase-39/39-CLOSURE.md && grep -q "Phase 39.*CLOSED" .planning/ROADMAP.md && echo "ok"</automated>
  </verify>
  <acceptance_criteria>
    - File exists: .planning/phases/phase-39/39-CLOSURE.md
    - grep -q "status: CLOSED" 39-CLOSURE.md
    - grep -q "D-01" 39-CLOSURE.md AND grep -q "D-02" 39-CLOSURE.md AND grep -q "D-03" 39-CLOSURE.md
    - grep -q "approved" 39-CLOSURE.md (operator UAT resume-signal pasted)
    - .planning/STATE.md `Previous Phase:` line contains "39 (CLOSED)"
    - .planning/ROADMAP.md Phase 39 entry header contains "(CLOSED" (status updated)
    - .planning/CRITICAL_KNOWN_BUGS.md contains at least one new entry referencing "MP4" + "MIME" + "octet-stream"
    - git tag -l "phase-39-closed" returns "phase-39-closed"
    - git log --oneline -1 message matches `^[0-9a-f]+ docs\(phase-39\): close phase`
    - `git diff HEAD~1 HEAD --name-only` shows ONLY .planning/ files modified by this task (no src/ or test/ changes)
  </acceptance_criteria>
  <done>39-CLOSURE.md exists with full closure documentation. STATE.md and ROADMAP.md reflect Phase 39 CLOSED status. CRITICAL_KNOWN_BUGS.md has new entries for #3 (MP4 MIME), #4 (INITIAL_CONNECT race classification), #5 (renderMode-before-GL-edits rule). Tag `phase-39-closed` exists on the closure commit.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Git tag → release ref | The tag `phase-39-closed` becomes an immutable reference point |
| Operator UAT input → closure decision | Human signal determines whether to close or escalate |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-39-5-01 | Repudiation | Operator approves UAT but defect re-appears later | mitigate | 39-CLOSURE.md captures the exact commit hash + UAT date + each test's exit code; future regressions can be diffed against this baseline |
| T-39-5-02 | Tampering | Someone force-pushes a different commit to the phase-39-closed tag | accept | Solo-developer single-repo product; tag is local until manually pushed |
| T-39-5-03 | DoS | Regression matrix takes >10 min and times out | mitigate | Task 1 commands are individually time-bounded by their own test runners; no single test > 60s except connection-stability (35s) |
</threat_model>

<verification>
Phase-level gate for Plan 39-5 (and Phase 39 overall):

```bash
# 1. Regression log shows all green
grep "Exit code:" .planning/phases/phase-39/39-5-REGRESSION-LOG.md | grep -v "Exit code: 0" | wc -l
# → must be 0

# 2. Closure document exists with required structure
grep -E "status: CLOSED|D-01|D-02|D-03|approved" .planning/phases/phase-39/39-CLOSURE.md | wc -l
# → must be >= 5

# 3. STATE.md reflects closure
grep "Previous Phase: 39" .planning/STATE.md
grep "39 (CLOSED)" .planning/STATE.md

# 4. ROADMAP.md reflects closure
grep "Phase 39.*CLOSED" .planning/ROADMAP.md

# 5. Tag exists
git tag -l "phase-39-closed"

# 6. Optionally re-run a quick smoke (10s) to confirm the closure commit is internally consistent
node --test test/phase-39-d01-mime-and-range.test.mjs
```

All assertions pass.
</verification>

<success_criteria>
- 39-5-REGRESSION-LOG.md captures green exit codes for all 13+ test gates
- Operator UAT signal received (resume-signal = "approved")
- 39-CLOSURE.md exists and consolidates all four prior SUMMARYs + the carry-forward matrix
- STATE.md + ROADMAP.md updated to reflect Phase 39 CLOSED
- CRITICAL_KNOWN_BUGS.md gains 3 new entries (#3 MP4 MIME, #4 INITIAL_CONNECT classification, #5 renderMode-before-GL-edits)
- Tag `phase-39-closed` exists on the closure commit
- No production code or test file modifications introduced by this plan (Task 1 is read-only, Task 2 is operator-only, Task 3 is .planning/ only)
</success_criteria>

<output>
After completion, ensure `.planning/phases/phase-39/39-CLOSURE.md` exists and is the canonical closure record for Phase 39. No separate `39-5-SUMMARY.md` is required (the closure document subsumes it), but the orchestrator may write one if its template requires.
</output>
