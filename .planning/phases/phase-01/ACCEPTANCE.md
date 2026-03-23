# Phase 1 Acceptance

## Testplan
- Smoke-Test: Board wechseln, kalibrieren, alle Trigger einmal ausloesen.
- Safety-Test: `Clear All` waehrend gleichzeitig laufender Effekte.
- Performance-Test: mindestens 30 Minuten Dauerbetrieb ohne visuelle Artefakte.
- Table-Check: Lesbarkeit auf realem Tisch bei variierender Helligkeit.
- Priority-Test P0: Power Outage unter Last triggern, Startlatenz und sichtbare Outage-Wirkung pruefen.
- Priority-Test P0b: Hex-Hitareas (board-spezifisch) muessen auf realen Raeumen deckungsgleich liegen (beide Boards, Rand/Mitte).
- Priority-Test P1a: Special-Room Mapping fuer Cockpit/Cryoschlaf/Maschinenraum 1-3 auf beiden Boards pruefen.
- Priority-Test P1b: Raum-Submenu (Auswahl, Intensitaet, Dauer/Hold) und Running-List Stop/Edit pruefen.
- Priority-Test P1c: Event-Sounds (Intruder/Reactor/Outage) inkl. Audio-Master an/aus und Lautstaerke-Regler pruefen.
- Priority-Test P2: Output-Route Wechsel inkl. Fullscreen-Fallback ohne Neustart pruefen.

## Manueller Verifikationsfokus (Pflicht)
- Hitarea-Passung: pro Board mindestens 10 Klicks (inkl. Randraeume + Special-Raeume), Soll/Ist als Trefferquote protokollieren.
- Special-Room Lage: Cockpit links, Cryoschlaf Mitte, Maschinenraum 1-3 rechts jeweils visuell gegen Realboard bestaetigen.
- Audio-Trigger: jeden Event-Trigger dreimal ausloesen; Start wahrnehmbar, kein falscher Sound.
- Audio-Settings: Master auf `off` -> keine Sounds; Master auf `on` + Volume 25/50/100 -> deutlich unterschiedliche Lautheit.
- Safety unter Audio-Last: waehrend Event-Sounds und laufender Effekte `Clear All` pruefen; visuelle Stops bleiben deterministisch.

## Definition of Done
- Stories aus `.planning/phases/phase-01/BACKLOG.md` sind inkl. Akzeptanzkriterien umgesetzt.
- `Clear All` arbeitet reproduzierbar auch unter Last.
- Globale und raumspezifische Animationen sind im UI und Laufzeitmodell klar getrennt.
- Raumanimationen rendern ausschliesslich innerhalb des gewaehlten Hex-Polygons.
- Hex-Hitareas treffen auf beiden Boards die realen Raumflaechen reproduzierbar.
- Die 5 Special-Raeume (Cockpit, Cryoschlaf, Maschinenraum 1-3) sind vorhanden und korrekt positioniert.
- Event-Sounds fuer Intruder/Reactor/Outage funktionieren und respektieren Audio-Master + Lautstaerke.
- Dashboard bleibt auf Desktop und kleinem Display bedienbar.
- Setup (Board -> Kalibrieren -> Loslegen) ist in unter 2 Minuten moeglich.
- README beschreibt den realen Session-Flow und die Safety-Bedienung.

## Nachweisartefakte
- Messergebnis Board-Wechselzeit (<1s).
- Latenzproben fuer Event-Trigger (<150ms Ziel).
- Kurzprotokoll 30-Minuten-Dauerlauf.
- Screenshot/Notiz zu Bedienbarkeit Small-Screen.
- Messprotokoll Power Outage inkl. Parallel-Last, sichtbarer Wirkung und `Clear All`.
- Kurzprotokoll Room-Click Trefferquote (beide Boards, Rand/Mitte) inkl. Polygon-Clip.
- Mapping-Protokoll fuer 5 Special-Raeume inkl. Board-A/B Screenshot oder Foto-Notiz.
- Audio-Testprotokoll fuer Intruder/Reactor/Outage inkl. Master-Toggle und Volume 25/50/100.
- Nachweis Running-Animations-Liste mit Stop/Edit je Eintrag.
- Nachweis Output-Route Wechselpfad inkl. Fullscreen-Fallback-Fall.

## Feedback Rework (Plan 1-3) - Zusatzabnahme
- Room-Hitareas bleiben board-spezifische Hex-Polygone ohne Hover-Verschiebung.
- Room-Submenu startet Effekte nur fuer die aktuelle Selektion und uebernimmt Edit-Loads aus der Running-Liste.
- Scope-Trennung ist im Runtime-Listing klar sichtbar (`GLOBAL` vs `ROOM`).
- `power-outage` dunkelt in beiden Boards sichtbar ab; Output-Routing meldet Fullscreen-Fallback explizit.
- Regression-Check: `node --check src/app.js` erfolgreich.

## Plan Update 2 - Pflichtabnahme (P1-T24..P1-T28)
- Hitarea-Nachkalibrierung ist fuer Board A/B per Rand-/Mitte-Probe dokumentiert.
- Fuenf Special-Raeume sind auf beiden Boards selektierbar und korrekt benannt.
- Event-Sounds sind fuer Intruder/Reactor/Outage im Triggerpfad aktiv.
- Audio-Master (default ON) und Lautstaerke 0-100 wirken sofort auf Event-Sounds.
- Pflichtprotokoll liegt in `.planning/phases/phase-01/P1-T28-MANUAL-VERIFICATION.md`.
