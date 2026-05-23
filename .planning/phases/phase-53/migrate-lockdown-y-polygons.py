#!/usr/bin/env python3
"""
Phase 53 (2026-05-24): one-time data migration for nemesis-lockdown-a/b
polygon Y coordinates.

Background: Phase 50 (aspect-ratio-aware board import) replaced the
hardcoded 7978/5456 stage aspect with the image's natural aspect. For
nemesis-board-a/b the image is exactly 7978×5456 so nothing changed,
but the lockdown PNGs are rasterized at 2500×1755 (aspect 1.4245)
which differs from the polygon-design aspect 7978/5456 (= 1.4623) by
~2.6%. Polygons drawn pre-Phase-50 against the 1.4623 stage are now
visually shifted on the 1.4245 stage because they're 0..1 normalized
to the stage (which now matches the image aspect, not the design
aspect).

Migration math (derived for the cover-scaled rendering pre-Phase-50):
  r = A_post / A_pre = (2500/1755) / (7978/5456)
  new_y = old_y * r + (1 - r) / 2
X coordinates are unchanged — the image fills width 1:1 in both cases
(no horizontal cropping).
"""
import json
import sys

PRE_W, PRE_H = 7978, 5456   # polygon design aspect (Nemesis print dims)
POST_W, POST_H = 2500, 1755  # Lockdown PNG native dims

# r = A_post / A_pre = (POST_W/POST_H) / (PRE_W/PRE_H) = (POST_W * PRE_H) / (POST_H * PRE_W)
r = (POST_W * PRE_H) / (POST_H * PRE_W)
shift = (1.0 - r) / 2.0

print(f"r = {r}")
print(f"shift = {shift}")
print(f"verify: y=0.5 → {0.5*r + shift} (expect ≈0.5)")
print(f"verify: y=0.0737 → {0.0737*r + shift}")
print(f"verify: y=0.0 → {0.0*r + shift}")
print(f"verify: y=1.0 → {1.0*r + shift}")

def migrate_y(y):
    return y * r + shift

def migrate_polygon(poly):
    return [[p[0], migrate_y(p[1])] for p in poly]

def migrate_board(path):
    with open(path) as f:
        d = json.load(f)
    b = d['board']
    nrooms = 0
    npa = 0
    for room in b.get('roomCatalog', []):
        if 'polygon' in room and isinstance(room['polygon'], list):
            room['polygon'] = migrate_polygon(room['polygon'])
            nrooms += 1
    for pa in b.get('playAreas', []):
        if 'polygon' in pa and isinstance(pa['polygon'], list):
            pa['polygon'] = migrate_polygon(pa['polygon'])
            npa += 1
    with open(path, 'w') as f:
        json.dump(d, f, indent=2)
        f.write('\n')
    print(f"  → migrated {nrooms} room polygons + {npa} play-area polygons in {path}")

for path in sys.argv[1:]:
    print(f"Migrating {path}")
    migrate_board(path)

print("DONE.")
