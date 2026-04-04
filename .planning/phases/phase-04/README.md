# Phase 4 Workspace

Planung fuer ein umfassendes Maintainability-Refactoring von `src/app.js` in eine modulare, testbare Architektur. Verbindliche Erweiterung: generalisiertes Raummodell (Room-CRUD, freie Polygonraeume, Custom-Namen) plus Migration auf neuen JSON-Standard bei stabiler Rueckwaertskompatibilitaet. Pflicht-Feedback-Wellen bis Plan 4-5 sind umgesetzt; als Verify-Follow-up ist ein P0 Mini-Hotfix execute-ready (Persist-on-change fuer Audio-/Sound-Mapping-Handler, deterministischer Direkt-Reload, kurze Regression-Doku).

- `PLAN.md`: Zielarchitektur, Refactoring-Prinzipien und inkrementelle Migrationsstrategie.
- `BACKLOG.md`: Epics und Story-Mapping fuer die Refactoring-Strecke.
- `TASKS.md`: priorisierte Ausfuehrungswellen inkl. Plan 4-5 und Plan 4-5b (Verify-Rest-Gap-Mini-Hotfix) als P0-Block.
- `ACCEPTANCE.md`: Regression-, Verifikations- und Exit-Gates.
- `RISKS.md`: technische und organisatorische Refactoring-Risiken mit Gegenmassnahmen.
- `EXECUTE.md`: verbindliche Reihenfolge mit Gate-Regeln fuer atomare Migration.

## Stand

- Plan 4-1 bis Plan 4-5 sind abgeschlossen; Nachweise: `4-1-SUMMARY.md`, `4-2-SUMMARY.md`, `4-3-SUMMARY.md`, `4-4-SUMMARY.md`, `4-5-SUMMARY.md`, `P4-T16-ROOM-MODEL-REGRESSION.md`, `P4-T21-HOTFIX-REGRESSION.md`, `P4-T32-HOTFIX-REGRESSION.md`, `P4-T38-HOTFIX-REGRESSION.md`.
- Fokus fuer die naechste Welle ist Plan 4-5b als priorisierter P0 Mini-Hotfix (Persist-on-change + Direkt-Reload-Determinismus + Kurzregression), danach Plan 4-6 (GIF/Render/UI-Isolation).
