<div align="center">

<img src="readme-assets/tt-beamer-logo.svg" width="96" height="96" alt="TableTop Beamer logo" />

# TableTop Beamer

**Atmospheric projection mapping for tabletop board games.**

A short-throw ceiling projector beams animations onto your board — alarms, lights,
intruders, space backdrops — and you trigger them from your phone, room by
room, in real time.

[![License: GPL v3](https://img.shields.io/badge/License-GPL_v3-blue.svg)](LICENCE)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows%20%7C%20RPi-orange.svg)](#requirements)
[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-1.0.0-7c3aed.svg)](#project-status)
[![Click-and-run](https://img.shields.io/badge/install-double--click-0f9e75.svg)](docs/INSTALL.md)

<br>

<img src="readme-assets/tt-beamer-readme.png" width="500" alt="TableTop Beamer overview" />

</div>

> [!NOTE]
> Hobby project I built for myself, not a polished commercial product. AI was
> used heavily during development. Bugs exist 🕷️ — suggestions and PRs welcome.

> [!TIP]
> **v1.0** is the first laypeople-friendly release. Just download the repo,
> run `./start.sh` (Linux) or double-click `start.bat` (Windows) — the
> launcher installs everything itself, no Node.js / npm knowledge needed.
> See [`docs/INSTALL.md`](docs/INSTALL.md).

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
- [Optional: looping non-loop videos with `loop_video.sh`](#optional-looping-non-loop-videos-with-loop_videosh)
- [Performance tips](#performance-tips)
- [Known issues](#known-issues)
- [Roadmap](#roadmap)
- [Project status](#project-status)
- [License](#license)

---

## What is it?

TableTop Beamer turns a ceiling-mounted short-throw projector into an
interactive atmosphere layer for board games. You define <b>rooms</b>
(polygons painted onto the board), assign <b>animations</b> (alarms,
fires, scanners, intruders, MP4 loops…), group rooms into <b>clusters</b>,
and trigger everything from your phone during play.

<table>
  <tr>
    <td align="center">
      <video src="https://github.com/user-attachments/assets/2dbe0f3f-5305-45ef-9895-f87d07323829"></video>
    </td>
    <td align="center">
      <video src="https://github.com/user-attachments/assets/f9b21f27-8330-4f6a-a1cb-ea3e045b27f1"></video>
    </td>
    <td align="center">
      <img src="./readme-assets/example_board.gif" width=""/>  
    </td>
  </tr>
</table>

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

- 📦 **Pre-shipped boards.** `Nemesis` (both base-game boards) and `Nemesis
  Lockdown` (both boards) are included with hand-crafted polygons and a starter
  animation library.
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
- 🧩 **Rooms, play areas, clusters.** Paint any polygonal region. Group rooms
  so one tap fires across many at once. Each cluster gets a live mini-preview
  tile next to the board on the dashboard.
  <div align="center">
  <img src="./readme-assets/edit_polygons.gif" width="75%" />
  </div>
- 🔊 **Per-animation sounds** with global master volume.
- 💾 **Self-contained board packages.** Export everything (definition, animations,
  assets, calibration profiles, the board image) as a single `.zip`. Re-import
  on another machine; nothing else required.
- 🥧 **Raspberry-Pi-friendly output path.** WebGL warp displays directly on the
  output canvas — no GPU readback, runs smoothly on a Pi 4 / Pi 5.

---

## Requirements

| | |
|---|---|
| 🎥 **Projector** | Short-throw, DLP, ceiling-mounted |
| 🖥️ **Output device** | Raspberry Pi 4/5 (or any Linux mini PC) connected to the projector |
| 🌐 **Server** | Any 64-bit Linux (Debian/Ubuntu) or Windows 10/11 machine on the same LAN. Node.js auto-installed by the launcher. |
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

### The lazy way — click-and-run launcher (recommended)

```bash
git clone https://github.com/McFredward/TableTop-Beamer
cd TableTop-Beamer
./start.sh             # Linux
# Windows: double-click start.bat in File Explorer
```

That's it. On first run the launcher will:

1. Download a portable Node 22 LTS into `.node-portable/` (no admin needed).
2. Install Xvfb / Chromium / ffmpeg via `sudo apt` (Linux) or fetch a
   portable ffmpeg + detect system Chrome/Edge (Windows).
3. Run `npm ci` (mediasoup's prebuilt worker is fetched automatically —
   **no Visual Studio Build Tools required on Windows**).
4. Boot the server, wait for `/api/health`, and open the dashboard.

After ~2–5 minutes the console prints two URLs to open from your devices:

```
TT-Beamer is running.
  Dashboard (open on phone/tablet):  http://192.168.x.x:4173/
  Output view (open on the Pi):      http://192.168.x.x:4173/output/
```

Subsequent runs reach the browser-open step in under 30 seconds.
Full walkthrough + troubleshooting in [`docs/INSTALL.md`](docs/INSTALL.md).

<details>
<summary><b>Manual / developer setup</b></summary>

```bash
sudo apt update && sudo apt install -y xvfb chromium-browser ffmpeg \
                                       python3 build-essential
git clone https://github.com/McFredward/TableTop-Beamer
cd TableTop-Beamer
npm ci
node server.mjs
```

Server defaults: `HOST=0.0.0.0`, `PORT=4173`. Override via env vars.

</details>

Once the dashboard is up, head to [Aligning the projection](#aligning-the-projection)
to map the image onto your physical board.

---

## Aligning the projection

On the dashboard, hit the **Align Mode** toggle in the topbar. A calibration
grid appears on the projector output (`/output/`); drag it until the room
outlines sit exactly on the board.

A fresh grid starts as a centered 80% rectangle with one horizontal and one
vertical line through the middle — clean enough to see what you're doing, easy
to add more lines wherever you need finer control.

### What you'll see on `/output/`

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

### Profiles, dirty state, and multi-device safety

- Calibration profiles are saved **per board**, so switching boards reapplies
  the matching alignment with two clicks.
- While there are unsaved changes on `/output/`, the dashboard's **Align
  Mode** toggle is disabled with a small amber chip — *"Unsaved on /output/"*.
  This prevents accidentally exiting align mode from a remote device and
  losing in-progress work. Save or discard on `/output/` to re-enable the
  dashboard toggle.
- Reloads on `/output/` are safe: a mid-edit page refresh keeps the loaded
  profile, the dirty state, and all your in-progress geometry exactly as you
  left them.

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
- **Manage** — list of running animations. Tap one to open the **Live Editor**
  for runtime overrides (opacity, intensity, speed, sound volume, rotation,
  stretch, scale, offset). The **Default animation** toggle marks an effect to
  auto-start when the server boots.
- **Control** — **Clear All** button. By default it keeps your default
  animations running; tick *Also clear default animations* to stop everything.

### Quick-Mode Tap Action

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
- **Break solid color** *(Hull Flicker / Power Outage)* — when paired with a
  Solid color animation in the same room, the room goes dark during the
  effect's dark phase instead of staying lit underneath.

Editor topbar controls:

- **+ Add** — creates a new animation in the active scope.
- **📋 Copy from another board** — pulls every animation from a chosen source
  board into the current one (skips duplicates by name).
- **Search** — filters the list as you type.
- **Apply / Discard** — Apply saves to the server and pushes to all connected
  clients. Discard reverts.

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
editor's source picker — they land under `resources/animations/` or
`resources/sounds/` and become available for every board.

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

**Export this board** wraps everything needed to reproduce a board (definition,
animation library, referenced GIFs / MP4s / sounds, calibration profiles, board
image) into a single `.zip`.

**Import board package** drops a `.zip` back in. A board with the same id is
overwritten — use the **Rename** field on import to land the package as a
sibling instead.

---

## Data layout (where things live on disk)

Each board's full state lives in **one file**: `config/boards/<board-id>.json`.

```
config/
├── boards/
│   ├── <board-id>.json             # one file = one board (everything per-board)
│   └── assets/                     # board images
├── global-defaults.json            # truly-global state (audio, animation speed)
└── projection-profiles.json        # saved alignment grids, keyed by board

resources/
├── animations/                     # shared GIFs + MP4s
└── sounds/                         # shared audio files
```

Deleting a board removes only its entry under `config/boards/`. Shared media
in `/resources/` is left alone.

---

## Optional: hardware-level cropping with `xrandr`

The in-browser Align Mode is enough for content alignment on its own — but if
you want to crop the whole projector raster to your table beforehand, `xrandr` can do it at the display layer.
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

cd ~ && git clone https://github.com/McFredward/TableTop-Beamer
cd TableTop-Beamer/scripts

python3 -m venv venv
./venv/bin/pip install pygame numpy
```

Run it:

```bash
~/TableTop-Beamer/scripts/venv/bin/python scripts/projection_mapper.py
```

Adjust the rectangle to match your table — drag vertices with the mouse,
fine-tune with arrow keys, **Enter** to apply, **Esc** to exit.

---

## Optional: looping non-loop videos with `loop_video.sh`

Have an MP4 clip you'd like to use as an animation, but it doesn't loop
cleanly? `scripts/loop_video.sh` is a small `ffmpeg` wrapper that takes
any video and produces a seamlessly-looping version by cross-fading the
end back into the beginning. Drop the result into the animation editor as
a regular video animation.

Requires `ffmpeg` (already installed if you ran `./start.sh` on Linux,
or get the same portable build that `start.bat` uses on Windows).

```bash
# Basic usage — writes <input>_looped.mp4 next to the input
./scripts/loop_video.sh my_clip.mp4

# Custom output path
./scripts/loop_video.sh my_clip.mp4 my_clip_seamless.mp4

# Custom fade duration in seconds (default: auto, ≈ 1 s)
./scripts/loop_video.sh my_clip.mp4 my_clip_seamless.mp4 2
```

The script auto-detects audio and cross-fades both the video and audio
streams if present. Output drops into the same directory as the input by
default; use the second argument to override.

---

## Performance tips

- **Prefer GIF over MP4** on the Pi — MP4 decode is the heaviest path.
- **Keep `/output/` in the foreground** on the projector Pi. Chromium
  aggressively throttles background tabs, which pauses the heartbeat
  evaluator and causes spurious "lost connection" reconnect cycles.
  Fullscreen-kiosk mode on the projector display avoids this entirely.
- **The default quality preset** (`extra-high`, 1080p, 30 fps source / 60
  fps stream cap, 16 Mbit) is tuned for a Pi 5 + a 1080p projector on
  a quiet LAN. Step down to `balanced` if you see jitter.

---

## Known issues

- MP4 decode is heavier than GIF on Pi — prefer GIFs where possible.
- Sound for non-looped global animations is unreliable. Workaround: tick
  *Loop until stopped* and stop manually.
- Mediasoup currently ships **no prebuilt worker for ARM64 Windows** —
  the click-and-run launcher bails fast on ARM64 Windows with a clear
  message. AMD64 (Intel/AMD 64-bit) is fully supported.

---

## Roadmap

- More pre-shipped boards: `Frostpunk: The Board Game`, `Twilight Imperium IV`,
  `This War of Mine`, …
- **Computer-vision-driven automation** — train local CV models that watch the
  board state and trigger animations automatically (no manual taps).
- Per-cluster live editor (long-press a cluster pad to open it).
- Cleaner audio routing.

---

## Project status

**v1.0.0** — first public release. The big v1 milestones:

- Server-Side Rendering (SSR) is the only render path; `/output/` is a
  thin WebRTC consumer that just paints what the server produces. No more
  client-side GL-backend juggling, MP4 perf controls, or experimental
  fallbacks — those were retired in phases 40–44.
- One-click installer launchers for Linux + Windows (phase 45). No more
  `npm install` literacy needed.
- Default quality preset locked to `extra-high` / 1080p / 30 fps source /
  60 fps stream cap (phase 43). The whole adaptive perf feedback loop
  collapsed onto known-good values that work on Pi 5 + a 1080p projector.

Hobby project I built primarily for myself. AI was used
heavily during development. It's been running reliably on my own setup for
many game nights, but bugs exist.

If you want to fork or extend it, the architecture is documented end-to-end
under `.planning/phases/`.

If you have suggestions, open a
[GitHub issue](https://github.com/McFredward/TableTop-Beamer/issues). You can also
reach me as **McFredward** on Discord.

---

## License

[GNU General Public License v3.0](LICENCE) © McFredward
