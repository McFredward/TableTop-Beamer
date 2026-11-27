# Utility scripts

Two helper scripts ship under `scripts/`. Both are optional — the core app
works without them, but they cover common operator chores.

## Contents

- [`projection_mapper.py` — hardware-level cropping with `xrandr`](#projection_mapperpy--hardware-level-cropping-with-xrandr)
- [`loop_video.sh` — making non-looping videos loop seamlessly](#loop_videosh--making-non-looping-videos-loop-seamlessly)
- [Board camera](#board-camera)
- [Diagnostic endpoints](#diagnostic-endpoints)
- [Media cache utilities](#media-cache-utilities)
- [Browser-side diagnostic flags](#browser-side-diagnostic-flags)

---

## `projection_mapper.py` — hardware-level cropping with `xrandr`

The in-browser Align Mode is enough for content alignment on its own — but if
you want to crop the whole projector raster to your table beforehand,
`xrandr` can do it at the display layer. Combine with Align Mode for the
final pixel-perfect placement.

> Only supported on Raspberry Pi OS with the X11 session (not Wayland).

### Switch the Pi to X11

```bash
sudo cp /etc/lightdm/lightdm.conf /etc/lightdm/lightdm.conf.bak
sudo sed -i 's/user-session=.*/user-session=rpd-x/' /etc/lightdm/lightdm.conf
sudo sed -i 's/autologin-session=.*/autologin-session=rpd-x/' /etc/lightdm/lightdm.conf
sudo systemctl restart lightdm
```

### Install the bundled mapper helper

```bash
sudo apt update
sudo apt install -y python3 python3-venv

cd ~ && git clone https://github.com/McFredward/TableTop-Beamer
cd TableTop-Beamer/scripts

python3 -m venv venv
./venv/bin/pip install pygame numpy
```

### Run it

```bash
~/TableTop-Beamer/scripts/venv/bin/python scripts/projection_mapper.py
```

Adjust the rectangle to match your table — drag vertices with the mouse,
fine-tune with arrow keys, **Enter** to apply, **Esc** to exit.

---

## `loop_video.sh` — making non-looping videos loop seamlessly

Have an MP4 clip you'd like to use as an animation, but it doesn't loop
cleanly? `scripts/loop_video.sh` is a small `ffmpeg` wrapper that takes
any video and produces a seamlessly-looping version by cross-fading the
end back into the beginning. Drop the result into the animation editor
as a regular video animation.

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

## Board camera

### Capture from `/output/` in Chromium

1. Start TT-Beamer on the PC, plug the USB camera into the Pi and connect both devices to the same network.
2. On the server PC, open `http://localhost:4173/` and choose **Pi output** in the dashboard. The dialog searches for the Pi as it opens. The Pi needs SSH enabled and a desktop session signed in with the same account.
3. Check the suggested user name, confirm the Pi’s SSH identity on first use, and enter the password. Press Enter or choose **Start fullscreen**. TT-Beamer enables the detected HDMI output, pairs the camera when the server manages pairing, and starts its dedicated Chromium profile in fullscreen. The password is used for that SSH connection. Check **Camera → Live camera** on the PC.

For later sessions, use the same button. TT-Beamer remembers the Pi’s host name,
SSH identity and user name. If discovery needs help, open **Find again or enter
address**. If the Pi was started before the projector, turn on
the projector and run the button again to enable HDMI.

**Manual setup command** remains available for a Pi without SSH. Copy the
command into a terminal on the Pi desktop within five minutes. In Chromium,
choose **Allow while visiting the site**. The manual setup adds a **TT-Beamer
Output** shortcut to the Pi’s application menu for later sessions.

For manual installations, the development checkout defaults to `192.168.0.29` until a Pi is paired.
Set `TT_BEAMER_OUTPUT_CAMERA_IP` to use a fixed LAN IPv4 address instead.
The server accepts camera uploads from the configured address on the same origin.

Setting `TT_BEAMER_CAMERA_URL` selects µStreamer in place of the checked-in
default. An explicit IPv4 in `TT_BEAMER_OUTPUT_CAMERA_IP` takes priority over
the µStreamer URL.

For a direct HTTP connection on a trusted LAN, launch Chromium with the exact
TT-Beamer origin as an exception. Open `/output/` on the Pi and allow camera
access when prompted. Replace
`192.168.0.80:4173` with the address and port you use to open the actual output.

~~~bash
chromium --disable-features=WebRtcPipeWireCamera \
  --unsafely-treat-insecure-origin-as-secure=http://192.168.0.80:4173 \
  http://192.168.0.80:4173/output/
~~~

The first flag selects the direct V4L2 camera path on Raspberry Pi OS. Use
the graphical session on the Pi to create and remember the site permission.
For a dedicated projection browser, add `--kiosk` after granting access.
Exit the existing Chromium process before changing its launch arguments. If
permission was previously blocked, use Chromium's site settings to allow it
and then press **Retry camera**. The browser requests up to 3840×2160 and sends
camera JPEGs directly when available. The upload is paced at up to two frames
per second and about 6 Mbit/s of JPEG payload to leave room for live projection.
Closing `/output/` releases the camera. Use a single output tab on the Pi.

Open `http://127.0.0.1:4173/api/camera/status` on the PC to check that the camera
is `streaming` and inspect the received resolution, sequence and frame rate.
The PC can retrieve the latest fresh JPEG at `/api/camera/latest.jpg` over
loopback. TT-Beamer keeps the latest frame in memory for diagnostics and
future vision processing. If you put TT-Beamer behind a reverse proxy, block
access to `/api/camera/latest.jpg` and `/api/camera/vision.jpg` at the proxy.
Browser capture requires the TT-Beamer server to see the Pi's address directly.

### Automatic board alignment

Select the matching board in TT-Beamer, lay it flat and keep all four corners
in view of the camera. Open **Camera → Auto calibrate** on the server PC after
the live camera is visible. Keep the projector's Output window in the foreground.

The projector shows a black frame and then coded white dots. TT-Beamer matches
the printed board to its reference artwork, refines the fit against local
details, and measures any visible physical edges. Items beside the board may
stay on the table. Light spots outside the detected board are excluded from
the projector fit, and visible sections of a board edge can support the fit
across a short obstruction. An effect whose polygon ends
at the artwork boundary uses a smaller inset along that part of the physical
edge. The projector measures and adjusts grids of 5×5, 9×9 and 13×13. It then
compares projected room outlines and small coloured indicators with the print.
When an indicator needs a local correction, the mesh can add lines around it
up to 16 per axis. Further images verify the correction and check the upper
room contours separately before a change is accepted.
The regular picture returns after the measurements. In Output, moving the mouse
shows the cursor again after idle. The cursor stays hidden during automatic
measurements.

A verified result activates and replaces the selected board's **autocalibrated**
profile. The status reports the 90th-percentile errors for the dot check and
available outline and indicator samples in camera pixels at a 1920-pixel
analysis width.
When you edit that grid by hand, **Save** asks for
a new profile name. **Cancel calibration** returns to the live camera. If the
board moves, repeat Auto calibrate with enough of the print visible to identify
the board and verify the result.

### Alternative capture with µStreamer

As an alternative, run a separate process on the Pi to publish the camera's
native MJPEG frames. The PC opens one HTTP connection to that process.

#### Start µStreamer on the Pi

Install `ustreamer` and `v4l-utils` from the Raspberry Pi OS repositories.
Connect the camera to a USB 3 port and find its V4L2 capture device. Prefer the
corresponding `/dev/v4l/by-id/` link for a persistent setup when available.

~~~bash
sudo apt install ustreamer v4l-utils
lsusb -t
v4l2-ctl --list-devices
v4l2-ctl --device=/dev/video0 --list-formats-ext
v4l2-ctl --device=/dev/video0 --list-ctrls-menus
~~~

Start with a 3840×2160 MJPEG mode that the device lists. Request 30 fps and
check the delivered rate. Replace the sample address with the Pi's LAN address
and the capture node with the one found above.

~~~bash
ustreamer --device=/dev/video0 --format=MJPEG --encoder=HW \
  --resolution=3840x2160 --desired-fps=30 \
  --host=192.168.0.42 --port=8092
~~~

`--encoder=HW` instructs uStreamer to use the camera's JPEGs directly.
Keep the stream on the local network. Reserve the Pi's IP in the router so the
PC can reconnect to the same address. Compare Ethernet and the actual Wi-Fi
link with projection running. Keep the spatial resolution for small pieces if
an offered lower frame rate fixes a bandwidth problem. Once capture is proven,
run the command as a Pi service that restarts on failure.
[µStreamer manual](https://github.com/pikvm/ustreamer/blob/master/man/ustreamer.1).

#### Connect the PC

Set the stream URL in the environment before starting TT-Beamer. On Windows
PowerShell, start the launcher from the same window.

~~~powershell
$env:TT_BEAMER_CAMERA_URL = "http://192.168.0.42:8092/stream"
.\start.bat
~~~

On Linux use `TT_BEAMER_CAMERA_URL=http://192.168.0.42:8092/stream ./start.sh`.
Open `/api/camera/status` on the TT-Beamer server, for example
`http://127.0.0.1:4173/api/camera/status`. Check for `streaming`, the expected
width and height, and a sequence that advances on each refresh. After enough
frames the endpoint also reports the received frame rate and JPEG payload rate.

The receiver requests uStreamer's extra frame headers to distinguish offline
placeholders and repeated capture timestamps from usable frames. It clears
the frame during an outage, drops stale frames and reconnects automatically.
Without `TT_BEAMER_CAMERA_URL` the receiver remains disabled. Using the status
endpoint does not open a second camera connection or send images to the browser.

### Evaluate GPU models on board crops

`scripts/benchmark_board_vision.py` runs RF-DETR box or segmentation models
on a saved camera image. The benchmark selects CUDA automatically
when available. An explicit `--device cuda` makes a missing GPU an error.
This is an offline tool. It does not change game state or start a stream.

On Windows, create an independent Python 3.12 environment. This example
uses the CUDA 12.8 build of PyTorch and assumes a compatible NVIDIA driver.
Run the benchmark from the TT-Beamer directory.

```powershell
$visionEnv = Join-Path $env:LOCALAPPDATA "tt-beamer-vision"
py -3.12 -m venv $visionEnv
$visionPython = Join-Path $visionEnv "Scripts\python.exe"
& $visionPython -m pip install torch==2.10.0 torchvision==0.25.0 --index-url https://download.pytorch.org/whl/cu128
& $visionPython -m pip install rfdetr==1.12.1 supervision==0.32.0
& $visionPython scripts/benchmark_board_vision.py capture.jpg --device cuda --roi 800,500,704,704
```

The ROI is `x,y,width,height` in original image pixels. Replace the example
with the bounds of a room and repeat `--roi` to time a batch of several rooms.
The JSON report includes boxes in original image coordinates, the median and
95th-percentile crop-batch time, mask areas for segmentation, and peak
allocated PyTorch memory on CUDA. Image loading and ROI selection are outside
the timed region. Tiled inference includes slicing and merging in its timing.

Use `--tile-size 960` to benchmark overlapping 960-pixel tiles inside the
same ROI. Compare against the same command with whole-image inference and
use the same checkpoint and thresholds for both. Tile detections are merged
and returned in original camera coordinates.

RF-DETR downloads its default weights on first use. Those pretrained
models serve as a runtime check. Use `--checkpoint`
with locally fine-tuned RF-DETR weights to evaluate actual Nemesis pieces.
Compare the same held-out clips across models, with an emphasis on incorrect
effect transitions during projected light and occlusion. For live deployment,
check projection frame pacing with the detector running. Evaluate TensorRT
FP16 against the PyTorch results before using it.
[RF-DETR model and license](https://github.com/roboflow/RF-DETR) ·
[TensorRT export](https://rfdetr.roboflow.com/latest/exports/tensorrt/)

### Prepare annotated board images for training

Run `python scripts/prepare_board_dataset.py captures/board.coco.json` to
check bounding boxes and count examples per class, scene and lighting
condition. Each COCO image needs a `scene_group`. Give repeated frames of
the same piece placement one group, including frames recorded with the
projected effects switched on and off. Record the condition in `lighting`.

Once the dataset includes independent scenes, select held-out scene groups
for RF-DETR and leave the remaining groups for training.

```powershell
& $visionPython scripts/prepare_board_dataset.py captures/board.coco.json --output captures/rfdetr --valid-scene placement-04 --test-scene placement-06
```

The export keeps each group in one split and checks for identical images
across splits. Bounding boxes support box-detector training. Segmentation
training also needs mask annotations.

For miniatures with different paint schemes, add `--grayscale-miniatures`
when exporting. It keeps the RGB originals and adds a grayscale view for
every fourth training image that contains an alien or character within each
scene. These views encourage the model to use shape and texture. Validate on
independent captures with different paint schemes and unpainted pieces.

### Live detections in the dashboard

With the camera and TT-Beamer running, open `http://127.0.0.1:4173/` on the PC
and choose **Camera** in the dashboard. **Live camera** shows the full incoming
frame. **Detections** shows segmentation masks, boxes, labels and confidence
scores on the exact frame used for inference. On Nemesis boards A and B it also
draws boxes and the confirmed artwork numbers for the transparent counters.
It shows the local detections while
waiting for a result from the Python process.

In a second PowerShell window, start inference with the Python environment from
the previous section. The default model is RF-DETR Seg 2XLarge. Its first launch
downloads the pretrained weights.

```powershell
$visionPython = Join-Path $env:LOCALAPPDATA "tt-beamer-vision\Scripts\python.exe"
& $visionPython scripts/stream_board_vision.py --device cuda
```

The worker analyzes the most recent frame, up to three times per second. Use
`--max-fps 1` to compare projection performance under a lighter load, or
`--model seg-nano --device cpu` for a machine without CUDA. Use `--port` if
TT-Beamer runs on a different port. `--roi 800,500,704,704` processes a crop
from the original 4K image. Without a crop the annotated preview is scaled to
fit within 1600×1600. To try tiled inference on small game pieces, use
`--tile-size 960 --max-fps 1` with an ROI covering the board. The model reads
the tiles at source resolution, and the dashboard still shows one merged
preview. Check projection smoothness and inference time before increasing
the inference rate. Add `--checkpoint path\to\weights.pt` and choose the
matching `--model` to test trained Nemesis classes. The dashboard identifies
whether the result uses COCO weights or a custom checkpoint.
The registered Nemesis checkpoint rechecks up to three uncertain compact
alien candidates on crops at camera resolution. When projected light changes
over a crop, the detector can use the darkest values from recent camera frames
to reduce the overlay. Confirmed positions get checked again in later frames.
Only a matching, confident detection is added to the game readings.

The worker and dashboard access the camera images on the server PC over
loopback. TT-Beamer keeps the newest result in memory. When the camera goes
offline the preview clears, and inference waits for fresh frames.

### Observe Nemesis game state

Open **Camera → Game observation** on the server PC. On Nemesis boards A and B,
the view matches the camera image to the selected board artwork. Reopen the
view after moving the board. It compares the printed track fields with the
camera image and can use fainter round counter highlights when local contrast
is low. Two matching frames confirm the slot. Round positions 8–1 propose
**Scanning** in the cryochamber (011 on A, 008 on B). Self-destruct positions 3
and below propose **Intruder Alert** in the ship interior. A readable, empty
self-destruct track is inactive. A counter beside the numbers is outside the
track. Uncertain or covered slots retain the last confirmed reading.

Run the vision worker with `--game --checkpoint path/to/weights.pth` to
publish model detections for pieces. Bounding boxes remain visible between
model updates. The built-in Nemesis proposals use `noise`, `fire`, `malfunction`,
`alien`, `character` and optionally `hand` and `dice`. Dice get a bounding box
and protect a covered marker's last confirmed state. The local fire check can
provide observations while the trained model starts.
On Nemesis A and B, Game observation checks model Fire boxes against the matching
camera image. Boxes with a clear dice shape are treated as possible occluders.
If that source image has expired, the previous Fire state stays in place.
The worker uses the base of an alien or character to assign it to a room.
Noise in a mapped corridor proposes **Light Flicker** there. Fire and
malfunction have independent room effects. A room gets an **Alarm** proposal
while at least one alien remains. These built-in proposals appear for review.

### Link a trained detector to an animation

In **Animations**, select the board and a Room, Inside, or Outside animation.
Under **Camera trigger**, select a trained model and a class from its
dropdown, then set the minimum confidence. The editor lists registered
checkpoints and detectors currently publishing results. Select **Apply** to save
the binding with the animation. Select **None** to remove the binding.

Start the worker with `--game --checkpoint path/to/weights.pth`. Registered
checkpoints supply their model ID and RF-DETR variant. For custom checkpoints,
use `--model-id my-detector` to give the worker a stable ID of your choice.

Nemesis A and B already pair the seven-class Nemesis detector with Fire,
Malfunction, Light Flicker and the room Alarm. Fire uses a verification opacity
of 0.42. These bindings are editable like any other animation setting.

Turn on **Camera effects** in the dashboard once the board camera and trained
model worker are running. The server applies bindings in the background,
including while the camera dialog is closed. The switch starts off on each
server launch. Turning it off stops the instances started by the camera.
**Waiting for model** means the server has yet to receive fresh detections for
the model linked to the selected board's animations.
On setups without server rendering, keep the dashboard open on the server PC
to run the camera observer.
**Camera → Game observation** shows the readings for review.

A confirmed presence starts the linked animation. Room animations use the
detected position. Two fresh, clear readings of the last known positions stop
the camera-started instance. Occlusion, glare or incomplete coverage keep the
prior reading while the camera checks. Room animations also offer an optional
**Verification opacity**. When the last position is hard to read, the renderer
briefly uses that opacity so the camera can check the room again.

---

## Diagnostic endpoints

These HTTP endpoints are served by the running TT-Beamer process and are
intended for operator troubleshooting, not normal use.

### `GET /api/diag/ssr-screenshot`

Returns a JPEG snapshot of what the SSR Chromium tab is currently
rendering. Useful for confirming that the server-side render path is
producing the expected frame without opening a browser.

Returns `503` when the SSR tab is not yet attached.

### `GET /api/diag/ssr-eval-in-tab?expr=…`

Evaluates a JavaScript expression inside the SSR Chromium tab via CDP and
returns `{ ok: true, value: … }`. Useful for probing live runtime state
(e.g. `window.TT_BEAMER_RUNTIME_PROJECTION_GRID_STATE`).

**Security:** only reachable from `127.0.0.1` / `::1` unless the server
is started with `SSR_DIAG_ENABLE=1`. Expressions are capped at 2048
characters and may not contain newlines or nested `eval`/`Function` calls.

Returns `403` from non-localhost without the env gate; `400` on invalid
expressions; `503` when CDP is not attached.

---

## Media cache utilities

Two server endpoints produce and cache re-encoded MP4 variants on demand.
The caches are stored under `resources/` and are safe to delete — the
server re-encodes on the next request.

### `GET /api/animation-reverse?asset=<path>[&height=360|480|720]`

Returns a time-reversed MP4 of the given asset (URL path relative to the
server root, e.g. `/resources/animations/snow.mp4`). Used automatically
by the runtime when an animation's direction is set to **Reverse** or its
playback mode is **Boomerang**.

The first call synchronously re-encodes with `ffmpeg`; subsequent calls
are served from `resources/.reverse-cache/` keyed by the source file's
mtime. The optional `height` parameter (360, 480, or 720) encodes a
downscaled reverse in the same pass — used by the adaptive quality
controller.

### `GET /api/animation-proxy?asset=<path>&height=360|480|720`

Returns a downscaled proxy MP4 (default height: 480 px, aspect preserved,
audio dropped). Used automatically when the adaptive quality controller
downswitches under sustained frame-drops.

Cached under `resources/.proxy-cache/` with the same mtime-keyed naming
scheme. Audio is not included in proxy variants.

### Clearing the caches

Both cache directories are safe to delete at any time while the server is
stopped. They will be repopulated on demand.

```bash
rm -rf resources/.reverse-cache resources/.proxy-cache
```

---

## Browser-side diagnostic flags

These flags can be set from the browser console on any TT-Beamer page.
They persist only for the current page session.

### `window.TT_MP4_DIAG = true`

Enables per-animation MP4 paint diagnostics. Every ~1 second the console
receives a summary line counting paint outcomes: `live`, `stale`,
`fallback`, `gated-out`, `no-frame`. Also activated automatically by
adding `?mp4diag=1` to the page URL — the server appends this suffix to
the SSR tab automatically when `SSR_PUBLISHER_DEBUG=1`.

### `window.TT_DEBUG_58 = true`

Enables verbose Phase-58 instrumentation. Adds per-rAF paint-outcome
tallies and `[58-diag] room` / `[58-diag] play() rejected` lines to help
trace animation playback regressions. Throttled to once per second per
video element to keep output legible.

### Permanent `[58]` console.warn event log

The following `console.warn` tags are always active (not gated) and appear
in the browser DevTools console of any open TT-Beamer tab. They can be
filtered by the `[58]` prefix to get a chronological event log:

| Tag | Emitted when |
|---|---|
| `[58] re-trigger` | An animation is re-triggered while already playing |
| `[58] cluster-retrigger` | A pad cluster is re-triggered |
| `[58] cluster-toggle` | A cluster pad is toggled on or off |
| `[58] quick-toggle` | Quick-mode toggle applied |
| `[58] anim-removed` | A live-sync update removes an animation |
| `[58] anim-absent-start` | Sync arrives for an animation not yet in the DOM |
| `[58] anim-absent-recovered` | A previously absent animation is now found |
| `[58] re-stamp-accepted` | An idempotent re-stamp is accepted by live-sync |
| `[58] release-video` | A video element is released back to the pool |
| `[58] prune-release` | Draw-loop prunes and releases a stale video element |
| `[58] phase` | MP4 playback phase transition (forward → reverse, etc.) |
| `[58] src-swap` | Video `src` is swapped to a different URL |
| `[58] quality` | Adaptive quality tier changes |
| `[58] quality-swap` | Proxy variant swap triggered by quality controller |
| `[58] boomerang-degraded` | Boomerang can't resolve a reverse variant (once per element) |
| `[58] select` | Room audio selection event |
