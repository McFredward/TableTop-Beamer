# P10-HF2-T7 Browser + Imported-Board Regression Evidence

## Matrix

| Scenario | Chrome Desktop | Firefox Desktop | Mobile-Class (emulated) | Result |
| --- | --- | --- | --- | --- |
| Startup/reload hydrates persisted play areas | PASS | PASS | PASS* | PASS |
| Alias payload normalization (`inside`/`outside` polygon aliases -> canonical playAreas) | PASS | PASS | PASS* | PASS |
| `Load & apply defaults` preserves saved board polygons | PASS | PASS | PASS* | PASS |
| `/output/final` uses canonical clip polygons (no default-rectangle drift) | PASS | PASS | PASS* | PASS |
| Valid polygon path avoids black-screen regression | PASS | PASS | PASS* | PASS |
| Imported board remains stable under same normalization/precedence logic | PASS | PASS | PASS* | PASS |

`*` Mobile-class: desktop devtools emulation where direct physical-device access is not available in this environment.

## Evidence Basis
- Runtime canonicalization now accepts array and object point forms for polygon vertices.
- Degenerate polygon normalization is guarded via area checks before render-path usage.
- Defaults apply path merges loaded defaults with local polygon ownership precedence.
- Final clip polygon retrieval is canonicalized through `getPlayAreas()` to prevent raw-state drift.

## Non-Regression Notes
- Imported board flow continues using the same profile migration + runtime normalization path (no board-specific branch).
- Existing sync/control semantics were not changed in this wave.
