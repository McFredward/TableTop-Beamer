# TABLETOP BEAMER | Atmosphere Controller

A tabletop projector overlay controller designed to enhance board games with immersive animations.

> NOTE: This is more of an hobby project build for myself than a stable piece of software. Expect bugs 🕷️. AI was heavily used here.



<p align="center">
<table>
<tr>
  <td><video src="https://github.com/user-attachments/assets/2dbe0f3f-5305-45ef-9895-f87d07323829"></video></td>
  <td><video src="https://github.com/user-attachments/assets/f9b21f27-8330-4f6a-a1cb-ea3e045b27f1"></video></td>
</tr>
</table>
<img src="readme-assets/tt-beamer-readme.png" width="500">
</p>

## Features

- Quickly start and stop room animations  
<img src="readme-assets/tt-beamer_start_animations.gif" width="500" height="300">

- Optimized for mobile browser control

- Dedicated output path for projector animation rendering  
<img src="readme-assets/tt-beamer_output.gif" width="500" height="300">

- Fine-grained animation control (speed, opacity, etc.)

- Built-in animations:
  - [Coded] Space travel (outside view)
  - [MP4] Sandstorm (outside view)
  - [Coded] Alarm
  - [Coded] Scanning
  - [GIF] Slime
  - [GIF] Malfunction

- Support for custom animations (GIF or MP4)

- Create, edit, and manage custom areas:
  - **Rooms** (indoor areas)
  - **Play areas** (for “outside” effects like space)  
<img src="readme-assets/tt-beamer_polygons.gif" width="500" height="300">

- Group multiple Rooms/Areas to "Clusters", so you can start an animation for the whole cluster.

- Set up custom sounds to specific animations.

- Preshipped with **OG Nemesis** (both boards) and **Nemesis Lockdown** (both boards).

- **Align mode** — a full in-browser projection-mapping workflow to match the projected image to the physical board. Includes:
  - Freely draggable grid with intersections, line handles, and whole-grid pan
  - Proportional scaling when outer edges are moved
  - Add/remove grid lines on the fly via right-click context menu (deformation is preserved)
  - Triangulated mesh warp — SVG room outlines and canvas animations stay perfectly in sync
  - Rotate the whole projection from any of the 4 corner handles
  - **Undo** with `Ctrl+Z` / `Cmd+Z`
  - Persisted per-client in `localStorage`
  - **Server-side profiles per board** — save, load, and delete named calibrations via the right-click menu

<!-- TODO: screenshot / short GIF of align mode in action here -->


## Requirements

- **Short-throw, ceiling-mounted projector**  
  Ensure the projection fully covers your table.

  Example setup (Amazon Germany):
  - Projector: BenQ TH671ST  
  - Ceiling Mount: ONKRON Projector Ceiling Holder  
  - Raspberry Pi: Raspberry Pi 5 (8GB Starter Kit)

  > It's fine if the image is larger than the table — the in-browser **Align Mode** can shrink and warp the projection to match the board. If you prefer the projector itself to only cover the table (so no light spills onto surrounding chairs/walls), `xrandr` is still supported as an optional hardware-level step — see [Optional: xrandr](#optional-xrandr-hardware-level-cropping).

- **Raspberry Pi** (or similar Linux-based mini PC) connected to the projector

- **Computer** running the server

- **Mobile phone** with a browser for controlling animations


## Setup

### PC / Server

Run the backend server on any machine reachable from your Pi and your phone:

```bash
sudo apt update
sudo apt install -y nodejs npm

git clone https://github.com/McFredward/tt-beamer
cd tt-beamer

node server.mjs --host 0.0.0.0 --port 4173
```

Windows users:  
Follow this guide to install Node.js:  
https://learn.microsoft.com/windows/dev-environment/javascript/nodejs-on-windows

### Raspberry Pi (Projector Device)

On the Pi, open a browser in kiosk/fullscreen mode pointing at the server's output view:

```
http://<SERVER-IP>:4173/output
```

That's all that's strictly required — the in-browser Align Mode handles everything else.

## Getting Started

1. **Start the server** on your PC / server machine:
   ```bash
   node server.mjs --host 0.0.0.0 --port 4173
   ```

2. **Open the control interface** on your phone:
   ```
   http://<SERVER-IP>:4173
   ```

3. **Open the output view** on the Pi (or whichever device drives the projector):
   ```
   http://<SERVER-IP>:4173/output
   ```

4. **Align the projection**. On the dashboard press the **Align Mode** button (the prominent toggle near the top). A calibration grid appears on the output view. Drag it until the room outlines sit exactly on the board:

   - **Intersection handles (teal circles)** — drag to move that single point freely.
   - **Line handles (↕ / ↔ badges)** — drag a whole row/column along one axis.
   - **Outer edges** — dragging an outer edge or corner proportionally scales all inner points, so the whole image resizes with it.
   - **Empty area** — left-click and drag to pan the whole grid.
   - **Rotate handles (orange ↻ badges at the 4 corners)** — drag to rotate the entire grid around its centroid.
   - **Right-click** anywhere on the grid for a context menu:
     - **Add horizontal/vertical line** — inserts a new control line at the click position (existing deformation is preserved).
     - **Remove this line** — removes the line you right-clicked near.
     - **Save profile…** — persists the current calibration to the server under a name you choose (scoped to the current board).
     - **Load profile…** — pick from previously saved profiles for this board.
     - **Delete profile…** — remove a saved profile.
     - **Reset all** — restore default 5×5 grid.
   - **`Ctrl+Z` / `Cmd+Z`** — undo the last action. Works for all grid operations.
   - **`ESC`** — reset the grid to its default.
   - Arrow keys nudge the currently selected handle (hold `Shift` for larger steps).

   Calibration is persisted per client in `localStorage`, and **named profiles are stored server-side per board** so you can switch boards and re-apply a previous calibration with two clicks.

   <!-- TODO: screenshots of the align grid, the context menu, and the rotate handles -->

5. **You're ready** — start controlling animations and enjoy your game!

## Using the app

The control UI has two top-level views that you switch between with the large Dashboard / Settings toggle:

- **Dashboard** — what you use during the game. Start/stop animations, switch rooms, tweak a running effect on the fly.
- **Settings** — what you set up before the game. Paint the room outlines, link animations to rooms, organize clusters, tune asset defaults.

### Dashboard

The dashboard is split into three zones (on mobile you swipe between them; on desktop they sit side by side):

- **Trigger** — the grid of room / cluster / global buttons. Tap a button to start an animation in that room (or stop it if one is already running there). Global buttons trigger board-wide effects (e.g. "Outside Space").
- **Manage** — the list of currently-running animations. Tap one to bring up the **Live Editor**: override opacity, intensity, speed, sound volume and per-animation transform (rotation, stretch, scale, offset) without editing the saved animation definition. "Default animation" toggle auto-starts this effect when the server boots.
- **Control** — **Clear All** + the "Also clear default animations" checkbox. By default, Clear All stops only the animations you started manually and keeps the board atmosphere (outside effects, default animations) running. Tick the checkbox first if you want to stop literally everything.

### Settings

Settings has three subtabs:

- **Board** — rooms, polygons, play areas, the board catalog, zoom controls, and the per-board Export / Import section.
- **Animations** — the three animation editors (Inside / Outside / Room).
- **System** — global animation speed factor and audio settings.

#### Rooms

A **room** is a polygon on the board that can host animations. Rooms are where you actually trigger effects like "Alarm" or "Intruder Alert".

In the **Board** subtab, the *Room Editor* panel lets you:

1. **Create a room** — type a name, click *Create room*. A small hexagon appears on the board.
2. **Edit its polygon** — drag the teal vertex handles. Double-click an edge midpoint to insert a vertex. Select a vertex and hit `Delete` to remove it.
3. **Move the whole polygon** — click inside it and drag.
4. **Copy / Paste** — select a room, `Ctrl+C` to copy, `Ctrl+V` to paste. Useful when you need many similarly-shaped rooms (e.g., the Nemesis hex grid).
5. **Freeze** — the lock icon disables drag on a room so you don't accidentally move it mid-game.
6. **Undo / Redo** — `Ctrl+Z` / `Ctrl+Shift+Z` works across all polygon edits and works in any Settings subtab.

#### Play Areas

A **play area** is the region the board itself occupies — everything *inside* is "indoors", everything *outside* is "space" (or whatever backdrop you pick). It's what Outside Animations render against.

A board can have multiple play areas — useful for split-board setups or boards with an outer frame. The polygon editor works the same as for rooms (vertex drag, double-click to insert, delete).

#### Clusters

A **cluster** groups several rooms together. When you trigger a cluster, the animation fires in every room of the cluster simultaneously. Example: a "Nest Activity" cluster covering every hex where nests spawn, so you can flash them all at once when an event card says so.

Create/edit clusters from the Room Editor's cluster sub-panel.

#### Animations

There are three kinds of animations you can define, each with its own editor in **Settings → Animations**:

- **Room Animations** — play inside a specific room polygon (triggered per-room from the dashboard).
- **Inside Animations** — play inside the *play area* (board-wide indoor effects like a lighting flicker).
- **Outside Animations** — play *outside* the play area (the backdrop: space, sandstorm, an alien world).

Every editor has the same two-tab layout:

- **Create new** — a name field and a **Create & switch to Edit** button. The new animation is created with sensible defaults and the tab automatically flips to Edit.
- **Edit existing** — dropdown of all animations + all their parameters:
  - **Type** — `Effect` (built-in coded), `GIF`, or `Video` (MP4).
  - **Source** — pick from the resource catalog. For Effects it's a list of built-in names; for GIF / Video it's files under `resources/`.
  - **Sound** — pick from event-sound assets. Plays when the animation starts.
  - **Intensity / Speed / Opacity** — per-type tweakable ranges.
  - **Loop until stopped** — relevant for one-shot effects you want to hold.
  - **Transform defaults** (Room) — rotation, stretch-to-polygon toggle, width/height scale, X/Y offset. These apply to GIF/MP4 assets that don't automatically fit the polygon shape.

#### Sounds

Any animation can have a sound attached via the *Sound* dropdown in its editor. The per-animation volume is controlled in the Live Editor (or as a default in the Room animation editor). Global audio enable + master volume lives in **Settings → System**.

Place custom sound files under `resources/sounds/` and they'll show up in the dropdown after a reload.

#### Custom assets (GIF / MP4)

Drop your files into:

- `resources/boards/images/` — board background images
- `resources/gifs/` — custom GIFs
- `resources/videos/` — custom MP4 loops
- `resources/sounds/` — custom event sounds

Reload the control UI and they'll appear in the Source / Sound dropdowns. For MP4 loops that aren't seamlessly looped, see [Looping Videos](#looping-videos-ffmpeg) below.

#### Boards

The **Board** dropdown at the top of Settings → Board switches between boards. Each board has its own rooms, play areas, clusters, animations, sounds and align-mode calibration.

Import a new board from:

- **JSON** — a `tt-beamer.board-catalog.v1` file you already exported.
- **Image** — a JPG / PNG / WEBP. The server registers a minimal board with that image as the background; you then paint rooms on it yourself.

#### Export / Import

Two levels of export/import are provided:

- **Per-board bundle** (`Settings → Board → Export / Import Board`). Packages everything that belongs to the currently-selected board:
  - Board definition (rooms, play areas)
  - Runtime profile (animations, clusters, Inside/Outside/Room FX settings)
  - Align-mode projection profiles for that board

  The JSON file has schema `tt-beamer.board-bundle.v1`. Importing merges into the target server — board definition is overwritten, runtime profile is replaced for that board only, projection profiles are merged (existing ones with the same name are overwritten).

- **Global config** (the two Export/Import buttons further up in the Board panel). Bundles *all* boards' runtime profiles + global settings into a single backup JSON. Use this for full backups of your setup.

### Align Mode

See *Getting Started* step 4 above. Align mode is how you match the projected image to the physical board; it is described there with all the interaction details.

## Optional: xrandr (hardware-level cropping)

The in-browser Align Mode handles most projection alignment just fine. The only thing it can't do is prevent light from spilling past the edges of your table — it can shrink the _content_, but the projector will still emit light everywhere. If that bothers you (e.g., it lights up nearby walls or chairs), you can additionally use `xrandr` to crop and transform the output signal at the X server level.

This is only supported on Raspberry Pi OS when running the X11 session (not Wayland). Switch the session:

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

cd ~
git clone https://github.com/McFredward/tt-beamer
cd tt-beamer/scripts

python3 -m venv venv
./venv/bin/pip install pygame numpy
```

Run the mapping tool:

```bash
~/tt-beamer/scripts/venv/bin/python map.py
```

This tool lets you:

- Adjust a rectangle to match your table or board
- Drag vertices with the mouse
- Fine-tune using arrow keys
- Press **Enter** to apply the transformation
- Press **ESC** to exit

After `xrandr` has cropped the projector output, you can still fine-tune room outlines from the phone using the in-browser **Align Mode** described above.

---

## Known Issues

- MP4 playback can be demanding on the Raspberry Pi  
  → Prefer GIF animations for better performance
- Sound issues global Animations which are not looped (if you wish to have sound for those Animations, for now check "loop until stopped" and stop them manually)
- Sometimes some GIF-Animations are played on the pi but not on the phone.

## Future plans

- Add more of my favourite Board games like `Frostpunk the Board game`, `Twilight Imperium IV`, `This War of Mine`, ...
- **Train Computer-Vision Models for local inference for some board games for automatic animations instead of pure manual control.**

## Useful stuff
### Looping Videos (FFmpeg)

I used this command to create looped versions of video animations which are not looped. Does not work with everything, but so far my best attempt without using AI models to interpolate or animate.

```bash
ffmpeg -i input.mp4 -filter_complex "
[0:v]split=2[vA][vB];
[0:a]asplit=2[aA][aB];
[vA]trim=0:duration/2,setpts=PTS-STARTPTS[v1];
[vB]trim=start=duration/2,setpts=PTS-STARTPTS[v2];
[aA]atrim=0:duration/2,asetpts=PTS-STARTPTS[a1];
[aB]atrim=start=duration/2,asetpts=PTS-STARTPTS[a2];
[v2][v1]xfade=transition=fade:duration=5:offset=(duration/2-5)[v];
[a2][a1]acrossfade=d=5[a]
" -map "[v]" -map "[a]" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -movflags +faststart output.mp4
```

---

If you have any suggestions, feel free to open an Issue. Or contact me (McFredward) in via Discord.
