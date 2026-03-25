# P3-T55 Mobile-Hard-Proof Soak (3-7)

Datum: 2026-03-25

## Setup
- Zielgeraet: Mobile WebView / Smartphone (Portrait + Landscape)
- Boards: Nemesis A/B im Wechsel
- Lastfall: paralleler Betrieb aus
  1. Global Inside (`intruder-alert`),
  2. Room-Effekt (`alarm` oder `lichtflackern`),
  3. GIF-Room (`kaputt`/`feuer`/`schleim`)
- Laufzeitfenster: 20 Minuten inkl. Trigger/Edit/Stop-Roundtrips

## Pflichtnachweis Mobile-Sichtbarkeit
- Nach Trigger sind mindestens **global + room + GIF** gleichzeitig sichtbar und bewegt.
- Audio darf parallel laufen, ist aber kein Sichtbarkeitskriterium.
- Bei absichtlichem Outside-Fehler (Harness `injectOutsideLayerFailureOnce`) bleiben Inside/Room/GIF sichtbar.

## Beobachtung
- Keine komplette Render-Pause trotz injizierter Outside-/Clip-Fehler.
- Outside-Maskierung blieb im Mobile-Flow sichtbar korrekt (kein Fullscreen-Leak im Schiffsinnenraum).
- Running-Liste blieb instanzscharf; `Stop`/`Edit` funktionierten waehrend des Soak stabil.
- Keine Rueckkehr von Preview-UI/Preview-State/Live-Rollback-Pfaden.

## Fazit
Der mobile Hard-Proof fuer Plan 3-7 ist erbracht: globale, room- und GIF-basierte Effekte bleiben nach Trigger sichtbar und bewegend, auch unter Outside-Fehlern und laengerem Parallelbetrieb.
