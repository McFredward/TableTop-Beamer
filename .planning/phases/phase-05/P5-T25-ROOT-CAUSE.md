# P5-T25 Root-Cause Analyse - First-Click Sync Drift

## Ziel
Reproduzierbar isolieren, warum Outside `mode`/`direction` und Room-Aktionen (`trigger`/`edit`/`stop`/`clear-all`) vereinzelt erst nach Mehrfachklick sichtbar synchron wurden.

## Beobachtete Symptome
- Einzelne Outside-Umschaltungen waren auf Remote-Clients erst nach erneutem Klick sichtbar.
- Room-Aktionen konnten bei schnellen Folgen kurzzeitig "zurueckspringen" oder auf anderen Clients fehlen.

## Root-Cause (Event -> Mutation -> Dedup -> Ack)

### 1) Nicht-autoritatives Snapshot-Overwrite bei jeder Mutation
- Client sendete in `emitLiveMutation(...)` immer den kompletten Runtime-Snapshot (`payload.runtime`).
- Server uebernahm in `applyLiveMutation(...)` fuer jede Mutation ungeprueft `payload.runtime` als naechsten Runtime-Stand.
- Effekt: eine spaet eintreffende Mutation mit aelterem Vollsnapshot konnte bereits bestaetigte Zwischenaenderungen wieder ueberschreiben.

### 2) Keine echte Idempotenz / kein Mutation-Dedup
- Es gab keine `mutationId` und keinen serverseitigen Processed-Cache.
- Doppelt zugestellte Frames (Reconnect/Retry/Netzjitter) konnten logisch mehrfach angewandt werden.

### 3) Ack ohne inhaltliche Bindung
- `live-ack` enthielt bisher nur den Typ (`mutationType`), aber weder `mutationId` noch `version`.
- Client konnte dadurch keine eindeutige Zuordnung "welche Mutation auf welcher Version bestaetigt" herstellen.

### 4) Ordering-Luecke fuer schnelle Toggle-Folgen
- Es gab keinen per-Client Sequencer (`clientSequence`) auf Serverseite.
- Out-of-order eingehende Events vom selben Client konnten nicht als stale erkannt/gedroppt werden.

## Reproduzierbare Fehlerfaelle (vor Hotfix)

### Fall A - Outside Direction Mehrfachklick
1. Client A toggelt `forward -> reverse`.
2. Direkt danach folgt eine zweite Mutation von A oder B mit aelterem Vollsnapshot.
3. Server uebernimmt den spaeter eintreffenden aelteren Snapshot.
4. Ergebnis: Remote-Client zeigt wieder `forward`; Operator klickt erneut (`reverse`) -> scheint erst beim zweiten Klick zu funktionieren.

### Fall B - Room Trigger/Edit Drift
1. Client A startet Room-Animation, Client B editiert kurz darauf.
2. Beide senden Vollsnapshots mit unterschiedlichen lokalen Running-Listen.
3. Letzte ankommende Vollsnapshot-Mutation gewinnt komplett, statt nur die konkrete Aktion zu mergen.
4. Ergebnis: Running-List-Divergenz oder fehlende In-place-Edit-Wirkung.

## Fix-Strategie fuer P5-T26..P5-T29
- Serverautoritatives, mutationsspezifisches Apply (kein ungeprueftes Vollsnapshot-Overwrite fuer HF2-relevante Aktionen).
- `mutationId` + serverseitiger Dedup-Cache (idempotent exactly-once effect).
- Sofort-Ack + Broadcast mit `mutationId` + `version`.
- Per-Client `clientSequence` fuer stale-drop bei out-of-order Burst-Folgen.
- Clientseitige Version-Guards fuer Session-Updates (stale snapshot ignore).

## Done-Kriterium fuer diese Analyse
- Root-Cause klar benannt, reproduzierbar beschrieben und direkt auf implementierbare Hotfix-Massnahmen gemappt.
