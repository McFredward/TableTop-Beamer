# Phase 1 Scope

## Objective
Stabiler Vertical Slice fuer OG-Nemesis mit manueller Steuerung, schneller Bedienung und sicherem Live-Betrieb am Tisch.

## In Scope
- Board-Auswahl fuer zwei vorhandene Nemesis-Layouts.
- Echtzeit-Kalibrierung: Offset X/Y, Scale, Rotation.
- Ambient-Effekte mit On/Off: Flicker, Ash Drift, Toxic Leak.
- Event-Effekte per Trigger: Intruder Alert, Reactor Pulse, Fire Burst, Power Outage.
- Globaler Master-Intensity-Regler.
- Sofort wirksames `Clear All` als Safety-Funktion.
- Kompaktes Dashboard fuer Desktop und kleine Displays.

## Out of Scope
- Persistente Kalibrierungsprofile.
- Hotkeys und Preset-Slots.
- Datengetriebene Zonen-Dateien.
- Preview-vs-Live Ausgabemodus.
- Netzwerk-Remote, Kamera/CV-Ausrichtung.

## Constraints
- Overlays sind visuell und nicht spielbeeinflussend.
- Bedienung muss waehrend laufender Partie reaktionsfaehig bleiben.
- Safety-Stop darf nicht vom UI-Loop abhaengen.
