# Phase 39 Plan 39-5 Task 1 — Full regression matrix
**Run date:** 2026-05-12T23:54:06+02:00
**Commit:** fe94797cade6619c9dbbc954e376cf11f26adfdf

## Phase 39 new tests (unit)

### test/phase-39-d01-mime-and-range.test.mjs
Exit code: 0
```
✔ D-01 RED: server.mjs MIME_TYPES table maps .mp4 to video/mp4 (0.60385ms)
✔ D-01 RED: server.mjs MIME_TYPES table maps .webm to video/webm (0.154202ms)
✔ D-01 RED: server.mjs MIME_TYPES table maps .m4v to video/mp4 (0.132339ms)
✔ D-01 RED: handleStaticFile honours Range: bytes=N-M with status 206 (0.32639ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 45.217767
```

### test/phase-39-d02-state-machine.test.mjs
Exit code: 0
```
✔ D-02 RED: ConnectionState.INITIAL_CONNECT exists as a string (0.50368ms)
✔ D-02 RED: NEW → INITIAL_CONNECT is legal (0.19079ms)
✔ D-02 RED: NEW → CONNECTING is NOT legal (must route via INITIAL_CONNECT) (0.271465ms)
✔ D-02 RED: INITIAL_CONNECT → CONNECTED is legal (0.090449ms)
✔ D-02 RED: INITIAL_CONNECT → RECONNECTING is legal (after 5s grace) (0.087509ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 42.379245
```

### test/phase-39-d03-render-mode-probe.test.mjs (RUN_LIVE_TESTS=1)
Exit code: 0
```
✔ D-03 SSR renderMode probe and record (4880.405775ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4956.823496
```

### test/connection-stability/phase-39-cold-boot.test.mjs (RUN_LIVE_TESTS=1)
Exit code: 0
```
[d-02-cold-boot] reconnectingEvents=0
ℹ pass 1
ℹ fail 0
ℹ duration_ms 31927.090081
```

### test/live-e2e/test_phase39_d01_mp4_in_ssr.py
Exit code: 0
```
============================= test session starts ==============================
platform linux -- Python 3.14.3, pytest-9.0.3, pluggy-1.6.0 -- /home/linuxbrew/.linuxbrew/opt/python@3.14/bin/python3.14
cachedir: .pytest_cache
rootdir: /home/claw/tt-beamer
collecting ... collected 1 item

test/live-e2e/test_phase39_d01_mp4_in_ssr.py::test_d01_sandstorm_mp4_plays_in_ssr_tab PASSED [100%]

============================== 1 passed in 10.64s ==============================
```

### test/live-e2e/test_phase39_d03_no_seams.py
Exit code: 0
```
============================= test session starts ==============================
platform linux -- Python 3.14.3, pytest-9.0.3, pluggy-1.6.0 -- /home/linuxbrew/.linuxbrew/opt/python@3.14/bin/python3.14
cachedir: .pytest_cache
rootdir: /home/claw/tt-beamer
collecting ... collected 3 items

test/live-e2e/test_phase39_d03_no_seams.py::test_d03_solid_color_no_visible_seams[3] PASSED [ 33%]
test/live-e2e/test_phase39_d03_no_seams.py::test_d03_solid_color_no_visible_seams[5] PASSED [ 66%]
test/live-e2e/test_phase39_d03_no_seams.py::test_d03_solid_color_no_visible_seams[9] PASSED [100%]

============================== 3 passed in 27.52s ==============================
```

## Phase 38 carry-forward rails

### test/phase-38-w10-ws-frame-fragmentation.test.mjs
Exit code: 0
```
✔ phase-38-w10: LARGE ws frame sent byte-by-byte still reassembles (2602.771471ms)
✔ phase-38-w10: TWO frames concatenated in one TCP write are both decoded (2553.426386ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10400.700496
```

### test/phase-35-bayer-dither.test.mjs
Exit code: 0
```
✔ D-03-C1: dither produces non-uniform pixel values (proof of dither) (0.878579ms)
✔ D-03-C1: BAYER_4X4 matrix shape (sanity, optional export) (0.582918ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 43.00483
```
### test/static-resource-headers.test.mjs
Exit code: 0
```
✔ buildStaticResourceHeaders: app code paths do NOT get Connection: close (0.086012ms)
✔ buildStaticResourceHeaders: identical for sounds/rooms/board-images (0.102194ms)
ℹ tests 8
ℹ suites 0
ℹ pass 8
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 42.681166
```

### test/connection-stability/live-fixture-smoke.test.mjs (RUN_LIVE_TESTS=1)
Exit code: 0
```
[smoke] sustained 31504ms heartbeats=21 closed=false producerReady=0 producerClosed=0 renderHostDown=0
ℹ fail 0
```

### test/live-e2e/test_phase38_ssr_grid_state_cdp.py
Exit code: 0
```
platform linux -- Python 3.14.3, pytest-9.0.3, pluggy-1.6.0 -- /home/linuxbrew/.linuxbrew/opt/python@3.14/bin/python3.14
cachedir: .pytest_cache
rootdir: /home/claw/tt-beamer
collecting ... collected 3 items

test/live-e2e/test_phase38_ssr_grid_state_cdp.py::test_phase38_A_baseline_propagation PASSED [ 33%]
test/live-e2e/test_phase38_ssr_grid_state_cdp.py::test_phase38_B_post_burst_single_shot PASSED [ 66%]
test/live-e2e/test_phase38_ssr_grid_state_cdp.py::test_phase38_C_identity_reset_propagation PASSED [100%]

============================== 3 passed in 34.61s ==============================
```

### test/live-e2e/test_phase38_w11_align_off_overlay_disappears.py
Exit code: 0
```
platform linux -- Python 3.14.3, pytest-9.0.3, pluggy-1.6.0 -- /home/linuxbrew/.linuxbrew/opt/python@3.14/bin/python3.14
cachedir: .pytest_cache
rootdir: /home/claw/tt-beamer
collecting ... collected 1 item

test/live-e2e/test_phase38_w11_align_off_overlay_disappears.py::test_phase38_w11_overlay_disappears_on_align_off PASSED [100%]

============================== 1 passed in 9.08s ===============================
```

### test/live-e2e/test_phase38_w12_invalidate_cache.py
Exit code: 0
```

=============================== warnings summary ===============================
test/live-e2e/test_phase38_w12_invalidate_cache.py::test_w12_boot_paint_shows_warp
  /home/claw/tt-beamer/test/live-e2e/test_phase38_w12_invalidate_cache.py:133: DeprecationWarning: Image.Image.getdata is deprecated and will be removed in Pillow 14 (2027-10-15). Use get_flattened_data instead.
    pixels = list(box.getdata())

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
======================== 3 passed, 1 warning in 21.33s =========================
```

### test/live-e2e/test_phase38_pi_ssr_sync_enforcement.py
Exit code: 0
```
cachedir: .pytest_cache
rootdir: /home/claw/tt-beamer
collecting ... collected 2 items

test/live-e2e/test_phase38_pi_ssr_sync_enforcement.py::test_phase38_pi_ssr_sync_after_single_shot PASSED [ 50%]
test/live-e2e/test_phase38_pi_ssr_sync_enforcement.py::test_phase38_pi_ssr_sync_after_drag_burst PASSED [100%]

============================== 2 passed in 27.54s ==============================
```

## Phase 32/33 reconnect rails

### test/connection-stability/receiver-state-machine.test.mjs
Exit code: 0
```
✔ 03-T2 sim: shouldGiveUp logic — reaches GIVEN_UP after 10 attempts (0.116357ms)
✔ 03-T2 sim: shouldGiveUp — reaches GIVEN_UP after 120s elapsed (0.057471ms)
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 52.394579
```

### test/phase-32-cold-boot-reconnect-repro.test.mjs
Exit code: 0
```
✔ POST-PATCH: receiver-bootstrap.js does NOT contain 'if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS)' — hard cap removed in 32-02-T2 (1.434686ms)
✔ GREEN: Pi recovers within 10s when producer comes up after 500ms delay (505.766137ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 551.440352
```

## Result

**All regression tests PASS.** Phase 39 is gate-green and ready for operator UAT (Task 2).

- Total test sections run: 16 (≥13 required by acceptance criteria)
- Non-zero exit codes: 0
- D-08 sustained heartbeat: see live-fixture-smoke output
- D-02 cold-boot reconnectingEvents: see phase-39-cold-boot output
