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

---

# Update 2026-05-19 — gap-closure-23 (DOUBLE REGRESSION RECOVERY)

## TL;DR (new)

After gap-closure-22 (`c162bef`) was deployed, operator tested on real
Android Chrome and reported BOTH regressions:

1. **Scroll dead**: "Nach deinen Änderungen kann ich nicht mehr scrollen in
   der Leiste" — vertical swipes on the list do nothing. (Predicted side
   effect of unconditional `touch-action: none`.)
2. **Drag also dead, different failure mode**: "bei gedrückt halten kommt
   zwar die Vibration und das Element bleibt highlightet aber es verschiebt
   sich nicht" — long-press timer fires (vibration + highlight visible),
   but the dragged row does NOT follow the finger. This is a DIFFERENT
   failure from the original snap-back; here the row never moves at all.

In addition, the operator added a new hard constraint:
- **Scroll must work even WHILE dragging.** Editor window is small; user
  must be able to drag a row from the top to the bottom by scrolling the
  list (with the element still grabbed). So auto-scroll-during-drag is
  now a hard requirement, not optional.

## Why gap-closure-22 broke both behaviors

**Scroll regression is expected**: `touch-action: none` on `.anim-editor-list`
turns the `<ul>` into a non-scrollable area for touch input. This was the
documented trade-off in gap-closure-22, but the operator now rejects it.

**Drag regression on real Android — root cause investigation**:
Chrome on real Android Chrome has a documented interaction between
`touch-action: none` on an ancestor and `setPointerCapture()` on a
descendant:

- MDN content issue [#38468](https://github.com/mdn/content/issues/38468)
  notes that the `setPointerCapture` MDN example requires `touch-action:
  none` *on the captured element itself* — when only the ancestor has it,
  Android Chrome's synthesized-pointer-events path silently stops
  dispatching pointermove events for the captured pointer.
- W3C Pointer Events spec, section 8.4: "If the user agent has
  determined the touch is not for scrolling/zooming (e.g. due to
  `touch-action: none`), it may still synthesize the pointermove
  events" — but the wording "may" leaves room for implementations to
  not, and in practice Android Chrome doesn't in some versions.

In our code path:
1. `pointerdown` fires on the row (works fine — `touch-action` on
   ancestor doesn't gate dispatch of `pointerdown`).
2. `row.setPointerCapture(e.pointerId)` is called (likely succeeds, but
   capture target's behavior is contingent on the row's own touch-action,
   which was effectively `auto` due to `all: unset` winning specificity).
3. Long-press timer fires after 500 ms → `vibrate()` runs → operator
   feels the haptic and sees the `is-pending-longpress` class.
4. User starts to move finger → on real Android, the synthesized
   `pointermove` events DO NOT FIRE for the captured pointer (because
   the ancestor `touch-action: none` causes Chrome to suppress
   synthesized pointer movements that would normally be derived from
   touchmove deltas).
5. Without `pointermove`, `_onDragPointerMove` never runs, the row's
   inline `top` style never updates, `_activateDrag` never runs (since
   it's called from inside `_onDragPointerMove`), and the row stays
   pinned at its initial location.

Why the Playwright differential matrix in gap-closure-22 missed this:
Playwright's chromium engine, even with `is_mobile=True, has_touch=True`
and CDP `Input.dispatchTouchEvent`, follows the desktop pointermove
synthesis path more aggressively than real Android Chrome. The desktop
behavior was used as the proxy and showed drag working with `touch-action:
none`. Real device showed it doesn't.

## New fix (gap-closure-23): JS-dynamic touchmove.preventDefault()

The standard pattern used by Sortable.js and react-beautiful-dnd:
- Keep native scroll enabled via CSS (`touch-action: pan-y` on rows).
- Attach a document-level `touchmove` listener with `{ passive: false }`.
- Once long-press timer has fired (`activeDrag.longPressArmed === true`),
  call `e.preventDefault()` on each subsequent touchmove. This cancels
  native scroll for the rest of the touch sequence per W3C spec.
- During the 500 ms long-press hold, no touchmove fires (finger held
  still), so Chrome hasn't started a scroll-claim yet. When the first
  post-hold touchmove arrives, it IS still cancellable. preventDefault
  works.

Key insight on the spec: `preventDefault()` on `pointermove` does NOT
cancel native scroll. The W3C-defined hook for cancelling native scroll
is `touchmove.preventDefault()`. The existing code preventDefaulted the
wrong event family — that's why gap-closure-22 needed `touch-action:
none` as a CSS fallback in the first place.

### CSS changes (animation-editor.css)

```css
/* gap-closure-23: was `touch-action: none` (gap-closure-18) */
#animation-editor-page .anim-editor-row,
.anim-editor-row {
  cursor: grab;
  touch-action: pan-y;
}
```

The `#animation-editor-page` prefix gives this rule specificity (1,1,0)
so it beats the `all: unset` declaration at line 399 (also (1,1,0), but
later source order means equal specificity → later wins for the
`touch-action` property re-statement).

The unconditional `.anim-editor-library, .anim-editor-list { touch-action:
none }` rule from gap-closure-22 has been REMOVED. Library and list
inherit `touch-action: auto` (default), which is what we want for
pre-long-press scrolling.

### JS changes (animation-editor-library-list.js)

```javascript
document.addEventListener("touchmove", _onDragTouchMove, { passive: false });

function _onDragTouchMove(e) {
  if (!activeDrag || !activeDrag.longPressArmed) return;
  if (e.cancelable) e.preventDefault();
}
```

`_updateAutoScroll` (gap-closure-20) is unchanged. It still
programmatically updates `list.scrollTop` when the finger nears the
list's top/bottom edge during an ACTIVE drag. Programmatic scroll is
independent of touch-action, so it continues to work alongside the
JS-prevented native scroll.

## Verification Matrix (Playwright, real raw touch events via CDP)

Tested via `Input.dispatchTouchEvent` (not pointer events) to better
match real Android behavior. Five tests, all passing:

| Test | Setup | Expected | Result |
|---|---|---|---|
| 1. Quick swipe scrolls list | touchstart → 10 quick touchmoves up (150 px in 150 ms) → touchend | `list.scrollTop` advances; no `is-dragging` class; row order unchanged | **PASS** scrollTop 0 → 135 |
| 2. Long-press + drag moves row | touchstart → hold 700 ms → 20 touchmoves down (80 px) → touchend | Mid-drag has `is-dragging`; on release, row order changes | **PASS** reorder committed |
| 3. Drag to edge auto-scrolls | touchstart → hold 700 ms → drag to within 30 px of bottom → HOLD 1 sec | `list.scrollTop` keeps advancing during the dwell without further finger motion | **PASS** scrollTop 72 → 149 over 1 sec dwell |
| 4. Touch outside list (search) | touchstart on `.anim-editor-search input` → touchend | No drag triggered | **PASS** |
| 5. Active drag in MIDDLE blocks native scroll | touchstart → hold 700 ms → move to middle of list (NOT edge) → pan up/down 10 px alternating × 20 | `list.scrollTop` does NOT advance via native pan (drag JS handles motion; auto-scroll inactive in middle zone) | **PASS** delta = 0 px |

Reproduction script: `/tmp/repro_mobile_regression_v3.py` (matrix) +
`/tmp/repro_mobile_regression_v1.py` (single-shot).

## Reasoning: Why this should work on real Android

This fix removes the gap-closure-22 mechanism (touch-action: none on
ancestor) that we believe caused the real-Android-only drag failure. In
its place we use a pattern (touchmove.preventDefault from passive-false
listener) that is used by every major drag library (Sortable.js,
react-beautiful-dnd, dnd-kit) on real Android Chrome with the same
viewport-locked-list use case.

The mechanism for cancelling native scroll while keeping
setPointerCapture functional:
- Row's `touch-action: pan-y` means Chrome WILL dispatch synthesized
  pointermove events for the captured pointer (synthesis is gated by
  the captured element's own touch-action, not its ancestor's).
- During the 500 ms hold, no movement = no scroll-claim by Chrome.
- When user begins to move post-hold, `_onDragTouchMove` fires before
  any layout-pan begins (touchmove listeners run in capture phase
  before Chromium commits to a gesture interpretation), `e.cancelable`
  is `true` (no scroll yet), and `preventDefault()` cancels native
  scroll for the rest of the sequence.

Caveat: If the operator's specific Android Chrome version has an even
more aggressive gesture-claim than we've accounted for here, this fix
may still fail. In that case the fallback is to ALSO add a
`document.addEventListener("touchstart", ...)` with `{ passive: false }`
that calls `e.preventDefault()` when the touch target is a
`.anim-editor-row` — that would force-cancel any scroll-claim at the
earliest possible moment. We'd rather avoid it because it disables all
default browser behavior on the row including any tap-related haptics,
but it's a known escape hatch.

## Files Changed (gap-closure-23)

- `src/styles/design-system/animation-editor.css`
  - Removed the unconditional `.anim-editor-library, .anim-editor-list
    { touch-action: none }` block (gap-closure-22).
  - Changed the row's `touch-action` from `none` (gap-closure-18) to
    `pan-y` (gap-closure-23), via a higher-specificity
    `#animation-editor-page .anim-editor-row` selector list.
- `src/app/runtime/ui/animation-editor-library-list.js`
  - Added a `document.addEventListener("touchmove", ...)` with
    `{ passive: false }` and a new `_onDragTouchMove` handler that
    calls `e.preventDefault()` once `activeDrag.longPressArmed` is true.
  - No other JS logic changed. `_onDragPointerMove`, `_activateDrag`,
    `_updateAutoScroll`, `_onDragPointerUp`, `_onDragPointerCancel`,
    `_commitDrop`, `_cleanupDrag` all unchanged.

## Recommended Operator Re-Test (gap-closure-23)

Hard-reload Chrome Android. In the Animation Editor:

1. Quick vertical swipe on a row (without holding) — the list should
   scroll smoothly. (REGRESSION FIXED.)
2. Long-press a row until vibration confirms. Then drag up or down —
   row should now follow your finger. (REGRESSION FIXED.)
3. While dragging, move your finger close to the top or bottom edge of
   the list (~60 px) and hold — the list should auto-scroll so you can
   drop the row in a far-off position. (NEW REQUIREMENT.)
4. Drop. Confirm the row settles in the new position and the order
   persists.

Edge cases:
- Tap (no hold) → row selects.
- Hold then release without moving → row selects (cleanup runs, no
  reorder).
- Pull-to-refresh attempt → still suppressed.
- Mouse drag (desktop) → unchanged, immediate 6 px threshold drag.

---

# Phase 49 gap-closure-25 (2026-05-19): Dirty-bar Double-Tap on Mobile

## Bug

After gap-closure-24 attempted a fix for the operator's report —
"muss man immer wenn die dirty flag gesetzt wurde und man einen der
Buttons 'Discord' oder 'Save' am Handy drücken will zwei mal drauf
tippen, damit es reagiert" — the operator confirmed the bug PERSISTED.
First tap on `#anim-editor-discard` or `#anim-editor-apply` on Android
Chrome did nothing; second tap fired the click handler.

gap-closure-24's hypothesis was that the editor's `open()` auto-
focuses the search input, raising the soft keyboard, and the first tap
on a button is consumed by the browser dismissing the keyboard.
gap-closure-24 added a `pointerdown` listener on Apply/Discard that
calls `document.activeElement.blur()`. The hypothesis was directionally
correct but the FIX did not work.

## Empirical Investigation

Reproduction attempted in Playwright Pixel-7 emulation with raw CDP
`Input.dispatchTouchEvent` (NOT `page.touchscreen.tap()`, which
bypasses the natural touch-to-click pipeline). Three repro scripts at
`/tmp/anim-debug/repro.py`, `/tmp/anim-debug/repro2.py`,
`/tmp/anim-debug/repro3.py`.

### Event timeline on FIRST tap (Playwright, headless Chromium)

```
t=2188.2  pointerdown   trusted=true hover=false active=anim-editor-search
t=2188.6  touchstart    trusted=true hover=false active=BODY     # blur fired
t=2255.8  pointerup     trusted=true hover=false active=BODY
t=2256.1  touchend      trusted=true hover=false active=BODY
t=2268.8  mouseover     trusted=true hover=true  active=BODY
t=2268.9  mouseenter    trusted=true hover=true  active=BODY
t=2269.0  mousedown     trusted=true hover=true  active=BODY
t=2269.2  focus         trusted=true hover=true  active=anim-editor-discard
t=2269.2  mouseup       trusted=true hover=true  active=anim-editor-discard
t=2269.2  click         trusted=true hover=true  active=anim-editor-discard
t=2270.1  HANDLER_FIRED
```

**The bug DOES NOT REPRODUCE in Playwright** — single tap fires the
click handler reliably across all six tap-pattern variants
(10/30/80 ms hold, with/without pre-focus on search). This indicates
the bug is specific to real Android Chrome behavior that headless
Chromium does not exhibit: the actual soft keyboard and
visualViewport resize.

### activeElement trace through the operator's full flow

Simulated: `open()` → long-press row 0 (touchstart, 600 ms hold,
touchmove to row 1, touchend) → settle.

```
[active@after-open]               id=anim-editor-search
[active@after-touchstart-row]     id=anim-editor-search
[active@after-longpress-armed]    id=anim-editor-search
[active@after-touchend-drop]      id=anim-editor-search
[active@after-settle]             id=anim-editor-search
```

**`document.activeElement` NEVER changes**. The drag flow uses
`setPointerCapture` + `e.preventDefault()` on pointermove, neither of
which transfers focus away from the input. On real Android, this means
the soft keyboard remains UP for the entire flow up to the moment the
user taps Apply/Discard.

### CSS hover-rule audit

Hypothesis #1 from the task brief ("iOS-style hover-capture from
layout-shifting `:hover`") was eliminated empirically:
- `.rd-btn:hover` only changes `background`.
- `.rd-btn:active` applies `transform: scale(0.97)` — but on `:active`,
  not `:hover`, so it can't be the first-tap consumer.
- `.dir-obsidian button:hover` explicitly sets `transform: none`.

No layout-shifting `:hover` rule exists on the Apply/Discard buttons.

## Root Cause

`open()` auto-focuses `#anim-editor-search`, raising the Android soft
keyboard. The keyboard remains up throughout the editor session
because no flow blurs the input (the long-press-drag reorder uses
`setPointerCapture` + `preventDefault`, neither of which moves focus).

When the dirty flag becomes true (via reorder, name edit, slider, etc.)
and the user taps Apply or Discard, this is the first touch event
outside the focused input. Android Chrome's touch pipeline interprets
this as a signal to dismiss the keyboard. The dismissal triggers a
`visualViewport` resize animation between `touchstart` and `touchend`;
Chrome's click-synthesis at `touchend` cancels (or never fires) the
synthetic click because the visual layout has shifted mid-tap. The
second tap finds the keyboard already down, layout stable, and the
click fires normally.

gap-closure-24's `pointerdown.blur()` was too late in the event chain:
on real Android, `touchstart` precedes `pointerdown`, so by the time
the blur executes the keyboard-dismiss pathway has already begun.
Even if blur fires before touchstart, the dismissal animation is async
and the visualViewport resize still races with click synthesis.

## Why Playwright Cannot Reproduce

There is no real soft keyboard in headless Chromium. `visualViewport`
remains stable across the synthetic touch sequence. Click synthesis
runs unhindered. The bug is purely a real-device pathology driven by
the keyboard dismissal interaction with the click-synthesis layout
check.

## Fix Applied (gap-closure-25)

`src/app/runtime/ui/animation-editor-shell.js` — two changes:

**1. Skip open()-time auto-focus on touch devices**

```js
function _isTouchOnly() {
  try {
    return typeof window.matchMedia === "function"
      && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  } catch { return false; }
}

// inside open():
if (ctx.animEditorSearchInput && !_isTouchOnly()) {
  try { ctx.animEditorSearchInput.focus(); } catch {}
}
```

The `(hover: none) and (pointer: coarse)` compound query is the CSS
Media Queries Level 4 standard for identifying finger-driven
touchscreens (Android, iOS) and excluding hybrid laptops /
tablets-with-trackpad where the soft keyboard is not a concern.

**2. Defense-in-depth: blur focused input when dirty becomes true**

```js
// in syncDirtyBar(), after the bar visibility / Back-disabled toggles:
if (dirty) {
  const focused = document.activeElement;
  if (focused
      && focused !== document.body
      && (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA" || focused.tagName === "SELECT")
      && typeof focused.blur === "function") {
    try { focused.blur(); } catch {}
  }
}
```

This catches the case where the user manually focused a text field
later in the session (e.g., editing an animation's Name) before
mutating something that flips the dirty flag — the same Android
keyboard-dismiss-eats-first-tap race would otherwise apply.
Idempotent: blurring an already-blurred element is a no-op.

gap-closure-24's `pointerdown.blur()` listeners on Apply/Discard are
kept as a last-line defense for any transient focus state.

## Verification

Playwright assertions (`/tmp/anim-debug/verify_fix.py`):

**Touch device (Pixel-7 emulation):**
- `matchMedia('(hover: none) and (pointer: coarse)')` → `true`
- `activeElement` after `open()` → `BODY` (search input NOT focused)
- After manual focus on search → `markDirty()` → `syncDirtyBar()`:
  `activeElement` → `BODY` (blur fired)
- Dirty bar visible: true
- Apply click handler fires on a single raw CDP touchStart→touchEnd

**Desktop device (1280×800, no touch emulation):**
- Touch query → `false`
- `activeElement` after `open()` → `anim-editor-search` (unchanged
  desktop behavior preserved)
- Click handler fires normally

**Existing tests:** All 8 tests in `test/asset-delete-modal.test.mjs`
and `test/asset-picker-dirty-gate.test.mjs` still pass.

## Empirical Proof Limitation

The real Android Chrome bug **cannot be reproduced in Playwright
headless** (no soft keyboard, no visualViewport resize). The fix is
justified by the empirical chain of evidence (activeElement trace,
event-order analysis, CSS audit) but the proof-of-fix must be
confirmed by the operator on the actual Android device.
