---
phase: 34
plan: V
type: execute
wave: 4
depends_on: [W0, B, A]
files_modified:
  - .planning/phases/phase-34/34-HUMAN-UAT.md
  - .planning/phases/phase-34/34-VERIFICATION.md
  - .planning/phases/phase-34/34-VALIDATION.md
autonomous: false
requirements: []
must_haves:
  truths:
    - "All 16 Phase 34 Wave-0 rail tests are GREEN."
    - "Connection-stability suite (test/connection-stability/**) is GREEN at 80/0 — D-06 hard gate verified at the END of Phase 34."
    - "34-HUMAN-UAT.md exists with the operator's checklist (visual smoketest D-05 + Pi-deferred items)."
    - "34-VERIFICATION.md exists summarizing the automated PASS/FAIL matrix for the phase exit criteria."
    - "34-VALIDATION.md per-task verification map is filled (was a draft at phase start)."
    - "Operator sign-off is captured in the HUMAN-UAT doc OR a known-blocker clearly recorded."
  artifacts:
    - path: ".planning/phases/phase-34/34-HUMAN-UAT.md"
      provides: "Operator's manual UAT checklist: visual smoketest, /ssr direct nav, /output thin-mode behavior verification, Pi-deferred items."
      min_lines: 60
    - path: ".planning/phases/phase-34/34-VERIFICATION.md"
      provides: "Automated verification matrix: each CONTEXT.md exit criterion mapped to its verifying command + observed result."
      min_lines: 80
    - path: ".planning/phases/phase-34/34-VALIDATION.md"
      provides: "Per-task verification map filled with rows for each task in W0/A/B + sign-off section."
      min_lines: 100
  key_links:
    - from: "34-VERIFICATION.md exit-criterion rows"
      to: "automated test commands"
      via: "command + expected output for each criterion"
      pattern: "node --test"
---

<objective>
**Verification + closure documentation.** Track B and Track A are functionally complete; this plan captures the evidence for phase closure and produces the artifacts the verification workflow expects.

Purpose: prove every CONTEXT.md exit criterion (D-01 through D-06 + the ROADMAP M1-M5 milestones) was met, OR explicitly record an INCONCLUSIVE/DEFERRED state with operator sign-off. The hard rule is: connection-stability suite GREEN at the END of Phase 34, NOT just at the end of Track B or Track A individually. If a regression slipped in between Track B and Track A landing, this plan catches it.

Output:
- `34-HUMAN-UAT.md` — operator's manual checklist (visual smoketest is the only mandatory item; Pi-hardware items are deferred per CONTEXT.md).
- `34-VERIFICATION.md` — automated PASS/FAIL matrix for every exit criterion.
- `34-VALIDATION.md` — fully populated per-task verification map (was a draft at phase start).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/phase-34/34-CONTEXT.md
@.planning/phases/phase-34/34-RESEARCH.md
@.planning/phases/phase-34/34-VALIDATION.md
@.planning/phases/phase-34/34-W0-PRECHECK.md
@.planning/phases/phase-34/34-W0-SUMMARY.md
@.planning/phases/phase-34/34-B-SUMMARY.md
@.planning/phases/phase-34/34-A-SUMMARY.md
@.planning/phases/phase-34/34-B-D06-VERIFICATION.md
@.planning/phases/phase-34/34-A-D06-VERIFICATION.md
@.planning/phases/phase-33/33-HUMAN-UAT.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fill 34-VALIDATION.md per-task verification map + write 34-VERIFICATION.md</name>
  <files>.planning/phases/phase-34/34-VALIDATION.md, .planning/phases/phase-34/34-VERIFICATION.md</files>
  <read_first>
    - .planning/phases/phase-34/34-VALIDATION.md (current draft — to be filled)
    - .planning/phases/phase-34/34-CONTEXT.md (exit criteria are the verification matrix's keys)
    - .planning/phases/phase-34/34-W0-PLAN.md (Tasks 1-3)
    - .planning/phases/phase-34/34-B-PLAN.md (Tasks 1-4)
    - .planning/phases/phase-34/34-A-PLAN.md (Tasks 1-4)
    - .planning/phases/phase-34/34-W0-SUMMARY.md
    - .planning/phases/phase-34/34-B-SUMMARY.md
    - .planning/phases/phase-34/34-A-SUMMARY.md
    - .planning/phases/phase-34/34-B-D06-VERIFICATION.md
    - .planning/phases/phase-34/34-A-D06-VERIFICATION.md
  </read_first>
  <action>
    Two file writes.

    **File 1: `.planning/phases/phase-34/34-VALIDATION.md` — replace the "Per-Task Verification Map" placeholder section with a full table.**

    Read the existing 34-VALIDATION.md to find the section labeled "## Per-Task Verification Map". Replace its body (currently `*Final list: planner specifies based on RESEARCH.md findings.*` and `To be filled by planner...`) with:

    ```markdown
    ## Per-Task Verification Map

    | Plan | Task | Behavior under test | Automated command | Manual? |
    |------|------|---------------------|-------------------|---------|
    | W0 | 1 | Route-split + runtime-env contract tests written and produce expected RED count | `node --test test/phase-34-route-split.test.mjs test/phase-34-runtime-env.test.mjs` | no |
    | W0 | 2 | Chrome-flags + thin-output + render-mode-probe contract tests written | `node --test test/phase-34-chrome-flags.test.mjs test/phase-34-thin-output-script-graph.test.mjs test/phase-34-render-mode-probe.test.mjs` | no |
    | W0 | 3 | D-06 baseline captured; no production code touched | `node --test "test/**/*.test.mjs" 2>&1 \| tail -3` (compare to 34-W0-PRECHECK.md) | no |
    | B  | 1 | Server route split + runtime-env classifier update | `node --test test/phase-34-route-split.test.mjs test/phase-34-runtime-env.test.mjs` (all GREEN) | no |
    | B  | 2 | Thin output.html + output-audio-binder.js created | `node --test test/phase-34-thin-output-script-graph.test.mjs` (all GREEN) | no |
    | B  | 3 | SSR navigation URL migration to /ssr (TWO sites) + body-marker fix | `grep -cE '127\.0\.0\.1:\$\{port\}/ssr' src/server/ssr-render-host.mjs` returns ≥2; `grep -cE '/output\?ssr=1' src/server/ssr-render-host.mjs` returns 0 | no |
    | B  | 4 | D-06 hard-gate verification + Track-B manual smoketest | `RUN_LIVE_TESTS=1 node --test test/connection-stability/` reports 80/0; manual smoketest of /, /output, /ssr documented | yes (smoketest part) |
    | A  | 1 | Decouple hasIgpuDev from hasVaapiEnabled; add unconditional GL flags | `node --test test/phase-34-chrome-flags.test.mjs test/ssr-chromium-flags-merge.test.mjs test/phase-32-encoder-detect-vaapi.test.mjs` (all GREEN) | no |
    | A  | 2 | ssr-stats renderMode telemetry log line | `node --test test/phase-34-render-mode-probe.test.mjs` (GREEN); + manual: server stdout shows `[ssr-stats] renderMode=...` lines | partial |
    | A  | 3 | Force renderMode='gl' on /ssr + ban 2D-fallback on /ssr only | `grep -nE '__ttBeamerForceRenderMode' src/app/runtime/runtime-orchestration.js` ≥2; `grep -nE 'D-02 forbids 2D-fallback' src/app/runtime/viewport/runtime-projection-gl-renderer.js` ≥1 | no |
    | A  | 4 | D-06 + D-05 manual visual smoketest | `RUN_LIVE_TESTS=1 node --test test/connection-stability/` reports 80/0; D-05 visual smoketest documented in 34-A-D06-VERIFICATION.md | yes (D-05 visual) |
    | V  | 1 | Validation map + verification matrix populated | `test -s .planning/phases/phase-34/34-VERIFICATION.md` exits 0; this very file > 100 lines | no |
    | V  | 2 | HUMAN-UAT checklist written + operator sign-off captured | `test -s .planning/phases/phase-34/34-HUMAN-UAT.md` exits 0; sign-off section present | yes (operator sign-off) |
    | V  | 3 | Final phase closure check (D-06 + summary count parity) | `RUN_LIVE_TESTS=1 node --test test/connection-stability/` 80/0 + `node --test "test/**/*.test.mjs" 2>&1 \| tail -3` matches 34-A-SUMMARY post-Track-A counts | no |
    ```

    Then, AT THE BOTTOM of `34-VALIDATION.md`, replace the "Validation Sign-Off" checklist with the actually-checked state:

    ```markdown
    ## Validation Sign-Off

    - [x] All tasks have `<automated>` verify or Wave 0 dependencies (rows above)
    - [x] Sampling continuity: every task in B and A has automated verify or routes through Wave 0 contracts
    - [x] Wave 0 covers all rail tests for B and A
    - [x] No watch-mode flags
    - [x] Feedback latency < 90s (each verify command runs in < 60s)
    - [x] `nyquist_compliant: true` set in frontmatter (update on save — flip from false to true)
    - [x] D-06 hard gate: `test/connection-stability/**` green at 34-B Task 4 AND 34-A Task 4 AND 34-V Task 3

    **Approval:** PASS — populated 2026-05-10 by 34-V-PLAN.md Task 1.
    ```

    Also flip `nyquist_compliant: false` to `nyquist_compliant: true` in the frontmatter at the top of the file (since the per-task map is now populated).

    **File 2: `.planning/phases/phase-34/34-VERIFICATION.md` — NEW**

    Write a full automated verification matrix mapping each CONTEXT.md exit criterion to its evidence:

    ```markdown
    ---
    phase: 34
    title: SSR Render-Quality + /output/ Thin-Consumer Refactor — Verification
    status: <planner fills: PASS | PASS-WITH-DEFERRALS | FAIL>
    verified: 2026-05-10
    ---

    # Phase 34 Verification Matrix

    Maps each CONTEXT.md exit criterion / D-decision to its evidence (automated or manual).

    ## Exit Criteria from CONTEXT.md and ROADMAP.md

    | # | Criterion | Source | Verification | Result |
    |---|-----------|--------|--------------|--------|
    | 1 | Renderer-Detection im SSR-Tab meldet WebGL2 (nicht 2D-Canvas Fallback) | ROADMAP.md | `[ssr-stats] renderMode=<value>` in server stdout; value does NOT contain "2d" | <fill: PASS / INCONCLUSIVE — actual observed value> |
    | 2 | Bekannte solid-color Banding-Animation rendert visuell ohne Banding | ROADMAP.md | Manual visual smoketest in 34-A-D06-VERIFICATION.md | <fill: PASS / INCONCLUSIVE — operator note> |
    | 3 | /output/ ohne ?ssr=1 Param lädt KEINE GIF/MP4-Decoder, KEINE Animations-Engine, KEINE Runtime-Orchestration | ROADMAP.md | `node --test test/phase-34-thin-output-script-graph.test.mjs` GREEN | <fill: PASS / FAIL> |
    | 4 | /output/?ssr=1 verhält sich identisch zum bisherigen SSR-Tab (no behavior regression) | ROADMAP.md | URL no longer used (D-04 hard-cut); /ssr replaces it; runtime-env still tolerates ?ssr=1 query → "server-ssr" | <fill: PASS — query tolerated as defense-in-depth> |
    | 5 | Pi /output/-Tab CPU-Verbrauch messbar geringer als vor dem Refactor | ROADMAP.md | DEFERRED — requires Pi hardware; documented in 34-HUMAN-UAT.md | DEFERRED |
    | 6 | Phase 33 Connection-Stability bleibt PASS — kein Reconnect-Regress | ROADMAP.md (D-06) | `RUN_LIVE_TESTS=1 node --test test/connection-stability/` reports 80/0 | <fill: PASS / FAIL with diff> |
    | 7 | VAAPI bleibt default-disabled (Phase 33 fix 3cd6748 carries forward) | ROADMAP.md (D-06) | `node --test test/phase-32-encoder-detect-vaapi.test.mjs` GREEN; ssr-render-host.mjs still gates VaapiVideoEncoder on hasVaapiEnabled (= SSR_ENABLE_VAAPI=1 + DRI device) | <fill: PASS> |
    | 8 | Tests in test/connection-stability/** weiterhin grün | ROADMAP.md | Same as #6 | (linked) |

    ## D-decision verification

    | D | Decision | Verification | Result |
    |---|----------|--------------|--------|
    | D-01 | Probe + Force in parallel | render-mode-probe rail GREEN + chrome-flags rails GREEN | <fill> |
    | D-02 | SSR-tab forbids 2D-Canvas fallback (LOCKED) | runtime-projection-gl-renderer.js contains `D-02 forbids 2D-fallback` carve-out + `__ttBeamerSsrGlHardFailed` escalation; Phase 30 B2 h10 unchanged for non-/ssr | <fill> |
    | D-03 | Maximum strip; separate HTML entry point (LOCKED) | output.html rail-7 GREEN (script count ≤ 8); output-audio-binder.js exists | <fill> |
    | D-04 | Server-side path split (LOCKED) | route-split rails GREEN; runtime-env rails GREEN; ssr-render-host.mjs URL migration: 0 references to /output?ssr=1 in that file | <fill> |
    | D-05 | Probe + manual visual smoketest | renderMode probe value does NOT contain "2d"; D-05 manual smoketest result documented in 34-A-D06-VERIFICATION.md | <fill> |
    | D-06 | No connection-stability regression (HARD GATE) | connection-stability 80/0; phase-32-hotfix-regression GREEN; VAAPI default-disabled regression test GREEN | <fill> |
    | D-07 | Plans 34-A and 34-B can run parallel or sequential | Sequential ordering picked: W0 → B → A → V (per RESEARCH.md primary recommendation: B-first because URL-detection cascades) | PASS |

    ## Test Snapshot

    | Metric | Pre-Phase-34 | Post-Phase-34 | Delta |
    |--------|--------------|---------------|-------|
    | All-tests pass | <fill from 34-W0-PRECHECK.md "Before Wave 0" pass> | <fill from final test run pass> | <fill> |
    | All-tests fail | <fill> | <fill — should be 0 above pre, all 16 rail tests flipped> | <fill> |
    | All-tests skip | <fill> | <fill> | <fill> |
    | connection-stability live | 80 / 0 / 0 | <fill> | <fill — must equal pre> |

    ## Files Touched

    | File | Plan | Change |
    |------|------|--------|
    | server.mjs | 34-B-T1 | resolveStaticPath /ssr → index.html, /output → output.html |
    | src/app/lib/shared/runtime-env.js | 34-B-T1 | getRuntimeEnvironment classifies pathname /ssr as 'server-ssr' |
    | src/app/runtime/runtime-orchestration.js | 34-B-T3, 34-A-T3 | data-ssr-tab marker pathname-aware; window.__ttBeamerForceRenderMode set on /ssr |
    | src/server/ssr-render-host.mjs | 34-B-T3, 34-A-T1 | ssrUrl + page.goto → /ssr; hasIgpuDev/hasVaapiEnabled split; GL flags gated on hasIgpuDev |
    | src/server/ssr-webrtc-signaling.mjs | 34-A-T2 | ssr-stats renderMode periodic log |
    | src/app/runtime/viewport/runtime-projection-gl-renderer.js | 34-A-T3 | /ssr-only 2D-fallback ban + hard-fail escalation |
    | output.html | 34-B-T2 | NEW — thin /output entry |
    | src/app/runtime/output-receiver/output-audio-binder.js | 34-B-T2 | NEW — thin live-sync audio binder |

    ## Outstanding / Deferred

    | Item | Reason | Pi UAT trigger |
    |------|--------|----------------|
    | Pi-hardware /output/ CPU drop measurement (exit criterion 5) | Pi hardware not available at phase-close | when Pi available — see 34-HUMAN-UAT.md §Pi-deferred |
    | Pi visual smoketest of solid-color animation | Pi hardware not available | same as above |
    | VAAPI re-enable investigation | Out of scope (CONTEXT.md §deferred) | future phase |
    | Pixel-diff regression suite | Out of scope (D-05 rejected) | future phase |

    ## Self-check

    Phase 34 is closed when:
    - All criteria above are PASS or explicitly DEFERRED with reason.
    - 34-HUMAN-UAT.md exists with operator's smoketest result.
    - Connection-stability is GREEN at this commit.
    - All 16 Wave-0 rails GREEN.
    ```

    The `<fill>` placeholders should be replaced with actual observed values from the live test run done in this task. If the executor cannot run live tests (no Xvfb), each `<fill>` row should record `INCONCLUSIVE — pending live re-run on operator hardware` with a TODO marker.
  </action>
  <verify>
    <automated>test -s .planning/phases/phase-34/34-VALIDATION.md && test -s .planning/phases/phase-34/34-VERIFICATION.md && grep -c "| W0 |" .planning/phases/phase-34/34-VALIDATION.md | xargs -I{} test {} -ge 3 && grep -c "D-0" .planning/phases/phase-34/34-VERIFICATION.md | xargs -I{} test {} -ge 7 && echo PASS</automated>
  </verify>
  <acceptance_criteria>
    - `.planning/phases/phase-34/34-VALIDATION.md` exists, has the per-task map populated (≥ 12 task rows visible via `grep -c "^| [WBAV]" .planning/phases/phase-34/34-VALIDATION.md` ≥ 12).
    - 34-VALIDATION.md frontmatter has `nyquist_compliant: true` (was false at phase start).
    - 34-VALIDATION.md "Validation Sign-Off" section has all checklist items checked.
    - `.planning/phases/phase-34/34-VERIFICATION.md` exists, ≥ 80 lines, contains both an "Exit Criteria" table and a "D-decision verification" table.
    - 34-VERIFICATION.md `<fill>` markers are all replaced with actual observed values OR explicit `INCONCLUSIVE — reason` strings.
    - 34-VERIFICATION.md "Test Snapshot" table has both pre-phase and post-phase numbers (no `<fill>` left).
  </acceptance_criteria>
  <done>
    Validation per-task map populated (was a draft); verification matrix written with actual observed values for every exit criterion + D-decision.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Write 34-HUMAN-UAT.md + capture operator sign-off</name>
  <files>.planning/phases/phase-34/34-HUMAN-UAT.md</files>
  <read_first>
    - .planning/phases/phase-34/34-CONTEXT.md (D-05 visual smoketest is the only mandatory manual gate; Pi-deferred items also recorded here)
    - .planning/phases/phase-33/33-HUMAN-UAT.md (template — eight scenarios pattern)
    - .planning/phases/phase-34/34-A-D06-VERIFICATION.md (Track-A manual smoketest result already documented; this doc summarizes for operator sign-off)
    - .planning/phases/phase-34/34-B-D06-VERIFICATION.md (Track-B smoketest result)
  </read_first>
  <what-built>
    Phase 34 is feature-complete. Every automated verification has been done. The remaining gate is operator-confirmed sign-off on the visual smoketest (D-05) and acknowledgment of the Pi-hardware deferred items.

    This task drafts the HUMAN-UAT checklist for the operator to walk through, then waits for the operator to mark each item PASS / FAIL / DEFERRED.
  </what-built>
  <how-to-verify>
    Step 1: Write `.planning/phases/phase-34/34-HUMAN-UAT.md` with the exact structure below. The executor fills the static parts; the operator fills the result columns.

    ```markdown
    ---
    phase: 34
    title: SSR Render-Quality + /output/ Thin-Consumer Refactor — Human UAT
    status: <PENDING-OPERATOR | PASS | PASS-WITH-DEFERRALS | FAIL>
    test_board: nemesis-lockdown-a
    ---

    # Phase 34 — Human UAT Checklist

    Mandatory items must be PASS for phase close. Deferred items carry the Phase 33 PASS-AUTOMATED-PENDING-PI-HARDWARE pattern forward.

    ## Mandatory (gaming-PC desktop browser, before phase close)

    | # | Scenario | Expected | Actual / Notes | Result |
    |---|----------|----------|----------------|--------|
    | M1 | Open http://<host>:<port>/ — dashboard renders | Dashboard fully loads, no console errors | <operator fills> | <PASS/FAIL> |
    | M2 | Open http://<host>:<port>/output — thin consumer | Splash → video stream visible; DevTools Network shows WS to /api/live/ws?role=final-output; view source confirms NO runtime-orchestration.js / runtime-gif-* script tags | <operator fills> | <PASS/FAIL> |
    | M3 | Open http://<host>:<port>/ssr directly — full app at /ssr | Full dashboard HTML loads (same content as / but at the new SSR route) | <operator fills> | <PASS/FAIL> |
    | M4 | D-05 visual: known solid-color banding animation rendered via stream — observed on /output in gaming-PC desktop browser | Smooth gradient, NO banding visible | <operator fills> | <PASS/FAIL/INCONCLUSIVE> |
    | M5 | Server stdout shows `[ssr-stats] renderMode=<value>` lines roughly every 10s | renderMode value does NOT contain "2d" — i.e. one of "gl", "webgl", "webgl2", "auto" | <operator fills observed value> | <PASS/FAIL> |
    | M6 | Pi-local audio still triggers on /output (test by triggering an animation that has a sound mapping) | Audio plays in the /output tab | <operator fills> | <PASS/FAIL> |
    | M7 | Connection-stability sanity: open /output, kill the SSR Chromium tab process, observe reconnect within 30s | Reconnect succeeds, video resumes | <operator fills> | <PASS/FAIL> |

    ## Deferred — Pi hardware UAT

    Carries Phase 33's PASS-AUTOMATED-PENDING-PI-HARDWARE pattern forward.

    | # | Scenario | Why deferred |
    |---|----------|--------------|
    | P1 | Pi browser /output renders the H264 stream visually identical to gaming-PC | Pi hardware not currently accessible to operator |
    | P2 | Pi /output CPU-Verbrauch messbar geringer als vor Phase 34 Track B (htop / atop measurement) | Pi hardware required |
    | P3 | Pi solid-color banding visual smoketest | Pi hardware required + may show separate banding source (RESEARCH.md §deferred — Pi /output render-mode policy review) |
    | P4 | 10× Pi-reload connection-stability repro on actual Pi | Phase 33 pattern carries forward |

    ## Sign-off

    - Mandatory section result (M1-M7): <PENDING / ALL-PASS / FAILED — list which>
    - Deferred section: P1-P4 acknowledged as Pi-pending
    - Operator initials + ISO date: <fill>
    - Phase 34 close decision: <PASS | PASS-WITH-DEFERRALS-PENDING-PI-HARDWARE | FAIL>
    ```

    Step 2: Manually walk the operator through M1-M7 in the gaming-PC desktop browser. For each item, record observed value or behavior in the `Actual / Notes` cell, then mark PASS / FAIL / INCONCLUSIVE.

    Step 3: If ALL of M1-M7 are PASS (with M4 INCONCLUSIVE allowed if and only if the operator records that the renderMode probe (M5) confirms `gl`/`webgl`/`webgl2` — meaning GL is working but the visual judgment is subjective), the phase closes as PASS-WITH-DEFERRALS-PENDING-PI-HARDWARE (deferring P1-P4 per Phase 33 precedent).

    Step 4: If any of M1-M7 except M4 FAILs, the phase does NOT close. Return to the relevant plan (B for routing/script-graph; A for renderMode/banding) for root-cause work.

    Step 5: Operator types one of:
    - `approved — all mandatory PASS, deferring P1-P4 to Pi hardware`
    - `approved — M4 INCONCLUSIVE (renderMode=<value> per M5), banding subjective; deferring visual judgment to Pi UAT; phase closes PASS-WITH-DEFERRALS`
    - Specific failure description with file:line / observed value
  </how-to-verify>
  <resume-signal>Type one of: "approved — all mandatory PASS", "approved — M4 INCONCLUSIVE PASS-WITH-DEFERRALS", or describe the failure.</resume-signal>
  <action>Step 1: write .planning/phases/phase-34/34-HUMAN-UAT.md using the exact template structure given in <how-to-verify> above (frontmatter + Mandatory M1-M7 table + Deferred P1-P4 table + Sign-off section). Step 2: walk the operator through M1-M7 in the gaming-PC desktop browser, recording observed values in the 'Actual / Notes' column and PASS/FAIL/INCONCLUSIVE in the Result column. Step 3: capture operator sign-off via the resume signal — one of 'approved — all mandatory PASS', 'approved — M4 INCONCLUSIVE PASS-WITH-DEFERRALS', or a specific failure description. Step 4: update the Sign-off section of 34-HUMAN-UAT.md with the operator's initials, ISO date, and final close decision (PASS / PASS-WITH-DEFERRALS-PENDING-PI-HARDWARE / FAIL). Step 5: if any of M1-M7 except M4 FAILs, do NOT close the phase — return to the relevant track (B for routing/script-graph; A for renderMode/banding) for root-cause work.</action>
  <verify>
    <automated>test -s .planning/phases/phase-34/34-HUMAN-UAT.md && grep -cE 'M[1-7]' .planning/phases/phase-34/34-HUMAN-UAT.md | xargs -I{} test {} -ge 7 && grep -cE 'Sign-off' .planning/phases/phase-34/34-HUMAN-UAT.md | xargs -I{} test {} -ge 1</automated>
  </verify>
  <done>34-HUMAN-UAT.md exists with all 7 mandatory items recorded (PASS/FAIL/INCONCLUSIVE) + 4 deferred items + operator sign-off section completed; final close decision recorded.</done>
</task>

<task type="auto">
  <name>Task 3: Final phase-close gate — connection-stability + all-tests parity check</name>
  <files>.planning/phases/phase-34/34-CLOSURE.md</files>
  <read_first>
    - .planning/phases/phase-34/34-CONTEXT.md (D-06 hard gate; exit criteria)
    - .planning/phases/phase-34/34-W0-PRECHECK.md (baseline)
    - .planning/phases/phase-34/34-VERIFICATION.md (Task 1 output — must show PASS for D-06)
    - .planning/phases/phase-34/34-HUMAN-UAT.md (Task 2 output — must show operator sign-off)
    - .planning/phases/phase-33/33-CLOSURE.md (template + status enum: CLOSED-PASS-WITH-LIVE-FIX, PASS-AUTOMATED-PENDING-PI-HARDWARE)
  </read_first>
  <action>
    Final automated check + closure document.

    Step 1 — Run the absolute final verification:
    ```bash
    node --test "test/**/*.test.mjs" 2>&1 | tail -3 | tee /tmp/34-final-all-tests.out
    RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tail -3 | tee /tmp/34-final-conn-stab.out
    ```

    Confirm:
    - All-tests fail count == pre-phase fail count (no production regressions; all 16 rail tests are GREEN, balanced against the pre-phase baseline).
    - Connection-stability fail count == 0 (D-06 hard gate).

    Step 2 — Write `.planning/phases/phase-34/34-CLOSURE.md`:

    ```markdown
    ---
    phase: 34
    phase_id: 34
    title: SSR Render-Quality + /output/ Thin-Consumer Refactor — Closure
    status: <one of: CLOSED-PASS | PASS-AUTOMATED-PENDING-PI-HARDWARE | FAIL>
    closed: 2026-05-10T<fill>:00:00Z
    test_board: nemesis-lockdown-a
    ---

    # Phase 34 Closure

    ## Outcome

    <one paragraph: what shipped, what was verified, what is deferred>

    ## What Phase 34 Delivered

    ### Track B — URL split + thin consumer
    - `/ssr` route added; SSR Chromium tab navigates here (was /output?ssr=1).
    - `/output` and `/output/final` now serve the new thin `output.html` (was index.html).
    - `runtime-env.js` classifies pathname `/ssr` as `server-ssr` so the GL renderer's permanent-disable threshold is correctly skipped (the cascade RESEARCH §Pitfall 2 warned about).
    - `output.html` is a ~80-line thin entry: video, splash, banner, error overlay, diagnostic chip, plus 4 script tags (runtime-env, receiver-bootstrap, output-audio-binder, inline diagnostic-chip rAF). NO render pipeline, NO decoders, NO orchestration.
    - `output-audio-binder.js` (NEW, ~120 lines): minimal live-sync subscriber, plays `animation.sound` paths via HTMLAudioElement pool, exponential-backoff WS reconnect.

    ### Track A — GL flag fix + 2D-fallback ban + telemetry
    - `hasIgpuDev` decoupled from `hasVaapiEnabled` in `ssr-render-host.mjs`.
    - GL-helpful Chrome flags `--ignore-gpu-blocklist` and `--enable-gpu-rasterization` added unconditionally on `hasIgpuDev` (default-on when /dev/dri/renderD128 exists, regardless of VAAPI opt-in).
    - VAAPI features still gated on `SSR_ENABLE_VAAPI=1` — D-06 default-disabled lock UNCHANGED.
    - On `/ssr`, `state.renderMode` forced to `"gl"` so `__ttBeamerEffectiveRenderMode()` returns a string explicitly NOT containing `"2d"`.
    - On `/ssr`, the 2D-fallback is banned (D-02 LOCKED): GL renderer logs LOUD on context loss + escalates `__ttBeamerSsrGlHardFailed` after 6 losses. Phase 30 B2 h10 fallback is preserved on dashboard + `/output` (the unchanged paths).
    - `ssr-stats` envelope's `renderMode` field is now logged to server stdout every 10th message: `[ssr-stats] renderMode=<value>` (D-01 telemetry).

    ## Test Snapshot

    | Stage | Pass | Fail | Skip |
    |-------|------|------|------|
    | Pre-Phase-34 (master) | <fill from 34-W0-PRECHECK.md> | <fill> | <fill> |
    | Wave 0 (rails added) | <fill> | <fill> | <fill> |
    | After Track B | <fill> | <fill> | <fill> |
    | After Track A | <fill> | <fill> | <fill> |
    | After Phase-34 close | <fill from /tmp/34-final-all-tests.out> | <fill> | <fill> |

    Connection-stability live tests:
    | Stage | Pass | Fail |
    |-------|------|------|
    | Phase 33 close (master before 34) | 80 | 0 |
    | Phase 34 close | <fill from /tmp/34-final-conn-stab.out> | <fill> |

    ## Files Touched

    Source:
    - `server.mjs` (Track B Task 1 — `resolveStaticPath` route split)
    - `src/app/lib/shared/runtime-env.js` (Track B Task 1 — getRuntimeEnvironment /ssr classifier)
    - `src/app/runtime/runtime-orchestration.js` (Track B Task 3 — data-ssr-tab pathname-aware; Track A Task 3 — `__ttBeamerForceRenderMode = "gl"` set on /ssr)
    - `src/server/ssr-render-host.mjs` (Track B Task 3 — ssrUrl + page.goto → /ssr; Track A Task 1 — hasIgpuDev/hasVaapiEnabled split + GL flags decoupling)
    - `src/server/ssr-webrtc-signaling.mjs` (Track A Task 2 — ssr-stats renderMode log)
    - `src/app/runtime/viewport/runtime-projection-gl-renderer.js` (Track A Task 3 — /ssr 2D-fallback ban + hard-fail escalation)

    New:
    - `output.html` (Track B Task 2 — thin /output/ entry)
    - `src/app/runtime/output-receiver/output-audio-binder.js` (Track B Task 2 — thin live-sync audio binder)

    Tests (new):
    - `test/phase-34-route-split.test.mjs` (W0 rail)
    - `test/phase-34-runtime-env.test.mjs` (W0 rail)
    - `test/phase-34-chrome-flags.test.mjs` (W0 rail)
    - `test/phase-34-thin-output-script-graph.test.mjs` (W0 rail)
    - `test/phase-34-render-mode-probe.test.mjs` (W0 rail)

    ## Outstanding (Pi-hardware UAT)

    See `34-HUMAN-UAT.md` §Deferred. Four scenarios deferred:
    1. Pi browser /output visual rendering parity
    2. Pi /output CPU-Verbrauch measurement vs pre-Phase-34
    3. Pi solid-color banding visual smoketest
    4. 10× Pi-reload connection-stability repro

    ## Self-Check: <fill: PASS / PASS-WITH-DEFERRALS-PENDING-PI-HARDWARE / FAIL>

    Tag pending: `phase-34-end` (after Pi UAT completes) or `phase-34-delivered-to-uat` (now — automated coverage complete + gaming-PC manual smoketest passed).
    ```

    Fill the `<fill>` placeholders with actual observed numbers from the test runs done at start of this task.
  </action>
  <verify>
    <automated>test -s .planning/phases/phase-34/34-CLOSURE.md && grep -cE 'PASS|FAIL' .planning/phases/phase-34/34-CLOSURE.md | xargs -I{} test {} -ge 1 && RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tail -1 | grep -E "fail 0|0 fail|✔" && echo CLOSED</automated>
  </verify>
  <acceptance_criteria>
    - `.planning/phases/phase-34/34-CLOSURE.md` exists with all `<fill>` markers replaced with concrete numbers.
    - The "Test Snapshot" tables show actual numbers, not placeholders.
    - The connection-stability post-Phase-34 row shows fail count = 0.
    - The status frontmatter is one of `CLOSED-PASS`, `PASS-AUTOMATED-PENDING-PI-HARDWARE`, or (only if smoketest failed) `FAIL`.
    - `RUN_LIVE_TESTS=1 node --test test/connection-stability/ 2>&1 | tail -3` shows 80 pass / 0 fail.
    - The "Self-Check" line at the bottom of 34-CLOSURE.md matches the frontmatter status.
  </acceptance_criteria>
  <done>
    Phase 34 closure document written with concrete pre/post test numbers; connection-stability suite verified GREEN at the absolute end of the phase; phase status declared (CLOSED-PASS or PASS-AUTOMATED-PENDING-PI-HARDWARE) and recorded in the frontmatter. The closure doc serves the same role as Phase 33's `33-CLOSURE.md`.
  </done>
</task>

</tasks>

<threat_model>
**This plan modifies only documentation files (.planning/phases/phase-34/*.md). No code execution surface, no new HTTP routes, no new user input.**

`<threat_model>No threats — change is documentation-only / no production code touched / no new network surface / no user input handling.</threat_model>`

The Phase 34 production-code threat surfaces (T-34-B-01..05 and T-34-A-01..05) are documented in the respective Track-B and Track-A plans. This Verification plan inherits those mitigations without modification.
</threat_model>

<verification>
- 34-VALIDATION.md per-task map populated; `nyquist_compliant: true` set.
- 34-VERIFICATION.md exists with Exit-Criteria + D-decision tables, no `<fill>` markers remaining.
- 34-HUMAN-UAT.md exists; operator has signed off (or status PASS-WITH-DEFERRALS recorded).
- 34-CLOSURE.md exists; pre/post test numbers concrete; status declared.
- Final connection-stability run: 80/0.
</verification>

<success_criteria>
Plan 34-V is complete when:
- All four documentation artifacts exist with concrete (non-placeholder) content.
- Operator has provided sign-off on 34-HUMAN-UAT.md (or recorded an explicit PASS-WITH-DEFERRALS).
- 34-CLOSURE.md frontmatter status is `CLOSED-PASS` OR `PASS-AUTOMATED-PENDING-PI-HARDWARE`.
- Connection-stability suite is GREEN at this exact commit.
</success_criteria>

<output>
After completion, create `.planning/phases/phase-34/34-V-SUMMARY.md` with:
- Documents finalized (validation, verification, human-uat, closure).
- Phase 34 final status (one of: CLOSED-PASS, PASS-AUTOMATED-PENDING-PI-HARDWARE, FAIL).
- Final test snapshot numbers.
- Outstanding Pi-deferred items (4 scenarios).
- Tag recommendation (`phase-34-end` if Pi UAT done, `phase-34-delivered-to-uat` if Pi-pending).
</output>
