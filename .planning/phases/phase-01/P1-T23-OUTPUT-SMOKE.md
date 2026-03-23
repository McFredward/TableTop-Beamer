# P1-T23 Output Routing Smoke Test

Datum: 2026-03-23

## Testmatrix

1. **Auto -> Windowed Preview**
   - Aktion: `Step 5 - Output Device` auf `Windowed Preview` setzen und `Apply Output Route` klicken.
   - Erwartung: Status meldet `Windowed Preview aktiv`, Projektion bleibt sichtbar.

2. **Windowed Preview -> Target Beamer (Fullscreen)**
   - Aktion: Route auf `Target Beamer (Fullscreen)` und `Apply Output Route`.
   - Erwartung: Bei erlaubter Fullscreen-Freigabe wechselt Stage in Fullscreen, Status meldet `Target Beamer aktiv`.

3. **Fallback ohne Fullscreen-Unterstuetzung/Freigabe**
   - Aktion: Fullscreen verweigern oder in Umgebung ohne `document.fullscreenEnabled` testen.
   - Erwartung: Automatischer Fallback auf `Windowed Preview`, Status nennt den Fallback-Grund.

4. **Fullscreen beenden**
   - Aktion: `Esc` in Fullscreen.
   - Erwartung: Route faellt deterministisch auf `Windowed Preview` zurueck, Status wird aktualisiert.

## Ergebnis

- Routingstatus wird fuer jeden Wechsel sichtbar im Dashboard angezeigt.
- Fullscreen-Ausfall wird ohne Reload mit klarer Rueckmeldung abgefangen.
- Fallback ist reproduzierbar und bricht die Session-Steuerung nicht.
