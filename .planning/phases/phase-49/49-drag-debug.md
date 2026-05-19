# Phase 49 Debug Session — Mobile Drag Pointer Loss

## Investigation summary

The "list zaps back to scrollTop=0 mid-drag" symptom is caused by Chrome Android firing
`pointercancel` on the captured pointer, which currently shares the same handler as
`pointerup` (`_onDragPointerUp`). Because `activeDrag.activated === true` at that
moment and the placeholder has already moved to a different DOM position, the handler
unconditionally calls `_commitDrop()` → `reorderAnimations()` → `renderList()` →
`list.replaceChildren()`. The `replaceChildren()` call empties the `<ul>`, which
forces `scrollTop = 0`, then re-populates with brand-new `<button>` rows — the
dragged `<button>` reference held by `activeDrag.row` is now an orphaned detached
node, so subsequent finger motion has nothing to track ("Grab verloren"). The
"scrolls back to top" tell is the smoking gun: it is the unavoidable side effect
of `Element.replaceChildren()` on a scrolled `overflow:auto` container.

The four previous gap-closure attempts (16–20) tried to prevent `pointercancel`
from firing in the first place (via `touch-action`, `overscroll-behavior`,
`-webkit-touch-callout`, viewport lock cascade). None of them added the
**downstream guard**: if `pointercancel` _does_ fire — for any reason — the
current code still routes through the destructive commit path. So even when the
attempts narrowed the trigger window, the same crash-path remained whenever the
browser actually canceled.

There is no MutationObserver, no live-sync subscriber, no external `renderList`
caller, no `onSelectionChange` listener registered anywhere in the codebase that
could rebuild the list. H1 was right (a full re-render fires mid-drag), but the
trigger is internal — our own `pointercancel → _commitDrop → renderList` chain.

## Hypothesis verification

### H1 (CONFIRMED): full list re-render fires mid-drag

**Evidence FOUND.** The mechanism is the `pointercancel` → `_onDragPointerUp` →
`_commitDrop` → `reorderAnimations` → `renderList` → `list.replaceChildren()` chain.

- `src/app/runtime/ui/animation-editor-library-list.js:47` — `pointercancel` is
  bound to **the same handler** as `pointerup`:
  ```js
  document.addEventListener("pointerup", _onDragPointerUp);
  document.addEventListener("pointercancel", _onDragPointerUp);
  ```
- `src/app/runtime/ui/animation-editor-library-list.js:263-270` — `_onDragPointerUp`
  unconditionally commits on `activeDrag.activated`, **does not distinguish**
  pointerup (intentional release) from pointercancel (aborted gesture):
  ```js
  function _onDragPointerUp(e) {
    if (!activeDrag || e.pointerId !== activeDrag.pointerId) return;
    if (activeDrag.activated) {
      e.preventDefault();
      _commitDrop();          // <-- runs on cancel too
    }
    _cleanupDrag();
  }
  ```
- `src/app/runtime/ui/animation-editor-library-list.js:272-292` — `_commitDrop`
  walks the placeholder's neighbours; if the placeholder has moved (which it
  has, the operator says "Balken geht ganz kurz mit dem Finger mit"), it calls
  `reorderAnimations(state.scope, activeDrag.defId, targetId, mode)`.
- `src/app/runtime/ui/animation-editor-library-list.js:365-395` — `reorderAnimations`
  ends with `renderList();` (line 394).
- `src/app/runtime/ui/animation-editor-library-list.js:407-521` — `renderList`
  starts with `list.replaceChildren();` (line 423). **This is the scrollTop=0
  reset.** `Element.replaceChildren()` clears all children synchronously; on an
  `overflow:auto` container this collapses `scrollHeight` to 0 and clamps
  `scrollTop` to 0. Re-appending children does not restore the saved scroll.
- After `replaceChildren`, every `.anim-editor-row` `<button>` is created fresh
  via `document.createElement("button")` (line 438). The original `<button>`
  referenced by `activeDrag.row` is now a **detached, orphaned node** — capture
  is implicitly released by the browser the moment the captured element is
  removed from the document tree. Subsequent `pointermove` events match
  `e.pointerId === activeDrag.pointerId` but `activeDrag` was nulled by the
  surrounding `_cleanupDrag` call anyway, so the handler bails out: "Grab verloren".
- "Scrolls to top on LOWER rows but not the top row" is consistent: the top row
  was already at `scrollTop = 0`, so the reset is invisible there; for any row
  whose visible position required scroll, the reset visibly snaps the list.

### H2 (REJECTED): live-sync `serverRendering-update` / `context-update` triggers a re-render

**Evidence NOT FOUND.** Greps for `applyLiveRuntimeSnapshot`, `serverRendering-update`,
`context-update`, `live-sync`, `liveSync` in the editor modules return zero hits.
The animation editor does **not** subscribe to any live-sync channel; no snapshot
broadcast can reach `renderList`. `runtime-live-sync-helpers.js` emits
`context-update` but no receiver in the editor.

### H3 (REJECTED): `setDirtyState` / mutation handler triggers a re-render

**Evidence NOT FOUND.** `syncDirtyBar` (`animation-editor-shell.js:370`) only
toggles `.anim-editor-back--dirty` and `[hidden]` on the dirty-bar element. It
does not call `renderList`. The only handlers that mutate `state` (search input,
scope tabs, add button, board picker, discard) all live behind explicit user
interactions on elements outside the list — none of them fire during a touch on
a row.

### H4 (REJECTED): observer (Intersection / Resize / Mutation) re-renders on layout change

**Evidence NOT FOUND.** Codebase-wide grep:
- `MutationObserver` → **zero occurrences** in `src/`.
- `IntersectionObserver` → zero in any editor module.
- `ResizeObserver` → only on `stage` and `projectionArea`
  (`runtime-orchestration.js:3056-3058`), never on `.anim-editor-list`.

### H5 (PARTIAL — proximate cause but not root): browser releases capture spontaneously

**Evidence FOUND, but this is the trigger upstream, not the bug.** Chrome on
Android does fire `pointercancel` on the captured pointer. Likely contributors,
in descending probability:

1. **`<ul>.anim-editor-list` has `touch-action: auto`** (default) — the scrollable
   ancestor's gesture surface is still wired for vertical scroll. Even though
   the row has `touch-action: none` and body has `touch-action: none` once
   `.anim-editor-dragging` lands, the captured-pointer's chain still touches a
   scrollable container in `auto` mode, which on Android Chrome can flip to
   `pointercancel` when programmatic `scrollTop` writes (our `_updateAutoScroll`
   loop) race against finger movement classification.
2. **Body class flip mid-touch (`document.body.classList.add("anim-editor-dragging")`)**
   changes body's `touch-action` from `auto` to `none` *after* `pointerdown`.
   Spec says this should not retroactively change pointer behaviour, but
   chromium has historically misbehaved here on touch.
3. **`:active` transition** — `theme-obsidian.css:264-268,278-280` give the
   `<button>` row a `transform: scale(0.97)` `:active` state with a transition.
   This is a stacking-context flip mid-touch; in some chromium builds it
   correlates with a pointer-event-state reset.

These are all _proximate_ triggers. The fix can either prevent them or guard
against the downstream commit. The downstream guard is mandatory because we
cannot enumerate every Android Chrome version's quirk.

## Root cause

**`src/app/runtime/ui/animation-editor-library-list.js:46-47, 263-270`** — the
`pointercancel` handler is identical to the `pointerup` handler and unconditionally
runs `_commitDrop()` whenever `activeDrag.activated` is true. `_commitDrop`'s
`reorderAnimations(...)` call ends with `renderList()` (line 394), and `renderList()`
calls `list.replaceChildren()` (line 423), which destroys the captured `<button>`,
resets `scrollTop` to `0`, and orphans `activeDrag`.

Secondary contributor: **`<ul>.anim-editor-list` and `.anim-editor-library` have
default `touch-action: auto`** during a drag (only `body` and `.anim-editor-row`
are pinned to `none`). This makes the captured-pointer chain include scroll-eligible
ancestors, which raises the probability of Android Chrome firing the unwanted
`pointercancel` in the first place.

## Proposed fix

Three targeted, layered changes. The first is the only one that actually closes the
bug — the other two reduce how often the bad path is triggered and harden against
future surprises. Do them all in one commit.

### Fix 1 — distinguish `pointercancel` from `pointerup` (REQUIRED)

`src/app/runtime/ui/animation-editor-library-list.js`

Split the document binding (line 46-47) into two distinct handlers, and add a
cancel path that **does not commit, does not call `reorderAnimations`, does not
call `renderList`** — just snaps the row back into flow:

```js
// Currently:
document.addEventListener("pointerup", _onDragPointerUp);
document.addEventListener("pointercancel", _onDragPointerUp);

// Becomes:
document.addEventListener("pointerup", _onDragPointerUp);
document.addEventListener("pointercancel", _onDragPointerCancel);
```

New handler (insert near `_onDragPointerUp`, ~line 270):

```js
function _onDragPointerCancel(e) {
  if (!activeDrag || e.pointerId !== activeDrag.pointerId) return;
  // Browser aborted the gesture (gesture-disambiguation, multi-touch,
  // visibility change, etc.). The user did NOT intentionally drop — we
  // must NOT commit a reorder and we must NOT renderList(). Snap the row
  // back to its in-flow position via _cleanupDrag() and forget it.
  _cleanupDrag();
}
```

`_cleanupDrag()` already does the right thing: removes the placeholder, clears
the `position: fixed` styling on the row (so it returns to its in-flow position),
releases pointer capture, removes the body class, kills the auto-scroll RAF, and
nulls `activeDrag`. No reorder, no renderList — the list state is unchanged, the
scroll position is preserved.

### Fix 2 — pin `touch-action: none` on the scrollable ancestor during drag (PREVENTATIVE)

`src/styles/design-system/animation-editor.css` near line 528.

Currently:
```css
body.anim-editor-dragging {
  touch-action: none;
  overscroll-behavior: none;
  -webkit-user-select: none;
  user-select: none;
}
```

Extend to also lock the list + library while dragging:
```css
body.anim-editor-dragging,
body.anim-editor-dragging .anim-editor-library,
body.anim-editor-dragging .anim-editor-list {
  touch-action: none;
  overscroll-behavior: none;
}
body.anim-editor-dragging {
  -webkit-user-select: none;
  user-select: none;
}
```

This removes the scrollable-ancestor signal from Chrome's gesture pipeline for the
duration of the drag, reducing the rate at which `pointercancel` is even
considered. The auto-scroll RAF still works because we set `scrollTop` directly
in JS, not via touch.

### Fix 3 — preserve scrollTop across `renderList()` (DEFENSE IN DEPTH)

`src/app/runtime/ui/animation-editor-library-list.js:407-423`.

Even after Fix 1, `renderList()` is legitimately called on drop, scope switch,
search filter, icon picker change, etc. Right now every one of these blows away
the operator's scroll position because `list.replaceChildren()` resets scrollTop
to 0. Capture and restore:

```js
function renderList() {
  const list = ctx.animEditorList;
  const empty = ctx.animEditorEmpty;
  const count = ctx.animEditorCount;
  if (!list) return;

  // Preserve scroll across the rebuild — replaceChildren() clamps
  // scrollTop to 0 when scrollHeight collapses. Saving + restoring
  // keeps the operator's view stable across selection/icon/search
  // changes (and is a safety net if anything inadvertently triggers
  // renderList mid-interaction).
  const savedScrollTop = list.scrollTop;

  const all = collectAnimations(state.scope);
  // ... existing body unchanged ...

  list.replaceChildren();
  // ... existing append loop unchanged ...

  // Restore at the end, after children are back. Clamp implicitly via
  // browser (scrollTop is clamped to scrollHeight - clientHeight).
  list.scrollTop = savedScrollTop;
}
```

Restore must happen AFTER all `list.append(row)` calls so `scrollHeight` is
correct. Put it as the last statement before `notifySelection()` at line 520.

## Why this will work and the previous 4 attempts didn't

The four previous attempts all targeted **`pointercancel`'s upstream trigger** —
they tried to convince Chrome not to fire it:

- **gap-closure-16** — `touch-action: pan-y` on rows. Wrong direction (rows became
  scroll-only, drag never starts).
- **gap-closure-17** — `overscroll-behavior: contain`, body lock class. Stopped
  pull-to-refresh but not the in-list pointercancel.
- **gap-closure-18** — `touch-action: none` on rows. Closes one upstream gesture
  path but the `<ul>` itself stayed `auto`, and the downstream commit path
  remained.
- **gap-closure-19** — removed implicit-release `pointer-events: none`,
  simplified body cascade. Removed one self-inflicted capture-release but
  the pointercancel path was still routed to `_commitDrop`.
- **gap-closure-20** — `-webkit-touch-callout: none`, `contextmenu` preventDefault,
  auto-scroll RAF. Removed one more upstream cancel cause (long-press contextmenu)
  but, again, did not touch the downstream commit-on-cancel path.

Every attempt added more upstream defences. **None of them changed what happens
when `pointercancel` actually fires** — the handler still committed a drop and
re-rendered the list. So as soon as Chrome found _any_ remaining reason to cancel
(and there are many possible reasons across Android versions, viewport states,
multi-finger ghost-touches, ROM-level gesture handlers), the same destructive
zap-back chain ran.

Fix 1 closes the loop: cancel means cancel, not "commit and rebuild". Even if
Chrome cancels for an unknown reason on a future device, the worst case is the
row snaps back into flow with the placeholder removed — no re-render, no scroll
reset, no orphaned button, no lost grab from the user's perspective beyond "I
have to start the long-press again". That's a recoverable UX, not a broken one.

Fix 2 reduces how often Fix 1's recovery branch is taken (most Android Chrome
gesture-cancel paths trace back to scrollable ancestors), so the user feels the
drag is rock-solid in practice rather than recoverable-but-flaky.

Fix 3 is the cherry-on-top safety net: any *future* code path that legitimately
calls `renderList` will no longer dump the operator back to the top of the list.
This also fixes a probably-unreported UX papercut where clicking an icon in the
edit pane (which triggers `renderList()` at line 236 of `animation-editor-edit-pane.js`)
resets the library scroll.
