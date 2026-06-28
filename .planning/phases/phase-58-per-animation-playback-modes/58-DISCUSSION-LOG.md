# Phase 58 — Discussion Log

Date: 2026-06-02
Mode: discuss (default)
Operator: Frederik

---

## Pre-discussion clarification (before formal discuss-phase)

Three operator answers via AskUserQuestion that framed the phase scope:

1. **Phase number** — 58 (next free).
2. **Scope** — alle drei Animationsbereiche (room + inside + outside).
3. **mp4-reverse architecture** — research first, prefer in-Code (no
   manual user step), fallback to automatic server-side ffmpeg pre-
   compute with UI loading indicator.

## Gray areas presented (multiselect)

All four selected by operator:
- UI-Layout der Playback-Mode-Controls
- Boomerang-Verhalten im Detail
- Re-Trigger-Semantik in non-loop Modi
- Dashboard per-Trigger Override

## Area 1 — UI Layout

**Q:** Wie soll die Playback-Mode-Auswahl im Animationseditor
präsentiert werden?

Options:
- Stufenweise: Mode-Dropdown, dann Subfeld erscheint kontextabhängig
  (Recommended)
- Flaches Dropdown mit allen 6 Varianten ausgeschrieben
- Eigene 'Playback' Karte unterhalb 'Defaults' mit Radio + Toggles

**A:** Stufenweise (recommended).

## Area 4 — Per-Trigger Override

**Q:** Soll der Operator im Dashboard pro Trigger den Playback-Mode
überschreiben können, oder ist der Modus strikt per-definition gelockt?

Options:
- Strikt per-definition (Recommended)
- Definition setzt Default, Dashboard kann überschreiben
- Loop-Override behalten, aber Mode-Override nur per-definition

**A:** Definition setzt Default, Dashboard kann überschreiben.
*(Operator wählte non-recommended Option — mehr Flexibilität gewünscht.)*

## Area 2+3 — Boomerang + Re-Trigger State-Machine (batched 4 questions)

### Q2a: Boomerang-Zyklus

Options:
- Endlos bis manueller Stop (Recommended)
- Fest N Zyklen, dann auto-disappear
- Endlos mit konfigurierbarer Pause an Endpunkten

**A:** Endlos bis manueller Stop.

### Q2b: Re-Trigger während laufender Boomerang-Animation

Options:
- Sofort stoppen + verschwinden (Recommended)
- Beim nächsten Endpunkt sauber beenden
- Auf 'play-once-and-disappear' wechseln

**A:** Sofort stoppen + verschwinden.

### Q3: Re-Trigger während 'play-then-freeze' noch in Forward-Phase

Options:
- Re-Trigger ignorieren bis Forward+Freeze erreicht ist (Recommended)
- Re-Trigger startet die on-retrigger-Aktion sofort
- Re-Trigger pausiert Forward und startet on-retrigger ab aktueller
  Position

**A:** Re-Trigger startet die on-retrigger-Aktion sofort.
*(Non-recommended; operator will reaktivere UX.)*

### Q4: Edge-Cases bei board-switch, clear-all, system-reset

Options:
- Bei jedem Event sofort verschwinden, kein reverse (Recommended)
- Bei Board-Switch reverse-Playback, bei Clear/Reset sofort weg
- Bei allen drei Events on-retrigger-Aktion abspielen

**A:** Sofort verschwinden bei allen drei Events.

## Follow-up — Reverse Start Point + Frozen-First Semantik (2 Q batched)

### Q5: Reverse-Startpunkt bei Re-Trigger während Forward

Options:
- Ab aktueller Position rückwärts (Recommended)
- Snap zum letzten Frame, dann komplett rückwärts
- Forward beschleunigt durchspulen, dann normales Reverse

**A:** Ab aktueller Position rückwärts.

### Q6: Frozen-First Re-Trigger Semantik

Options:
- Wieder forward spielen — Toggle-Pattern (Recommended)
- Animation komplett verschwinden lassen
- Nichts — explizites Clear nötig

**A:** Toggle-Pattern (manuell gesteuerter Boomerang).

---

## Total turns: 5 (3 individual + 1 batched-4 + 1 batched-2)

## Deferred Ideas (captured in CONTEXT.md)

- N-cycle limit für Boomerang
- Endpunkt-Pausen für Boomerang
- Per-trigger reverse-Speed override
- Audio-Sync für reverse mp4
- "Reverse preview" Button im Editor
- Mode-Indikator-Icon im Library-List (Badge)
