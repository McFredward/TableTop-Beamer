# Utility scripts

Two helper scripts ship under `scripts/`. Both are optional — the core app
works without them, but they cover common operator chores.

## Contents

- [`projection_mapper.py` — hardware-level cropping with `xrandr`](#projection_mapperpy--hardware-level-cropping-with-xrandr)
- [`loop_video.sh` — making non-looping videos loop seamlessly](#loop_videosh--making-non-looping-videos-loop-seamlessly)
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
