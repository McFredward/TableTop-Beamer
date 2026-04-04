# P10-HF9-T8 Command Timeout/Ack/Resend Hardening

- Runtime: `emitLiveMutation` now retries deterministically (`maxAttempts=3`, exponential backoff) and preserves idempotent `mutationId` across attempts.
- Diagnostic: `node debug/p10-hf9-t8-command-hardening-pass.mjs`
- Output: `debug/p10-hf9-t8-command-hardening-pass-output.json` (**PASS**)
