# P8-T23 Validation - Empty Image Board Start

Date: 2026-03-27
Plan: 8-HF1
Status: PASS

## Scenario
- Import a board from image upload where the imported board payload starts with an empty `roomCatalog`.

## Expected
- Board is accepted and appears in the active runtime catalog.
- Board can be activated immediately after import.
- Settings stays usable for manual room/play-area authoring (no startup crash).

## Evidence
1. Client catalog loading no longer filters out boards with empty `rooms` arrays.
2. Import flow upserts response board data into client catalog if `/api/boards` returns a stale snapshot.
3. Import activation path now fails explicitly if active-board switching cannot be completed (no silent success).
