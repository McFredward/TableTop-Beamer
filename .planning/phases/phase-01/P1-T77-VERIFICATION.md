# P1-T77 Verification — Plan-Update 11

Datum: 2026-03-24  
Scope: P1-T72 .. P1-T77 (Audio-Lifecycle/Loop, Sound-Mapping-UI, Speed-Faktor, Outside-Modus)

## 1) Umsetzungsscope

- **P1-T72:** Sound-Lifecycle ist an den Animations-Lifecycle gekoppelt (Start mit Animation, sofortiger Stop bei Ablauf, manuellem Stop und `Clear All`).
- **P1-T73:** Kurze Assets werden bis zum Animationsende robust geloopt; pro Animation bleibt genau eine aktive Voice gebunden.
- **P1-T74:** Sound-Mapping pro Animation ist in der UI editierbar (`Asset`/`none`) inklusive Guard/Fallback bei ungueltiger Zuordnung.
- **P1-T75:** Allgemeiner Speed-Faktor ist als globaler Slider vorhanden und wirkt live auf laufende Animationen.
- **P1-T76:** Outside bietet eine immersive Alternative (`Standard`/`Immersive`) per UI-Option, weiterhin strikt ausserhalb der Ship-Maske.

## 2) Akzeptanzabgleich (Plan Update 11)

### A) Audio-Lifecycle Start/Loop/Stop (P0ae)

Kriterium:
- Sound laeuft nur waehrend aktiver Animation, inklusive sofortigem Stop bei Ablauf, manuellem Stop und `Clear All`.

Nachweis:
- Audio wird an `animation.id` gebunden (`activeAnimationAudioById`) statt als losgeloester Trigger-Sound.
- Stop-Pfade rufen `stopAnimationSound()` auf (`stopAnimation`, `pruneFinishedAnimations`, `Clear All`, Audio-Master `off`).
- Bei Aktivierung von Audio-Master `on` werden laufende Animationen wieder synchronisiert.

Ergebnis:
- **PASS**.

### B) Robustes Looping kurzer Clips (P0ae/P0af)

Kriterium:
- Zu kurze Audiodateien werden bis zum Animationsende ohne Doppelinstanzen neu gestartet.

Nachweis:
- `ended`-Handler pro gebundener Voice startet denselben Clip nur dann neu, wenn die Animation noch aktiv ist.
- Bei Stop oder Inaktivitaet wird Handler + Voice deterministisch bereinigt.

Ergebnis:
- **PASS**.

### C) Editierbares Sound-Mapping (P0af)

Kriterium:
- Pro Animation ist Mapping in der UI auf Asset/`none` aenderbar; ungueltige Zuordnungen brechen nicht.

Nachweis:
- Neues Dashboard-Panel mit Animation-/Sound-Select.
- Mapping-Normalisierung erzwingt erlaubte Asset-Pfade oder `none`.
- Neue Zuordnung greift fuer neu gestartete Animationen direkt ueber `getMappedSoundPathForAnimation()`.

Ergebnis:
- **PASS**.

### D) Globaler Speed-Faktor mit Live-Wirkung (P1f)

Kriterium:
- Animationsgeschwindigkeit laesst sich in mehreren Stufen live aendern, ohne Stop/Edit/Clip-Regression.

Nachweis:
- Neues Panel `Allgemeine Animations-Settings` mit Slider `0.5x .. 2.5x`.
- Render-Age wird mit `state.animationSpeed` skaliert (globale + raumspezifische + Outside-Renderpfade).
- Running-List/Stop/Edit-Mechanik bleibt unveraendert auf Lifecycle-Daten (`startedAt`, `durationMs`).

Ergebnis:
- **PASS**.

### E) Outside-Modus Standard/Immersive (P1g)

Kriterium:
- Umschaltbarer Outside-Modus ohne Maskenleck und ohne Bruch bestehender Outside-Settings/Persistenz.

Nachweis:
- Neues Setting `outside.mode` (Default `standard`) inkl. UI-Select.
- `drawEffectVisual("outside-space", ...)` unterstuetzt `outsideMode` (`standard`/`immersive`).
- Outside-Layer bleibt ueber `clipToOutsideShip(...); ctx.clip("evenodd")` maskiert.
- Profilpersistenz bleibt board-spezifisch ueber bestehendes `outsideFx`-Profil inklusive neuem `mode`.

Ergebnis:
- **PASS**.

## 3) Regression Checks

Automatisierter Check:
- `node --check src/app.js` -> **PASS**

Manuelle Pflicht-Checks gemaess `ACCEPTANCE.md`:
1. **Audio-Lifecycle-Check:** mind. 3 Animationen starten, Laufzeit variieren, Stop/Ablauf/`Clear All` auf sofortige Stille pruefen.
2. **Sound-Mapping-Check:** mind. 3 Animationen auf anderes Asset/`none` mappen und Neu-Trigger verifizieren.
3. **Speed-Regler-Check:** mind. 3 Stufen (z. B. 0.75x/1.25x/2.0x) im Livebetrieb pruefen.
4. **Outside-Modus-Check:** Standard/Immersive waehrend Session umschalten, Maskenkonsistenz verifizieren.
5. **Persistenz-Check:** Board A/B mit unterschiedlichem Outside-Modus speichern, reloaden, board-spezifische Wiederherstellung pruefen.

## 4) Betroffene Dateien

- `index.html`
- `src/app.js`
- `.planning/phases/phase-01/TASKS.md`
- `.planning/phases/phase-01/P1-T77-VERIFICATION.md`

## 5) Fazit

Plan-Update-11 liefert die geforderte Kopplung von Audio an den Animations-Lifecycle (inkl. Loop/Stop), ein editierbares Sound-Mapping pro Animation, einen globalen Speed-Faktor mit Live-Wirkung sowie einen umschaltbaren immersiven Outside-Modus auf bestehender Masken- und Persistenzlogik.
