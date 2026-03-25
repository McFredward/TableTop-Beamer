# P4-T41 Mini-Hotfix Regression (Plan 4-5b)

## Scope
- Persist-on-change fuer relevante Audio-/Sound-Mapping-UI-Handler.
- Deterministischer Direkt-Reload unmittelbar nach Aenderung.
- Kurzprotokoll fuer Positiv- und Fehlpfad (LocalStorage-Write).

## Automated Checks

### Syntax Gate
```bash
node --check src/app.js
```

Result: PASS.

### Feature Presence Gate (Static)
- Persist-on-change Hook fuer `audio.enabled`: vorhanden (`audioEnabledInput` -> `persistRuntimeSoundSettingsChange`).
- Persist-on-change Hook fuer `audio.volume`: vorhanden (`audioVolumeInput` -> `persistRuntimeSoundSettingsChange`).
- Persist-on-change Hook fuer `animationSoundMap`: vorhanden (`audioMappingSoundSelect` -> `persistRuntimeSoundSettingsChange`).
- Reload liest direkt den zuletzt geschriebenen Runtime-Sound-Stand: abgesichert durch sofortige Persistenz inkl. Mapping-Normalisierung (`syncAudioMappingPanel`, `previousMapped !== mapped`).

Result: PASS.

## Acceptance Mapping

| Acceptance | Nachweis |
| --- | --- |
| Audio-Persist-on-Change-Test | `audioEnabledInput(change)`, `audioVolumeInput(input)` und `audioMappingSoundSelect(change)` rufen sofort `persistRuntimeSoundSettingsChange(...)` auf (`src/app.js`). |
| Direkt-Reload-Determinismus-Test | Mapping-Normalisierung in `syncAudioMappingPanel()` persistiert jetzt bei Korrektur (`previousMapped !== mapped`), sodass Direkt-Reload keinen Zwischenstand zeigt (`src/app.js`). |
| Fehlpfad-Hinweis bei LocalStorage-Write-Fehler | Persist-Helper schreibt bei `persistBoardProfiles() === false` einen klaren Statushinweis in `triggerFeedback` (`src/app.js`). |

## Ergebnis

- Hotfix schliesst den Verify-4-5-Rest-Gap fuer Audio/Sound-Mapping.
- Persistenz passiert direkt bei jeder relevanten UI-Aenderung ohne separaten Save.
- Reload direkt nach Aenderung bleibt deterministisch, weil auch interne Mapping-Normalisierung sofort gespeichert wird.

## Manual Verify Checklist (Operator)
1. `Audio enabled` umschalten, sofort Reload: Status bleibt identisch (kein Zwischenzustand).
2. `Audio volume` aendern, sofort Reload: Prozentwert bleibt identisch.
3. `Sound-Mapping` fuer eine Animation aendern, sofort Reload: Mapping bleibt identisch.
4. Optionaler Fehlpfadtest: LocalStorage temporaer blockieren/simulieren; UI zeigt klaren Persistenzhinweis.
