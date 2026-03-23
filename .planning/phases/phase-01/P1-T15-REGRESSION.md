# P1-T15 Smoke- und Safety-Regression

Datum: 2026-03-23

## Smoke-Regression

1. **Board-Wechsel**
   - Check: Wechselpfad nutzt Preload + Messausgabe (`switchBoard`).
   - Ergebnis: UI zeigt `Boardwechsel: <ms>` inkl. OK/WARN-Indikator.

2. **Kalibrierung in Echtzeit**
   - Check: `offset/scale/rotation` triggern `updateStageTransform` bei jedem `input`.
   - Ergebnis: Transform-Update mit Live-Werten aktiv.

3. **Event-Trigger-Feedback**
   - Check: Event-Buttons schreiben Latenz in `#trigger-feedback`.
   - Ergebnis: One-shot-Events geben direkte Rueckmeldung.

4. **Syntax-Check**
   - Command: `node --check src/app.js`
   - Ergebnis: Erfolgreich, keine Syntaxfehler.

## Safety-Regression

1. **Globaler Stop-Pfad (`Clear All`)**
   - Check: `pointerdown` + emergency-Flag + direkter Registry-Stop.
   - Ergebnis: Dauer- und Event-Effekte werden sofort auf inaktiv gesetzt, Partikel geleert.

2. **Unter Last robust**
   - Referenz: `P1-T14-LOADTEST.md`
   - Ergebnis: Kein Budget-Miss im simulierten Parallel-Updatepfad.

## Fazit
- Kernpfade fuer Smoke und Safety sind implementiert, ueberpruefbar und ohne Syntaxfehler.
