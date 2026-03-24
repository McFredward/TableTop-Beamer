# Phase 2 Acceptance

## Testplan
- Mobile-Pflichttest: Smartphone Portrait und Landscape durchgaengig bedienbar, ohne Mischpanel zwischen Triggern und Running-Management.
- Daumen-Speed-Test: Kerntrigger sind mit einer Hand schnell erreichbar; Startaktion in maximal zwei Touch-Schritten.
- Touch-Target-Test: alle primaeren Controls mit >=44x44 px; keine kritischen Ziele in zu engem Abstand.
- Fehlklick-Test: `Clear All` und Stop/Edit bleiben auch unter hektischer Touch-Bedienung kontrollierbar.
- Lesbarkeits-Test: Status und Triggerlabels unter realem Spieltisch-Licht klar erkennbar.
- Orientation-Test: Portrait <-> Landscape Wechsel ohne Verlust laufender Animationen oder UI-State.
- Mobile-Performance-Test: stabile Interaktion bei laufenden Effekten, keine deutlichen Bedienhaenger in 30+ Minuten.
- Session-Test: 3h Betrieb (Desktop + mobile Bedienung) ohne Crash und ohne Funktionsverlust.
- Real-Setup-Test: Mehrmonitor-/Beamer-Setup inkl. Standard- und Special-Raumprofil dokumentiert.

## Plan Update 2 - Pflichtabnahme (P2-T1..P2-T10)
- UX-Konzept ist dokumentiert und in der UI sichtbar umgesetzt (Portrait + Landscape, Daumen-Flow, klare Funktionszonen).
- Triggerflaeche und Running-Management sind getrennt; Bedienende wechseln bewusst zwischen Ausloesen und Verwalten.
- Primaere Touch-Ziele unterschreiten nicht 44x44 px und zeigen eindeutige Zustandsrueckmeldung.
- Einhandbedienung ist am realen Spieltisch nachgewiesen (inkl. klar lesbarer Statusanzeige).
- Fehlklick-Schutz ist fuer kritische Aktionen nachgewiesen (insb. `Clear All`).
- Orientation-Wechsel bleibt stabil: keine State-Verluste, keine unbenutzbaren Layout-Zustaende.
- Mobile Responsiveness/Performance ist verifiziert und als Protokoll abgelegt.

## Definition of Done
- Alle Stories aus `.planning/phases/phase-02/BACKLOG.md` sind mit zugeordneten Tasks umgesetzt.
- Priorisierte Mobile-First-Tasks (P2-T1..P2-T10) sind vor den nachgelagerten P2-Ausbaustories abgeschlossen.
- Trigger-Bedienung ist auf Smartphone (Portrait/Landscape) schnell, lesbar, einhaendig und fehlklickarm.
- Trennung `Triggern` vs `laufende Animationen managen` ist im UI klar und bleibt unter Last stabil.
- Performance-/Responsiveness-Verifikation auf mobilen Endgeraeten und reale Tischtests sind dokumentiert.
- README und Phase-02-Artefakte sind konsistent aktualisiert.

## Nachweisartefakte
- Mobile-UX-Blueprint mit Portrait-/Landscape-Skizze und Thumb-Zonen.
- Touch-Target-Checkliste (inkl. gemessener Mindestgroessen und kritischer Abstandspaare).
- Spieltisch-Protokoll fuer Einhandbedienung + Lesbarkeit (kurze Foto-/Notizserie reicht).
- Fehlklick- und Safety-Protokoll fuer `Clear All` und Stop/Edit unter schneller Touchfolge.
- Orientation-Roundtrip-Protokoll (mehrfache Wechsel ohne State-Drift).
- Mobile-Performance-Protokoll (Interaktionslatenz, Bedienfluessigkeit, 30+ min Laufzeit).
- Mehrmonitor-/Beamer-Verifikationsprotokoll fuer Standard-/Special-Raumprofil.

### Aktuelle Phase-2 Nachweise (P2-T1..P2-T10)
- `.planning/phases/phase-02/P2-T1-MOBILE-UX-BLUEPRINT.md`
- `.planning/phases/phase-02/P2-T4-TOUCH-TARGET-CHECKLIST.md`
- `.planning/phases/phase-02/P2-T6-FEHLKLICK-PROTOKOLL.md`
- `.planning/phases/phase-02/P2-T7-LESBARKEIT-PROTOKOLL.md`
- `.planning/phases/phase-02/P2-T8-ORIENTATION-ROUNDTRIP.md`
- `.planning/phases/phase-02/P2-T9-MOBILE-PERFORMANCE.md`
- `.planning/phases/phase-02/P2-T10-SPIELTISCH-VERIFIKATION.md`
