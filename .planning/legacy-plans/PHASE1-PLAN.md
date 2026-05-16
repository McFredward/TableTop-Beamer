# Nemesis Prototype - Phase 1 Plan

## Zielbild
Phase 1 liefert einen stabilen Vertical Slice fur OG-Nemesis: Board auswahlen, kalibrieren, Effekte sicher triggern und den Abend ohne Technikstress starten.

## Scope (Phase 1)
- Board-Auswahl fur die zwei vorhandenen Nemesis-Layouts.
- Echtzeit-Kalibrierung (Offset X/Y, Scale, Rotation) fur den Projektionstisch.
- Dauerhafte Atmosphareffekte (Flicker, Ash Drift, Toxic Leak) mit On/Off.
- Event-Effekte (Intruder Alert, Reactor Pulse, Fire Burst, Power Outage) per Klick.
- Master-Intensity als globaler Regler.
- Safety-Control mit sofortigem `Clear All`.
- Kompaktes Operator-Dashboard fur Desktop und kleine Displays.

## Nicht im Scope (Phase 1)
- Persistente Profile fur Kalibrierung.
- Tastatur-Hotkeys und Preset-Slots.
- Externe Zonen-Datenfiles pro Board.
- Preview-vs-Live Ausgabemodus.
- Netzwerk-Remote und Kamera/CV-Ausrichtung.

## Epic 1 - Projection Core

### Story 1.1 - Board laden
- Outcome: Das richtige Board ist in unter 1 Sekunde sichtbar und stabil gerendert.
- Umsetzung:
  - Zwei Board-Assets mit klarer ID/Label-Verknupfung.
  - Schneller Wechsel ohne Flackern durch vorgehaltene Ressourcen.
  - Sichtbarer aktueller Board-Status im Dashboard.

### Story 1.2 - Basis-Kalibrierung
- Outcome: Projektion kann am echten Tisch in Echtzeit ausgerichtet werden.
- Umsetzung:
  - Regler fur X/Y, Scale, Rotation mit sofortiger Stage-Aktualisierung.
  - Session-Werte im Laufzeit-State halten (ohne Reload).
  - Sichere Defaults fur Reset auf brauchbare Startwerte.

## Epic 2 - Effect Engine

### Story 2.1 - Dauerhafte Atmosphare
- Outcome: Stimmungseffekte sind einzeln aktivierbar und klar erkennbar.
- Umsetzung:
  - Toggle-State pro Ambient-Effekt.
  - Einheitliche Effekt-API fur Start/Stop.
  - Visuelle Aktiv-Markierung im UI.

### Story 2.2 - Event-Effekte
- Outcome: One-shot-Events starten direkt nach Operator-Trigger.
- Umsetzung:
  - Event-Buttons mit kurzer Trigger-Ruckmeldung.
  - Ziel-Latenz unter 150 ms bis Effektstart.
  - Zentrale Intensitatsanbindung uber Master-Intensity.

### Story 2.3 - Sicherheitssteuerung
- Outcome: `Clear All` stoppt alle laufenden Effekte sofort und verlasslich.
- Umsetzung:
  - Globale Stop-Routine fur Dauer- und Event-Effekte.
  - Priorisierter Safety-Pfad ohne Abhangigkeit vom UI-Loop.
  - Reaktions-Checks unter Last.

## Epic 3 - Operator Dashboard

### Story 3.1 - Schnellbedienung
- Outcome: Bedienung ist ohne Suchen moglich.
- Umsetzung:
  - Kompaktes Grid-Layout fur Trigger.
  - Deutliche aktive/inaktive Zustande.
  - Touch-freundliche Targets fur kleinere Displays.

### Story 3.2 - Session-Flow
- Outcome: Setup gelingt in drei Schritten (Board -> Kalibrieren -> Start).
- Umsetzung:
  - Reihenfolge im UI klar gefuhrt.
  - Kernaktionen ohne Untermenus erreichbar.
  - Sofortiger Zugriff auf `Clear All`.

## Delivery-Plan
- Milestone A (Projection): Board-Auswahl + Kalibrierregler stabilisieren.
- Milestone B (Effects Core): Ambient + Event-Trigger inkl. Master-Intensity.
- Milestone C (Operator UX): Dashboard-Layout, Aktivzustande, Responsive-Verhalten.
- Milestone D (Safety & Hardening): `Clear All` priorisieren, Lasttests, Bugfixing.

## Test- und Abnahmeplan
- Smoke-Test: Board wechseln, Kalibrieren, alle Trigger einmal auslosen.
- Safety-Test: `Clear All` wahrend gleichzeitig laufender Effekte.
- Performance-Test: Mindestens 30 Minuten Dauerbetrieb ohne visuelle Artefakte.
- Table-Check: Projektionslesbarkeit auf realem Tisch (verschiedene Helligkeit).

## Risiken und Gegenmassnahmen
- Projektionsverzerrung durch Beamerwinkel -> fruher Real-Table-Test, konservative Defaults.
- Helligkeitskonflikte mit physischen Komponenten -> Master-Intensity schnell erreichbar halten.
- UI-Uberladung im Spielbetrieb -> priorisierte Controls, klare Gruppierung, kein versteckter Critical-Action-Pfad.

## Definition of Done (Phase 1)
- Alle Stories aus `docs/PHASE1-BACKLOG.md` sind mit Akzeptanzkriterien umgesetzt.
- `Clear All` funktioniert reproduzierbar auch unter Last.
- Dashboard ist auf Desktop und kleinem Display bedienbar.
- Startablauf (Board -> Kalibrieren -> Loslegen) ist in unter 2 Minuten moglich.
- README deckt den realen Session-Flow und Safety-Bedienung ab.
