# P2-T9 Mobile Performance-/Responsiveness-Protokoll

## Integrierte Checks
- Settings-Button: `Performance-Snapshot erstellen`
- Laufend gesammelte Kennzahlen:
  - Trigger-Latenz p95 (ms)
  - Frame-Delta p95 (ms) / approx FPS
  - Jank-Rate (`Frame >= 40ms`) in %

## Testablauf (Pflicht fuer Abnahme)
1. Dashboard auf Smartphone (Portrait) starten, 5 Minuten Trigger-/Stop-Flow.
2. Nach Lastphase Snapshot ausloesen.
3. Orientation zu Landscape wechseln, weitere 5 Minuten bedienen.
4. Zweiten Snapshot erstellen und Werte vergleichen.
5. Langlauf: mindestens 30 Minuten Mixed-Flow (Trigger, Running-Stop/Edit, Orientation-Wechsel) und Abschluss-Snapshot.

## Zielkriterien (Richtwerte)
- Trigger p95 <= 180ms
- Frame p95 <= 40ms
- Jank-Rate <= 8%

## Ergebnisprotokoll
- [ ] Snapshot #1 (Portrait) dokumentiert
- [ ] Snapshot #2 (Landscape) dokumentiert
- [ ] Snapshot #3 (30+ min) dokumentiert
- [ ] Keine kritischen Bedienhaenger beobachtet
