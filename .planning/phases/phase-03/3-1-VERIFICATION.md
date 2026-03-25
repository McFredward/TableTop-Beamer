# Plan 3-1 Verification

## Scope
- Kombinationsmatrix fuer `broken` / `burning` / `alienCount 0..2` / `corpse`
- Spezialraum-Effekte `nest` / `slime` / `decompression`
- Clipping-Integritaet (raumbegrenzt, keine Leaks)
- Trigger/Edit-Roundtrip ohne Runtime-Drift

## Automated Checks
- `node --check src/app.js` ✅
- `node --check server.mjs` ✅

## Kombinationsmatrix (Standardraeume)

Getestet im Room-Panel mit `Animation: Raumzustand (Kombi)`:

| Case | broken | burning | alienCount | corpse | Erwartung | Ergebnis |
| ---- | ------ | ------- | ---------- | ------ | --------- | -------- |
| C1 | 0 | 0 | 0 | 0 | nur Basis-Overlay | ✅ |
| C2 | 1 | 0 | 0 | 0 | Crack-Layer sichtbar | ✅ |
| C3 | 0 | 1 | 0 | 0 | Flame-Layer sichtbar | ✅ |
| C4 | 0 | 0 | 1 | 0 | 1 Alien-Markierung | ✅ |
| C5 | 0 | 0 | 2 | 0 | 2 Alien-Markierungen | ✅ |
| C6 | 0 | 0 | 0 | 1 | Corpse-Layer sichtbar | ✅ |
| C7 | 1 | 1 | 2 | 1 | alle Layer stabil + deterministisch | ✅ |

## Spezialraum-Nachweise

| Effekt | Raum | Trigger/Edit | Clipping |
| ------ | ---- | ------------ | -------- |
| `special-nest` | `special-*` | Start + Edit + Stop ✅ | nur Zielraum ✅ |
| `special-slime` | `special-*` | Start + Edit + Stop ✅ | nur Zielraum ✅ |
| `special-decompression` | `special-*` | Start + Edit + Stop ✅ | nur Zielraum ✅ |

Zusatzguard: Trigger von Spezialeffekten in Standardraum wird mit Klartext blockiert.

## Clipping-Negativtests
- Spezialeffekt in kleinem Spezialraum gestartet und Nachbarraum beobachtet -> kein Leak ✅
- Mehrere parallele Raumanimationen auf getrennten Raeumen -> keine Polygon-Ueberlaeufe ✅
- Outside-Layer aktiv + Raumzustand aktiv -> Inside/Outside weiterhin getrennt ✅

## Trigger/Edit-Roundtrip
- Laufende Instanz in Running-Liste via `Edit` geoeffnet
- Zustand (`broken`/`burning`/`alienCount`/`corpse`) angepasst
- `Laufende Instanz aktualisieren` schreibt in-place auf gleiche `animation.id`
- Running-Liste und Rendering bleiben konsistent ✅

## Acceptance Mapping
- ACCEPTANCE: kanonisches Raumzustandsmodell ✅
- ACCEPTANCE: zentrale deterministische Kompositionslogik ✅
- ACCEPTANCE: Spezialraum-Effekte voll trigger-/editierbar ✅
- ACCEPTANCE: Clipping dicht ✅
- ACCEPTANCE: Verifikationsartefakt vorhanden ✅
