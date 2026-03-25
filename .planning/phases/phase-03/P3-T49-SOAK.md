# P3-T49 Soak-Protokoll (3-6)

Datum: 2026-03-25

## Setup
- Boards: Nemesis A/B im Wechsel
- Lastfall: parallele Room-GIFs (`kaputt`/`feuer`/`schleim`) + globale Inside/Outside-Effekte + Audio aktiv
- Laufzeitfenster: 20 Minuten

## Beobachtungsschwerpunkte
- Keine Rueckkehr zu Preview-Zwischenzustaenden
- Direkter Start/Edit/Stop bleibt unmittelbar in der Live-Runtime sichtbar
- Running-Liste bleibt 1:1 zur Instanz-ID
- Render-Tick bleibt stabil; kein Audio-only-Zustand ohne sichtbaren Effekt

## Ergebnis
- Keine Preview-Restpfade beobachtet
- Start/Edit/Stop bleiben live und ohne Queue-Drift
- Running-Liste blieb ID-konsistent, inkl. Stop/Edit-Roundtrip
- Keine Render-Freezes oder unsichtbaren Dauerlaeufer beobachtet

## Fazit
Der Plan-3-6-Hotfix haelt unter Last stabil; P0-Wirkung bleibt im Soak-Fenster erhalten.
