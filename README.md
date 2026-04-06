# TABLETOP BEAMER | Atmosphere Controller

TableTop beamer overlay controller designed to enhance board games with animations to boost the immersion.

<p align="center">
<table>
<tr>
  <td><img src="readme-assets/tt-beamer-readme.png" width="350"></td>
  <td width="20"></td>
  <td><video src="readme-assets/TableTopBeamerPreview.mp4" controls width="400" height="250"></video></td>
</tr>
</table>
</p>

## Features
- Quickly start and stop Room-Animations:
<img src="readme-assets/tt-beamer_start_animations.gif" alt="Demo of the app's login flow" width="500" height="300"> 
- Optimzed for controll usage on a mobile Browser.
- Extra output path for animation output of the beamer:
<img src="readme-assets/tt-beamer_output.gif" alt="Demo of the app's login flow" width="500" height="300"> 
- Controll each animation: Adapt speed and opacity to your liking.
- Add your own Animations based on a gif or mp4.
- Pre-coded animations: Space-travel (outside), Alarm, Scanning, 
- Shipped with some mpf4/gif animations: 
- Add/Remove and draw your own areas/rooms for animations: Tow kind of areas: rooms (inner areas), and play-areas for controlling "outside" animations like space:
<img src="readme-assets/tt-beamer_polygons.gif" alt="Demo of the app's login flow" width="500" height="300">  
- 

## What you need

- **Short-throw ceiling-mounted projector** to display the image directly on your table.
  > This is my exact setup (German Amazon links):  
  > **Projector**: [BenQ TH671ST](https://www.amazon.de/dp/B075JH2J42?ref=ppx_yo2ov_dt_b_fed_asin_title&th=1)  
  > **Ceiling Mount**: [ONKRON Projector Ceiling Holder](https://www.amazon.de/dp/B0CGVGS7SN?ref=ppx_yo2ov_dt_b_fed_asin_title)  
  > **Raspberry Pi**: [Raspberry Pi 5 8GB Starter Kit](https://www.amazon.de/dp/B0CRPF47RG?th=1)  
  > *Make sure the beamer image covers your whole table before you mount the beamer on the ceiling. Its okay if the image is bigger and does not fit perfectly - for that we use an xrandr script on the pi later.* 

- **Raspberry Pi** (or comparable Linux mini-PC) connected to the projector.

- **Computer** running the server software.

- **Mobile phone** with a web browser for quick animation control during sessions.

## Set-Up
### Rasberry Pi (Mini-PC connected with the Beamer)

This project uses `xrandr` for transforming the image to perfectly fit to the corresponding table. To be able to use `xrandr` on RasberryPiOS, you need to switch from labwc (Wayland-based GUI) to X11.

```bash
sudo cp /etc/lightdm/lightdm.conf /etc/lightdm/lightdm.conf.bak # backup
sudo sed -i 's/user-session=.*/user-session=rpd-x/' /etc/lightdm/lightdm.conf
sudo sed -i 's/autologin-session=.*/autologin-session=rpd-x/' /etc/lightdm/lightdm.conf
sudo systemctl restart lightdm # or full restart
```

To be able to use the `xrandr` script in that repo, you need to install Python with some PyPI libraries. For that we use a virtual environment (`venv`):

```bash
sudo apt update
sudo apt install -y python3 python3-venv
cd ~
git clone https://github.com/McFredward/tt-beamer
cd tt-beamer/scripts
python3 -m venv venv
./venv/bin/pip install pygame numpy
```

After that you can always start the script with:

```bash
~/tt-beamer/scripts/venv/bin/python map.py
```

This script will show you a rectangle. You can drag the edge vertices with the mouse to fit the rectangle to the game board (or tge whole table for DnD battlemaps, etc.). If you click on a vertex, you can use the arrow keys to fine‑tune its position. Pressing Enter maps the entire projector output to that area using `xrandr` transform. Pressing ESC exits the mapping procedure and closes the script.


## Start

1. Start API + frontend:
   - `node server.mjs`
2. Open control UI:
   - `http://localhost:4173`
3. Optional final output (FX only):
   - `http://localhost:4173/output/final`

## Save flow

- `Save (local -> global defaults)` sends `POST /api/global-defaults`.
- Requires the Node API server (`node server.mjs`).
- Static hosting only (for example `python3 -m http.server`) cannot save defaults.

## Board catalog and import

- Catalog endpoint: `GET /api/boards`
- Import endpoint: `POST /api/boards/import`
- Imported boards are persisted in:
  - `config/boards/imported/*.json`
- Built-in boards are loaded from:
  - `config/zones/*.json`

### Import format (`tt-beamer.board-definition.v1`)

```json
{
  "board": {
    "boardId": "my-board-id",
    "metadata": {
      "name": "My Board",
      "imageSrc": "/resources/my-board.png"
    },
    "roomCatalog": [
      { "id": "r-1", "name": "Bridge", "x": 0.2, "y": 0.3, "radius": 0.06 }
    ],
    "roomClusters": [
      { "clusterId": "cluster-top", "name": "Top Side", "roomIds": ["r-1"] }
    ]
  }
}
```

## Notes

- Room clicks always select a single room.
- Cluster execution is available through the room target dropdown.
- Operator-facing copy must be English-only in Phase 6 flows (Control, Settings, Final flow, status, and errors).
- Language-sweep verification artifact:
  - `.planning/phases/phase-06/P6-HF1-LANGUAGE-SWEEP.md`

## Loop videos

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

ffmpeg -i input.mp4 -filter_complex "
[0:v]trim=0:10,setpts=PTS-STARTPTS[v1];
[0:v]trim=10:20,setpts=PTS-STARTPTS[v2];
[0:a]atrim=0:10,asetpts=PTS-STARTPTS[a1];
[0:a]atrim=10:20,asetpts=PTS-STARTPTS[a2];
[v2][v1]xfade=transition=fade:duration=5:offset=5[v];
[a2][a1]acrossfade=d=5[a]
" -map "[v]" -map "[a]" -c:v libx264 -crf 18 -preset slow output.mp4
```