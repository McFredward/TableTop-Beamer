# P2-T1 Mobile UX Blueprint (Smartphone)

## Ziel
Mobile-First Bedienung fuer den Operator am Spieltisch mit klar getrennten Aufgabenflaechen:
- **Triggern** (schnelles Ausloesen)
- **Running managen** (Stop/Edit/Safety)

## Informationsarchitektur
- Dashboard bleibt Trigger-zentriert.
- Settings enthaelt weiterhin ausschliesslich Konfiguration.
- Innerhalb vom Dashboard gibt es auf Mobile einen **Fokus-Switch**:
  - `Triggern`
  - `Running managen`

## Portrait-Konzept (Daumen-Flow)
- Board bleibt sichtbar, aber kompakt oben fixiert.
- Kontrollbereich darunter mit Mobile-Zone-Switch als sticky Bottom-Element.
- Primaere Trigger-Aktionen (globale Trigger + Raumstart) liegen im Trigger-Fokus.
- Kritische Safety-Aktion (`Clear All`) liegt nur im Manage-Fokus.

## Landscape-Konzept
- Gleicher Daten-/State-Flow wie Portrait.
- Mehr Breite fuer Triggergrids und Running-Liste.
- Keine Vermischung der Funktionsrollen: Trigger-Bloecke bleiben getrennt von Runtime-Management.

## Thumb-First Trigger Zone
- Trigger-Bedienung im unteren Panelbereich erreichbar.
- Fokuswechsel zwischen Trigger/Manage mit zwei grossen Buttons.
- Start/Stop bleiben mit maximal zwei Touch-Schritten erreichbar.

## Touch-Safety
- Mindestzielgroesse fuer primaere Controls: >=44x44 px.
- `Clear All` erfordert explizite Doppelbestaetigung (Arming + Confirm).
- Schnelle Doppeltaps auf Trigger/Stop/Edit werden per Tap-Guard gedrosselt.

## Orientation-Regel
- Portrait/Landscape-Wechsel darf keinen Verlust von:
  - aktiven Animationen
  - Board-Auswahl
  - Room-Draft
  - Dashboard/Settings-View
  - Mobile-Fokus (`Triggern`/`Running managen`)

## Nachweisbezug
- Acceptance: `.planning/phases/phase-02/ACCEPTANCE.md` (P2-T1..P2-T10 Pflichtabnahme)
