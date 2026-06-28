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
- [Playback modes](#playback-modes)
- [Live editing & auto-start](#live-editing--auto-start)
- [Built-in animations](#built-in-animations)
- [Sounds](#sounds)
- [Custom assets (GIF / MP4 / audio)](#custom-assets-gif--mp4--audio)
- [Boards](#boards)
- [Export / Import](#export--import)
- [Data layout (where things live on disk)](#data-layout-where-things-live-on-disk)
- [Troubleshooting](#troubleshooting)

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

> **Tip — extreme zoom:** At high zoom the scale handles (⤢) automatically
> flip inward and clamp to the viewport edge so they stay reachable when
> the natural outward position would fall off-screen. Drag math is
> unaffected — dragging a repositioned handle applies the exact same
> transform as dragging from the true corner.

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
| **Toggle** *(default)* | First tap fires the armed animation, second tap stops it — **except** for `Freeze, reverse on re-trigger` animations (see below). |
| **Clear** | Tapping a room stops every animation in that room. |
| **Select** | Picks the animation to fire next without triggering it. |

When the armed animation is the **Solid color** effect, an inline color picker
appears in the panel so you can change the colour without leaving the
dashboard.

### Tap behavior for play-then-freeze + reverse-on-retrigger animations

Animations configured as **Freeze, reverse on re-trigger** have different
tap semantics in Toggle mode:

- **Tap while playing or frozen** — flips the playback direction
  (forward → reverse, reverse → forward) instead of stopping. The
  direction flip works at any point during playback, not only after the
  animation has reached its frozen state.
- **First frame continuity** — the frozen image holds through the
  direction flip; there is no blank frame during the transition.
- **Stopping** these animations is done via quick-mode **Clear**, or
  from the running animations list — tap-to-stop is intentionally
  disabled for them in Toggle mode.
- **Loop animations** keep the standard tap-to-toggle behavior.

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

**Re-triggering a cluster** with a `Freeze, reverse on re-trigger` animation
running flips the direction of **every member room**, each from its own
current playback phase. Member rooms that were individually re-triggered
between cluster taps keep their independent phase — the cluster tap does not
force them into sync.

The pads are dashboard-only and not visible in `/output`.

---

## Settings panel

Settings has three subtabs:

| Subtab | Owns |
|---|---|
| **Board** | Rooms, polygons, play areas, clusters, board catalog, zoom, per-board export / import |
| **Animations** | The full-page animation editor |
| **System** | Global animation-speed multiplier, audio enable + master volume, performance settings (incl. adaptive video quality), and **Server Side Rendering** stream tuning — codec (H.264 / VP9), content-hint (detail / motion / auto), and bitrate cap. Keep the codec on **H.264** unless the server has a hardware VP9 encoder; software VP9 only sustains ~15 fps at 1080p and stutters fast effects on `/output/`. |

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
- **Fade in / out** — optional fade on start and stop; a duration slider
  appears when fade is enabled. Applies to any animation type.
- **Effect-specific controls** *(coded effects)* — each coded effect exposes
  its own settings under a **Coded Settings** section, e.g.
  **Snow**: density, speed, mean flake size, and a **Storm** (blizzard)
  toggle; **City Workers**: count (up to 24), figure size, walk-sway,
  trail intensity, a movable center-exclusion ring, and a **Stronger
  lighting** toggle (brighter, lit figures for the beamer vs. dark
  silhouettes); **Heat**: intensity.
- **Playback configuration** *(GIF and MP4 only)* — see [Playback modes](#playback-modes) below
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

## Playback modes

GIF and MP4 animations expose a **playback configuration** block in the
editor's Defaults card. Both asset types support all modes — MP4 reverse
is pre-computed on the server the first time it is needed (brief one-time
encode per asset, typically 1–5 s depending on file length); GIF reverse
is instantaneous (cursor math, no encoding).

### Initial direction

The **Initial direction** dropdown sets which end of the animation plays
first:

| Option | Behavior |
|---|---|
| **Forward (start to end)** *(default)* | Plays from frame 1 to the last frame. |
| **Reverse (end to start)** | Plays from the last frame back to frame 1. |

This is independent of the *When ended* mode — a reverse-direction loop
plays backwards continuously; a reverse-direction play-then-freeze plays
once backwards and then holds the first frame.

### When ended

The **When ended** dropdown controls what happens after the initial
playthrough completes:

| Option | What happens at end of playback |
|---|---|
| **Loop forever** | Restarts from the beginning continuously. |
| **Disappear** | Removes the animation from the room. |
| **Freeze (re-trigger removes)** | Holds the final frame. Tapping the room again (Toggle mode) removes it. |
| **Freeze, reverse on re-trigger** | Holds the final frame. Re-triggering plays reverse; when reverse ends, see *After reverse on re-trigger* below. |
| **Boomerang (auto forward & reverse)** | Ping-pongs automatically between forward and reverse without any tap. |

When **Freeze, reverse on re-trigger** is selected, a second dropdown
appears:

| After reverse on re-trigger | What happens when reverse completes |
|---|---|
| **Freeze at first frame (manual ping-pong)** | Holds the first frame. Another re-trigger plays forward again — manual ping-pong. |
| **Disappear** | Removes the animation after the reverse playthrough. |

### Editor live preview

The preview in the editor honors the configured mode and direction:
- Non-loop modes restart on every slider or dropdown change so you always
  see a full playthrough of the current settings.
- **Disappear** mode hides the preview canvas at end-of-sequence, mirroring
  what the board will show.
- **Boomerang** ping-pongs the preview cursor through forward then reverse.
- **Reverse** direction walks frames backward in the preview at the same
  speed as the forward setting.

---

## Live editing & auto-start

Tap any animation in the **Active Animations** list (dashboard) to open the
**Live Editor** for that running instance. You can adjust its sliders,
transform, fade, and — for coded effects — its **Coded Settings** in real
time. While the editor is open the changes preview **dashboard-local** only;
they apply to every client (`/output/` included) when you commit:

| Button | What it does |
|---|---|
| **Done** | Applies the current values to all clients for the rest of this run. Does **not** change the saved definition. |
| **Save as default** | Writes the current values into the animation's definition, so every future trigger of that animation starts with them. Also applies + closes like Done. |

**Auto-start animation** — tick this checkbox in the Live Editor and press
**Done** (or **Save as default**) to mark the running animation as a board
default. Default animations **start automatically on every server boot**.
The setting is saved per board into `config/boards/<board-id>.json`
(`defaultAnimations`), so it survives restarts. Untick + Done removes it from
the auto-start set.

---

## Built-in animations

A starter library ships with each pre-shipped board (and is available to
copy into your own boards). Since v1.3.0 the **coded** effects form a single
catalog that is selectable in **every** scope (Room / Inside / Outside); the
"Scope" column below is just where each is most commonly used:

| Name | Engine | Scope |
|---|---|---|
| **Outside Space** | Coded (parallax stars) | Outside |
| **Outside Sandstorm** | MP4 | Outside |
| **Snow** *(with Storm/blizzard mode)* | Coded | Any |
| **City Workers** | Coded | Any |
| **Heat** | Coded | Any |
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

Upload your own GIFs, MP4s, and audio files directly from the
animation editor's source picker — they land under `resources/animations/`
or `resources/sounds/` and become available for every board.

Both GIF and MP4 assets support all playback modes including reverse and
boomerang. For MP4, the server pre-computes a reversed copy on first use
(cached under `resources/.reverse-cache/`); the encode runs once per asset
and subsequent uses are instant. GIF reverse requires no pre-compute.

---

## Adaptive video quality

When many rooms are running MP4 animations simultaneously, the rendering
load from concurrent video decoders can cause frame drops. TT-Beamer
monitors frame rate and automatically switches active videos to a
server-encoded 480p proxy variant when sustained distress is detected,
then recovers to full resolution when load drops.

- **Toggle:** **Settings → System → Adaptive Video-Qualität (auto 480p
  bei Framedrops)** — enabled by default. The setting is per rendering
  client (dashboard, `/output/`, and the SSR tab each have their own
  stored preference).
- **Switching is seamless:** playback position is preserved when switching
  tiers mid-play. Frozen instances do not swap mid-freeze; they pick up
  the current tier on their next phase change.
- **Recovery:** the system returns to full resolution once frame rate is
  healthy and the number of concurrently playing videos drops — designed
  to recover after a burst rather than oscillate.
- **Loop-mode MP4s** are exempt — they share one decoder across all rooms
  using the same asset and do not create N×decoder pressure.

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
├── .reverse-cache/                 # server-encoded reversed MP4 variants (auto-generated)
├── .proxy-cache/                   # server-encoded downscaled proxy MP4 variants (auto-generated)
└── sounds/                         # shared audio files
```

Deleting a board removes only its entry under `config/boards/`. Shared
media in `/resources/` is left alone.

> `config/projection-profiles.json` is **local-only** (in `.gitignore`) —
> calibration is per-install. Saving a profile in align mode writes to
> this file on your server.

---

## Troubleshooting

### Reading the console logs

TT-Beamer emits permanent `[58]`-prefixed console messages (visible in
the browser's developer tools on both the dashboard and `/output/`) that
explain key playback lifecycle events in real time:

| Log tag | What it reports |
|---|---|
| `[58] re-trigger` | Every room-trigger's phase-advance check — which animation matched, its current phase, mode, and on-retrigger setting. |
| `[58] anim-removed` | Every animation removal, with the reason (`explicit-remove`, `board-mismatch`, or `sustained-absence`) and absence duration. |
| `[58] phase` | Playback phase transitions (forward → frozen-last → reverse → frozen-first, etc.). |
| `[58] src-swap` | Forward ↔ reverse URL swaps for play-then-freeze and boomerang animations. |
| `[58] quality` / `[58] quality-swap` | Adaptive quality tier changes and the position-preserving src swap that goes with them. |
| `[58] quick-toggle` | Every tap on an occupied room — whether the tap was routed to retrigger (direction flip) or stop. |
| `[58] cluster-toggle` / `[58] cluster-retrigger` | Every cluster pad toggle decision and the per-member phase-advance outcome. |
| `[58] anim-absent-start` / `[58] anim-absent-recovered` | Grace-period tracking when a snapshot transiently omits a running animation. |
| `[58] prune-release` | Video element release decisions. |
| `[58] release-video` | Immediately before a video element is released — useful for correlating browser media-load errors. |

These logs fire on events only (never per-frame) and are always on.
When reporting a playback issue, paste the `[58]` lines from the console
— they identify what was removed and why, which phase was active, and
whether a quality switch was in progress.
