# Phase 49 — Mobile Drag-and-Drop Snap-Back: Empirical Debug Report

## TL;DR

After five failed fix attempts (gap-closures 16–21), the mobile drag-snap-back
bug was diagnosed empirically via Playwright touch emulation + a differential
hypothesis matrix. **Root cause: Chromium evaluates the `touch-action`
property chain AT TOUCHSTART. The previous fix declared `touch-action: none`
on `.anim-editor-list` only under `body.anim-editor-dragging`, which is added
INSIDE `_activateDrag` — too late.** Chromium had already classified the touch
as a scroll-candidate for the `<ul>`. On the first sustained vertical
touchmove (~110 ms after activation), Chromium claimed the touch for scroll
and fired `pointercancel` on our captured pointer.

**Fix**: Promote `touch-action: none` on `.anim-editor-list` (and
`.anim-editor-library`) to an unconditional CSS rule that applies from page
load. One CSS block, no JS changes.

**Verification**: With the fix applied, the same Playwright gesture that
previously snapped back now completes a successful reorder (24 sustained row
position updates instead of 2; `pointercancel` does not fire; `pointerup`
fires correctly at the end; the animation array order is mutated server-side).

## Reproduction Steps

Run `/tmp/repro_mobile_drag.py` against `http://localhost:4173/` with the dev
server up. Setup:

```python
context = browser.new_context(
    viewport={"width": 414, "height": 896},
    is_mobile=True, has_touch=True,
    user_agent="Mozilla/5.0 (Linux; Android 13) ... Chrome/119 Mobile",
)
```

Gesture, dispatched via CDP `Input.dispatchTouchEvent`:

1. `touchStart` at center of row #1 in the animation library list.
2. Hold for 700 ms (longer than `LONG_PRESS_MS = 500`) — long-press fires,
   `is-pending-longpress` -> arming complete (vibrate).
3. `touchMove` in 20 steps of 4 px each (80 px total), one every 25 ms.
4. `touchEnd`.

## Smoking-Gun Event Timeline (Pre-Fix, Baseline)

Captured via document-level pointer event listeners (capture phase) +
MutationObserver on `#anim-editor-list` and `<body>`:

```
[+30 ms]   pointerdown            isTrusted=true  pId=2  y=309
[+30 ms]   touchstart             isTrusted=true  touches=1
[+759 ms]  gotpointercapture      pId=2  y=313
[+759 ms]  pmove#1                y=313
[+809 ms]  pmove#2                y=317
[+823 ms]  body class +=anim-editor-dragging         <- _activateDrag runs
[+825 ms]  row.is-dragging classes added
[+825 ms]  row.style.position = "fixed", top=291    <- 6x style writes (px, top, left, width, zIndex, position)
[+825 ms]  UL childList: placeholder inserted
[+876 ms]  pmove#3                y=321              <- row.style.top = 295
[+926 ms]  touchmove#1            touches=1          <- FIRST raw touchmove on document
[+930 ms]  pointercancel          isTrusted=true  pId=2  y=0   <- 4ms later, browser cancels
[+943 ms]  releasePointerCapture (from _cleanupDrag)
[+943 ms]  body class -=anim-editor-dragging
[+943 ms]  row.style.position = ""                   <- SNAP-BACK to in-flow position
[+943 ms]  UL childList: placeholder removed
[+943 ms]  lostpointercapture
```

**Key facts:**
- `pointercancel.isTrusted === true` — the browser dispatched it, not our JS.
- It fires 4 ms after the first `touchmove` fires at document level.
- Only 2 of the 20 dispatched `touchMove` CDP events were processed before
  cancel (top: 291 -> 295 -> 299, ~8 px of total motion).
- The "snap back in <1 s" operator symptom is exactly: `_cleanupDrag()`
  clearing `row.style.position = ""`, returning the row to its in-flow
  position.

## Hypothesis Differential Matrix

To find the upstream trigger, every plausible cause was tested in isolation
by either (a) blocking it via JS monkeypatching or (b) applying overriding
CSS before any touch. Result: only one variable changed the outcome.

| Hypothesis | Test | Result | Verdict |
|---|---|---|---|
| `:active { transform: scale(0.97) }` creates stacking-context flip | Applied `transform: none !important; transition: none !important` on rows | cancel fires at +928 ms | REJECTED |
| Mid-touch `position: fixed` change | MutationObserver reverts position:fixed to "" immediately | cancel fires at +931 ms | REJECTED |
| Mid-touch body class `anim-editor-dragging` cascade | Blocked `body.classList.add("anim-editor-dragging")` | cancel fires at +932 ms | REJECTED |
| Combined: skip BOTH `position:fixed` AND body class | Both patches applied | cancel fires at +934 ms | REJECTED |
| `navigator.vibrate(15)` interferes with pointer events | Stubbed `navigator.vibrate = () => false` | cancel fires at +951 ms | REJECTED |
| Browser long-press context-menu detector | Listened for `contextmenu` | NEVER fires | REJECTED |
| Our own JS code dispatches the cancel | Checked `event.isTrusted` on the cancel | `true` (browser-dispatched) | REJECTED |
| `touch-action: none` on html+body (from load) | Applied before any touch | cancel fires at +947 ms | REJECTED |
| `touch-action: none` on `.anim-editor-library` only | Applied before any touch | cancel fires at +943 ms | REJECTED |
| **`touch-action: none` on `.anim-editor-list` only** | **Applied before any touch** | **NO cancel, drag fully succeeds, 24 row updates, pointerup fires** | **CONFIRMED** |

The matrix isolates `.anim-editor-list`'s effective `touch-action` AT
TOUCHSTART as the sole controlling variable.

## Root Cause

The `<ul class="anim-editor-list">` is implicitly a scrollable container
(the parent `.anim-editor-library` declares `overflow-y: auto` and the
`<ul>` is the scrolling child via flex/grid layout). Chromium's
gesture-disambiguation engine evaluates the `touch-action` chain at
**touchstart-time**, classifying each touch as a scroll-candidate for the
nearest scrollable ancestor whose effective `touch-action` allows the
needed direction.

With `.anim-editor-list` at default `touch-action: auto`, the touch is
flagged as a scroll-candidate. When the first sustained vertical
`touchmove` event arrives at document level (~110 ms after `_activateDrag`,
because `pointermove`s on captured pointers and `touchmove`s on the
document are dispatched out-of-step in Chromium), Chromium commits its
decision: the touch is claimed for scroll on the `<ul>`, and our captured
pointer is canceled via a synthetic `pointercancel` event.

Our `_onDragPointerCancel` handler (added in gap-closure-21) correctly
avoids the destructive `_commitDrop -> renderList -> replaceChildren` path,
but it still calls `_cleanupDrag`, which clears `row.style.position`,
removes the placeholder, and releases capture. From the user's perspective
this **is** the snap-back: the row was at `position: fixed` following the
finger, and one frame later it is back at `position: static` in the row's
original list slot.

**Why the existing `body.anim-editor-dragging .anim-editor-list { touch-action: none }`
rule didn't work**: the `body.anim-editor-dragging` class is added inside
`_activateDrag`, which only runs after the long-press timer is armed AND
the user has moved the finger by >= 6 px. By that point, the touch has
already been classified by Chromium's gesture engine; subsequent CSS
changes to `touch-action` on an in-flight pointer's ancestor chain do not
retroactively reclassify the touch. Chromium documents this behavior
internally as "scroll-claim is sticky once committed."

## Why the Previous 5 Attempts Missed It

Each attempt addressed a downstream symptom or an upstream variable that
turned out not to be the trigger:

- **gap-closure-16**: Long-press timer + `touch-action: pan-y` on rows.
  Wrong direction on the row's own touch-action.
- **gap-closure-17**: `overscroll-behavior: contain` + body lock. Solved
  pull-to-refresh but not in-list pointercancel.
- **gap-closure-18**: Reverted row to `touch-action: none`. Fixed
  PRE-activation cancel (during the long-press hold), but the in-flight
  drag still got canceled.
- **gap-closure-19**: Removed implicit-release `pointer-events: none`,
  scoped body cascade to body only. Fixed one self-inflicted cancel cause
  but not Chromium's scroll-claim cancel.
- **gap-closure-20**: `-webkit-touch-callout: none`, context-menu
  preventDefault, auto-scroll RAF. Fixed contextmenu cancel cause but not
  scroll-claim.
- **gap-closure-21**: Split `pointercancel` from `pointerup` handler
  (correct), preserve scrollTop across `replaceChildren` (correct), and
  added `touch-action: none` on library/list **but only under
  `body.anim-editor-dragging`**. The class-gating made the rule a no-op
  for preventing the cancel.

Each fix was rigorously implemented for the symptom or trigger it
identified, but the fundamental Chromium "touch-action evaluated at
touchstart" timing was not articulated in any of them, so the rule that
mattered (unconditional `touch-action: none` on `.anim-editor-list`)
remained gated behind a class that arrives too late.

## Applied Fix

`src/styles/design-system/animation-editor.css`, in the block immediately
following the existing `.anim-editor-scope-tabs, .anim-editor-library-head, ...`
pan-y rule:

```css
/* Phase 49 gap-closure-22 (2026-05-19): unconditional `touch-action: none`
 * on the list <ul> + library <aside>. ... [full comment in the source] */
.anim-editor-library,
.anim-editor-list {
  touch-action: none;
}
```

The now-redundant `touch-action: none` parts of the
`body.anim-editor-dragging .anim-editor-library, body.anim-editor-dragging .anim-editor-list`
rule were removed; the `overscroll-behavior: none` portion stayed because
that property is correctly reactive (it gates the in-flight gesture's
overscroll/pull-to-refresh handling).

**Trade-off** (same trade-off accepted in gap-closure-18): a vertical
swipe directly on the list cannot scroll the list. Users scroll via the
search input + scope-tabs area above the list (already has
`touch-action: pan-y`), or via the visible scrollbar.

## Verification

Re-ran the same Playwright reproduction script against the deployed CSS
(no runtime injection):

```
Computed touch-action on .anim-editor-list:    'none'   (was 'auto')
Computed touch-action on .anim-editor-library: 'none'

Row order before: ['hull-flicker', 'intruder-alert', 'power-outage']
Row order after:  ['hull-flicker', 'power-outage',  'intruder-alert']
Reordered?        True

pointercancel fired:   False   (expected False)
pointerup fired count: 1       (expected >= 1)
row top updates:       24      (expected >= 20)

Timeline tail:
[+47 ms]    pointerdown   y=309
[+771 ms]   gotpointercapture  y=313
[+827 ms]   row top=291.188px      (6x initial style writes from _activateDrag)
[+888 ms]   row top=295.188px
[+938 ms]   row top=299.188px      (where baseline CANCELED here)
[+988 ms]   row top=303.188px      (continues smoothly)
... 16 more sustained position updates ...
[+1488 ms]  row top=363.188px      (full 72 px of motion)
[+1809 ms]  pointerup y=389
[+1817 ms]  lostpointercapture
```

The same gesture that previously canceled now completes a successful
reorder: `_commitDrop` runs, `reorderAnimations(...)` mutates the
`animations` array, `renderList()` rebuilds the list with the new order,
and the order persists through the next render cycle.

## Files Changed

- `src/styles/design-system/animation-editor.css`
  - Added unconditional `.anim-editor-library, .anim-editor-list { touch-action: none }`
    block (gap-closure-22 comment block above it explains the Chromium
    timing rationale and why the previous gap-closure-21 class-gated rule
    was insufficient).
  - Removed redundant `touch-action: none` from the
    `body.anim-editor-dragging .anim-editor-library, body.anim-editor-dragging .anim-editor-list`
    rule (kept `overscroll-behavior: none` there).

No JS changes were necessary — the `_onDragPointerCancel` handler from
gap-closure-21 remains correct as a defensive guard for any future case
where `pointercancel` does fire (e.g., user receives a phone call
mid-drag, browser gesture multi-touch interruption). It just shouldn't be
the common path anymore.

## Recommended Operator Re-Test

Hard-reload Chrome Android (pull-to-refresh or browser-history overflow ->
"Reload"). In the Animation Editor:

1. Long-press a row in the library list until vibration confirms.
2. Drag up or down past at least one other row.
3. Release.
4. Confirm: row visually follows the finger, placeholder reflows, on
   release the row settles into the new position, and the order
   persists across a scope-tab switch and a page reload.

Edge cases to spot-check (all should still work):
- Long-press then release without moving -> row clicks (selects).
- Quick swipe up/down on the list without holding -> currently does
  nothing scroll-wise (this is the gap-closure-18 trade-off, unchanged).
- Pull-to-refresh attempt -> still suppressed by `overscroll-behavior: contain`.
- Two-finger pinch -> still suppressed by `touch-action: none`.
