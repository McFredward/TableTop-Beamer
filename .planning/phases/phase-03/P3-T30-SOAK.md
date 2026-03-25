# P3-T30 Soak - Multi-GIF-Loop Betrieb

Datum: 2026-03-25

## Ziel
Nachweis, dass parallele GIF-Loops (`kaputt`/`feuer`/`schleim`) inkl. Mapping-Edit waehrend Laufzeit stabil bedienbar bleiben.

## Protokoll (Acceptance-orientiert)

1. Startzustand
   - UI laden, Board A aktiv
   - Je ein Raum fuer `kaputt`, `feuer`, `schleim` auswaehlen und starten (Hold)

2. Lastaufbau
   - Parallel weitere GIF-Instanzen auf mehreren Raeumen starten
   - Laufzeit >= 10 Minuten

3. Mapping-Edit unter Last
   - In Settings mehrfach GIF-Mapping fuer `kaputt`/`feuer`/`schleim` wechseln
   - Zwischen den Wechseln neue Instanzen starten
   - Bestehende Instanzen per Running-Liste editieren/stoppen

4. Persistenz-Roundtrip
   - Mapping aendern -> Reload
   - Mapping aendern -> Save Global Defaults -> Restart -> Reload

## Sollkriterien
- Keine Runtime-Fehler oder Render-Abbrueche im Draw-Loop
- Running-Liste bleibt 1:1 instanzkonsistent (Stop/Edit auf korrekte `animation.id`)
- GIF-Loops bleiben sichtbar mehrframe-basiert
- Neue Instanzen nutzen neues Mapping, laufende Instanzen bleiben stabil
- Mapping bleibt ueber Reload/Restart erhalten

## Ergebnisstatus
- Soak-Checkliste fuer Abnahme dokumentiert und auf Plan-3-3-Pflichtkriterien ausgerichtet.
- Detail-Execution wird im finalen `3-3-VERIFICATION.md` zusammengefuehrt.
