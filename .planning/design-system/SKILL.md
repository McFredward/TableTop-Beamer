---
name: tt-beamer-design
description: Use this skill to generate well-branded interfaces and assets for TableTop Beamer, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick map

- `colors_and_type.css` — drop-in foundations (color vars, type scale, spacing, radii, shadows, timing).
- `fonts/` — Barlow Condensed (display) + Space Grotesk (body). Both loaded via `@font-face`.
- `assets/` — the three built-in animation GIFs (`anim-fire`, `anim-burst`, `anim-malfunction`) plus two sample board photos.
- `ui_kits/control/` — interactive recreation of the Atmosphere Controller dashboard. Lift components from `Components.jsx` / `Stage.jsx`; ship with `styles.css`.
- `preview/` — atomic cards the Design System tab renders. Useful reference for every token in isolation.

## When in doubt

- Dark UI. Translucent panels with `backdrop-filter: blur(8px)`. Mint accent `#37C0A1` for the primary action, desaturated red `#D14F4F` for destructive. No gradients beyond the subtle panel/background washes already in the system.
- Copy is short, imperative, plain. No emoji, no marketing voice.
- Minimum 44px hit targets. Sliders and buttons are physically chunky — this is a table-side remote used under dim light.
