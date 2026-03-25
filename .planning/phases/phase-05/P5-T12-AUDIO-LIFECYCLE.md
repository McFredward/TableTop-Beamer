# P5-T12 Audio Lifecycle Guard (Output-Rollenbindung)

- `control`-Views bleiben stumm, auch wenn Audio-Mapping und globale Audio-Settings aktiv sind.
- `final-output` spielt Audio nur waehrend laufender Animationen.
- `stop-animation` und `clear-all` stoppen Audio sofort.
- Reconnect/Live-Snapshot erzwingt Guard erneut (keine Audio-Leaks in `control`).
