// Animation editor library-list — owns the scope tabs, the filtered
// search list, and the selection-driven re-render fan-out (pane +
// preview). Reads shell.state by reference; cross-module callbacks
// (renderPane / renderPreview / notifySelection / syncDirtyBar /
// getEditorBoardId) are wired at init time so call sites stay
// byte-identical with the pre-W3.3 IIFE.
//
// Phase 24 W3.3-C2: extracted from animation-editor-view.js.
(() => {
  let ctx = null;
  let state = null;

  // Cross-sub-module callbacks injected at init time. Local shadow
  // declarations let renderList / render / etc. keep their bare-
  // identifier call sites byte-identical with the pre-split IIFE.
  let getEditorBoardId = null;
  let syncDirtyBar = null;
  let notifySelection = null;
  let renderPane = null;
  let renderPreview = null;

  // Phase 46 iter7: pointer-events drag state. Singleton — only one drag
  // can be in progress at a time. Created on pointerdown, populated on
  // activate (after movement threshold), cleared on pointerup/cancel.
  let activeDrag = null;
  let dragHandlersBound = false;

  function init(deps) {
    ctx = deps;
    state = deps.state ?? deps.shell?.getState?.() ?? null;
    if (deps.shell) {
      getEditorBoardId = deps.shell.getEditorBoardId;
      syncDirtyBar = deps.shell.syncDirtyBar;
      notifySelection = deps.shell.notifySelection;
    }
    if (typeof deps.getEditorBoardId === "function") getEditorBoardId = deps.getEditorBoardId;
    if (typeof deps.syncDirtyBar === "function") syncDirtyBar = deps.syncDirtyBar;
    if (typeof deps.notifySelection === "function") notifySelection = deps.notifySelection;
    if (typeof deps.renderPane === "function") renderPane = deps.renderPane;
    if (typeof deps.renderPreview === "function") renderPreview = deps.renderPreview;
    // Bind document-level handlers ONCE — pointer events from a captured
    // pointer fire on the captured element, but as a defensive fallback
    // when capture fails we also listen at document level.
    if (!dragHandlersBound) {
      document.addEventListener("pointermove", _onDragPointerMove, { passive: false });
      document.addEventListener("pointerup", _onDragPointerUp);
      document.addEventListener("pointercancel", _onDragPointerUp);
      dragHandlersBound = true;
    }
  }

  // Phase 46 iter7: per-row pointer-event hookup. Just records the start
  // state on pointerdown; activation + movement happens at document level
  // so the drag continues even when the cursor leaves the row.
  //
  // Phase 49 gap-closure-16 (2026-05-17): for touch pointers, drag requires
  // a LONG-PRESS first (500 ms hold without moving > 8 px). Mouse pointers
  // get immediate 6 px-threshold drag (unchanged behavior). The long-press
  // gate is necessary because the previous `touch-action: pan-x` CSS made
  // the animation list un-scrollable on phones — every vertical swipe was
  // captured as drag intent. Now `touch-action: pan-y` lets the list
  // scroll naturally; reorder is opt-in via hold-then-drag.
  const LONG_PRESS_MS = 500;
  const LONG_PRESS_MOVE_THRESHOLD_PX = 8;
  function _setupRowPointerDrag(row, def, list) {
    row.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (activeDrag) return;  // one drag at a time
      const rect = row.getBoundingClientRect();
      const isTouch = e.pointerType === "touch" || e.pointerType === "pen";
      activeDrag = {
        pointerId: e.pointerId,
        defId: def.id,
        row,
        list,
        startY: e.clientY,
        startX: e.clientX,
        offsetY: e.clientY - rect.top,
        width: rect.width,
        left: rect.left,
        height: rect.height,
        activated: false,
        placeholder: null,
        wasActivated: false,  // sticks after activate, used to suppress click
        isTouch,
        // Touch: drag is gated behind a long-press timer. Mouse: drag arms
        // immediately and activates after the 6 px movement threshold.
        longPressArmed: isTouch ? false : true,
        longPressTimer: null,
        cancelled: false,
      };
      try { row.setPointerCapture(e.pointerId); } catch {}
      if (isTouch) {
        row.classList.add("is-pending-longpress");
        activeDrag.longPressTimer = setTimeout(() => {
          if (!activeDrag || activeDrag.cancelled) return;
          activeDrag.longPressArmed = true;
          // Haptic feedback to confirm hold registered (where supported).
          try { if (navigator.vibrate) navigator.vibrate(15); } catch {}
        }, LONG_PRESS_MS);
      }
    });
  }

  function _onDragPointerMove(e) {
    if (!activeDrag || e.pointerId !== activeDrag.pointerId) return;
    const dy = e.clientY - activeDrag.startY;
    const dx = e.clientX - activeDrag.startX;
    // Touch path: if the user moves before the long-press timer fires,
    // CANCEL the pending drag — treat the gesture as a scroll/swipe.
    if (activeDrag.isTouch && !activeDrag.longPressArmed) {
      if (Math.abs(dy) > LONG_PRESS_MOVE_THRESHOLD_PX || Math.abs(dx) > LONG_PRESS_MOVE_THRESHOLD_PX) {
        // Cancel the long-press: clear timer, release the captured pointer,
        // remove the visual hint. The list keeps native scroll.
        activeDrag.cancelled = true;
        if (activeDrag.longPressTimer) clearTimeout(activeDrag.longPressTimer);
        activeDrag.row.classList.remove("is-pending-longpress");
        try { activeDrag.row.releasePointerCapture(activeDrag.pointerId); } catch {}
        activeDrag = null;
      }
      return;
    }
    if (!activeDrag.activated) {
      if (Math.abs(dy) < 6) return;
      _activateDrag();
    }
    e.preventDefault();
    // Float the row so its top edge follows the cursor (cursor stays
    // at the same offset within the row as on pointerdown).
    activeDrag.row.style.top = `${e.clientY - activeDrag.offsetY}px`;
    _updatePlaceholderPosition(e.clientY);
  }

  function _activateDrag() {
    activeDrag.activated = true;
    activeDrag.wasActivated = true;
    const row = activeDrag.row;
    const placeholder = document.createElement("div");
    placeholder.className = "anim-editor-row-placeholder";
    placeholder.style.height = `${activeDrag.height}px`;
    row.parentElement.insertBefore(placeholder, row);
    row.classList.add("is-dragging");
    row.style.position = "fixed";
    row.style.left = `${activeDrag.left}px`;
    row.style.top = `${activeDrag.row.getBoundingClientRect().top}px`;
    row.style.width = `${activeDrag.width}px`;
    row.style.zIndex = "1000";
    row.style.pointerEvents = "none";
    // Move row out of the list to a top-level absolute layer would also
    // work, but fixed + zIndex keeps DOM siblings intact for the
    // placeholder-position search below.
    activeDrag.placeholder = placeholder;
  }

  function _updatePlaceholderPosition(cursorY) {
    if (!activeDrag?.placeholder) return;
    const list = activeDrag.list;
    const others = Array.from(list.querySelectorAll(".anim-editor-row"))
      .filter((r) => r !== activeDrag.row);
    let insertBefore = null;
    for (const r of others) {
      const rect = r.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (cursorY < mid) {
        insertBefore = r;
        break;
      }
    }
    if (insertBefore) {
      if (activeDrag.placeholder.nextElementSibling !== insertBefore) {
        list.insertBefore(activeDrag.placeholder, insertBefore);
      }
    } else {
      // Cursor past the last row → drop at end.
      if (activeDrag.placeholder !== list.lastElementChild) {
        list.appendChild(activeDrag.placeholder);
      }
    }
  }

  function _onDragPointerUp(e) {
    if (!activeDrag || e.pointerId !== activeDrag.pointerId) return;
    if (activeDrag.activated) {
      e.preventDefault();
      _commitDrop();
    }
    _cleanupDrag();
  }

  function _commitDrop() {
    const placeholder = activeDrag.placeholder;
    if (!placeholder) return;
    // Find the row that will be next to the placeholder after drop.
    let targetId = null;
    let mode = null;
    const next = placeholder.nextElementSibling;
    const prev = placeholder.previousElementSibling;
    if (next && next.classList && next.classList.contains("anim-editor-row")
        && next !== activeDrag.row) {
      targetId = next.dataset.animationId;
      mode = "before";
    } else if (prev && prev.classList && prev.classList.contains("anim-editor-row")
               && prev !== activeDrag.row) {
      targetId = prev.dataset.animationId;
      mode = "after";
    }
    if (targetId && targetId !== activeDrag.defId) {
      reorderAnimations(state.scope, activeDrag.defId, targetId, mode);
    }
  }

  function _cleanupDrag() {
    if (!activeDrag) return;
    const row = activeDrag.row;
    const wasActivated = activeDrag.wasActivated;
    // Phase 49 gap-closure-16: clear long-press timer + visual hint.
    if (activeDrag.longPressTimer) {
      clearTimeout(activeDrag.longPressTimer);
    }
    if (activeDrag.placeholder?.parentElement) {
      activeDrag.placeholder.remove();
    }
    if (row) {
      row.classList.remove("is-dragging");
      row.classList.remove("is-pending-longpress");
      row.style.position = "";
      row.style.left = "";
      row.style.top = "";
      row.style.width = "";
      row.style.zIndex = "";
      row.style.pointerEvents = "";
      try { row.releasePointerCapture?.(activeDrag.pointerId); } catch {}
      if (wasActivated) {
        // Suppress trailing click that some browsers fire after the drag.
        row.dataset.justDropped = "1";
        // Clear the flag after the click event has had time to fire.
        setTimeout(() => { try { delete row.dataset.justDropped; } catch {} }, 300);
      }
    }
    activeDrag = null;
  }

  function collectAnimations(scope) {
    const boardId = getEditorBoardId();
    if (!boardId) return [];
    if (scope === "inside" && typeof ctx.getInsideFxProfile === "function") {
      return ctx.getInsideFxProfile(boardId)?.animations ?? [];
    }
    if (scope === "outside" && typeof ctx.getOutsideFxProfile === "function") {
      return ctx.getOutsideFxProfile(boardId)?.animations ?? [];
    }
    if (scope === "room" && typeof ctx.getRoomFxProfile === "function") {
      return ctx.getRoomFxProfile(boardId)?.animations ?? [];
    }
    return [];
  }

  function render() {
    renderScopeTabs();
    renderList();
    renderPane();
    renderPreview();
    syncDirtyBar();
  }

  // Phase 46 iter6 (2026-05-17): drag-and-drop reorder. Operator UAT —
  // "Ich will im Animations-Editor in der Lage sein bei den Elementen
  // auf der linken Seite die Reihenfolge zu verändern per drag and drop.
  // Die Reihenfolge soll dann entsprechend auch direkt bei der Toggle
  // 'Tap Action' bei den Kacheln sichtbar sein und server seitig
  // genauso gespeichert werden."
  //
  // The Tap-Action picker + Dashboard global buttons read directly from
  // the profile's animations array, so persisting a new array order
  // propagates automatically.
  function reorderAnimations(scope, fromId, toId, dropPos /* "before" | "after" */) {
    const boardId = getEditorBoardId();
    if (!boardId || !fromId || !toId || fromId === toId) return;
    const getter = scope === "inside" ? ctx.getInsideFxProfile
      : scope === "outside" ? ctx.getOutsideFxProfile
      : scope === "room" ? ctx.getRoomFxProfile
      : null;
    const setter = scope === "inside" ? ctx.setInsideFxProfile
      : scope === "outside" ? ctx.setOutsideFxProfile
      : scope === "room" ? ctx.setRoomFxProfile
      : null;
    if (!getter || !setter) return;
    const profile = getter(boardId);
    if (!profile?.animations) return;
    const arr = profile.animations.slice();
    const fromIdx = arr.findIndex((d) => d.id === fromId);
    if (fromIdx < 0) return;
    const [moved] = arr.splice(fromIdx, 1);
    let toIdx = arr.findIndex((d) => d.id === toId);
    if (toIdx < 0) {
      arr.splice(fromIdx, 0, moved);
      return;
    }
    if (dropPos === "after") toIdx += 1;
    arr.splice(toIdx, 0, moved);
    setter(boardId, { ...profile, animations: arr });
    if (typeof ctx.persistBoardProfiles === "function") ctx.persistBoardProfiles();
    if (typeof ctx.refreshGlobalButtons === "function") ctx.refreshGlobalButtons();
    if (typeof syncDirtyBar === "function") syncDirtyBar();
    renderList();
  }

  function renderScopeTabs() {
    const nav = ctx.animEditorScopeTabs;
    if (!nav) return;
    for (const btn of nav.querySelectorAll("button[data-anim-scope]")) {
      const isActive = btn.dataset.animScope === state.scope;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    }
  }

  function renderList() {
    const list = ctx.animEditorList;
    const empty = ctx.animEditorEmpty;
    const count = ctx.animEditorCount;
    if (!list) return;

    const all = collectAnimations(state.scope);
    const filtered = state.search
      ? all.filter((def) =>
          String(def.name || "").toLowerCase().includes(state.search)
          || String(def.id || "").toLowerCase().includes(state.search))
      : all;

    if (count) {
      count.textContent = `${all.length} configured`;
    }
    list.replaceChildren();
    if (filtered.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    // If no selection for this scope yet, seed from the first visible
    // entry so the editor pane (W3b-2) has something to render.
    if (!state.selectedIds[state.scope]) {
      state.selectedIds[state.scope] = filtered[0].id;
    }

    const icons = window.TT_BEAMER_UI_ICONS;
    for (const def of filtered) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "anim-editor-row";
      row.setAttribute("role", "option");
      row.dataset.animationId = def.id;
      // Phase 46 iter7 (2026-05-17): switched from HTML5 DnD to pointer
      // events. Operator UAT: "ich will, dass man den gesamten Balken im
      // Mauszeiger hat während man es nach oben oder unten verschieben
      // kann und sieht wie sich die Reihenfolge neu anordnet, und wenn
      // man loslässt zappt es an die Stelle an der es am nächsten ist."
      // HTML5 DnD gave only a faint OS-drawn ghost; pointer events let
      // the actual row visually follow the cursor + live-reorder the
      // others via DOM moves.
      if (state.selectedIds[state.scope] === def.id) {
        row.classList.add("is-selected");
        row.setAttribute("aria-selected", "true");
      } else {
        row.setAttribute("aria-selected", "false");
      }

      const iconWrap = document.createElement("span");
      iconWrap.className = "anim-editor-row-icon";
      iconWrap.setAttribute("aria-hidden", "true");
      if (icons?.createIcon) {
        const name = icons.resolveAnimationIcon
          ? icons.resolveAnimationIcon({
            ...def,
            codedEffectType: def.codedEffectType,
            codedKey: def.codedKey,
          })
          : "sparkles";
        iconWrap.append(icons.createIcon(name, { size: 16 }));
      }
      row.append(iconWrap);

      const body = document.createElement("span");
      body.className = "anim-editor-row-body";
      const nm = document.createElement("span");
      nm.className = "anim-editor-row-name";
      nm.textContent = def.name;
      body.append(nm);
      const sub = document.createElement("span");
      sub.className = "anim-editor-row-sub";
      sub.textContent = def.assetType ? String(def.assetType).toUpperCase() : "";
      body.append(sub);
      row.append(body);

      const dot = document.createElement("span");
      dot.className = "anim-editor-row-loop";
      dot.title = def.loopUntilStopped ? "Loops until stopped" : "Plays once";
      dot.setAttribute("aria-hidden", "true");
      row.append(dot);

      row.addEventListener("click", (e) => {
        // Phase 46 iter6: a drag-end fires click on some browsers — skip
        // selection if we just dropped (drag flag was set during dragstart
        // and cleared on dragend).
        if (row.dataset.justDropped === "1") {
          delete row.dataset.justDropped;
          return;
        }
        state.selectedIds[state.scope] = def.id;
        renderList();
        // The click handler used to only refresh
        // the list + notify listeners. The pane subscribes via
        // render() at init, not notifySelection, so the pane didn't
        // rebuild when the user picked another animation. Call
        // renderPane() / renderPreview() directly so both follow the
        // selection.
        renderPane();
        renderPreview();
        notifySelection();
      });

      // Phase 46 iter7: pointer-events-based drag. See _setupRowPointerDrag
      // below for the full state machine. We bind onto the row + window so
      // pointermove/up continues to fire even when the dragged row leaves
      // the list.
      _setupRowPointerDrag(row, def, list);

      list.append(row);
    }
    notifySelection();
  }

  window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_LIBRARY_LIST = {
    init,
    collectAnimations,
    render,
    renderScopeTabs,
    renderList,
    reorderAnimations,
  };
})();
