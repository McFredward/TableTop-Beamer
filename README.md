<div align="center">

<img src="readme-assets/tt-beamer-logo.svg" width="96" height="96" alt="TableTop Beamer logo" />

# TableTop Beamer

**Phone-controlled atmospheric projection mapping for tabletop board games.**

A short-throw ceiling projector beams animations onto your board — alarms, lights,
intruders, space backdrops — and you trigger them from your phone, room by
room, in real time.

[![License: GPL v3](https://img.shields.io/badge/License-GPL_v3-blue.svg)](LICENCE)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%2F%20RPi-orange.svg)](#requirements)
[![Made with Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-0.26.x-purple.svg)](#project-status)

<br>

<table>
<tr>
  <td><video src="https://github.com/user-attachments/assets/2dbe0f3f-5305-45ef-9895-f87d07323829"></video></td>
  <td><video src="https://github.com/user-attachments/assets/f9b21f27-8330-4f6a-a1cb-ea3e045b27f1"></video></td>
</tr>
</table>

<img src="readme-assets/tt-beamer-readme.png" width="500" alt="TableTop Beamer overview" />

</div>

> [!NOTE]
> Hobby project I built for myself, not a polished commercial product. AI was
> used heavily during development. Bugs exist 🕷️ — suggestions and PRs welcome.

---

## Contents

- [What is it?](#what-is-it)
- [Highlights](#highlights)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Aligning the projection](#aligning-the-projection)
- [Using the app](#using-the-app)
  - [Dashboard](#dashboard)
  - [Quick-Mode Tap Action](#quick-mode-tap-action)
  - [Cluster pads](#cluster-pads)
  - [Settings](#settings)
  - [Rooms, play areas, clusters](#rooms-play-areas-clusters)
  - [Animation editor](#animation-editor)
  - [Built-in animations](#built-in-animations)
  - [Sounds](#sounds)
  - [Custom assets (GIF / MP4 / audio)](#custom-assets-gif--mp4--audio)
  - [Boards](#boards)
  - [Export / Import](#export--import)
- [Data layout (where things live on disk)](#data-layout-where-things-live-on-disk)
- [Optional: hardware-level cropping with `xrandr`](#optional-hardware-level-cropping-with-xrandr)
- [Performance tips](#performance-tips)
- [Known issues](#known-issues)
- [Roadmap](#roadmap)
- [Project status](#project-status)
- [License](#license)

---

## What is it?

TableTop Beamer turns a ceiling-mounted short-throw projector into an
interactive atmosphere layer for board games. You define **rooms** (polygons
painted onto the board), assign **animations** (alarms, fires, scanners,
intruders, MP4 loops…), group rooms into **clusters**, and trigger everything
from your phone during play.

Two browsers run side-by-side:

- **Control dashboard** (`/`) — on your phone or tablet. Tap rooms to fire
  effects, manage what's running, alter speed/opacity/sound on the fly.
  <div align="center">
  <img src="./readme-assets/tab_animations.gif" width="" />
  </div>
- **Output view** (`/output`) — fullscreen on a Raspberry Pi connected to the
  projector. No UI, just the rendered animations warped to fit your physical
  board.
  <div align="center">
  <img src="./readme-assets/output_mode.gif" width="" />
  </div>

Both browsers stay in sync through the server: a change made on one client
appears on every other within a frame. Multiple controllers can be connected
at once.

---

## Highlights

- 🎯 **In-browser projection mapping.** A WebGL-accelerated mesh-warp grid you
  drag, rotate, and scale until the projection sits perfectly on the physical
  board. Profiles are saved per-board on the server.
  <div align="center">
  <img src="./readme-assets/align_mode.gif" width="75%" />
  </div>
- 📱 **Mobile-first control UI.** Designed for one-thumb operation during a game.
- 🪐 **Animation editor.** Built-in coded effects, plus your own GIF / MP4 /
  audio uploads. Per-scope library (Room / Inside / Outside) with a single tab
  switcher.
  <div align="center">
  <img src="./readme-assets/edit_animations.gif" width="75%" />
  </div>
- 📋 **Copy animations between boards.** One click pulls every animation from
  another board into the current one (skipping duplicates by name) — perfect
  starting point for a freshly-imported board.
- 🧩 **Rooms, play areas, clusters.** Paint any polygonal region. Group rooms
  so one tap fires across many at once. Each cluster gets a live mini-preview
  tile next to the board on the dashboard.
  <div align="center">
  <img src="./readme-assets/edit_polygons.gif" width="75%" />
  </div>
- 🌗 **Light & dark themes.** Toggle from the topbar.
- 🔊 **Per-animation sounds** with global master volume.
- 💾 **Self-contained board packages.** Export everything (definition, animations,
  assets, calibration profiles, the board image) as a single `.zip`. Re-import
  on another machine; nothing else required.
- 🥧 **Raspberry-Pi-friendly output path.** WebGL warp displays directly on the
  output canvas — no GPU readback, runs smoothly on a Pi 4 / Pi 5.
- 📦 **Pre-shipped boards.** Nemesis (both base-game boards) and Nemesis
  Lockdown (both boards) are included with hand-crafted polygons and a starter
  animation library.

---

## Requirements

| | |
|---|---|
| 🎥 **Projector** | Short-throw, DLP, ceiling-mounted, image fully covering the table |
| 🖥️ **Output device** | Raspberry Pi 4/5 (or any Linux mini PC) connected to the projector |
| 🌐 **Server** | Any machine running Node.js 20+, reachable from the Pi and the phone |
| 📱 **Controller** | Phone / tablet / desktop with a modern browser |

**Reference setup** I use:
- Projector: BenQ TH671ST
- Ceiling mount: ONKRON projector ceiling holder
- Output device: Raspberry Pi 5 (8 GB starter kit)

> The projection doesn't have to fit the table exactly — the in-browser **Align
> Mode** can shrink and warp the image to match. If you want to crop the
> projector itself so light doesn't spill onto chairs/walls, see
> [Optional: `xrandr`](#optional-hardware-level-cropping-with-xrandr).

---

## Quick start

Clone the repo on your **server machine** and start it:

```bash
sudo apt update && sudo apt install -y nodejs npm
git clone https://github.com/McFredward/tt-beamer
cd tt-beamer
node server.mjs --host 0.0.0.0 --port 4173
```

> Windows users: install Node.js via
> [Microsoft's guide](https://learn.microsoft.com/windows/dev-environment/javascript/nodejs-on-windows),
> then run the same `node server.mjs ...` command.

Then open two URLs:

| Where | URL | What it shows |
|---|---|---|
| 📱 Phone / tablet | `http://<SERVER-IP>:4173` | Control dashboard |
| 🥧 Pi (kiosk / fullscreen) | `http://<SERVER-IP>:4173/output` | Projector output |

That's it — head to [Aligning the projection](#aligning-the-projection) to map
the image onto your physical board.

---

## Aligning the projection

On the dashboard, hit the **Align Mode** toggle in the topbar. A calibration
grid appears on the output view; drag it until the room outlines sit exactly on
the board.

| Action | What it does |
|---|---|
| 🟢 Drag intersection handle (teal circle) | Move that single point freely |
| ↕ / ↔ Drag line handle | Move a whole row / column along one axis |
| Drag outer edge / corner | Proportionally scale all inner points |
| Drag empty area | Pan the whole grid |
| 🟠 Drag rotate handle (corner) | Rotate the entire grid around its centroid |
| Right-click anywhere | Context menu: add line, remove line, save / load profile, reset |
| `Ctrl+Z` / `Cmd+Z` | Undo last grid action |
| `Esc` | Reset grid to default |
| Arrow keys | Nudge selected handle (`Shift` for larger steps) |

Calibration persists per-client in `localStorage`, and **named profiles are
stored server-side per board** — so you can switch between boards and reapply
the matching calibration with two clicks.

> The warp uses a triangulated mesh: SVG room outlines, GIFs, MP4s, and coded
> effects all stay perfectly in sync as you deform the grid. On the Pi the
> output path is WebGL-accelerated and skips the CPU readback that older
> browser projection setups need.

---

## Using the app

The control UI has two top-level views; toggle with the big **Dashboard /
Settings** switch.

| View | When you use it | What's there |
|---|---|---|
| **Dashboard** | During the game | Trigger animations, manage what's running, clear all |
| **Settings** | Before the game | Paint room outlines, set up animations, configure boards |

### Dashboard

The dashboard is split into three zones (swipe between them on mobile,
side-by-side on desktop):

- **Trigger** — grid of room / cluster / global buttons. Tap to start an
  animation. Tap again to toggle off (when Tap-Action is set to **Toggle**).
- **Manage** — list of currently-running animations. Tap one to open the
  **Live Editor** for runtime overrides: opacity, intensity, speed, sound
  volume, rotation, stretch, scale, X/Y offset. The **Default animation**
  toggle here marks an effect to auto-start whenever the server boots.
- **Control** — **Clear All** button + an *Also clear default animations*
  checkbox. By default Clear All keeps your atmospheric defaults running so
  the table never goes pitch-black mid-game.

### Quick-Mode Tap Action

A small segmented control above the trigger grid governs what a single tap
does:

| Mode | Behavior |
|---|---|
| **Toggle** *(default)* | First tap fires the armed animation, second tap stops it. |
| **Clear** | Tapping a room stops every animation in that room. |
| **Select** | Picks the animation to fire next without triggering it (useful when picking from a long library). |

When the armed animation is the **Solid color** effect, an inline color picker
appears in the panel so you can change the colour without leaving the
dashboard.

### Cluster pads

A column of mini-render-surfaces sits to the **left of the board**, labelled
**Cluster**. Each pad is a tiny "fake room" that:

- Plays the live animation of its cluster inside it (so you can see at a glance
  what's running on each cluster).
- Reacts to taps using the same Tap-Action mode as real rooms.
- Stacks multiple animations like a regular room — fire + scanning + light
  flicker can all run on one cluster simultaneously.
- Scrolls if you have more clusters than fit, with touch-momentum on mobile.

The pads are dashboard-only and not visible in `/output`.

### Settings

Settings has three subtabs:

| Subtab | Owns |
|---|---|
| **Board** | Rooms, polygons, play areas, clusters, board catalog, zoom, per-board export / import |
| **Animations** | The full-page animation editor |
| **System** | Global animation-speed multiplier, audio enable + master volume |

### Rooms, play areas, clusters

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

- **+ Add Play Area** — drops a new area at the default ship outline; edit its
  polygon afterwards via the vertex / edge controls.
- **Rename selected** — renames the active play area.
- **Delete selected** — removes the active play area (one always remains).

Room labels scale with both the polygon-handle slider and the polygon's own
size, so tiny rooms get tiny labels and large rooms don't blow up.

### Animation editor

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
- **Break solid color** *(Hull Flicker / Power Outage)* — when enabled in a
  room running alongside a solid-color animation, the solid colour is gated
  off during the effect's dark phase, so the room actually goes dark instead
  of blinking on top of a lit surface.

Editor topbar controls:

- **+ Add** — creates a new animation in the active scope.
- **📋 Copy from another board** — pulls every animation from a chosen source
  board into the current one (all three scopes at once). Skips entries whose
  name already exists on the target — safe to re-run, intended as a starting
  point for a brand-new board.
- **Search** — filters the list as you type.
- **Apply / Discard** — Apply pushes all pending edits to the server (and out
  to every connected client). Discard reloads the server-side state.

> Newly image-imported boards start with **no animations**. Use *Copy from
> another board* or **+ Add** to build the library.

### Built-in animations

A starter library ships with each pre-shipped board (and is available to copy
into your own boards):

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

### Sounds

Attach a sound to any animation via the *Sound* dropdown in its editor.
Per-animation volume is in the Live Editor (or as a default in the Room
editor). Global audio enable + master volume lives in **Settings → System**.

### Custom assets (GIF / MP4 / audio)

Upload your own GIFs, MP4 loops, and audio files directly from the animation
editor's source picker — they land under `resources/animations/` (or
`resources/sounds/`) and become available for any animation. Uploads are
de-duplicated by content hash, so re-importing a package never accumulates
copies of the same file.

### Boards

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

Shared media — animation GIFs, MP4s, sounds — is *not* deleted, since other
boards may still reference it.

### Export / Import

Export a board as a self-contained `.zip` from *Settings → Board → Export
this board*. The package contains everything needed to reproduce the board on
another machine: definition, animation library (with referenced GIFs / MP4s /
sounds), projection-mapping profiles, and the board image.

Import via *Settings → Board → Import board package*. Existing boards with the
same id are overwritten — use the optional **Rename** field on import to land
the package as a sibling instead.

> Package schema: `tt-beamer.board-package.v3`. Earlier formats are not
> supported (pre-release; no back-compat).

---

## Data layout (where things live on disk)

Everything per-board lives in **one file** — `config/boards/<board-id>.json`:

```
config/
├── boards/
│   ├── nemesis-board-a.json        # full state for one board
│   ├── nemesis-board-b.json        # (rooms, polygons, animations, FX,
│   ├── nemesis-lockdown-a.json     #  default-animations, frozen rooms,
│   ├── nemesis-lockdown-b.json     #  hitarea calibration, …)
│   └── assets/                     # board images (JPG / PNG / WEBP)
├── global-defaults.json            # truly-global state only:
│                                   #   audio, animationSpeed,
│                                   #   animationSoundMap, projectionMapping
└── projection-profiles.json        # named align-mode calibration grids,
                                    # keyed by board

resources/
├── animations/                     # shared GIFs + MP4s
└── sounds/                         # shared audio files
```

`/resources/` is the *shared* media library — animations and sounds that any
board can reference. `/config/boards/` is the per-board data. Deleting a
board never touches `/resources/`.

---

## Optional: hardware-level cropping with `xrandr`

The in-browser Align Mode is enough for content alignment on its own — but if
you want to crop the whole projector raster to your table beforehand (so light
doesn't spill onto chairs / walls), `xrandr` can do it at the display layer.
Combine with Align Mode for the final pixel-perfect placement.

> Only supported on Raspberry Pi OS with the X11 session (not Wayland).

Switch to X11:

```bash
sudo cp /etc/lightdm/lightdm.conf /etc/lightdm/lightdm.conf.bak
sudo sed -i 's/user-session=.*/user-session=rpd-x/' /etc/lightdm/lightdm.conf
sudo sed -i 's/autologin-session=.*/autologin-session=rpd-x/' /etc/lightdm/lightdm.conf
sudo systemctl restart lightdm
```

Install the bundled mapper helper:

```bash
sudo apt update
sudo apt install -y python3 python3-venv

cd ~ && git clone https://github.com/McFredward/tt-beamer
cd tt-beamer/scripts

python3 -m venv venv
./venv/bin/pip install pygame numpy
```

Run it:

```bash
~/tt-beamer/scripts/venv/bin/python map.py
```

Adjust the rectangle to match your table — drag vertices with the mouse,
fine-tune with arrow keys, **Enter** to apply, **Esc** to exit.

---

## Performance tips

- **Prefer GIF over MP4** on the Pi. MP4 decode is the heaviest path; GIFs
  drop straight into the GPU pipeline.
- **Cap concurrent room animations.** Each running animation costs a draw
  pass per frame. Default cap is 96 — adjust in *Settings → System* if needed.
- **Use a wired connection** between the Pi and the server. Wi-Fi works but
  jitter shows up as occasional frame stalls during peak traffic (live-state
  sync).
- **Match projector + board aspect roughly** so the warp doesn't have to
  squeeze too hard — a tightly-warped corner has slightly more visible
  triangulation than the rest.

---

## Known issues

- MP4 decode is heavy on Pi — prefer GIFs where possible.
- Sound for non-looped global animations is unreliable. Workaround: tick
  *Loop until stopped* and stop manually.
- Some GIF animations occasionally render on the Pi but not on the phone
  preview canvas (cosmetic — projector output is still correct).
- Bundle-import overwrites a board with the same id without warning. Use the
  *Rename* field at import time to avoid this.

---

## Roadmap

- More pre-shipped boards: `Frostpunk: The Board Game`, `Twilight Imperium IV`,
  `This War of Mine`, …
- **Computer-vision-driven automation** — train local CV models that watch the
  board state and trigger animations automatically (no manual taps).
- Per-cluster live editor (long-press a cluster pad to open it).
- Cleaner audio routing for global non-looped animations.
- Optional 409-on-collision flag for bundle-import.

---

## Project status

Hobby project I built primarily for myself. AI was used heavily during
development. Things I didn't bother polishing for a wider audience are clearly
labelled as such, and bugs will exist.

That said: it's been running reliably on my own setup for many game nights,
and the architecture is documented end-to-end in `.planning/phases/`. If you
want to fork or extend it, the planning docs are a good orientation map.

The current version is **0.26.x** — Phase 26 unified the data model so each
board's full state lives in a single JSON file (previously split between a
catalog file and a fat `global-defaults.json`).

If you have suggestions, open a
[GitHub issue](https://github.com/McFredward/tt-beamer/issues). You can also
reach me as **McFredward** on Discord.

---

## License

[GNU General Public License v3.0](LICENCE) © McFredward
