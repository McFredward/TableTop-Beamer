# Phase 28 — Cross-cutting UX & State Polish — BACKLOG

Source: User-Test-Feedback nach Phase-27-Closure (2026-05-04). Verbatim
gesammelt vor Beginn der Discuss-Phase.

## B1 — Per-board Align-Profil-Memory

> Die Profile im Align Mode sind per board — aber wenn man das board
> switched bleibt das aktuell Profil erhalten, stattdessen sollte es
> per board sich merken was das zuletzt genutzte Profil war und das
> dann immer laden, wenn ein board geswitched wurde.

Heutiges Verhalten: Profile werden bereits per board gespeichert
(`config/boards/<id>.json` oder per-board projection-mapping namespace
in localStorage `tt-beamer.projection-mapping-v2`). Aber das aktuell
geladene Profil hängt am Browser-Zustand und switched nicht mit dem Board.

Erwartetes Verhalten: Beim Board-Switch soll der Client automatisch
das zuletzt für dieses Board verwendete Profil laden — entweder das
zuletzt gespeicherte oder das zuletzt explizit geladene. Wenn das
Board zum ersten Mal aktiv wird, fällt der Client auf den Default
zurück.

## B2 — Board-Switch save-gate (Align-Dirty-Block)

> Ähnlich wie bei unsaved changes im align-mode in /output/ verhindert
> wird, dass man den align mode verlässt soll auch verhindert werden,
> das man das board switchen kann (auch mit einem entsprechenden hinweis
> dran — so lange bis die Änderungen verworfen oder gespeichert wurden.

Heutiges Verhalten: Phase-27-B5 sperrt den Align-Mode-Toggle solange
`session.snapshot.alignModeDirtyOnOutput === true` ist. Board-Switch
ist davon nicht betroffen.

Erwartetes Verhalten: Board-Switch (Dropdown / Quick-Switch) soll
ebenfalls disabled sein und denselben Hint zeigen, solange Align-Dirty
auf /output/ aktiv ist.

## B3 — Asset-Upload/Delete Dirty-Flag-Hygiene

> Beim Upload und Delete von gifs/mp4s soll kein dirty flag entstehen,
> bzw. nur dann wenn für die jeweilige Animation dann das neue im
> Dropdown ausgewählt wurde und sich durch den Upload/Deletion die
> Animation selber verändert hat.

Heutiges Verhalten: Asset-Upload/Delete triggert das Dirty-Flag-System
unabhängig davon, ob die hochgeladenen/gelöschten Bytes von einer
aktiven Dropdown-Auswahl referenziert sind.

Erwartetes Verhalten: Dirty-Flag entsteht nur, wenn die effektiv
ausgewählte Animation sich tatsächlich verändert hat — sprich, wenn
das hochgeladene/gelöschte Asset Teil der aktuell selektierten Auswahl
ist und der Asset-Ref-Wechsel die rendered Animation verändert.

## B4 — Custom Asset-Delete-Modal

> löschen Pop-Up bei gif/mp4s nicht über das browser Pop-Up, sondern
> ein eigenes im selben Steal wie das Pop-Up bei der Löschung vom
> board selber.

Heutiges Verhalten: GIF/MP4-Delete verwendet `window.confirm()`
(Browser-Native-Pop-Up).

Erwartetes Verhalten: Eigenes Modal-Dialog im selben Stil/Token-Set
wie der Board-Delete-Modal (Glassmorphism-Panel, primary/destructive
buttons, Esc/Click-outside-to-cancel).

## B5 — Asset-Cache-Invalidierung bei Re-Upload mit gleichem Namen

> Wenn ich ein gif/video lösche und dann eins mit dem selben namen wie
> das alte wieder neu hochladen, wird die alte Animation abgespielt,
> statt die neue — wird es über Namen irgendwo gecached? Sollte immer
> das aktuellste nutzen. Schau da mal rein was das verursacht und
> behebe es.

Heutiges Verhalten: Re-Upload mit identischem Dateinamen führt zu
veralteter Wiedergabe. Vermutete Ursachen (zu prüfen): Browser-HTTP-
Cache auf dem Asset-Pfad, In-Memory-`Image`/`HTMLVideoElement`-Reuse-Cache
in `runtime-gif-playback` o. ä., oder Asset-Hash-Stripping beim Save.

Erwartetes Verhalten: Sofort nach Re-Upload zeigt jede aktive
Animation die neuen Bytes — egal ob /output/ neu lädt, das Dashboard
neu lädt oder beides nicht.

## B6 — Diagnostic-Overlay Cross-Client-Sync + Topbar-Integration

> "Show diagnostic overlay" soll sich auf alle clients insbesondere
> auch /output/ auswirken und dort direkt angezeigt bzw. versteckt
> werden. Im Dashboard soll es in die UI ganz oben integriert werden,
> aktuell überlagert es etwas das logo und den Titel des Programms
> "TableTop Beamer".

Heutiges Verhalten: Toggle wirkt nur lokal (kein cross-client
broadcast). Im Dashboard rendert das Overlay als floating-Box, die
das Logo + den Titel überlagert.

Erwartetes Verhalten:
- Toggle-Mutation propagiert via `global-config-update` an alle
  Clients (Dashboard + Settings + /output/).
- Auf /output/ erscheint das Overlay direkt sichtbar/versteckt.
- Im Dashboard wird das Overlay in die Topbar integriert (oder direkt
  unterhalb der Topbar verankert), so dass es das Logo + den Titel
  nicht mehr überlagert.
