# P2-T8 Orientation-Roundtrip Protokoll

## Ziel
Portrait/Landscape-Wechsel ohne State-Verlust und ohne UI-Drift.

## Technische Guards
- Orientation-Event synchronisiert Layoutstatus und Zone-Sichtbarkeit.
- Regression-Guard `runOrientationStateRegression()` prueft auf State-Drift:
  - `boardId`
  - `selectedRoomId`
  - `uiView`
  - `dashboardZone`
  - laufende Animations-IDs

## Manuelle Roundtrip-Checks
- [ ] 10x Portrait -> Landscape -> Portrait ohne Verlust aktiver Animationen
- [ ] Dashboard/Settings-View bleibt beim Wechsel stabil
- [ ] Mobile-Fokus (`Triggern`/`Running managen`) bleibt konsistent
- [ ] Kein unbenutzbarer Zustand (versteckte Kerncontrols / uebereinanderliegende Panels)
