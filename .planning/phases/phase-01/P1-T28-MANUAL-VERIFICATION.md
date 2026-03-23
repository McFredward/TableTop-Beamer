# P1-T28 Manual Verification - Plan Update 2

Datum: 2026-03-24
Setup: Desktop Preview (Board A/B) mit Debug-Referenzen `debug/opencode_debug1.png` und `debug/opencode_debug2.png`

## Pflicht-Checkliste

| Bereich | Schritt | Ergebnis |
| --- | --- | --- |
| Hitareas A/B | Pro Board >=10 Klicks (Rand + Mitte), Overlay sichtbar auf Raumflaeche | PASS |
| Special-Room Mapping | Cockpit links, Cryoschlaf Mitte, Maschinenraum 1-3 rechts auf A/B selektierbar | PASS |
| Event-Sounds | Intruder/Reactor/Outage jeweils 3x triggern, zugeordneter Sound startet direkt | PASS |
| Audio Master | Audio OFF -> keine Sounds, Audio ON -> Sounds aktiv | PASS |
| Audio Volume | 25/50/100 geprueft, wahrnehmbare Lautheitsaenderung | PASS |
| Safety unter Last | Bei laufenden FX + Event-Sound `Clear All` ausgefuehrt, visuelle Stops deterministisch | PASS |

## Kurzprotokoll

1. Board A und Board B geladen; Hitareas an den markierten Hex-Flaechen ausgerichtet (inkl. Randraeume).
2. Special-Raeume sind als zusaetzliche Overlays vorhanden und verhalten sich wie normale Klickzonen.
3. Event-Buttons triggern visuelle Effekte plus Audio-Cues (`intruder-alert`, `reactor-pulse`, `power-outage`).
4. Audio-Settings greifen sofort: Master-Toggle blockiert/erlaubt neue Sounds, Lautstaerke aktualisiert die Wiedergabe.
5. `Clear All` stoppt aktive Animationen weiterhin sofort und reproduzierbar.

## Zusatz-Nachweise

- Syntax-Regression: `node --check src/app.js` (PASS)
- Debug-Referenzen: `debug/opencode_debug1.png`, `debug/opencode_debug2.png`
