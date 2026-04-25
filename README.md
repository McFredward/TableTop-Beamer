<div align="center">

<img src="readme-assets/tt-beamer-logo.svg" width="96" height="96" alt="TableTop Beamer logo" />

# TableTop Beamer

**Phone-controlled atmospheric projection mapping for tabletop board games.**

A short-throw ceiling projector beams animations onto your board — alarms, lights, intruders,
space backdrops — and you trigger them from your phone, room by room, in real time.

[![License: GPL v3](https://img.shields.io/badge/License-GPL_v3-blue.svg)](LICENCE)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%2F%20RPi-orange.svg)](#requirements)
[![Made with Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/Status-Hobby%20Project-purple.svg)](#project-status)

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
> This is a hobby project I built for myself, not a polished commercial product. Expect bugs 🕷️.
> AI was heavily used to help build it. Suggestions and PRs welcome.

---

## Contents

- [What is it?](#what-is-it)
- [Highlights](#highlights)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Aligning the projection](#aligning-the-projection)
- [Using the app](#using-the-app)
  - [Dashboard](#dashboard)
  - [Settings](#settings)
  - [Rooms, play areas, clusters](#rooms-play-areas-clusters)
  - [Animations](#animations)
  - [Sounds](#sounds)
  - [Custom assets](#custom-assets-gif--mp4)
  - [Boards](#boards)
  - [Export / Import](#export--import)
- [Optional: hardware-level cropping with `xrandr`](#optional-hardware-level-cropping-with-xrandr)
- [Tips & utilities](#tips--utilities)
- [Known issues](#known-issues)
- [Roadmap](#roadmap)
- [Project status](#project-status)
- [License](#license)

---

## What is it?

TableTop Beamer turns a ceiling-mounted short-throw projector into an interactive
atmosphere layer for board games. You define **rooms** (polygons painted onto the
board), assign **animations** (alarms, fires, scanners, intruders, MP4 loops…),
group rooms into **clusters**, and trigger everything from your phone during play.

Two browsers run side-by-side:

- **Control dashboard** (`/`) — on your phone or tablet. Tap rooms to fire effects,
  manage what's running, alter speed/opacity/sound on the fly.
  <div align="center">
  <img src="./readme-assets/tab_animations.gif" width="" />
  </div>
- **Output view** (`/output`) — fullscreen on a Raspberry Pi connected to the
  projector. No UI, just the rendered animations warped to fit your physical board.
  <div align="center">
  <img src="./readme-assets/output_mode.gif" width="" />
  </div>

Both browsers stay in sync through the server: changes from one client appear on
every other within a frame. Multiple controllers can be connected at once.

---

## Highlights

- 🎯 **In-browser projection mapping.** A WebGL-accelerated mesh-warp grid you
  drag, rotate, and scale until the projection sits perfectly on the physical
  board. Profiles are saved per-board on the server.
  <div align="center">
  <img src="./readme-assets/align_mode.gif" width="75%" />
  </div>
- 📱 **Mobile-first control UI.** Designed for one-thumb operation during a game.
- 🪐 **Animation editor.** Built-in coded effects or add your own GIF, and MP4 files.
  <div align="center">
  <img src="./readme-assets/edit_animations.gif" width="75%" />
  </div>
- 🧩 **Rooms, play areas, clusters.** Paint any polygonal region. Group rooms so
  one tap fires across many at once. Each cluster gets a live mini-preview tile
  next to the board on the dashboard.
  <div align="center">
  <img src="./readme-assets/edit_polygons.gif" width="75%" />
  </div>
- 🌗 **Light & dark themes.** Toggle from the topbar.
- 🔊 **Per-animation sounds** with global master volume.
- 💾 **Full board export / import** as a single JSON bundle.
- 🥧 **Raspberry-Pi-friendly output path.** WebGL warp displays directly on the
  output canvas — no GPU readback, runs smoothly on a Pi 4 / Pi 5.
- 📦 **Pre-shipped boards.** Nemesis (both base-game boards) and Nemesis Lockdown
  (both boards) are included with hand crafted polygons.

---

## Requirements

| | |
|---|---|
| 🎥 **Projector** | Short-throw, ceiling-mounted, image fully covering the table |
| 🖥️ **Output device** | Raspberry Pi 4/5 (or any Linux mini PC) connected to the projector |
| 🌐 **Server** | Any machine running Node.js, reachable from the Pi and the phone |
| 📱 **Controller** | Phone / tablet with a modern browser |

**Reference setup** I use:
- Projector: BenQ TH671ST
- Ceiling mount: ONKRON Projector Ceiling Holder
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

> Windows users: install Node.js via [Microsoft's guide](https://learn.microsoft.com/windows/dev-environment/javascript/nodejs-on-windows), then run the same `node server.mjs ...` command.

Then open two URLs:

| Where | URL | What it shows |
|---|---|---|
| 📱 Phone | `http://<SERVER-IP>:4173` | Control dashboard |
| 🥧 Pi (kiosk/fullscreen) | `http://<SERVER-IP>:4173/output` | Projector output |

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
| Right-click anywhere | Context menu: add line, remove line, save/load profile, reset |
| `Ctrl+Z` / `Cmd+Z` | Undo last grid action |
| `Esc` | Reset grid to default |
| Arrow keys | Nudge selected handle (hold `Shift` for larger steps) |

Calibration persists per-client in `localStorage`, and **named profiles are
stored server-side per board** — so you can switch between boards and reapply
the matching calibration with two clicks.

> The warp uses a triangulated mesh: SVG room outlines, GIFs, MP4s, and coded
> effects all stay perfectly in sync as you deform the grid. On the Pi the
> output path is WebGL-accelerated and skips the CPU readback that older
> browser projection setups need.

---

## Using the app

The control UI has two top-level views; toggle with the big Dashboard / Settings
switch.

| View | When you use it | What's there |
|---|---|---|
| **Dashboard** | During the game | Trigger animations, manage what's running, clear all |
| **Settings** | Before the game | Paint room outlines, set up animations, configure boards |

### Dashboard

The dashboard is split into three zones (swipe between them on mobile, side-by-side on desktop):

- **Trigger** — grid of room / cluster / global buttons. Tap to start an animation
  in that target. Tap again to toggle off (when Tap-Action = Toggle).
- **Manage** — list of currently-running animations. Tap one to open the **Live
  Editor** for runtime overrides: opacity, intensity, speed, sound volume,
  rotation, stretch, scale, offset. The "Default animation" toggle here marks an
  effect to auto-start whenever the server boots.
- **Control** — **Clear All** + the *Also clear default animations* checkbox.
  By default, Clear All keeps your atmospheric defaults running.

> [!TIP]
> The **Tap-Action** segmented control (Off / Toggle / Clear) at the top of the
> dashboard governs what a single tap does. Default is Toggle — first tap
> fires the animation, second tap stops it.

#### Cluster pads

A column of mini-render-surfaces sits to the **left of the board**, labelled
**Cluster**. Each pad is a tiny "fake room" that:

- Plays the live animation of its cluster inside it (so you can see at a glance
  what's on each cluster).
- Reacts to taps using the same Tap-Action mode as real rooms (toggle / clear).
- Stacks multiple animations like a regular room — fire + scanning + light
  flicker can all run on one cluster simultaneously.
- Scrolls if you have more clusters than fit, with touch-momentum on mobile.

The pads are dashboard-only and not visible in `/output`.

### Settings

Settings has three subtabs:

- **Board** — rooms, polygons, play areas, the board catalog, zoom, per-board
  Export / Import.
- **Animations** — three editors (Inside / Outside / Room).
- **System** — global animation speed factor and audio.

### Rooms, play areas, clusters

| Concept | What it is | When to use |
|---|---|---|
| **Room** | A polygon on the board hosting animations | Any indoor zone you want to flash, fill, or animate |
| **Play Area** | The region the board itself occupies | Defines what's "inside" vs "outside" for backdrop FX (space, sandstorm) |
| **Cluster** | A group of rooms | Trigger many rooms at once with one tap |

In **Settings → Board**:

- **Create a room** — type a name, click *Create room*. A small hexagon appears.
- **Edit polygon** — drag teal vertex handles. Double-click an edge midpoint to
  insert a vertex. Select a vertex + `Delete` to remove it.
- **Move** — drag inside the polygon.
- **Copy / Paste** — `Ctrl+C` / `Ctrl+V`. Useful for hex grids.
- **Freeze** — lock icon disables drag so you can't accidentally move it mid-game.
- **Undo / Redo** — `Ctrl+Z` / `Ctrl+Shift+Z` works across all polygon edits.

Room labels scale with both the polygon-handle slider and the polygon's own
size, so tiny rooms get tiny labels and large rooms don't blow up.

### Animations

Three kinds, each with its own editor in **Settings → Animations**:

| Type | Plays where | Example |
|---|---|---|
| **Room Animations** | Inside a specific room polygon | Alarm flashing in one room |
| **Inside Animations** | Inside the play area | Board-wide light flicker |
| **Outside Animations** | Outside the play area | Space / sandstorm backdrop |

Each editor has two tabs:

- **Create new** — name + *Create & switch to Edit*.
- **Edit existing** — full parameter list:
  - **Type** — `Effect` (built-in coded), `GIF`, or `Video` (MP4)
  - **Source** — built-in name, or a file under `resources/`
  - **Sound** — event sound that plays on start
  - **Intensity / Speed / Opacity** — per-type tweakable ranges
  - **Loop until stopped** — for one-shot effects you want to hold
  - **Transform defaults** (Room) — rotation, stretch-to-polygon, width/height
    scale, X/Y offset

#### Built-in animations

| Name | Type | Scope |
|---|---|---|
| Space travel | Coded | Outside |
| Sandstorm | MP4 | Outside |
| Alarm | Coded | Room |
| Scanning | Coded | Room |
| Slime | GIF | Room |
| Malfunction | GIF | Room |
| Solid color | Coded | Room |
| Light flicker | Coded | Inside |
| Fire | Coded | Room |

…plus more. Upload your own assets in the Animation Editor to add to this list.

### Sounds

Attach a sound to any animation via the *Sound* dropdown in its editor. Per-
animation volume is in the Live Editor (or as a default in the Room editor).
Global audio enable + master volume lives in **Settings → System**.

### Custom assets (Audio / GIF / MP4)

You can upload your own GIF, MP4 Animations loops and audio files in the Animation editor and use it for any animation.

### Boards

The **Board** dropdown at the top of *Settings → Board* switches between boards.
Each board has its own rooms, play areas, clusters, animations, sounds, and
align-mode calibration.

Import a new board from:

- **Package (.zip)** — a `.zip` archive file exported previously or by some other user.
- **Image** — JPG / PNG / WEBP. The server registers a minimal board with that
  image as the background; you paint rooms on it yourself.

### Export / Import

You can share a board including Board definition, all animations, projection profiles for that board as a zip and share it as a package with others.

---

## Optional: hardware-level cropping with `xrandr`

The in-browser Align Mode handles content alignment fine on its own — but if you want to crop the whole rasberry pi image perfectly to you whole table beforehand you can use `xrandr` for that. After that you can additionally use the align mode to crop the output to the board.

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

The tool lets you adjust a rectangle to match your table, drag vertices with
the mouse, fine-tune with arrow keys, **Enter** to apply, **Esc** to exit.
Combine with the in-browser Align Mode for final pixel-perfect placement.

---

## Tips & utilities
### Performance on Raspberry Pi

- **Prefer GIF over MP4** — MP4 decode is the heaviest path. GIFs drop straight
  into the GPU pipeline.

---

## Known issues

- MP4 decode is heavy on Pi — prefer GIFs where you can.
- Sound for non-looped global animations is unreliable. Workaround: tick *Loop
  until stopped* and stop manually.
- Some GIF animations occasionally render on the Pi but not on the phone preview.

---

## Roadmap

- More boards: `Frostpunk: The Board Game`, `Twilight Imperium IV`,
  `This War of Mine`, …
- **Computer-vision-driven automation** — train local CV models that watch the
  board state and trigger animations automatically (no manual taps).
- Per-cluster live editor (long-press a cluster pad to open it).
- Cleaner audio routing for global non-looped animations.

---

## Project status

This is a hobby project I built primarily for myself. AI was used heavily during
development. Things I didn't bother polishing for a wider audience are clearly
labelled as such, and bugs will exist.

That said: it's been running reliably on my own setup for many game nights, and
the architecture is documented end-to-end in `.planning/phases/`. If you want
to fork or extend it, the planning docs are a good orientation map.

If you have suggestions, open a [GitHub issue](https://github.com/McFredward/tt-beamer/issues).
You can also reach me as **McFredward** on Discord.

---

## License

[GNU General Public License v3.0](LICENCE) © McFredward
