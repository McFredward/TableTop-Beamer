# Phase 5 Risks

## R1 Sync-Drift zwischen Clients
- Risiko: getrennte lokale Zustandsfortschritte fuehren zu divergenten Running-Listen.
- Impact: Kritisch, Bedien- und Beamer-Ansicht widersprechen sich.
- Gegenmassnahme: serverautoritiver State + versionierte Mutationen + sofortiger Broadcast.

## R2 Race Conditions bei parallelen Triggern
- Risiko: nahezu gleichzeitige Events von Handy und PC erzeugen Reihenfolgekonflikte.
- Impact: Hoch, Instanzen fehlen oder duplizieren.
- Gegenmassnahme: serielle Server-Mutationsqueue mit deterministischer Event-Reihenfolge.

## R3 Final-Output verletzt FX-only-Vertrag
- Risiko: Board-Layer oder Labels leaken in den Beamerpfad.
- Impact: Kritisch, physische Projektion wird visuell verfremdet.
- Gegenmassnahme: dedizierter Render-Guard je Rolle + Negativtests auf Board/Polygon/Label-Visibility.

## R4 Align-Mode wirkt auf falsche Views
- Risiko: Align-Toggle blendet auch in Controller-Views oder global unerwuenscht aus.
- Impact: Hoch, Bedienbarkeit leidet.
- Gegenmassnahme: explizite Sichtbarkeitsregeln pro Rolle (`control always on`, `final-output toggle`).

## R5 Audio-Leak auf Controller-Geraeten
- Risiko: Sound startet trotz Routing in Handy/PC-Browsern.
- Impact: Hoch, stoerende Doppel-/Lokalwiedergabe.
- Gegenmassnahme: harte Rollenpruefung vor jedem Audio-Start + Regression fuer Stop/Clear-All.

## R6 Logging nicht persistent oder unvollstaendig
- Risiko: Logs bleiben nur im Speicher oder enthalten keine verwertbaren Kontexte.
- Impact: Hoch, Fehleranalyse im Livebetrieb kaum moeglich.
- Gegenmassnahme: append-only Dateilog mit strukturiertem Schema und Pflichtfeldern.

## R7 Log-Wachstum ohne Betriebsschutz
- Risiko: dauerhaftes Logging fuehrt zu grossen Dateien.
- Impact: Mittel, Wartung und Speicherverbrauch steigen.
- Gegenmassnahme: vorbereiteter Rotationspfad und dokumentierte Operator-Checks.

## R8 Reconnect-Verhalten liefert stale Snapshot
- Risiko: frisch verbundene Clients starten mit altem State und muessen manuell reloaden.
- Impact: Hoch, Runtime-Widersprueche im Betrieb.
- Gegenmassnahme: verpflichtender Snapshot-on-join mit Versionsvergleich.

## R9 Netzwerk-Latenz im LAN fuehrt zu Bedien-Irritation
- Risiko: wahrnehmbare Verzoegerungen bei schnellen Triggerfolgen.
- Impact: Mittel bis hoch, Operator verliert Vertrauen in den Live-Zustand.
- Gegenmassnahme: einfache Connection/Sync-Indikatoren plus Burst-Soak-Nachweis.

## R10 Scope-Creep in Richtung Auth/Cloud
- Risiko: Phase-5-Umsetzung driftet in nicht benoetigte Infrastruktur.
- Impact: Mittel, Lieferzeit steigt ohne Mehrwert fuer Spielabendbetrieb.
- Gegenmassnahme: strikte Scope-Grenze auf lokalen Multi-Device-Livebetrieb und Logging.

## R11 Outside-Sync bleibt partiell
- Risiko: Outside-Animation selbst laeuft, aber ON/OFF, Speed oder weitere Outside-Parameter driften zwischen Clients.
- Impact: Kritisch, Bedienentscheide sind nicht reproduzierbar und Final-Output weicht vom Controller ab.
- Gegenmassnahme: verpflichtende Shared-State-Felder fuer Outside + serverautoritiver Mutationspfad + Join/Reconnect-Snapshot-Checks.

## R12 Final-Output Bootstrap/Renderpfad instabil
- Risiko: `/output/final` zeigt White-Page oder leakende Control-UI statt FX-only.
- Impact: Kritisch, Beamerbetrieb unbrauchbar oder visuell kontaminiert.
- Gegenmassnahme: dedizierter Final-Bootstrap mit Render-Guards, Negativtests auf UI-Leaks und Align-Ausnahme als einziger Overlay-Pfad.

## R13 Dedup/Retry verwirft gueltige First-Click-Mutationen
- Risiko: aggressive Dedup-Logik oder Retry-Kollisionen markieren legitime erste Toggles faelschlich als Duplikat.
- Impact: Kritisch, Operator muss mehrfach schalten bis Zustand repliziert.
- Gegenmassnahme: stabile Mutation-IDs je Aktion, idempotentes Server-Apply und eindeutige Ack-Rueckmeldung pro Version.

## R14 Ack-Luecke zwischen Apply und Broadcast
- Risiko: Mutation wird serverseitig angewendet, aber ohne unmittelbare Broadcast-Bestaetigung bleibt Client-UI im alten Zustand.
- Impact: Kritisch, visuelle Inkonsistenz trotz erfolgreicher Server-Mutation.
- Gegenmassnahme: Apply und Broadcast-Ack als atomaren Pfad behandeln (kein stilles Apply ohne bestaetigten Outbound).

## R15 Versionsdrift bei schnellen Toggle-Folgen
- Risiko: bei schnellen `direction`/`mode`-Toggles treffen Updates out-of-order ein und stale Zustandsbilder ueberschreiben neuere.
- Impact: Hoch bis kritisch, Endzustand unterscheidet sich zwischen Clients.
- Gegenmassnahme: monotone Versionszaehlung pro Shared-State, stale-drop-Regel und deterministic last-write auf Serverseite.

## R16 Room-Action-Races unter Last
- Risiko: Trigger/Edit/Stop/Clear-All fuer Room-Animationen kollidieren in schneller Folge und erzeugen divergende Running-Listen.
- Impact: Hoch, Bedienlogik und Beamer-Output laufen auseinander.
- Gegenmassnahme: serielle Mutationsqueue fuer Room-Aktionen, idempotente Apply-Guards und Single-Click-Regression/Soak als Pflichtgate.

## R17 Board/Layout-Kontext driftet zwischen Clients
- Risiko: Board- oder Layout-Wechsel wird nur lokal wirksam; einzelne Clients arbeiten auf unterschiedlichem Kontext.
- Impact: Kritisch, Trigger/Editing erfolgen auf inkonsistenten Raumgrundlagen und fuehren zu Fehlbedienung.
- Gegenmassnahme: Board/Layout als verpflichtender Shared-State mit serverautoritiven Mutationen, Ack/Version und Join-Snapshot-Paritaet.

## R18 Teil-Decommission von `Output Route`
- Risiko: alte `Output Route`-Reste bleiben in UI/State/Code aktiv und erzeugen widerspruechliche Operatorpfade.
- Impact: Hoch, Bedienverwirrung und potenzielle Regression im dedizierten Final-Output-Setup.
- Gegenmassnahme: vollstaendige Entfernung per Decommission-Checklist (UI, State, Routing, Doku) plus Negativtests auf nicht mehr vorhandene Controls/Pfade.
