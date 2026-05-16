# Utility scripts

Two helper scripts ship under `scripts/`. Both are optional — the core app
works without them, but they cover common operator chores.

## Contents

- [`projection_mapper.py` — hardware-level cropping with `xrandr`](#projection_mapperpy--hardware-level-cropping-with-xrandr)
- [`loop_video.sh` — making non-looping videos loop seamlessly](#loop_videosh--making-non-looping-videos-loop-seamlessly)

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
