# Phase 4 Workspace

Planung fuer ein umfassendes Maintainability-Refactoring von `src/app.js` in eine modulare, testbare Architektur. Verbindliche Erweiterung: generalisiertes Raummodell (Room-CRUD, freie Polygonraeume, Custom-Namen) plus Migration auf neuen JSON-Standard bei stabiler Rueckwaertskompatibilitaet.

- `PLAN.md`: Zielarchitektur, Refactoring-Prinzipien und inkrementelle Migrationsstrategie.
- `BACKLOG.md`: Epics und Story-Mapping fuer die Refactoring-Strecke.
- `TASKS.md`: priorisierte Ausfuehrungswellen inkl. Plan 4-2 als P0-Umsetzung fuer das neue Raummodell.
- `ACCEPTANCE.md`: Regression-, Verifikations- und Exit-Gates.
- `RISKS.md`: technische und organisatorische Refactoring-Risiken mit Gegenmassnahmen.
- `EXECUTE.md`: verbindliche Reihenfolge mit Gate-Regeln fuer atomare Migration.

## Stand

- Plan 4-1 und Plan 4-2 sind abgeschlossen; Nachweise: `4-1-SUMMARY.md`, `4-2-SUMMARY.md`, `P4-T16-ROOM-MODEL-REGRESSION.md`.
- Fokus fuer die naechste Welle ist Plan 4-3 (GIF/Render/UI-Isolation) auf Basis des generalisierten Raummodells.
