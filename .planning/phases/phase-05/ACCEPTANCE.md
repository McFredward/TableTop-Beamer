# Phase 5 Acceptance

## Regression- und Verifikationsstrategie
- Server-first: Shared-State und Output-Rollen werden zuerst serverseitig verifiziert, danach im Multi-Client-E2E.
- Device-parity: jeder Pflichttest wird mindestens auf Handy-Controller, PC-Controller und Final-Beamer-Client geprueft.
- Role-contract: jeder Render-/Audio-/Overlay-Pfad wird gegen die Rollen `control` und `final-output` validiert.
- Persistenzpflicht: Logging-Nachweise gelten erst mit real existierender Logdatei und lesbaren Eintraegen.

## Testplan (Pflichtmatrix)
- Final-Route-Test: `GET /output/final` ist erreichbar und startet ohne Controller-UI-Elemente.
- Final-FX-only-Test: Final-Output zeigt keine Boardgrafik, keine Raum-Polygone, keine Raumnamen.
- Live-Sync-Trigger-Test: Trigger von Handy ist sofort auf PC-Controller und Beamer sichtbar.
- Live-Sync-Edit-Test: Edit laufender Instanz repliziert in Echtzeit auf alle Clients.
- Live-Sync-Stop-Test: Stop/Clear-All auf einem Client beendet Instanzen auf allen Clients synchron.
- Snapshot-Join-Test: neu geoeffneter Client bekommt den aktuellen Live-State ohne Reload-Schleifen.
- Board-Sync-Selection-Test: Wechsel des ausgewaehlten Boards auf einem Controller wird sofort auf allen Clients identisch sichtbar.
- Layout-Sync-Selection-Test: Wechsel des Layouts/Board-Layouts repliziert in Echtzeit auf Handy, PC und Final-Output.
- Board-Layout-Join-Test: neu joinender Client uebernimmt Board/Layout-Kontext ohne manuelles Nachstellen.
- Outside-Sync-Toggle-Test: Outside ON/OFF auf einem Controller ist sofort auf allen Clients identisch sichtbar.
- Outside-Sync-Speed-Test: Outside-Geschwindigkeit repliziert in Echtzeit auf Handy, PC und Final-Output ohne Drift.
- Outside-Sync-Parameter-Test: relevante Outside-Parameter (z. B. Richtung/Modus/intensity sofern aktiv genutzt) replizieren vollstaendig auf alle Clients.
- Outside-Single-Click-Direction-Test: einmaliges Umschalten `forward`/`reverse` wird ohne Zweitklick auf allen Clients identisch bestaetigt.
- Outside-Single-Click-Mode-Test: einmaliges Umschalten `standard`/`immersive` wird ohne Zweitklick auf allen Clients identisch bestaetigt.
- Outside-Burst-Ordering-Test: schnelle Toggle-Folge (`direction`/`mode`) endet auf allen Clients deterministisch im selben Endzustand (letzte Version gewinnt).
- Outside-Join-Snapshot-Test: neu joinender Client uebernimmt den aktuellen Outside-State vollstaendig ohne manuelles Nachziehen.
- Mutation-Ack-Test: jede serverseitige Mutation liefert sofortige Broadcast-Bestaetigung mit korrekter Mutation-ID/Version; Clients uebernehmen nur bestaetigte Versionen.
- Mutation-Dedup-Test: doppelt zugestellte identische Mutation wird idempotent genau einmal angewendet (kein Double-Apply, kein Zustandssprung).
- Room-Single-Click-Trigger-Test: ein einzelner Room-Trigger erscheint auf allen Clients ohne Mehrfachklick in der Running-Liste.
- Room-Single-Click-Edit-Test: ein einzelnes Edit auf laufender Room-Instanz repliziert sofort und deterministisch.
- Room-Single-Click-Stop-Clear-Test: Stop/Clear-All wirkt beim ersten Ausloesen auf allen Clients gleich und ohne Nachtrigger.
- Align-On-Test: Align-Mode ON blendet Polygone auf Final-Output sichtbar ein.
- Align-Off-Test: Align-Mode OFF blendet Polygone auf Final-Output wieder vollstaendig aus.
- Control-Polygon-Contract-Test: Controller (Handy/PC) behalten Polygone jederzeit sichtbar, unabhaengig vom Align-Mode.
- Final-Bootstrap-Stability-Test: `GET /output/final` zeigt keine White-Page; FX-Rendering startet deterministisch.
- Final-UI-Leak-Negativtest: `output/final` enthaelt keine Slider/Settings/Control-UI; nur FX-Layer ist sichtbar.
- Output-Route-Removal-Negativtest: Legacy-`Output Route` ist in UI/State/Interaktion nicht mehr erreichbar oder referenziert.
- Output-Route-Compatibility-Test: Decommission von `Output Route` veraendert den dedizierten Pfad `/output/final` nicht (Erreichbarkeit + Rendervertrag bleiben intakt).
- Audio-Routing-Test: Sound ist nur im Final-Output hoerbar; Controller bleiben stumm.
- Audio-Lifecycle-Test: bei Stop/Clear-All endet Audio sofort am Final-Output und startet nicht in Control-Views.
- Logging-Session-Test: Session-Events (connect/disconnect/role/join) werden persistent geloggt.
- Logging-State-Test: State-Aenderungen (trigger/edit/stop/align) werden mit Kontext persistent geloggt.
- Logging-Error-Test: Fehlerpfade schreiben strukturierte Error-Eintraege in dieselbe Logdatei.
- Logging-Restart-Test: nach Server-Neustart wird in derselben oder neuer Session-Datei appendbar weitergeloggt.

## Inkrementelle Pflicht-Gates
- Nach P5-T2: Final-Output verletzt nie den FX-only Vertrag.
- Nach P5-T4..P5-T7: kein Client zeigt veralteten Running-State nach Trigger/Edit/Stop/Join.
- Nach P5-T8..P5-T10: Align-Mode beeinflusst nur Final-Output-Polygon-Sichtbarkeit, nicht die Controller-Polygone.
- Nach P5-T11..P5-T12: Audio startet/stoppt nur fuer `final-output` und nie fuer `control`.
- Nach P5-T13..P5-T14: Logdatei enthaelt alle drei Klassen (`session_event`, `state_change`, `error`) mit Zeitstempel.
- Nach P5-T15: 3-Client-E2E-Nachweis ist dokumentiert und ohne P0-Blocker.
- Nach P5-T19..P5-T21: Outside-State ist inkl. Join/Reconnect auf allen Clients synchron und versionstreu.
- Nach P5-T22..P5-T23: Final-Output rendert stabil FX-only ohne UI-Leaks; Align-Ausnahme bleibt funktional.
- Nach P5-T24: Hotfix-Regression ist artefaktbasiert dokumentiert und ohne P0-Blocker.
- Nach P5-T25..P5-T27: Root-Cause und Ack-gebundener idempotenter Apply-Pfad sind aktiv; Single-Click-Sync erfordert keinen Zweitklick mehr.
- Nach P5-T28..P5-T29: schnelle Toggle-Folgen und Join/Reconnect bleiben versionsstabil ohne stale/dupe-State.
- Nach P5-T30..P5-T31: Single-Click-Regression und Burst-Soak sind artefaktbasiert dokumentiert und ohne P0-Blocker.
- Nach P5-T32..P5-T34: Board/Layout ist fuer alle Clients inkl. Join/Reconnect versionsstabil und driftfrei synchron.
- Nach P5-T35..P5-T36: `Output Route` ist vollstaendig entfernt; `/output/final` bleibt regressionsfrei erreichbar und FX-only.

## Definition of Done
- Alle P0-Tasks P5-T1..P5-T15 sowie P5-T19..P5-T36 sind abgeschlossen.
- Multi-Client-Live-State ist stabil und reproduzierbar synchron.
- Board-/Layout-Auswahl ist auf allen Clients inklusive Join/Reconnect deterministisch identisch.
- Outside-Space-State (ON/OFF, Speed, relevante Parameter) ist in Echtzeit inkl. Join/Reconnect synchron.
- Outside `direction`/`mode` und Room-Animation-Aktionen sind als Single-Click-Aktionen deterministisch beim ersten Ausloesen synchron.
- Jede Mutation ist serverautoritativ, idempotent, geordnet versioniert und per Broadcast-Ack bestaetigt.
- Final-Beamer-Output folgt dem FX-only-Vertrag inkl. Align-Mode-Ausnahme fuer Kalibrierung.
- Final-Output-Seite zeigt keine White-Page und keinerlei Slider/Settings/UI-Controls im Betriebsmodus.
- Legacy-`Output Route` ist aus Runtime und Bedienoberflaeche entfernt; `/output/final` ist der einzige dedizierte Ausgabepfad.
- Audio ist strikt auf Final-Output begrenzt.
- Persistentes Server-Logging fuer Session/State/Error ist aktiv und nachweisbar.
- Phase-5-Artefakte sowie `.planning/STATE.md`, `.planning/ROADMAP.md` und `.planning/CURRENT_PHASE.md` sind konsistent aktualisiert.
