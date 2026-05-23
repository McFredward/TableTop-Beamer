#!/usr/bin/env python3
"""
Phase 53 (2026-05-24) supplementary migration: shift projection-profile
srcYs for lockdown-a/-b by the same r-shift used on polygon Ys so the
existing mesh-warp calibrations keep mapping to the same physical
positions after the polygon migration.

Math: srcYs encode where (in stream-Y normalized space) each mesh row
samples the projection warp. The original calibration tied
polygon-stored-Y values to physical projector positions via the mesh.
We shifted polygon Y by r,shift; applying the same shift to srcYs
preserves the mesh-interpolation result the operator calibrated.

Also covers runtime-active-grid.json if its srcYs is from a lockdown
board (looks at originator board id).
"""
import json
import sys

PRE_W, PRE_H = 7978, 5456
POST_W, POST_H = 2500, 1755

r = (POST_W * PRE_H) / (POST_H * PRE_W)
shift = (1.0 - r) / 2.0

def migrate_y(y):
    return y * r + shift

def migrate_srcYs(srcYs):
    return [migrate_y(y) for y in srcYs]

# 1) projection-profiles.json — only nemesis-lockdown-a/-b boards
path = '/home/claw/tt-beamer/config/projection-profiles.json'
with open(path) as f:
    d = json.load(f)

migrated_count = 0
for board_id in ('nemesis-lockdown-a', 'nemesis-lockdown-b'):
    board_profiles = d.get(board_id) or {}
    for prof_name, prof in board_profiles.items():
        if isinstance(prof, dict) and 'srcYs' in prof:
            prof['srcYs'] = migrate_srcYs(prof['srcYs'])
            migrated_count += 1
            print(f"  migrated {board_id}/{prof_name}")

with open(path, 'w') as f:
    json.dump(d, f, indent=2)
    f.write('\n')

print(f"Migrated {migrated_count} projection profiles in {path}")

# 2) runtime-active-grid.json — check if originator is a lockdown board
path = '/home/claw/tt-beamer/config/runtime-active-grid.json'
try:
    with open(path) as f:
        d = json.load(f)
    grid = d.get('grid') or d
    board_id = grid.get('boardId') or grid.get('originatorBoardId') or d.get('boardId')
    print(f"runtime-active-grid board={board_id}")
    if board_id in ('nemesis-lockdown-a', 'nemesis-lockdown-b'):
        if 'srcYs' in grid:
            grid['srcYs'] = migrate_srcYs(grid['srcYs'])
            with open(path, 'w') as f:
                json.dump(d, f, indent=2)
                f.write('\n')
            print(f"  migrated runtime-active-grid.json srcYs")
        else:
            print('  no srcYs key — skipping')
    else:
        print(f"  not a lockdown board — skipping runtime-active-grid")
except FileNotFoundError:
    print("runtime-active-grid.json missing — skipping")

print("DONE.")
