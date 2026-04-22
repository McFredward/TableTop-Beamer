# TableTop Beamer — Design System

> A design system derived from **TableTop Beamer**, a tabletop projector overlay controller that enhances board games with immersive room animations (fire, alarms, space travel, malfunctions, etc.) — projected straight onto the board from a ceiling-mounted short-throw projector.

## Sources

This system was reverse-engineered from the project's public code and assets. Nothing is assumed to be on the reader's machine.

| Source | Location |
|---|---|
| Main repo | [github.com/McFredward/tt-beamer](https://github.com/McFredward/tt-beamer) (private at time of build — `master` branch) |
| Canonical CSS | `src/styles.css` inside repo — the `:root` token block is the sole source of truth for color |
| Canonical markup | `index.html` at repo root — control panel / dashboard / settings layout |
| Fonts | Google Fonts: **Barlow Condensed** (400, 600, 700) + **Space Grotesk** (400, 500, 700) |
| Imagery | `readme-assets/` in repo — system diagram + GIF captures of align mode, polygon editing, and output |
| Built-in animation assets | `resources/animations/*.gif` (fire, malfunction, burst — real GIFs copied into `assets/`) |

No Figma exists. The repo is the design system.

---

## Product Context

**One product, two surfaces, one user.** The whole thing runs off a single Node server (`server.mjs`) serving two views from the same bundle:

1. **Control UI** (`/`) — the phone/tablet dashboard the game operator holds in their hand. Half the time it's a glanceable trigger pad during play; the other half it's a dense settings workspace for pre-game setup (painting rooms, wiring animations, calibrating the projector).
2. **Output view** (`/output`) — fullscreen, chrome-less, rendered on a Raspberry Pi driving the projector. Dark room, long viewing distance, warped via `matrix3d()` to projection-map onto the physical board.

The same component tree drives both. Body gets `data-output-role="final-output"` and the dashboard + board image vanish, leaving only the FX canvas and room overlay (the things that should be projected).

This dual nature shapes every design decision:
- **Dark by default, unapologetically.** Anything brighter than the projected output would wash out the game.
- **Chunky touch targets** — 2.6–3.2rem mins — because the operator's hands are full of dice and minis.
- **One accent color**, not a palette. The mint-teal `#37c0a1` ("glow") is the only thing that's allowed to draw attention; everything else is slate/navy.
- **Phase-tagged code.** Comments reference Phase 13, Phase 18, etc. — the design system should expose the current-phase language, not invent new component names.

---

## Content Fundamentals

**Tone.** Practical, slightly gamer-hobbyist. The operator is a trusted adult hobbyist, not a novice. Copy is terse, imperative where it needs to act, declarative where it reports state. It's not trying to be cute.

**Voice.**
- **Imperative for actions:** *"Start room animation", "Clear All", "Reset all", "Create & switch to Edit"*.
- **Declarative for state:** *"Select a room on the board", "Active board: -", "Zoom: 100%", "Mobile focus: Control"*.
- **Parenthetical asides** are used for hints to power users: *"Stagger delay (cluster only)"*, *"Board name (only used when importing a picture)"*.
- Never addresses the user as "you" in the UI. Speaks about the system's state, not to the person.
- **No marketing copy.** No "unlock", "supercharge", "elevate". Even the README says *"Expect bugs 🕷️."*

**Casing.** Sentence case everywhere — headings, buttons, labels. *"Room animation"*, not *"Room Animation"*. The only ALL-CAPS is the `.eyebrow` microtypography above H1s (rendered via `text-transform: uppercase`).

**Terminology — the canonical glossary.** Use these exact words:
- **Room** — a polygon on the board that hosts animations.
- **Play Area** — the whole board polygon; the inside/outside boundary for atmospheric effects.
- **Cluster** — a group of rooms animated together.
- **Animation** — the unit; always categorized as *Room*, *Inside*, or *Outside*.
- **Effect / GIF / Video** — the three animation types. *Effect* means coded (JS-drawn on canvas), *GIF* and *Video* are assets.
- **Quick Mode** — the fast-trigger control at the top of the dashboard.
- **Align Mode** — the projection-mapping calibration UI.
- **Live Editor** — the per-running-animation tweak panel.
- **Dashboard** vs. **Settings** — the two primary views. Never "screens" or "tabs".
- **Board** — the physical + virtual representation; has an image, rooms, clusters, play areas, profiles.

**Emoji.** Repo uses emoji sparingly in prose (the README's lone 🕷️). **Never in UI copy.** No emoji in buttons, labels, status lines.

**Punctuation.**
- Em-dash (—) for asides in labels/hints.
- Ellipses (…) for "opens further UI" menu items: *"Save profile…", "Load profile…"*.
- `x` suffix for multipliers: *"1.00x"* (speed). No space.
- `%` suffix for percentages, no space: *"100%", "70%"*.
- Units after the number with no space: *"140ms"*, *"18s"* — tabular-nums enabled.

**Examples — lift these patterns, don't invent new ones:**
- Button: **"Create & switch to Edit"** (the `&` is repo-native; not "and").
- Status line: **"Status: ready"** (label, colon, one-word state).
- Empty state: **"Select a room on the board"** (imperative, no punctuation).
- Disabled CTA label: **"Apply changes (no pending edits)"** — parenthetical explains *why*, doesn't nag.

---

## Visual Foundations

**Background.** A single radial gradient on `body`: `radial-gradient(160% 180% at 20% 0%, #1a2538 0%, #090d14 45%)`. Top-left glow, settling into near-black. In output-role mode, this collapses to solid `#000`. **Never a flat color; never a linear gradient on the root.**

**Panels.** Every information container is the same thing:
```css
padding: 1rem;
background: linear-gradient(180deg, rgba(19,26,39,.85), rgba(15,21,33,.85));
border: 1px solid rgba(138,158,181,.18);
border-radius: 0.75rem;
backdrop-filter: blur(8px);
box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
```
Top-lit, translucent, with a subtle inner top highlight. **The backdrop-blur is non-negotiable** — the panels sit over the board image in output-role inspection, and the blur is what reads as "UI layer".

**The one accent — mint-teal `#37c0a1` ("glow").** This is the only saturated color in the system. Reserved for:
- The `.eyebrow` microtype above H1.
- Focus rings (`outline: 2px solid var(--glow)`).
- Active toggle states (`button.active`, `.quick-animation-pill.is-selected`).
- Glow halos (`box-shadow: 0 0 1rem rgba(55,192,161,.35)`).
- Align Mode's blinking indicator dot (pulsing opacity, 1.5s ease).
- The slider thumb fill.

**Danger.** Desaturated brick-red `#d14f4f`. Used for destructive buttons (`.danger`), with an `.is-armed` second-press state that darkens the bg and thickens the glow. Never paired with `--glow` in the same button.

**Imagery.** Board photos are warm, saturated, dark — typically a printed fantasy/sci-fi game board photographed top-down under projector light. Applied CSS: `filter: saturate(0.95) contrast(1.04)`. They always sit behind the UI, never in the UI. GIF animation assets are particle-heavy, orange/red (fire, burst, malfunction), designed to pop on dark wood-toned board photos. **Do not use stock photography. Do not use illustrations.** If a real board asset isn't available, use a dark neutral placeholder.

**Typography.**
- **Barlow Condensed** (display) — all headings + eyebrows + room-label SVG text. Condensed width is deliberate — controls have to fit a lot of text in narrow sidebar panels.
- **Space Grotesk** (body) — everything else. Body text, buttons, labels, status lines.
- Tracking: headings get `+0.04em`, eyebrows get `+0.04em` plus uppercase. Body gets default.
- Tabular nums are applied on `label span` (value display in sliders) — critical for "1.00x" and "140ms" to line up.

**Spacing rhythm.** Internal panel gap is `0.75rem`; dashboard gap between panels is `1rem`; control-panel padding is `1rem` on desktop, `0.72rem` on mobile. The grid is generous — **whitespace is the only visual separator** between neighboring panels, since borders are nearly invisible.

**Borders.** Always `1px solid` with rgba alpha. Low-contrast (`rgba(138,158,181,0.18)` most common). The only high-contrast borders are accent/danger states.

**Corner radii — the five-step scale:**
- `0.45rem` — inputs, small buttons inside popovers.
- `0.55rem` — default button, panel child.
- `0.75rem` — panel container.
- `1rem` — stage frame (the projection canvas).
- `999px` — pills, badges, the align-mode blinking dot.

**Shadows.**
- **Panels**: only a 1px inner top highlight — they don't float, they're translucent.
- **Stage**: `0 1rem 2.2rem rgba(0,0,0,0.45)` plus inner 1px white stroke — this is the only element that truly elevates.
- **Glow halos** on accent states — soft (0.6rem), medium (1rem), strong (1.4rem).
- **Popovers/toasts**: `0 8px 24px rgba(0,0,0,0.5)` plus a 1px white outline.

**Hover.**
- Buttons: `translateY(-1px)`, border brightens to `rgba(88,221,191,0.7)`, soft glow appears.
- Pills: border flips to `--glow`, text to `--text`, **no translate** (pills scroll horizontally; movement would interfere).
- Room polygons: fill intensifies (`.05 → .22`), stroke brightens.
- Inputs don't hover; they only focus.

**Press / Active.**
- Buttons: `.active` state uses `box-shadow: inset 0 0 0 1px rgba(93,230,199,0.6), 0 0 1rem rgba(93,230,199,0.35)` — a crisp green ring plus halo. No press-shrink.
- Dangerous actions have an intermediate `.is-armed` state (second-press confirmation).
- Slider thumb: hover scales `1.15` and deepens the glow; no active scale.

**Focus.** Always visible: `outline: 2px solid var(--glow); outline-offset: 2px;`. Range inputs get a 4px border-radius on the outline to match the track.

**Transitions.** All `120ms ease` or `200ms ease`. Two named:
- `--t-fast: 120ms ease` — small state flips (selected pill, hover fills).
- `--t-medium: 200ms ease` — buttons, panel transforms.
- `--t-slow: 500ms ease` — loading-overlay fade only.

**Keyframe animations** — three, all loopy:
- `loading-spin` — 0.8s linear infinite, for the loading spinner.
- `align-dot-blink` — 1.5s ease-in-out infinite, for the align-mode indicator.
- `align-glow-pulse` — 2.5s ease-in-out infinite, the breathing-green pulse on the active Align Mode toggle.

No bouncy springs. No rotate-into-place entrances. **Atmospheric, not theatrical.**

**Transparency & blur.** Blur is used on panels (`blur(8px)`), buttons (`blur(4px)`), apply-config bar (`blur(4px)`), context menus (`blur(8px)`). Everywhere there's a blur, there's also `-webkit-backdrop-filter`. The UI is explicitly a layer over the board — blur reinforces that.

**Layout rules.**
- Desktop: two-column grid, `minmax(0,1fr) 390px`. The 390px right sidebar is the dashboard.
- `<=1080px`: sidebar shrinks to 340, then 300.
- `<=920px` portrait: stacks — projection on top (215px min, 42vh), dashboard flows below.
- `<=920px` landscape: side-by-side again (phone in landscape = desktop-like).
- Stage uses a fixed aspect ratio `7978 / 5456` (the Nemesis board image's ratio). Everything inside is placed absolute within.

**Fixed elements.** The **Apply/Discard bar** (global unsaved-state warning) sits sticky at the top of the control panel, always visible. The **align-mode indicator** is sticky directly above it when active. On mobile portrait, the primary view switch + zone switch become sticky inside the dashboard.

---

## Iconography

**There is no icon system.** This is one of the design system's defining constraints.

**What the repo actually uses:**
- **Zero icon fonts, zero SVG icon sprites, zero icon libraries.** No Lucide, Heroicons, Feather — none imported.
- **Unicode for the rare glyph.** The context menu's add/remove-line items use `↕` and `↔`. The Align Mode rotate handles are labeled `↻`. `ESC` and `Ctrl+Z` are written as literal text.
- **Emoji once** in the README prose (🕷️). **Not in UI.**
- **Color and position carry meaning**, not glyphs. The align mode indicator is a pulsing colored dot. The "Default animation" state is indicated by a checkbox. The "is armed" danger state is a border-color + bg-color change.

**What that means for any new UI built with this system:**
- **Default to text labels.** Buttons say what they do — *"Create room"*, not *+ Room*.
- If a glyph is truly necessary, use **Unicode arrows / geometric shapes** (↕ ↔ ↻ ✕ ● ▶ ◼). Set them in the body font (Space Grotesk), not a display font.
- **If you must add a proper icon set,** pair Lucide (stroke-based, 1.5px, mint-teal on active, `currentColor` otherwise) at 18–20px — it matches the restrained, utilitarian vibe. **Flag this as a substitution in any doc that ships with it.**
- **Never draw illustrative SVGs** (the skill-level illustration in this codebase is a single `system-diagram.png` for the README — not a UI asset).

The logo — there **is no brand logo**. The product identifies itself via the `.eyebrow + h1` combo:

```
TABLETOP BEAMER        ← eyebrow, uppercase, mint, 0.85rem
Atmosphere Controller  ← h1, Barlow Condensed 700, 1.85rem
```

Treat that lockup as the logo. It's stored as a reusable component in `ui_kits/control/` as `Wordmark.jsx`.

---

## Index

Root files:
- `README.md` (this file) — start here.
- `SKILL.md` — machine-readable manifest for Claude Code / skill invocation.
- `colors_and_type.css` — all CSS vars + semantic type classes. Import this in any artifact you build.

Folders:
- `assets/` — real imagery copied out of the repo.
  - `system-diagram.png` — the architecture illustration from the repo README.
  - `output-demo.gif`, `polygons-demo.gif`, `start-animations-demo.gif` — in-app captures.
  - `anim-fire.gif`, `anim-burst.gif`, `anim-malfunction.gif` — three of the built-in animation GIFs, for use as realistic preview content on mocked boards.
- `preview/` — Design System tab cards. One concept per file.
- `ui_kits/control/` — the Control UI + Output view pixel recreations.
  - `index.html` — interactive clickthrough of the full dashboard.
  - `Components.jsx` — Wordmark, Panel, Button, ViewSwitch, Pills, Tabs, Range, Checkbox, Select, TextInput, ScopeBadge, RunningItem, AlignIndicator, ToastStack.
  - `Stage.jsx` — board frame + polygon overlay with selection / active / align-mode states.
  - `styles.css` — pairs with the root `colors_and_type.css`.
- `SKILL.md` — Claude Skills–compatible front matter so this folder can be dropped into a skill directory as-is.

No slide templates — none existed in source.

---

## Caveats & Known Gaps

- **Fonts are Google-hosted**, matching repo. If offline delivery is needed, download the Barlow Condensed / Space Grotesk TTF files.
- **No Figma** was provided; the repo code + live CSS is the single source of truth. Every color, radius, shadow, and transition here was lifted from `src/styles.css`.
- **No real icons exist** in the product. If you add icons, flag the substitution.
- **Only one board-game theme is shipped in the repo** (Nemesis). The system diagram and animation GIFs are sci-fi/horror-flavored. If used for a non-sci-fi game, the GIFs should be swapped.
- **There is no brand logo** — use the eyebrow + H1 lockup instead.

## Iterate with me

**Which of the following would sharpen this system the most?**
1. A **font pack** (actual TTFs in `fonts/`) so the system works offline.
2. A **second board theme** besides Nemesis — pick one and I'll mock the full flow.
3. **Slide templates** for a talk / product explainer (the system has the visual DNA for a dark, sci-fi-flavored deck — but I'd want a brief first).
4. A **Lucide icon layer** formally adopted and documented, with a short glyph dictionary for the most common product actions.
5. Deeper **Output-view** recreation — the fullscreen projector view, warped via `matrix3d()`, with live align-grid handles.

Tell me which direction and I'll push on it.
