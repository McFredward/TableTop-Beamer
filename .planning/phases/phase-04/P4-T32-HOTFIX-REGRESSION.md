# P4-T32 Hotfix Regression (Plan 4-4)

## Scope
- High-Zoom-Precision: Polygon-Handle-Groesse ist in Settings nahe Zoom einstellbar und wirkt direkt.
- Immersion: `lichtflackern` ist kein periodischer Pulse mehr, sondern ein unregelmaessiges Random-Flicker.
- Edit-Flow: Room-Polygon kann per LMB-Flaechen-Drag als Ganzes verschoben werden.
- Safety: Vertex-Edit (Insert/Delete/Move) und Raum-Clipping bleiben unveraendert stabil.

## Automated Checks

### Syntax Gate
```bash
node --check src/app.js
node --check src/app/state/runtime-state.js
node --check server.mjs
```

Result: ✅ alle Checks erfolgreich.

### Feature Presence Gate (Static)
- Handle-Size-Control in UI:
  - `index.html`: `#polygon-handle-size`, `#polygon-handle-size-value`.
- Handle-Scale im Runtime-Pfad:
  - `src/app.js`: `clampPolygonHandleScale`, `syncPolygonHandleSizePanel`, Statusanzeige im Polygoneditor, Radius-Skalierung fuer sichtbare Handles + Hit-Targets.
- Room-Flaechen-Drag vorhanden und guardiert:
  - `src/app.js`: `beginPolygonAreaDrag`, `finishPolygonAreaDrag`, `dragArea*`-Sessionstate, Cancel/Pointer-Guards fuer Pan/Escape/Blur.
- Random-Flicker-Rework vorhanden:
  - `src/app.js`: `flickerNoise` + neuer `hull-flicker`-Pfad mit Burst/Dip/Glitch-Line-Variation.
- Raum-Clipping weiterhin aktiv:
  - `src/app.js`: `drawAnimation()` nutzt weiter `clipToRoom(room, animation.boardId)` vor `drawRoomComposition(...)`.

Result: ✅ alle Plan-4-4-Hotfix-Bausteine im produktiven Sourcepfad vorhanden.

## Acceptance Mapping

| Acceptance | Nachweis |
| --- | --- |
| Polygon-Handle-Size-Test | Settings-Slider (`70%..220%`) in `index.html`; Runtime-Sync + unmittelbares Re-Render in `src/app.js` (`syncPolygonHandleSizePanel`, `renderRoomOverlay`). |
| High-Zoom-Precision | Handle-Scale wirkt auf sichtbare Radiuswerte und Hit-Targets im Polygoneditor (`renderPolygonEditorHandles`) und bleibt mit Zoom-Inversion gekoppelt. |
| Lichtflackern-Rework-Test | `hull-flicker` nutzt unregelmaessige Noise/Burst/Dip/Glitch-Logik statt sinusfoermigem Puls. `lichtflackern` bleibt ueber Room-Equivalent-Mapping im room-clipped Renderpfad. |
| Room-Drag-Test | LMB-Flaechen-Drag startet auf `room-zone` im Settings-Mode; Pointer-Session mit Capture, Persistenz-Commit bei Bewegung, Cancel via Escape/Blur/Pointercancel. |
| Room-Polygon-Test (Insert/Delete/Move) | Vertex-/Edge-Handles behalten eigene Pointer-Pfade; Area-Drag hat Guards gegen aktive Vertex-/Ship-Drags und Pan-Kollisionen. |
| Room-Animation-/Clipping-Test | Renderpfad bleibt unveraendert: room animation -> `clipToRoom(...)` -> `drawRoomComposition(...)`; kein Clipping-Leak eingefuehrt. |

## Manual Verify Checklist (Operator)
1. **Settings -> Board-Zoom-Panel**: Handle-Groesse auf 70%, 100%, 220% stellen und pruefen, dass Handles sofort sichtbar wachsen/schrumpfen.
2. **Hoher Zoom (>=250%)**: aktive Ecke und Kanten-Hitareas muessen weiter sauber greifbar bleiben.
3. **Lichtflackern starten**: im Zielraum unregelmaessiges kaputtes Flackern beobachten (kein periodischer Puls).
4. **Room-Flaechen-Drag**: LMB in Raumflaeche halten und Polygon verschieben; danach Vertex einzeln ziehen, Ecke einfuegen/loeschen (keine Kollision).
5. **Clipping-Sanity**: waehrend `lichtflackern` + GIF-Room-Animationen keine Zeichnung ausserhalb des Zielraums.

## Notes
- Area-Drag setzt kurzzeitige Click-Suppression nach Move ein, damit Drag-Ende nicht als ungewollter Selektionsklick doppelt feuert.
- Ship-Polygoneditor bleibt unveraendert; Hotfix betrifft den Raum-Polygoneditor.
