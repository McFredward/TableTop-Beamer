# P10-HF3-T5 Diagnostics - board-switch + final-output render contract

## Command

`node debug/p10-hf3-t5-board-switch-final-contract.mjs`

## Result

- Status: **FAIL (expected RED baseline)**
- Failed boards: `nemesis`, `nemesis-lockdown-a`
- Assertion: `Board-switch final-output contract drift`

## Console Output (excerpt)

```text
AssertionError [ERR_ASSERTION]: Board-switch final-output contract drift on: nemesis, nemesis-lockdown-a

2 !== 0
```

## Artifact

- `debug/p10-hf3-t5-board-switch-final-contract-output.json`
