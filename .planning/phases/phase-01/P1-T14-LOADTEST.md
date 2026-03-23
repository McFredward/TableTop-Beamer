# P1-T14 Lasttest (parallele Effekte)

Datum: 2026-03-23

## Setup
- Tool: `node docs/load-test-phase1.mjs`
- Szenario: Simulierte Parallel-Last fuer Ash Drift + Toxic Leak ueber 12.000 Frames
- Target-Budget: <=16.7 ms pro Frame (60 FPS)

## Ergebnis
- Frames: 12.000
- Laufzeit gesamt: 12.87 ms
- Durchschnitt pro Frame: 0.0010 ms
- Budget-Ueberschreitungen: 0
- Peak-Particle-Count: 125

## Bewertung
- Der Kern-Updatepfad fuer parallele Partikel-Effekte bleibt deutlich unter dem 60-FPS-Zeitbudget.
- Safety-Stop bleibt separat priorisiert (siehe P1-T13) und wurde nicht durch Lastpfad beeinflusst.
