# P2-T6 Fehlklick- und Safety-Protokoll (Touch)

## Fokus
- Kritische Aktion `Clear All`
- Nahe Runtime-Aktionen `Stop` / `Edit`
- Schnelle Mehrfachtaps bei Triggern

## Eingebaute Guards
1. **Clear-All Doppelbestaetigung**
   - 1. Tap: Aktion wird bewaffnet (`Clear All bestaetigen`)
   - 2. Tap innerhalb ~2.6s: erst dann echte Ausfuehrung
   - Auto-Reset nach Timeout, View-/Zone-Wechsel oder Blur

2. **Rapid-Tap-Schutz (Dedup)**
   - Trigger, Room-Start sowie Stop/Edit werden bei ultrakurzer Wiederholung unterdrueckt
   - Ziel: versehentliche Doppeltaps und Mehrfachstarts reduzieren

3. **Funktionszonen-Trennung**
   - `Clear All` nur im Manage-Bereich, nicht im Trigger-Bereich
   - reduziert versehentliche Sicherheitsaktionen waehrend Trigger-Flow

## Nachweis-Checkliste (reales Touch-Testing)
- [ ] 10x erster `Clear All`-Tap ohne zweiten Tap: keine Loeschung
- [ ] 10x bewusster Doppeltap: Loeschung nur nach Confirm
- [ ] 20x schnelle Trigger-Folge: keine unerwuenschten Doppelausloesungen
- [ ] 20x Stop/Edit in Running-Liste: keine Fehlauswahl durch zu dichte Targets
