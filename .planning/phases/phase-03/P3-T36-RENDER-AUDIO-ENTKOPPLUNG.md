# P3-T36 Render-/Audio-Entkopplung Guard

Datum: 2026-03-25

## Scope
- Draw-Tick bleibt stabil, auch wenn Audio-Lifecycle (`loop`, `stop`, `clear all`, `edit`) parallel Ereignisse ausloest.
- Audio darf keine false-positive Erfolgsanzeige erzeugen, wenn visuelle Ausgabe fuer einen Effektpfad ausfaellt.

## Umsetzung
- `drawAnimation()` liefert jetzt explizit Renderstatus statt implizitem `void`.
- Wenn ein Effektpfad (insb. GIF) kein zeichnbares Frame liefert, wird ein sichtbarer Render-Fallback gezeichnet.
- `drawAnimationSafely()` kapselt den Draw-Pfad weiterhin isoliert, damit Audio-Events den Frame-Loop nicht stoppen.
- Audio-Lifecycle bleibt instanzgebunden (`animation.id`) und stoppt/entfernt Voices ohne Eingriff in den Draw-Scheduler.

## Nachweis
- `node --check src/app.js`
- `node --check src/rendering/index.js`
- Startup-Regression bleibt aktiv (`requestAnimationFrame(draw)` im `finally`-Pfad) und wird nicht durch Audio-Stop/Loop unterbrochen.

## Ergebnis
Render- und Audio-Lifecycle sind entkoppelt genug, um den gemeldeten Audio-only-Regressionstyp abzufangen.
