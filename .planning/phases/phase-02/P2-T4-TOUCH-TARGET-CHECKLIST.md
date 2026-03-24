# P2-T4 Touch-Target Checkliste

## Ziel
Primaere mobile Controls mit robusten Touch-Zielen (>=44x44 px) und konsistenten Abstaenden.

## Gemessene Mindestgroessen (CSS-Basis)
- Standard-Button: `min-height: 2.9rem` (~46.4px bei 16px root)
- Select/Number Inputs: `min-height: 2.75rem` (~44px)
- Range-Inputs: `min-height: 2.75rem` (~44px)
- Running-Action Buttons: uebernehmen Standard-Button-Minimum

## Abstandspaare (kritische Naehe reduziert)
- Button-Grids: `gap: 0.65rem`
- Running-Action Grid: `gap: 0.62rem` (mobile), `0.4rem`+ baseline desktop
- Running-Items: erhoehte Innenabstaende (`padding: 0.62rem`, `gap: 0.48rem`)

## Safety-Hinweise
- `Clear All` ist aus der Triggerflaeche herausgeloest und im Manage-Bereich verankert.
- Kritische Aktion hat zusaetzlichen Confirm-Guard (separat in P2-T6).
