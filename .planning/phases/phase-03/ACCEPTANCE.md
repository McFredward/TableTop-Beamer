# Phase 3 Acceptance

## Testplan
- Einzeltrigger-Test: jede Raumanimation ist separat start-/stoppbar (`kaputt`, `feuer`, `schleim`, `nest`, `dekompression`, `lichtflackern`, `alarm`).
- Parallelaktivierungs-Test: Kombinationen entstehen ausschliesslich ueber gleichzeitige Einzeltrigger ohne implizite Sammelzustaende.
- Running-List-Test: jede aktive Raumanimation erscheint als eigener Eintrag (1:1 zur Runtime-Instanz) und kann einzeln gestoppt/editiert werden.
- GIF-Loop-Test `kaputt`: `resources/nemesis/animations/malfunction.gif` wird als echter Mehrframe-Loop abgespielt (kein statischer Puls-Frame), startet/stoppt/editiert korrekt und bleibt auf Zielraum geclippt.
- GIF-Loop-Test `feuer`: `resources/nemesis/animations/fire.gif` wird als echter Mehrframe-Loop abgespielt (kein statischer Puls-Frame), startet/stoppt/editiert korrekt und bleibt auf Zielraum geclippt.
- GIF-Loop-Test `schleim`: `resources/nemesis/animations/final.gif` wird als echter Mehrframe-Loop abgespielt (kein statischer Puls-Frame), startet/stoppt/editiert korrekt und bleibt auf Zielraum geclippt.
- Spezialraum-Test `nest`: Effekt startet/stoppt/editiert korrekt und bleibt auf Zielraum geclippt.
- Spezialraum-Test `dekompression`: Effekt startet/stoppt/editiert korrekt und bleibt auf Zielraum geclippt.
- Global-Aequivalent-Test `alarm`: nutzt globalen Renderer, bleibt aber strikt auf den Zielraum geclippt.
- Global-Aequivalent-Test `lichtflackern`: nutzt globalen Renderer, bleibt aber strikt auf den Zielraum geclippt.
- GIF-Parameter-Test: `opacity` und `playbackSpeed` sind pro Instanz einstellbar, editierbar und beeinflussen keine anderen Instanzen.
- GIF-Mapping-UI-Test: pro Animation ist ein GIF in der UI auswaehlbar (paritaetisch zum Sound-Mapping), inklusive `none`/Fallback-Regeln ohne Runtime-Fehler.
- GIF-Mapping-Persistenz-Test: pro-Animations-Mapping bleibt ueber Save/Reload/Restart konsistent erhalten.
- Hold-Default-Test: gestartete Raumanimationen laufen dauerhaft weiter, bis explizit `Stop` erfolgt.
- Clipping-Integritaets-Test: keine sichtbaren Leaks in Nachbarraeume, keine Draws ausserhalb der aktiven Raumgrenzen.
- Multi-Room-Paralleltest: gleichzeitige Raumzustaende beeinflussen sich nicht unzulaessig.
- Trigger/Edit-Roundtrip-Test: gesetzte Einzelanimationen bleiben beim Edit konsistent und erzeugen keinen Runtime-State-Drift.
- Performance-Test: stabile Darstellung unter Mehrfachzustand ohne spuerbaren Bedienabfall.

## Pflichtabnahme Plan 3-3 (P3-T26..P3-T31)
- GIF-Raumanimationen `kaputt`/`feuer`/`schleim` spielen eingebettete GIF-Loops als echte Mehrframe-Animationen ab.
- Pro Raumanimation ist das GIF in der UI auswaehlbar (analog Sound-Mapping), inklusive validierter Asset-Liste und Fallback.
- GIF-Mapping bleibt pro Animation ueber Save/Reload/Restart stabil erhalten.
- Running-Uebersicht und Trigger/Edit/Stop bleiben trotz Mapping-Aenderungen instanzkonsistent (1:1).
- `opacity` und `playbackSpeed` wirken weiterhin instanzscharf und kollidieren nicht mit der GIF-Loop-Runtime.
- Clipping bleibt in allen relevanten Renderpfaden dicht (kein Polygon-/Masken-Leak).
- Performance bleibt unter Parallelbetrieb mehrerer GIF-Loops bedienbar und stabil.
- Verifikationsdokument fuer Plan 3-3 ist vorhanden und referenziert die wichtigsten Nachweise.

## Pflichtabnahme Plan 3-4 (P3-T32..P3-T34)
- Direct-Start (`Raum starten`) uebergibt bei GIF-Raumanimationen den gemappten `gifAssetPath` explizit an `createAnimation`; Default-GIF greift nur bei `none`/ungueltigem Mapping gemaess Fallback-Regel.
- Regression deckt explizit den Pfad Direct-Start -> Edit-Flow -> Reload ab und weist nach, dass GIF-Mapping in allen drei Schritten konsistent bleibt.
- Running-/Edit-Instanzen bleiben dabei ID- und `gifAssetPath`-konsistent; kein unkontrollierter Drift auf neue Mappingwerte bei bereits laufenden Instanzen.
- Artefakte (`PLAN/BACKLOG/TASKS/ACCEPTANCE/RISKS/EXECUTE` plus Verifikationshinweis) sind auf den Hotfix-Scope synchronisiert.

## Definition of Done
- Alle P0-Tasks aus Plan 3-3 sind abgeschlossen.
- Alle P0-Tasks aus Plan 3-4 sind abgeschlossen.
- Keine offenen Blocker-Risiken fuer GIF-Loop-Runtime, Mapping-Persistenz oder Running-List-Paritaet.
- P1-Hardening fuer Stabilitaet und Performance ist mindestens initial umgesetzt und dokumentiert.
- Artefakte `PLAN.md`, `BACKLOG.md`, `TASKS.md`, `EXECUTE.md`, `RISKS.md` sind konsistent.

## Abnahmeprotokoll
- Plan 3-2 wurde am 2026-03-25 mit Verweis auf `3-2-VERIFICATION.md` abgenommen.
- Plan 3-3 wurde am 2026-03-25 mit Verweis auf `3-3-VERIFICATION.md` sowie `P3-T30-REGRESSION.md`/`P3-T30-SOAK.md` abgenommen.
- Plan 3-4 wurde am 2026-03-25 mit Verweis auf `3-4-VERIFICATION.md` sowie `P3-T33-REGRESSION.md` abgenommen.
