# P2-T30 Desktop-Paritaetscheck (Mobile Sticky-Fix)

Datum: 2026-03-24

## Ziel
Nachweisen, dass die Mobile-Sticky-Anpassungen aus P2-T29 nur unter `max-width: 920px` greifen und das Desktop-Layout unveraendert bleibt.

## Technischer Guard (Regression)
- `runLayoutScrollRegression()` prueft jetzt explizit:
  - **Mobile:** `.dashboard-sticky-shell` muss im Dashboard-View `position: sticky` sein.
  - **Desktop:** `.dashboard-sticky-shell` darf **nicht** sticky/fixed sein (`static`/`relative` erwartet).
- Der Guard ist Teil des Startup-Regression-Bundles und wird beim App-Start automatisch ausgefuehrt.

## Checkliste Desktop (manuell)
1. Desktop-Browser mit Breite > 920px oeffnen.
2. Bestaetigen:
   - Board links bleibt wie bisher sticky.
   - rechter Dashboard-Stack scrollt wie bisher.
   - kein zusaetzlicher mobiler Sticky-Header sichtbar.
3. Zwischen `Dashboard` und `Settings` wechseln.
4. Triggern + Running-Liste bedienen.
5. Auf Statuszeile achten: Regression darf keinen Layout-Fehler melden.

## Ergebnis
- Desktop-Verhalten bleibt unveraendert.
- Mobile-Sticky-Fix ist breakpoint-begrenzt.
- Keine Desktop-Scroll-/Layout-Regression festgestellt.
