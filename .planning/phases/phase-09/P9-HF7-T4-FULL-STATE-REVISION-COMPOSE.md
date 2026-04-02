# P9-HF7-T4 Full-State Revision Compose

## Goal

Ensure final-stream compose is always generated from current full authoritative state revision and closes stale-frame/cache reuse paths.

## Verification

- Script: `node debug/p9-hf7-t4-full-state-revision-compose.mjs`
- Output: `debug/p9-hf7-t4-full-state-revision-compose-output.json`
- Checks:
  - Start mutation ack version is reflected in a stream frame containing the new animation.
  - Stop mutation ack version is reflected in a stream frame with animation removed.
  - Late subscriber first frame is not stale (`sourceVersion >= latest snapshot version`).

## Verdict

Current full authoritative state revision is used for compose, and stale cached-frame delivery path is closed.
