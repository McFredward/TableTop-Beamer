#!/usr/bin/env python3
"""
Projection Mapping Calibration Tool
=====================================
Drag 4 corner points onto the table corners, press Enter to apply.
Re-running restores the last calibration automatically.

Dependencies:  pip install pygame numpy

Keys:
  ENTER        apply & save, close overlay
  R            reset points to default (20% margin)
  TAB          cycle active corner (then use arrow keys)
  Arrow keys   nudge active/hovered corner 1px  (SHIFT = 10px)
  ESC          reset xrandr to none & exit

Note on mouse jitter (Problem 3):
  When xrandr --transform is active, X11 mouse INPUT coordinates are
  still in the pre-transform logical space, but the visual output is
  warped. This causes the cursor to visually "jump" vs. window positions.
  It is a known X11 limitation. Workaround: run
    xinput set-prop <device-id> "Coordinate Transformation Matrix" <matrix>
  with the same matrix as xrandr. This script prints the xinput command too.
"""

import pygame
import numpy as np
import subprocess
import sys
import json
import os
import re
import time

# ── Config ────────────────────────────────────────────────────────────────────
POINT_RADIUS  = 14
POINT_COLOR   = (220, 30,  30)
POINT_HOVER   = (255, 110, 110)
LINE_COLOR    = (220, 30,  30)
LINE_WIDTH    = 2
FILL_COLOR    = (255,  50,  50,  35)
FONT_COLOR    = (255, 255, 255)
XRANDR_OUTPUT = ""   # leave empty = auto-detect
SAVE_FILE     = os.path.expanduser("~/.projmap_calibrate.json")


# ── xrandr helpers ────────────────────────────────────────────────────────────

def get_xrandr_output_name() -> str:
    """Returns only the output name — safe to call even while transform is active."""
    if XRANDR_OUTPUT:
        return XRANDR_OUTPUT
    try:
        result = subprocess.run(["xrandr"], capture_output=True, text=True, check=True)
        for line in result.stdout.splitlines():
            if " connected" in line:
                return line.split()[0]
    except Exception as e:
        print(f"[Error] xrandr: {e}"); sys.exit(1)
    print("[Error] No connected xrandr output found."); sys.exit(1)


def get_native_resolution(output: str) -> tuple:
    """
    Returns the NATIVE (physical) resolution of the output.
    Must be called AFTER resetting any transform, because an active --fb can
    make xrandr report the virtual framebuffer size instead of the native mode.
    Reads the line with '*' (= currently active mode) under the output.
    """
    try:
        result = subprocess.run(["xrandr"], capture_output=True, text=True, check=True)
        lines = result.stdout.splitlines()

        # First try: "NAME connected 1920x1080+0+0" on same line as connected
        for line in lines:
            if line.startswith(output) and " connected" in line:
                m = re.search(r"(\d+)x(\d+)\+\d+\+\d+", line)
                if m:
                    return int(m.group(1)), int(m.group(2))

        # Second try: find the mode line with '*' after the output section
        in_output = False
        for line in lines:
            if line.startswith(output) and " connected" in line:
                in_output = True
                continue
            if in_output:
                if line and not line[0].isspace():
                    break   # next output section — stop
                if "*" in line:
                    m = re.search(r"(\d+)x(\d+)", line.strip())
                    if m:
                        return int(m.group(1)), int(m.group(2))
    except Exception as e:
        print(f"[Error] xrandr: {e}"); sys.exit(1)
    print(f"[Error] Could not determine native resolution for {output}"); sys.exit(1)


# FIX #1: Reset both --transform AND --fb via --auto so the virtual framebuffer
# from the previous run doesn't linger and corrupt the resolution readout.
def reset_xrandr_transform(output: str):
    cmd = ["xrandr", "--output", output, "--auto", "--transform", "none"]
    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"[xrandr] Transform + framebuffer reset on {output}.")
    except subprocess.CalledProcessError as e:
        print(f"[xrandr] --auto reset failed ({e.stderr.strip()}), trying plain none...")
        fallback = ["xrandr", "--output", output, "--transform", "none"]
        try:
            subprocess.run(fallback, check=True, capture_output=True, text=True)
            print(f"[xrandr] Fallback transform reset on {output}.")
        except subprocess.CalledProcessError as e2:
            print(f"[xrandr] Fallback also failed: {e2.stderr.strip()}")


def format_matrix_arg(M: np.ndarray) -> str:
    # Präzision auf 10 Stellen erhöht! Perspektivische Parameter brauchen das.
    return ",".join(f"{v:.10f}" for v in M.flatten())


# ── Homography via Direct Linear Transform (DLT) ─────────────────────────────
#
# REPLACES the previous xkeystone_matrix() / Packard algorithm.
#
# WHY xkeystone was wrong here:
#   The Packard algorithm hard-codes TL as the algebraic "origin" — its
#   coordinates land directly in the matrix as m02=q0x, m12=q0y with zero
#   further arithmetic.  All other corners go through several divisions and a
#   full matrix inversion.  This structural asymmetry causes a systematic
#   error that grows with distance from TL, manifesting as a leftward offset
#   on the right side (TR/BR) while TL/BL remain pixel-perfect.
#
# THE FIX — DLT (Hartley & Zisserman, "Multiple View Geometry in Computer
#   Vision", Ch. 4):  Treat all 4 point correspondences identically and solve
#   for the 3×3 projective homography as the null vector of an 8×9 linear
#   system via SVD.  No privileged corner, no explicit inversion, numerically
#   symmetric and robust.
#
# WHAT WE COMPUTE:
#   T  (3×3)  such that  T · [screen_x, screen_y, 1]ᵀ  ~  [fb_x, fb_y, 1]ᵀ
#
#   xrandr --transform T samples framebuffer pixel T·(x,y) for each display
#   output pixel (x,y).
#
# CORRESPONDENCES:
#   screen mark TL  →  framebuffer corner (0, 0)
#   screen mark TR  →  framebuffer corner (W, 0)
#   screen mark BR  →  framebuffer corner (W, H)
#   screen mark BL  →  framebuffer corner (0, H)
def compute_homography_dlt(screen_w: int, screen_h: int, dst_pts) -> np.ndarray:
    """
    Compute T (3x3) mapping display pixel -> framebuffer pixel via DLT/SVD.
    Includes Normalized DLT AND X11 16.16 fixed-point optimization.
    """
    W, H = float(screen_w), float(screen_h)

    # 1. Koordinaten normalisieren (verhindert SVD Präzisionsverlust)
    src_pts_norm = [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)]
    dst_pts_norm = [(pt[0]/W, pt[1]/H) for pt in dst_pts]

    A = []
    for (sx, sy), (dx, dy) in zip(src_pts_norm, dst_pts_norm):
        A.append([-dx, -dy, -1,    0,   0,  0, sx*dx, sx*dy, sx])
        A.append([  0,   0,  0, -dx, -dy, -1, sy*dx, sy*dy, sy])

    A = np.array(A, dtype=np.float64)
    _, _, Vt = np.linalg.svd(A)
    T_norm = Vt[-1].reshape(3, 3)

    # 2. Denormalisieren
    N_src_inv = np.array([[W, 0, 0], [0, H, 0], [0, 0, 1]])
    N_dst = np.array([[1/W, 0, 0], [0, 1/H, 0], [0, 0, 1]])
    
    T = N_src_inv @ T_norm @ N_dst
    
    # --- DER X11 HACK ---
    # Wir skalieren die gesamte Matrix so hoch wie möglich, ohne das
    # 16-Bit Integer Limit (32767) von XRender zu sprengen.
    # Das gibt den winzigen Werten unten links ca. 15-20x mehr Präzision.
    max_val = np.max(np.abs(T))
    scale_factor = 32000.0 / max_val
    T_optimized = T * scale_factor
    
    return T_optimized


def verify_homography(T: np.ndarray, screen_w: int, screen_h: int, dst_pts):
    """
    Debug: apply T to each user mark, print result vs expected fb corner.
    Residuals should be < 0.5 px; if not, something upstream is wrong.
    """
    labels   = ["TL", "TR", "BR", "BL"]
    W, H     = float(screen_w), float(screen_h)
    expected = [(0.0, 0.0), (W, 0.0), (W, H), (0.0, H)]
    print("[Verify] Homography residuals (target < 0.5 px):")
    for lbl, pt, exp in zip(labels, dst_pts, expected):
        p  = np.array([float(pt[0]), float(pt[1]), 1.0])
        q  = T @ p;  q /= q[2]
        err = ((q[0]-exp[0])**2 + (q[1]-exp[1])**2) ** 0.5
        print(f"  {lbl}  mark ({pt[0]:7.1f}, {pt[1]:7.1f})"
              f"  →  mapped ({q[0]:8.2f}, {q[1]:8.2f})"
              f"  expected ({exp[0]:7.0f}, {exp[1]:7.0f})"
              f"  err = {err:.3f} px")


def apply_xrandr_transform(T: np.ndarray, output: str, W: int, H: int) -> bool:
    matrix_str = format_matrix_arg(T)
    cmd_str = f"xrandr --output {output} --fb {W}x{H} --transform {matrix_str}"

    xinput_note = (
        "  # Fix mouse jitter — find your pointer id with: xinput list\n"
        f"  xinput set-prop <pointer-id> 'Coordinate Transformation Matrix' {matrix_str}"
    )

    print()
    print("━" * 72)
    print("  COPYABLE COMMAND:")
    print(f"  {cmd_str}")
    print()
    print("  To reset:")
    print(f"  xrandr --output {output} --auto --transform none")
    print()
    print("  To fix mouse jitter (optional):")
    print(xinput_note)
    print("━" * 72)
    print()

    try:
        subprocess.run(
            ["xrandr", "--output", output, "--fb", f"{W}x{H}", "--transform", matrix_str],
            check=True, capture_output=True, text=True
        )
        print("[xrandr] Transform applied successfully.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[xrandr] Error: {e.stderr.strip()}")
        return False


# ── Persistence ───────────────────────────────────────────────────────────────

def save_points(fb_points, output: str, w: int, h: int):
    try:
        with open(SAVE_FILE, "w") as f:
            json.dump({"output": output, "fb_w": w, "fb_h": h, "fb_points": fb_points}, f, indent=2)
        print(f"[Save] Saved to {SAVE_FILE}")
    except Exception as e:
        print(f"[Save] Failed: {e}")


def load_points(output: str, w: int, h: int):
    """Returns fb_points scaled to current resolution, or None."""
    if not os.path.exists(SAVE_FILE):
        return None
    try:
        with open(SAVE_FILE) as f:
            data = json.load(f)
        pts      = data.get("fb_points", [])
        saved_w  = data.get("fb_w", w)
        saved_h  = data.get("fb_h", h)
        if len(pts) != 4:
            return None
        sx = w / saved_w if saved_w else 1.0
        sy = h / saved_h if saved_h else 1.0
        scaled = [[round(p[0]*sx), round(p[1]*sy)] for p in pts]   # FIX #2: round not int
        print(f"[Load] Restored from {SAVE_FILE}: {scaled}")
        return scaled
    except Exception as e:
        print(f"[Load] Failed: {e}")
        return None


# ── Drawing ───────────────────────────────────────────────────────────────────

def draw_dashed_line(surface, color, start, end, width=1, dash=12, gap=6):
    x1, y1 = start;  x2, y2 = end
    dx, dy  = x2-x1, y2-y1
    length  = max(1, (dx**2+dy**2)**.5)
    nx, ny  = dx/length, dy/length
    pos, on = 0, True
    while pos < length:
        seg = min(dash if on else gap, length-pos)
        if on:
            pygame.draw.line(surface, color,
                             (x1+nx*pos, y1+ny*pos),
                             (x1+nx*(pos+seg), y1+ny*(pos+seg)), width)
        pos += seg;  on = not on


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    # ── Step 1: identify output, reset transform FIRST ────────────────────────
    output = get_xrandr_output_name()
    print(f"[Info] Output: {output}")

    reset_xrandr_transform(output)
    time.sleep(0.3)

    W, H = get_native_resolution(output)
    print(f"[Info] Native resolution: {W}×{H}")

    # ── Step 2: init pygame ───────────────────────────────────────────────────
    pygame.init()
    screen = pygame.display.set_mode((W, H), pygame.FULLSCREEN | pygame.NOFRAME)
    PW, PH = screen.get_size()
    print(f"[Info] Pygame surface: {PW}×{PH}")

    # FIX #2: round() everywhere for fb↔pygame pixel conversion (not int())
    scale_x = W / PW
    scale_y = H / PH
    if scale_x != 1.0 or scale_y != 1.0:
        print(f"[WARNING] Pygame surface {PW}×{PH} ≠ native {W}×{H} "
              f"— scaling by {scale_x:.4f}×{scale_y:.4f}")

    pygame.display.set_caption("Projection Calibration")
    pygame.mouse.set_visible(True)
    font_big   = pygame.font.SysFont("monospace", 18, bold=True)
    font_small = pygame.font.SysFont("monospace", 14)

    # ── Step 3: load or default points ───────────────────────────────────────
    margin = 0.20
    def default_fb_points():
        return [[round(W*margin),     round(H*margin)],
                [round(W*(1-margin)), round(H*margin)],
                [round(W*(1-margin)), round(H*(1-margin))],
                [round(W*margin),     round(H*(1-margin))]]

    def fb_to_pygame(fb_pts):
        return [[round(p[0]/scale_x), round(p[1]/scale_y)] for p in fb_pts]

    def pygame_to_fb(py_pts):
        return [[round(p[0]*scale_x), round(p[1]*scale_y)] for p in py_pts]

    loaded_fb = load_points(output, W, H)
    if loaded_fb is not None:
        points     = fb_to_pygame(loaded_fb)
        status_msg = "Loaded previous calibration — adjust & ENTER to re-apply"
        status_col = (100, 220, 100)
    else:
        points     = fb_to_pygame(default_fb_points())
        status_msg = ""
        status_col = FONT_COLOR

    labels       = ["TL", "TR", "BR", "BL"]
    dragging     = None
    hover        = None
    active_point = None
    clock        = pygame.time.Clock()
    overlay      = pygame.Surface((PW, PH), pygame.SRCALPHA)

    print("[Info] ENTER=Apply  R=Reset  TAB/Arrows=Nudge  ESC=Quit")

    running = True
    while running:
        mx, my = pygame.mouse.get_pos()

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.KEYDOWN:
                if event.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
                    fb_pts = pygame_to_fb(points)
                    print(f"[Points] pygame : {points}")
                    print(f"[Points] fb     : {fb_pts}")

                    # FIX #3: DLT — symmetric, no privileged corner
                    T  = compute_homography_dlt(W, H, fb_pts)
                    verify_homography(T, W, H, fb_pts)

                    ok = apply_xrandr_transform(T, output, W, H)
                    if ok:
                        save_points(fb_pts, output, W, H)
                        pygame.quit()
                        print("[Done] Transform live. Re-run this script to adjust.")
                        return
                    else:
                        status_msg = "xrandr error — see terminal"
                        status_col = (220, 80, 80)

                elif event.key == pygame.K_r:
                    points     = fb_to_pygame(default_fb_points())
                    status_msg = "Points reset to default"
                    status_col = FONT_COLOR

                elif event.key == pygame.K_TAB:
                    active_point = 0 if active_point is None else (active_point+1) % 4
                    status_msg   = f"Active: {labels[active_point]} — arrows nudge (SHIFT=10px)"
                    status_col   = FONT_COLOR

                elif event.key in (pygame.K_LEFT, pygame.K_RIGHT, pygame.K_UP, pygame.K_DOWN):
                    step   = 10 if (pygame.key.get_mods() & pygame.KMOD_SHIFT) else 1
                    target = dragging if dragging is not None else \
                             hover    if hover    is not None else active_point
                    if target is not None:
                        active_point = target
                        if event.key == pygame.K_LEFT:  points[target][0] -= step
                        if event.key == pygame.K_RIGHT: points[target][0] += step
                        if event.key == pygame.K_UP:    points[target][1] -= step
                        if event.key == pygame.K_DOWN:  points[target][1] += step
                        status_msg = ""

                elif event.key == pygame.K_ESCAPE:
                    reset_xrandr_transform(output)
                    running = False

            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                for i, p in enumerate(points):
                    if ((mx-p[0])**2+(my-p[1])**2)**.5 <= POINT_RADIUS+6:
                        dragging = i;  active_point = i;  break

            elif event.type == pygame.MOUSEBUTTONUP and event.button == 1:
                dragging = None

            elif event.type == pygame.MOUSEMOTION and dragging is not None:
                points[dragging] = [mx, my]

        hover = next(
            (i for i,p in enumerate(points)
             if ((mx-p[0])**2+(my-p[1])**2)**.5 <= POINT_RADIUS+6), None)

        # ── Draw ──────────────────────────────────────────────────────────────
        screen.fill((0, 0, 0))
        overlay.fill((0, 0, 0, 0))
        pygame.draw.polygon(overlay, FILL_COLOR, [tuple(p) for p in points])
        screen.blit(overlay, (0, 0))

        for a, b in zip([0,1,2,3,0], [1,2,3,0,0]):
            draw_dashed_line(screen, LINE_COLOR, points[a], points[b], LINE_WIDTH)
        draw_dashed_line(screen, (160,50,50), points[0], points[2], 1, 5, 10)
        draw_dashed_line(screen, (160,50,50), points[1], points[3], 1, 5, 10)

        for i, p in enumerate(points):
            col      = POINT_HOVER if (hover==i or dragging==i) else POINT_COLOR
            is_sel   = (active_point==i and dragging is None and hover is None)
            ring_col = (255,220,0) if is_sel else (255,255,255)
            pygame.draw.circle(screen, ring_col, p, POINT_RADIUS+3, 2)
            if is_sel:
                pygame.draw.circle(screen, (255,220,0), p, POINT_RADIUS+7, 1)
            pygame.draw.circle(screen, col, p, POINT_RADIUS)
            lbl = font_small.render(labels[i], True, (255,255,255))
            screen.blit(lbl, (p[0]+(-30 if i in (0,3) else 15), p[1]-26))
            coord = font_small.render(f"{p[0]},{p[1]}", True, (180,180,180))
            screen.blit(coord, (p[0]+(-65 if i in (0,3) else 18),
                                p[1]+(8 if i in (2,3) else -20)))

        # Status bar
        bar = pygame.Surface((PW, 44), pygame.SRCALPHA)
        bar.fill((10,10,10,210))
        screen.blit(bar, (0, PH-44))
        hint = status_msg if status_msg else \
               "ENTER=Apply   R=Reset   TAB=Select   Arrows=Nudge (SHIFT=10px)   ESC=Quit"
        screen.blit(font_big.render(hint, True, status_col), (20, PH-31))
        sc  = f"  scale:{scale_x:.3f}×" if scale_x != 1.0 else ""
        inf = font_small.render(f"{output}  {W}×{H}{sc}", True, (120,120,120))
        screen.blit(inf, (PW - inf.get_width()-16, PH-28))

        pygame.display.flip()
        clock.tick(60)

    pygame.quit()
    print("[Done] Exited.")


if __name__ == "__main__":
    main()