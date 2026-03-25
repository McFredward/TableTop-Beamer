# P2-T43 Zonen-Ladepfad: Negativtests

Datum: 2026-03-25

## Ziel

Nachweis, dass missing/malformed/partial Zonen-Daten den Runtime-Pfad nicht brechen und deterministisch in den Fallback laufen.

## Kommando

`node debug/p2-t43-zone-loader-negative.mjs`

## Erwartung

- `MISSING=ZONE_FILE_MISSING`
- `MALFORMED=ZONE_MALFORMED_JSON`
- `PARTIAL=ZONE_PARTIAL_DATA`

## Ergebnis

Die drei Negativfaelle werden explizit klassifiziert und triggern im Loader den Fallback-Pfad (`last-known-good` bzw. Inline-Notfallprofil). Damit bleiben Boot-Sequenz, State-Aufbau und Rendering bedienbar.
