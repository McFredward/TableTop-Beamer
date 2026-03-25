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
- Render-Regression-P0-Test: Bei aktiven Animationen sind auf dem Board sichtbare Bewegungen vorhanden; Audio-only ohne sichtbares Rendering gilt als Fail.
- Render-vs-Audio-Entkopplungs-Test: Audio-Loop/Stop/Edit/Clear-All duerfen den Render-Tick nicht stoppen oder einfrieren.
- Preview-Removal-Test: Es existieren keine bedienbaren Preview-Elemente und keine Preview-Zwischenzustaende mehr im aktiven Runtime-Flow.
- Routing-/State-Test ohne Preview: Start/Edit/Stop nutzen ausschliesslich direkten Live-Pfad; Send/Rollback-Endpunkte sind funktionslos oder entfernt.
- Sichtbarkeits-Matrix-Test: `global`, `room` und GIF-basierte Animationen sind jeweils sofort sichtbar, auch bei parallel laufendem Audio.
- Render-Loop-Fault-Isolation-Test: ein absichtlich fehlschlagender Layer/Clip-Path stoppt den globalen Draw-Tick nicht; verbleibende Layer bleiben sichtbar animiert.
- Clip-Kompatibilitaets-Test (Mobile-WebView): Outside-/Ship-Maskierung rendert korrekt auch ohne verlaessliches Canvas-evenodd (Fallback-Pfad aktiv, kein Fullscreen-Leak).
- Outside-Failure-Isolation-Test: bei simuliertem Outside-Layer-Fehler bleiben Inside/Room/GIF-Effekte sichtbar und bewegend.
- Mobile-Hard-Proof-Test: im Mobile-Flow sind nach Trigger mindestens ein globaler, ein room- und ein GIF-Effekt gleichzeitig sichtbar.
- Runtime-Integritaetstest nach Preview-Rueckbau: Running-Liste bleibt 1:1 zur Instanz, `Stop`/`Edit` bleiben stabil bedienbar.
- Architekturtest Modulgrenzen: `app.js` ist entlastet; Kernlogik liegt in getrennten Modulen `state`, `rendering`, `effects`, `audio`, `ui`, `persistence`, `api/save`.
- Refactor-Paritaetstest: Trigger/Direct-Start/Edit/Stop/Reload/Save-Load/GIF-Mapping verhalten sich vor/nach Refactor gleich.
- Lesbarkeitstest: nicht-offensichtliche Kontrollfluesse sind mit zielgerichteten Kommentaren dokumentiert.
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

## Pflichtabnahme Plan 3-5 (P3-T35..P3-T44)
- Kritischer Regression-Bug ist behoben: laufende Animationen rendern auf dem Board wieder sichtbar und kontinuierlich; Audio allein gilt nicht als Erfolgsnachweis.
- Renderpfad ist robust gegen Audio-Lifecycle-Ereignisse; kein Freeze/Stillstand bei Loop, Stop, Clear-All, Edit oder Reload.
- `app.js` ist in klare Module aufgeteilt; verpflichtende Grenzziehung `state`, `rendering`, `effects`, `audio`, `ui`, `persistence`, `api/save` ist umgesetzt.
- Integrationspfade bleiben nach Refactor stabil: Trigger, Running-Liste, Direct-Start, Edit, Stop, Reload und Save/Load arbeiten ohne Drift.
- Nicht-offensichtliche Stellen sind mit sinnvollen, knappen Kommentaren dokumentiert.
- Funktionale Paritaet und Stabilitaet sind per Regression + Soak dokumentiert und nachvollziehbar.

## Pflichtabnahme Plan 3-6 (P3-T45..P3-T50)
- Preview-Flow ist vollstaendig entfernt (UI + State + Routing + Send/Rollback); es existiert kein Preview-Zwischenzustand mehr.
- Direkter Live-Trigger ist als einziger Bedienpfad aktiv; Start/Edit/Stop gehen ohne Preview-Staging direkt auf Runtime.
- Render-Pipeline zeigt laufende Animationen sofort sichtbar fuer `global`, `room` und GIF-basierte Pfade; Audio-only gilt als harter Fail.
- Running-Liste bleibt 1:1 zur Instanz; `Stop` und `Edit` funktionieren weiterhin stabil ohne ID-/State-Drift.
- Regression + Soak belegen stabile Hotfix-Wirkung ueber Trigger/Edit/Stop/Reload/Save-Load-Pfade.
- Refactor-Fortsetzung ist explizit auf "nach stabilem P0-Fix" gate-gesteuert dokumentiert.

## Pflichtabnahme Plan 3-7 (P3-T51..P3-T56)
- Render-Loop faellt nie komplett aus: ein einzelner Layer-/Clip-Path-Fehler wird lokal isoliert, der globale Tick bleibt aktiv.
- Outside-/Ship-Clipping laeuft browserrobust inkl. mobilem WebView-Fallback bei Canvas-evenodd-Inkompatibilitaet.
- Fehler im Outside-Layer blockieren Inside/Room/GIF nicht; sichtbare Animationen laufen weiter.
- Preview bleibt entfernt; es wurden keine Preview-UI-/State-/Routing-/Send-/Rollback-Pfade reaktiviert.
- Mobile-Flow zeigt nach Trigger nachweisbar mindestens globale + room + GIF-Effekte gleichzeitig sichtbar und bewegt.
- Regression + Soak + Artefakt-Sync belegen den geschlossenen Reopen-Blocker nachvollziehbar.

## Definition of Done
- Alle P0-Tasks aus Plan 3-3 sind abgeschlossen.
- Alle P0-Tasks aus Plan 3-4 sind abgeschlossen.
- Alle P0-Tasks aus Plan 3-5 sind abgeschlossen.
- Alle P0-Tasks aus Plan 3-6 sind abgeschlossen.
- Alle P0-Tasks aus Plan 3-7 sind abgeschlossen.
- Keine offenen Blocker-Risiken fuer GIF-Loop-Runtime, Mapping-Persistenz oder Running-List-Paritaet.
- Keine offenen Blocker-Risiken fuer Board-Render-Regression oder Refactor-Integritaet.
- Keine offenen Blocker-Risiken fuer Preview-Restpfade oder unsichtbares Rendering nach Preview-Rueckbau.
- Keine offenen Blocker-Risiken fuer Render-Loop-Komplettausfall, evenodd-Clip-Inkompatibilitaet oder Outside-Failure-Kaskaden.
- P1-Hardening fuer Stabilitaet und Performance ist mindestens initial umgesetzt und dokumentiert.
- Artefakte `PLAN.md`, `BACKLOG.md`, `TASKS.md`, `EXECUTE.md`, `RISKS.md` sind konsistent.

## Abnahmeprotokoll
- Plan 3-2 wurde am 2026-03-25 mit Verweis auf `3-2-VERIFICATION.md` abgenommen.
- Plan 3-3 wurde am 2026-03-25 mit Verweis auf `3-3-VERIFICATION.md` sowie `P3-T30-REGRESSION.md`/`P3-T30-SOAK.md` abgenommen.
- Plan 3-4 wurde am 2026-03-25 mit Verweis auf `3-4-VERIFICATION.md` sowie `P3-T33-REGRESSION.md` abgenommen.
- Plan 3-5 wurde am 2026-03-25 mit Verweis auf `3-5-VERIFICATION.md` sowie `P3-T42-REGRESSION.md`/`P3-T43-SOAK.md` abgenommen.
- Plan 3-6 wurde am 2026-03-25 mit Verweis auf `3-6-VERIFICATION.md` sowie `P3-T49-REGRESSION.md`/`P3-T49-SOAK.md` abgenommen.
- Plan 3-7 wurde am 2026-03-25 mit Verweis auf `3-7-VERIFICATION.md` sowie `P3-T55-REGRESSION.md`/`P3-T55-SOAK.md` abgenommen.
