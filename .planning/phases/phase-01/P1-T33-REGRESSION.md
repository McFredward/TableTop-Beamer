# P1-T33 Regression-Protokoll (Plan Update 3)

Datum: 2026-03-24

## Scope
- Hitarea-Calibration per Slider (X/Y/Scale) statt Auto-Tuning
- Persistenz pro Board (laden/speichern/reset)
- Spezialraum-Rendering sichtbar und Running-List-konsistent
- Stabilitaet fuer Triggerfolge `Spezialraum + Alarm Beacon`
- Kombi-Test mit parallel aktiven Event-Sounds

## Automatisierte Checks

### 1) Syntax-Regression
Command:

```bash
node --check src/app.js
```

Ergebnis: ✅ erfolgreich (kein Syntaxfehler)

### 2) Render-Loop Guard vorhanden
Nachweis im Code (`src/app.js`):
- `drawAnimationSafely(...)` kapselt Einzelanimationen in `try/catch`
- `draw(...)` nutzt `try/finally` und ruft `requestAnimationFrame(draw)` immer erneut auf
- Fehlerhafte Animationen werden isoliert entfernt statt den globalen Timer zu stoppen

## Manueller Kombi-Test (gem. ACCEPTANCE P0d/P0e)

1. Board A waehlen, Special-Raum anklicken, `Alarm Beacon` als Raum-Animation starten.
2. Parallel global `Intruder Alert` und `Reactor Pulse` triggern (Audio Master ON, Volume 70%).
3. Erwartung:
   - Running-List zeigt ROOM + GLOBAL Eintraege.
   - Spezialraum-Effekt ist sichtbar im Zielraum.
   - Visueller Timer laeuft weiter (kein kompletter Render-Stop).
   - Fremde Animationen laufen sichtbar weiter.
4. Schritte 1-3 fuer Board B wiederholen.

Status: ⚠️ Headless-Umgebung; manuelle Pflichtabnahme im realen Setup vorgesehen.

## Persistenz-Test (gem. ACCEPTANCE P0c)

1. Board A: X/Y/Scale per Slider aendern, `Kalibrierung speichern` klicken.
2. Auf Board B wechseln, andere Werte setzen/speichern.
3. Zurueck auf Board A/B wechseln.
4. Erwartung:
   - Pro Board werden die zuletzt gespeicherten Werte geladen.
   - Overlay/Hit-Test reagiert sofort auf die geladenen Werte.
5. `Kalibrierung auf Default` pruefen (pro Board, sofort wirksam).

Status: ⚠️ Manuelle Pflichtabnahme im realen Beamer-Setup.
