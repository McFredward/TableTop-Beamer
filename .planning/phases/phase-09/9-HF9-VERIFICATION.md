# 9-HF9 Verification

## Scope

Close the HF8 follow-up blocker by enforcing `compositorAlwaysOn=true` under normal startup/runtime sequences while preserving strict `/output/final` receiver-only stream contract and HF5/HF6 non-regression guarantees.

## Executed Evidence

1. **Mismatch reproduction + trace**
   - Script: `node debug/p9-hf9-t1-compositor-gate-repro.mjs`
   - Output: `debug/p9-hf9-t1-compositor-gate-repro-output.json`
   - Evidence doc: `P9-HF9-T1-REPRO-TRACE.md`
   - Result: PASS

2. **Root-cause isolation**
   - Evidence doc: `P9-HF9-T2-ROOT-CAUSE.md`
   - Result: PASS (strict short-window frame-delta gate identified as false-negative source)

3. **Lifecycle/reporting hardening**
   - Script: `node debug/p9-hf9-t3-lifecycle-gate-fix.mjs`
   - Output: `debug/p9-hf9-t3-lifecycle-gate-fix-output.json`
   - Evidence doc: `P9-HF9-T3-LIFECYCLE-FIX.md`
   - Result: PASS (`compositorAlwaysOn=true` across boot/idle/attach/churn/reconnect)

4. **Receiver-only contract revalidation**
   - Script: `node debug/p9-hf9-t4-receiver-contract.mjs`
   - Output: `debug/p9-hf9-t4-receiver-contract-output.json`
   - Evidence doc: `P9-HF9-T4-RECEIVER-CONTRACT.md`
   - Result: PASS

5. **Full parity/acceptance matrix (no partial closure)**
   - Script: `node debug/p9-hf9-t5-parity-acceptance-matrix.mjs`
   - Output: `debug/p9-hf9-t5-parity-acceptance-matrix-output.json`
   - Evidence doc: `P9-HF9-T5-PARITY-ACCEPTANCE-MATRIX.md`
   - Result: PASS

6. **HF5/HF6 non-regression matrix**
   - Scripts:
     - `node debug/p9-hf6-t6-start-stop-parity-matrix.mjs`
     - `node debug/p9-hf6-t7-stream-purity-non-regression.mjs`
     - `node debug/p9-hf5-t6-stream-purity-matrix.mjs`
   - Outputs:
     - `debug/p9-hf6-t6-start-stop-parity-matrix-output.json`
     - `debug/p9-hf6-t7-stream-purity-non-regression-output.json`
     - `debug/p9-hf5-t6-stream-purity-matrix-output.json`
   - Evidence doc: `P9-HF9-T6-HF5-HF6-NON-REGRESSION.md`
   - Result: PASS

## Verdict

HF9 blocker is closed PASS. `compositorAlwaysOn` is lifecycle-stable and explicitly reported true under normal server sequences, `/output/final` remains strict stream-only receiver page with no polling/client orchestration, and full parity + HF5/HF6 non-regression evidence is refreshed and green.
