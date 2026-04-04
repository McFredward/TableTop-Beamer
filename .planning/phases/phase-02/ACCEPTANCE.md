# Phase 2 Acceptance

## Testplan
- Mobile-Pflichttest: Smartphone Portrait und Landscape durchgaengig bedienbar, ohne Mischpanel zwischen Triggern und Running-Management.
- Daumen-Speed-Test: Kerntrigger sind mit einer Hand schnell erreichbar; Startaktion in maximal zwei Touch-Schritten.
- Touch-Target-Test: alle primaeren Controls mit >=44x44 px; keine kritischen Ziele in zu engem Abstand.
- Fehlklick-Test: `Clear All` und Stop/Edit bleiben auch unter hektischer Touch-Bedienung kontrollierbar.
- Lesbarkeits-Test: Status und Triggerlabels unter realem Spieltisch-Licht klar erkennbar.
- Orientation-Test: Portrait <-> Landscape Wechsel ohne Verlust laufender Animationen oder UI-State.
- Mobile-Performance-Test: stabile Interaktion bei laufenden Effekten, keine deutlichen Bedienhaenger in 30+ Minuten.
- Global-Defaults-Bootstrap-Test: auf neuem/geleertem Browserprofil werden globale Defaults automatisch geladen und direkt wirksam.
- Local-Storage-Empty-Test: leeres `localStorage` fuehrt nicht zu stiller Ignorierung, sondern zu explizitem Default-Fallback.
- Settings-Apply-Test: Button `Defaults laden & anwenden` zieht globale Defaults und aktualisiert die laufende Session ohne Neustart.
- Mobile-Top-Control-Flow-Test: `Dashboard`/`Settings` sind auf Mobile nicht sticky/fixiert, am Scroll-Start sichtbar und verschwinden beim Scrollen regulaer.
- Mobile-Projection-Visibility-Test: oberes Mobile-Cluster verdeckt beim Scrollen nicht die Board-/Projektionsflaeche; Board bleibt sichtbar und bedienbar.
- Mobile-Board-Interaktions-Test: Touch-/Pointer-Interaktion auf der Board-Flaeche bleibt trotz Top-Control-Bereichen robust erreichbar.
- View-Navigation-Persistenz-Test: `Dashboard`/`Settings` sind am oberen Scroll-Startpunkt sichtbar und im normalen Scrollfluss robust erreichbar.
- View-Navigation-Resilienz-Test: Scroll, Orientation-Wechsel, Resize und View-Switch erzeugen weder Board-Overlap noch Navigations-Dead-End.
- Desktop-Paritaets-Test: Mobile-Top-Control-Anpassungen sind auf Mobile begrenzt; Desktop-Layout und Scrollverhalten bleiben unveraendert.
- Zonen-Loader-Test: Board-Zonen kommen aus `config/zones/*.json` und nicht aus statischer Inline-Konstante.
- Zonen-Validator-Fallback-Test: missing/malformed/partial Zonen-JSON triggert deterministischen Fallback ohne Runtime-Abbruch.
- Preview/Kombi-Flow-Test: Einzelvorschau und Kombi-Staging sind als klarer Session-Zustand aufbaubar und in UI sichtbar.
- Live-Send-Rollback-Test: Preview-Commit auf Live ist ausloesbar; letzter Send ist per Undo/Rollback ruecknehmbar.
- README-Workflow-Test: Root-README beschreibt den finalen Phase-2-Operator-Ablauf inkl. Preview-vs-Live und Rollback.
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

## Verpflichtendes Feedback Add-on - Pflichtabnahme (P2-T26..P2-T30)
- Neuer/geleerter Browser startet mit globalen Defaults als aktivem Session-Stand (kein manuelles Vorladen noetig).
- Empty-Storage wird als gueltiger Fallback-Fall behandelt und nicht still uebersprungen.
- `Settings` bietet den Button `Defaults laden & anwenden`; Wirkung ist unmittelbar in Trigger-/Runtime-Konfiguration sichtbar.
- Auf Mobile bleibt der obere Dashboard-Bereich im normalen Scrollfluss (nicht sticky/fixiert), ohne darunterliegenden Content zu verdecken.
- Desktop zeigt nach Mobile-Fix keine Layout-/Scroll-Regression.

## Neues verpflichtendes Feedback Add-on 2 - Pflichtabnahme (P2-T31..P2-T35)
- Beim mobilen Scrollen verdeckt das obere Cluster die Board-/Projektionsflaeche nicht; die Flaeche bleibt sichtbar.
- Board-Interaktionen bleiben trotz Top-Control-Bereichen ausfuehrbar (kein Pointer-/Touch-Blocking durch Overlay-Leaks).
- `Settings` zeigt am Scroll-Start den Rueckweg nach `Dashboard`; der Wechsel bleibt robust erreichbar.
- Navigation `Dashboard` <-> `Settings` bleibt stabil bei Scroll, Orientation-Wechsel, Resize und wiederholtem View-Switch.
- Desktop-Paritaet bleibt erhalten; neue Mobile-Bugfixes fuehren zu keiner Desktop-Regression.

## Neues verpflichtendes Feedback Add-on 3 - Pflichtabnahme (P2-T36..P2-T40)
- Mobile Trigger-Modus (`Triggern`/`Running managen`/`Raum starten`) zeigt kein Overlay ueber der Board-/Projektionsflaeche.
- `Dashboard`/`Settings` sind auf Mobile nicht sticky/fixiert; sie sind am Scroll-Start sichtbar und duerfen beim Scrollen regulaer verschwinden.
- Mobile Layout erzwingt No-Overlay-Verhalten auch bei Scroll, Orientation-Wechsel und View-Switch.
- Board bleibt durchgaengig sichtbar/bedienbar; Pointer-/Touch-Interaktion wird durch Controls nicht blockiert.
- Screenshot-Referenz `debug/screenshot_debug.jpg` ist als Vorher-Bezug und Nachher-Nachweis im Verifikationsprotokoll dokumentiert.

## Abschluss-Add-on Plan Update 5 - Pflichtabnahme (P2-T41..P2-T47)
- Board-Zonen werden aus externen JSON-Dateien pro Board geladen (`config/zones/*.json`); statische Inline-Zonen sind kein Primaerpfad mehr.
- Zonen-Validator deckt mindestens fehlende Felder, Typfehler und ungueltige Polygondaten ab; Fallback bleibt deterministisch und session-stabil.
- Preview-Flow unterstuetzt Einzel- und Kombi-Vorschau als expliziten Staging-Zustand.
- Absenden ueberfuehrt den Staging-Zustand in Live-Ausgabe; letzter Send ist ueber Undo/Rollback ruecknehmbar.
- Root-README dokumentiert den finalen Phase-2-Workflow inklusive Defaults/Profile/Kalibrierung sowie Preview/Kombi/Absenden/Rollback.
- Re-Verification dokumentiert die Schliessung der `2-VERIFICATION.md` Gaps und referenziert alle relevanten Artefakte.

## Definition of Done
- Alle Stories aus `.planning/phases/phase-02/BACKLOG.md` sind mit zugeordneten Tasks umgesetzt.
- Pflichtfeedback P2-T26..P2-T30 ist vor nachgelagerten Ausbauarbeiten abgeschlossen.
- Neues Pflichtfeedback P2-T31..P2-T35 ist als P0-Bugfix vor nachgelagerten Ausbauarbeiten abgeschlossen.
- Neues Pflichtfeedback P2-T36..P2-T39 ist als P0-Hotfix vor nachgelagerten Ausbauarbeiten abgeschlossen.
- Abschluss-Add-on P2-T41..P2-T47 ist abgeschlossen und in Verifikation + README nachvollziehbar.
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

### Aktuelle Phase-2 Nachweise (Mobile-First + Pflichtfeedback)
- `.planning/phases/phase-02/P2-T1-MOBILE-UX-BLUEPRINT.md`
- `.planning/phases/phase-02/P2-T4-TOUCH-TARGET-CHECKLIST.md`
- `.planning/phases/phase-02/P2-T6-FEHLKLICK-PROTOKOLL.md`
- `.planning/phases/phase-02/P2-T7-LESBARKEIT-PROTOKOLL.md`
- `.planning/phases/phase-02/P2-T8-ORIENTATION-ROUNDTRIP.md`
- `.planning/phases/phase-02/P2-T9-MOBILE-PERFORMANCE.md`
- `.planning/phases/phase-02/P2-T10-SPIELTISCH-VERIFIKATION.md`
- `.planning/phases/phase-02/P2-T30-DESKTOP-PARITAET.md`
- `.planning/phases/phase-02/P2-T35-NAV-AND-PROJECTION-VERIFIKATION.md`
- `.planning/phases/phase-02/P2-T40-MOBILE-NO-OVERLAY-VERIFIKATION.md`
