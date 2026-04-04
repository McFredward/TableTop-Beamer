# P10-HF9-T1 Trigger Command Timeout RED Repro

- Script: `node debug/p10-hf9-t1-trigger-timeout-repro.mjs`
- Output: `debug/p10-hf9-t1-trigger-timeout-repro-output.json`
- Result: **FAIL reproduced** (single-attempt command path times out when ack arrives on second attempt window).

This is the mandatory RED baseline before retry/ack hardening.
