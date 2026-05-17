# Using TableTop Beamer

Detailed reference for the dashboard + settings UI. For installation see
[INSTALL.md](INSTALL.md); for utility scripts see [UTILITIES.md](UTILITIES.md);
for the high-level overview see the [README](../README.md).

## Contents

- [Cross-platform behavior](#cross-platform-behavior)
- [Aligning the projection](#aligning-the-projection)
  - [Profile toolbar](#profile-toolbar)
  - [Handles around the grid](#handles-around-the-grid)
  - [Right-click menu](#right-click-menu)
  - [Keyboard](#keyboard)
- [Dashboard vs. Settings](#dashboard-vs-settings)
- [Quick-Mode Tap Action](#quick-mode-tap-action)
- [Cluster pads](#cluster-pads)
- [Settings panel](#settings-panel)
- [Rooms, play areas, clusters](#rooms-play-areas-clusters)
- [Animation editor](#animation-editor)
- [Built-in animations](#built-in-animations)
- [Sounds](#sounds)
- [Custom assets (GIF / MP4 / audio)](#custom-assets-gif--mp4--audio)
- [Boards](#boards)
- [Export / Import](#export--import)
- [Data layout (where things live on disk)](#data-layout-where-things-live-on-disk)

---

## Cross-platform behavior

TT-Beamer behaves identically on Linux and Windows from the operator's
perspective. Both launchers (`./start.sh` on Linux, `start.bat` on
Windows) print the same LAN URL banner, open the same dashboard, and
both produce **zero** visible Chrome windows during operation: Linux
uses Xvfb to host the SSR Chromium tab off-screen; Windows 10/11 uses
Chromium's `headless: "new"` mode for the same effect. Process cleanup
on Ctrl+C is reliable on both platforms within 5 seconds. See
[INSTALL.md](INSTALL.md) for platform-specific install notes and the
Windows operator UAT checklist.

---

## Aligning the projection

On the dashboard, hit the **Align Mode** toggle in the topbar. A calibration
grid appears on the projector output (`/output/`); drag it until the room
outlines sit exactly on the board.

A fresh grid starts as a centered rectangle with one horizontal and one
vertical line through the middle — clean enough to see what you're doing,
easy to add more lines wherever you need finer control.

### Profile toolbar

A small **profile toolbar** floats at the top of the projected output during
align mode. Drag it by the chip on the left to move it out of the way of
whatever you're aligning — the position is remembered per profile.

| Toolbar button | What it does |
|---|---|
| `● Profile name` *(or "Unsaved")* | Shows which profile is loaded. The amber dot appears whenever there are unsaved changes. |
| **Save profile** | Saves the current grid into the loaded profile. If no profile is loaded, prompts for a name. |
| **New** | Asks for a name, then loads the default 80%-rectangle layout — perfect starting point for a new alignment. |
| **Load profile…** | Pick a previously saved profile for the current board. |
| **Discard** | Reverts every unsaved change. No confirm modal — quick to redo. |

### Handles around the grid

| Handle / gesture | Visual | What it does |
|---|---|---|
| **Intersection** | Teal circle on every line crossing | Drag a single point freely. Adjacent areas stretch around it. |
| **Line** | The line itself, between intersections | Drag to move that one line; neighbouring lines stay fixed, the bands between them stretch. |
| **Empty area** | — | Click+drag pans the whole grid as a unit (board translation). |
| **Rotate** | Round 🟠 button outside each corner | Rotates the whole grid around its centre. |
| **Scale** | Square teal button further out at each corner | Drags toward / away from the centre to scale the whole grid proportionally. |
| **Squish bar** | Slim teal bar on each outer side | Compresses or stretches the grid along that axis with the **opposite side anchored** — the board doesn't translate, only the area between. |

### Right-click menu

The grid is defined by lines (horizontal + vertical); intersections are just
where lines cross. The right-click menu reflects that:

| Right-click on… | You get |
|---|---|
| Empty grid area | *Add horizontal line here* + *Add vertical line here* |
| A line (between intersections) | *Delete this line* + *Add line through this point* |
| An intersection | *Delete vertical line* + *Delete horizontal line* + *Add line through this point* |

The four outer lines (the bounding rectangle) are immutable — they're never
deletable, no matter where you click.

### Keyboard

| Key | Action |
|---|---|
| `Ctrl+Z` / `Cmd+Z` | Undo last grid action |
| `Esc` | Same as **Discard** — revert unsaved changes (does **not** clear the loaded profile) |

---

## Dashboard vs. Settings

The control UI has two top-level views; toggle with the big **Dashboard /
Settings** switch.

| View | When you use it | What's there |
|---|---|---|
| **Dashboard** | During the game | Trigger animations, manage what's running, clear all |
| **Settings** | Before the game | Paint room outlines, set up animations, configure boards |

---

## Quick-Mode Tap Action

A small segmented control above the trigger grid governs what a single tap
does:

| Mode | Behavior |
|---|---|
| **Toggle** *(default)* | First tap fires the armed animation, second tap stops it. |
| **Clear** | Tapping a room stops every animation in that room. |
| **Select** | Picks the animation to fire next without triggering it. |

When the armed animation is the **Solid color** effect, an inline color picker
appears in the panel so you can change the colour without leaving the
dashboard.

---

## Cluster pads

A column of mini-render-surfaces sits to the **left of the board**, labelled
**Cluster**. Each pad is a tiny "fake room" that:

- Plays the live animation of its cluster inside it (so you can see at a
  glance what's running on each cluster).
- Reacts to taps using the same Tap-Action mode as real rooms.
- Stacks multiple animations like a regular room — fire + scanning + light
  flicker can all run on one cluster simultaneously.
- Scrolls if you have more clusters than fit, with touch-momentum on mobile.

The pads are dashboard-only and not visible in `/output`.

---

## Settings panel

Settings has three subtabs:

| Subtab | Owns |
|---|---|
| **Board** | Rooms, polygons, play areas, clusters, board catalog, zoom, per-board export / import |
| **Animations** | The full-page animation editor |
| **System** | Global animation-speed multiplier, audio enable + master volume, performance settings |

---

## Rooms, play areas, clusters

| Concept | What it is | When to use |
|---|---|---|
| **Room** | A polygon on the board hosting animations | Any indoor zone you want to flash, fill, or animate |
| **Play Area** | The region the board itself occupies | Defines what's "inside" vs "outside" for backdrop FX (space, sandstorm) |
| **Cluster** | A named group of rooms | Trigger many rooms at once with one tap |

In **Settings → Board**:

- **Create a room** — type a name, click *Create room*. A small hexagon appears.
- **Edit polygon** — drag the **mint vertex handles**. Double-click an
  **edge midpoint** (gold dot) to insert a vertex. Select a vertex and press
  `Delete` to remove it. The active vertex turns red.
- **Move** — drag inside the polygon.
- **Copy / Paste** — `Ctrl+C` / `Ctrl+V`. Useful for hex grids.
- **Freeze** — lock icon disables drag so you can't accidentally move it
  mid-game.
- **Undo / Redo** — `Ctrl+Z` / `Ctrl+Shift+Z` works across all polygon edits.

**Play Areas** have their own panel under *Settings → Board*:

- **+ Add Play Area** — drops a new area at the default ship outline; edit
  its polygon afterwards via the vertex / edge controls.
- **Rename selected** — renames the active play area.
- **Delete selected** — removes the active play area (one always remains).

Room labels scale with both the polygon-handle slider and the polygon's own
size, so tiny rooms get tiny labels and large rooms don't blow up.

---

## Animation editor

Open it from the **+** button in any animation panel, or from the
*Settings → Animations* subtab. The editor is a single full-page library
scoped by tab:

| Tab | Where the animation plays |
|---|---|
| **Room** | Inside a specific room polygon |
| **Inside** | Inside the play area (board-wide) |
| **Outside** | Outside the play area (backdrop) |

Each animation definition exposes:

- **Type** — `Effect` (built-in coded), `GIF`, or `Video` (MP4)
- **Source** — built-in name, or a file under `resources/`
- **Sound** — event sound that plays on start (per-definition)
- **Intensity / Speed / Opacity** — per-type tweakable ranges
- **Loop until stopped** — for one-shot effects you want to hold
- **Transform defaults** *(Room only)* — rotation, stretch-to-polygon,
  width / height scale, X / Y offset
- **Color** *(Solid color effect)* — colour swatch picked once at edit time
  (and overridable live from the dashboard panel)
- **Break solid color** *(Hull Flicker / Power Outage)* — when paired with
  a Solid color animation in the same room, the room goes dark during the
  effect's dark phase instead of staying lit underneath.

Editor topbar controls:

- **+ Add** — creates a new animation in the active scope.
- **📋 Copy from another board** — pulls every animation from a chosen
  source board into the current one (skips duplicates by name).
- **Search** — filters the list as you type.
- **Apply / Discard** — Apply saves to the server and pushes to all
  connected clients. Discard reverts.

> Newly image-imported boards start with **no animations**. Use *Copy from
> another board* or **+ Add** to build the library.

**Reorder via drag-and-drop:** grab any row in the library list, drag up
or down, drop where you want it. The new order persists to the server
and propagates to the Tap-Action picker + Dashboard global buttons
immediately.

---

## Built-in animations

A starter library ships with each pre-shipped board (and is available to
copy into your own boards):

| Name | Engine | Scope |
|---|---|---|
| **Outside Space** | Coded (parallax stars) | Outside |
| **Outside Sandstorm** | MP4 | Outside |
| **Hull Flicker** | Coded | Inside / Room |
| **Intruder Alert** *(used as "Alarm" in rooms)* | Coded | Inside / Room |
| **Power Outage** | Coded | Inside |
| **Scanning** | Coded | Room |
| **Solid Color** | Coded | Room |
| **Slime** | GIF | Room |
| **Malfunction** | GIF | Room |
| **Fire** | GIF | Room |

Add your own by uploading GIFs / MP4s in the editor — see below.

---

## Sounds

Attach a sound to any animation via the *Sound* dropdown in its editor.
Per-animation volume is in the Live Editor (or as a default in the Room
editor). Global audio enable + master volume lives in **Settings → System**.

---

## Custom assets (GIF / MP4 / audio)

Upload your own GIFs, MP4 loops, and audio files directly from the
animation editor's source picker — they land under `resources/animations/`
or `resources/sounds/` and become available for every board.

---

## Boards

The **Board** dropdown at the top of *Settings → Board* switches between
boards. Each board has its own:

- Rooms, play areas, clusters
- Animation library (Room / Inside / Outside)
- Sound assignments
- Align-mode calibration profiles
- Default-animation set (auto-started on server boot)

**Importing** a new board:

| Method | When to use |
|---|---|
| **Package (`.zip`)** | A board exported from another TT-Beamer instance — image, animations, calibration, all bundled. Just drop it in. |
| **Image** (JPG / PNG / WEBP) | Starting from scratch with a board photo. The server registers a board with the image as the background; you paint rooms on it yourself. |

**Deleting** a board removes:

- The board JSON
- The board's image (if it lives under `/config/boards/assets/`)
- Any per-board projection-mapping calibration profiles

Shared media — animation GIFs, MP4s, sounds — is *not* deleted, since
other boards may still reference it.

---

## Export / Import

**Export this board** wraps everything needed to reproduce a board
(definition, animation library, referenced GIFs / MP4s / sounds,
calibration profiles, board image) into a single `.zip`.

**Import board package** drops a `.zip` back in. A board with the same id
is overwritten — use the **Rename** field on import to land the package
as a sibling instead.

---

## Data layout (where things live on disk)

Each board's full state lives in **one file**:
`config/boards/<board-id>.json`.

```
config/
├── boards/
│   ├── <board-id>.json             # one file = one board (everything per-board)
│   └── assets/                     # board images
├── global-defaults.json            # truly-global state (audio, animation speed)
└── projection-profiles.json        # saved alignment grids, keyed by board (local-only)

resources/
├── animations/                     # shared GIFs + MP4s
└── sounds/                         # shared audio files
```

Deleting a board removes only its entry under `config/boards/`. Shared
media in `/resources/` is left alone.

> `config/projection-profiles.json` is **local-only** (in `.gitignore`) —
> calibration is per-install. Saving a profile in align mode writes to
> this file on your server.
