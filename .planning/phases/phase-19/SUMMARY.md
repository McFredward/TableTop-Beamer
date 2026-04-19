---
phase: 19
title: Align Mode + In-Browser Projection Mapping
status: CLOSED
closed_at: 2026-04-19
plans:
  - 19-01  # Align button, Play Area display, /output route
  - 19-02  # 4-corner projection mapping (superseded by 19-04)
  - 19-03  # Grid mesh warp (superseded by 19-04)
  - 19-04  # Unified grid projection system
---

# Phase 19 Closure — Align Mode + Projection Mapping

Phase 19 replaced the old xrandr-only alignment flow with a complete in-browser projection-mapping system. What shipped goes well beyond the four formally-planned plans — much of the final feature set came out of user iteration.

## What Shipped

### Core projection system (plans 19-01 … 19-04)
- Prominent **Align Mode** button on the Dashboard; sticky "Align Mode ON" indicator while active.
- `/output` route served alongside the legacy `/output/final`.
- Play-area outlines displayed during align mode.
- Unified grid projection system replacing the original dual (4-corner CSS matrix3d + canvas mesh) approach:
  - Every grid intersection is a freely draggable `{x, y}` point.
  - Default 5×5 (4×4 cells), but fully variable — lines can be added/removed on the fly.
  - Post-draw mesh warp (no offscreen-canvas swap, zero overhead when undeformed).

### User-driven iteration (post-plan)
- **Line handles** with ↕ / ↔ badges for dragging entire rows/columns.
- **Outer-edge proportional scaling** — moving an outer edge or corner scales all inner points within the new bounds.
- **Pan** — clicking an empty area and dragging moves the whole grid, clamped so the bounding box stays in the viewport.
- **Rotate handles** — orange ↻ badges at each of the 4 corners, rotating the whole grid around its centroid.
- **Context menu** with Add/Remove lines (preserving existing deformation), Reset, and profile Save/Load/Delete.
- **Server-side profiles per board**, persisted to `config/projection-profiles.json`. Endpoints: `GET /api/projection-profiles?boardId=X` (list), `GET …/load`, `POST` (save), `DELETE`.
- **Undo stack** (up to 50 entries) with `Ctrl+Z` / `Cmd+Z`, pushing a snapshot before every destructive op.
- **`ESC`** fully resets the grid.
- **Triangulated mesh warp** — each cell split along the TL-BR diagonal into two triangles with proper affine warping. Matches the barycentric triangulation used for SVG-contour remapping, so animations and room outlines stay 1:1 aligned even under strong deformation.

### Documentation
- README restructured: Align Mode is now the primary alignment flow; xrandr preserved as an optional hardware-level cropping step for users who want to eliminate light spill.
- Full step-by-step walkthrough of every interaction pattern in Getting Started.

## Key Files

- `src/app/runtime/viewport/runtime-projection-mapping.js` — rewritten as a unified per-point grid system with triangulated warping, pan, rotate, undo, and profile management.
- `src/app/runtime/runtime-orchestration.js` — wires `getBoardId` into the projection ctx so profiles scope correctly.
- `src/app/runtime/render/runtime-draw-loop.js` — hook for `postDrawMeshWarp`.
- `src/app/runtime/polygon-editor/runtime-polygon-editor.js` — SVG room contours routed through `remapGridPoint` so they track the warp.
- `server.mjs` — `/api/projection-profiles` endpoints, `config/projection-profiles.json` storage.
- `README.md` — restructured.

## Decisions Worth Remembering

- Unified grid beats dual CSS-matrix3d + canvas-mesh — the dual system caused double-transform glitches at the corners.
- Triangulated cell warp (both for canvas `drawImage` and SVG barycentric remap) is mandatory — the earlier rect-to-rect `drawImage` silently ignored TR and BL corner displacements.
- Profiles are scoped per board; calibration also persists per client in `localStorage` as a fallback.
- Undo is scoped to a single align-mode session (stack cleared on `hideHandles`).

## Next Phase Intake

User has provided these items for the next phase:

1. **"Clear all" checkbox "also clear default animations"** — by default `Clear all` should only stop user-started animations; opt-in checkbox to also stop the outside/default animations.
2. **Polygon-edit bug on Play Areas** — double-click on a polygon edge adds a vertex for rooms but resets the whole play area. Fix.
3. **Animation creation UX rewrite** — rework the Room / Outside / Inside animation editors to have two tabs per section: "Create new" and "Edit existing". Avoid the current flow of entering name → picking type under the edit-dropdown → scrolling up to Create → confirming the dirty-type prompt.
4. **Dropdown labels** — drop the `(internal-id)` suffix, show only the user-friendly name (e.g. `Hull Flicker` instead of `Hull Flicker (hull-flicker)`).
5. **README expansion** — document all currently-shipped features (polygons, rooms, animations, clusters, …) in a user-friendly way in English.
6. **Board-scoped export/import** — current JSON export/import covers global settings. Rework so that users can export everything belonging to a single board (polygons, rooms, cluster membership, animations, sounds, align-mode profiles, …) and import it into another instance, so boards can be shared end-to-end. Likely as its own UI section (e.g. "Export/Import").
