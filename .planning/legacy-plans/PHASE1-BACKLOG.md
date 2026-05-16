# Nemesis Vertical Slice Backlog

## Ziel
Ein lauffahiger Vertical Slice fur OG-Nemesis mit manueller Effektsteuerung, stabiler Projektion und schneller Bedienung am Spieltisch.

## Epic 1 - Projection Core

### Story 1.1 - Board laden
- Als Operator mochte ich ein Nemesis-Board auswahlen, damit ich die passende Basisprojektion starten kann.
- Akzeptanzkriterien:
  - Beide vorhandenen Boardbilder sind auswahlbar.
  - Wechsel dauert unter 1 Sekunde.
  - Bild fullt die Projektion stabil ohne sichtbares Flackern.

### Story 1.2 - Basis-Kalibrierung
- Als Operator mochte ich Offset/Scale/Rotation anpassen, damit die Projektion auf meinen Tisch passt.
- Akzeptanzkriterien:
  - X/Y/Scale/Rotation reagieren in Echtzeit.
  - Kalibrierung kann fur eine Session beibehalten werden.
  - Anpassung ohne Neustart moglich.

## Epic 2 - Effect Engine

### Story 2.1 - Dauerhafte Atmosphare
- Als Spielergruppe mochte ich subtile Ambient-Effekte sehen, damit die Stimmung dichter wird.
- Akzeptanzkriterien:
  - Ambient Flicker ein/aus.
  - Ash Drift ein/aus.
  - Toxic Leak ein/aus.

### Story 2.2 - Event-Effekte
- Als Operator mochte ich situative Effekte sofort auslosen, damit ich Spielmomente unterstreiche.
- Akzeptanzkriterien:
  - Intruder Alert, Reactor Pulse, Fire Burst, Power Outage triggerbar.
  - Effektstart unter 150 ms nach Klick.
  - Effektintensitat global regelbar.

### Story 2.3 - Sicherheitssteuerung
- Als Operator mochte ich jederzeit alle Effekte stoppen, damit nichts die Runde storen kann.
- Akzeptanzkriterien:
  - Clear-All stoppt alle laufenden Effekte sofort.
  - Funktion bleibt auch unter Last reaktionsfahig.

## Epic 3 - Operator Dashboard

### Story 3.1 - Schnellbedienung
- Als Operator mochte ich ein kompaktes Dashboard nutzen, damit ich Trigger blind schnell finde.
- Akzeptanzkriterien:
  - Trigger in einem klaren Grid.
  - Aktive Dauer-Effekte visuell markiert.
  - Mobil/kleine Displays bleiben bedienbar.

### Story 3.2 - Session-Flow
- Als Operator mochte ich Setup in wenigen Schritten erledigen, damit der Spielabend schnell startet.
- Akzeptanzkriterien:
  - Startablauf: Board auswahlen, Kalibrieren, loslegen.
  - Alle Kernfunktionen ohne Untermenus erreichbar.

## Nicht im Vertical Slice
- Automatische Figur- oder Board-Erkennung per Kamera.
- Netzwerk-Remote fur Tablet/Handy.
- Mehrspieler-Sync uber mehrere Clients.

## Risikoreduktion (fruh testen)
- Verzerrung durch Beamerwinkel auf echtem Tisch prufen.
- Maximalhelligkeit fur Lesbarkeit von Karten/Markern testen.
- Dauerlast-Test mit gleichzeitig laufenden Effekten.
