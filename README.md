# TABLETOP BEAMER | Atmosphere Controller

A tabletop projector overlay controller designed to enhance board games with immersive animations.

> NOTE: This is more of an hobby project build for myself than a stable piece of software. Expect bugs 🕷️. AI was heavily used here. 

<p align="center">
<table>
<tr>
  <td><video src="readme-assets/demo.mp4" controls width="400" height="250"></video></td>
  <td><video src="readme-assets/demo2.mp4" controls width="400" height="250"></video></td>
</tr>
</table>
<img src="readme-assets/tt-beamer-readme.png" width="350">
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


## Requirements

- **Short-throw, ceiling-mounted projector**  
  Ensure the projection fully covers your table.

  Example setup (Amazon Germany):
  - Projector: BenQ TH671ST  
  - Ceiling Mount: ONKRON Projector Ceiling Holder  
  - Raspberry Pi: Raspberry Pi 5 (8GB Starter Kit)

  > It’s fine if the image is larger than the table, you will correct this later using `xrandr`.

- **Raspberry Pi** (or similar Linux-based mini PC) connected to the projector

- **Computer** running the server

- **Mobile phone** with a browser for controlling animations


## Setup
### Raspberry Pi (Projector Device)

This project uses `xrandr` to transform the projected image so it perfectly fits the board of the game you want to play.

To enable `xrandr` on Raspberry Pi OS, switch from Wayland (labwc) to X11:

```bash
sudo cp /etc/lightdm/lightdm.conf /etc/lightdm/lightdm.conf.bak
sudo sed -i 's/user-session=.*/user-session=rpd-x/' /etc/lightdm/lightdm.conf
sudo sed -i 's/autologin-session=.*/autologin-session=rpd-x/' /etc/lightdm/lightdm.conf
sudo systemctl restart lightdm
```

#### Install dependencies

```bash
sudo apt update
sudo apt install -y python3 python3-venv

cd ~
git clone https://github.com/McFredward/tt-beamer
cd tt-beamer/scripts

python3 -m venv venv
./venv/bin/pip install pygame numpy
```

#### Run the mapping tool

```bash
~/tt-beamer/scripts/venv/bin/python map.py
```

This tool allows you to:

- Adjust a rectangle to match your table or board
- Drag vertices with the mouse
- Fine-tune using arrow keys
- Press **Enter** to apply the transformation
- Press **ESC** to exit

### PC / Server

Run the backend server on a separate machine:

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

## Getting Started

1. Start the server:
   ```bash
   node server.mjs --host 0.0.0.0 --port 4173
   ```

2. Open the control interface on your phone:
   ```
   http://<SERVER-IP>:4173
   ```

3. On the Raspberry Pi, open the output view (**/output/final**):
   ```
   http://<SERVER-IP>:4173/output/final
   ```

4. Run the mapping script onf your Pi:
   ```bash
   ~/tt-beamer/scripts/venv/bin/python map.py
   ```

5. (Optional) Enable alignment mode from your phone to fine-tune room placement

6. You're ready—start controlling animations and enjoy your game!

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