# P9-HF7-T3 Producer Subscriber Independence

## Goal

Guarantee server stream producer remains authoritative and active independent of subscriber count/churn (0/1/N).

## Verification

- Script: `node debug/p9-hf7-t3-producer-subscriber-independence.mjs`
- Output: `debug/p9-hf7-t3-producer-subscriber-independence-output.json`
- Assertions:
  - `producer.running` stays `true` before subscriber attach, during attach, detach, reconnect, and post-close.
  - Producer state remains stable while subscriber count changes.

## Verdict

Producer lifecycle is subscriber-independent and remains always authoritative while clients churn.
