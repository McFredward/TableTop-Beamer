# P9-HF3-T6 - Align-Mode Parity Check

## Objective

Verify that align-mode ON/OFF semantics remain identical between:

1. server-stream final path, and
2. client-render fallback final path.

## Validation Notes

- Stream frame payload carries authoritative `alignMode`.
- Final output stream renderer mirrors `alignMode` into the same body class contract (`align-mode-active`) used by fallback mode.
- Existing overlay visibility behavior remains unchanged:
  - Control role: overlay visible.
  - Final role + align OFF: overlay hidden.
  - Final role + align ON: overlay visible.

## Result

PASS - align-mode visibility contract is shared across stream and fallback paths without introducing a divergent rule set.
