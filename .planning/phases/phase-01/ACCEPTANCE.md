# Phase 1 Acceptance

## Testplan
- Smoke-Test: Board wechseln, kalibrieren, alle Trigger einmal ausloesen.
- Safety-Test: `Clear All` waehrend gleichzeitig laufender Effekte.
- Performance-Test: mindestens 30 Minuten Dauerbetrieb ohne visuelle Artefakte.
- Table-Check: Lesbarkeit auf realem Tisch bei variierender Helligkeit.
- Priority-Test P0: Power Outage unter Last triggern, Startlatenz und sichtbare Outage-Wirkung pruefen.
- Priority-Test P1: Hex-Hitareas (board-spezifisch) mit Hover/Selection sowie room-clip Rendering pruefen.
- Priority-Test P1b: Raum-Submenu (Auswahl, Intensitaet, Dauer/Hold) und Running-List Stop/Edit pruefen.
- Priority-Test P2: Output-Route Wechsel inkl. Fullscreen-Fallback ohne Neustart pruefen.

## Definition of Done
- Stories aus `.planning/phases/phase-01/BACKLOG.md` sind inkl. Akzeptanzkriterien umgesetzt.
- `Clear All` arbeitet reproduzierbar auch unter Last.
- Globale und raumspezifische Animationen sind im UI und Laufzeitmodell klar getrennt.
- Raumanimationen rendern ausschliesslich innerhalb des gewaehlten Hex-Polygons.
- Dashboard bleibt auf Desktop und kleinem Display bedienbar.
- Setup (Board -> Kalibrieren -> Loslegen) ist in unter 2 Minuten moeglich.
- README beschreibt den realen Session-Flow und die Safety-Bedienung.

## Nachweisartefakte
- Messergebnis Board-Wechselzeit (<1s).
- Latenzproben fuer Event-Trigger (<150ms Ziel).
- Kurzprotokoll 30-Minuten-Dauerlauf.
- Screenshot/Notiz zu Bedienbarkeit Small-Screen.
- Messprotokoll Power Outage inkl. Parallel-Last, sichtbarer Wirkung und `Clear All`.
- Kurzprotokoll Room-Click Trefferquote, Hover-Feedback und Polygon-Clip.
- Nachweis Running-Animations-Liste mit Stop/Edit je Eintrag.
- Nachweis Output-Route Wechselpfad inkl. Fullscreen-Fallback-Fall.

## Feedback Rework (Plan 1-3) - Zusatzabnahme
- Room-Hitareas bleiben board-spezifische Hex-Polygone ohne Hover-Verschiebung.
- Room-Submenu startet Effekte nur fuer die aktuelle Selektion und uebernimmt Edit-Loads aus der Running-Liste.
- Scope-Trennung ist im Runtime-Listing klar sichtbar (`GLOBAL` vs `ROOM`).
- `power-outage` dunkelt in beiden Boards sichtbar ab; Output-Routing meldet Fullscreen-Fallback explizit.
- Regression-Check: `node --check src/app.js` erfolgreich.
