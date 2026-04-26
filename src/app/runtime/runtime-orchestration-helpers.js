// W3.5-C1 — orchestration top-level helpers extracted from
// runtime-orchestration.js. Hosts the small helper functions that
// were previously top-level declarations inside the orchestration
// IIFE. Closure-light helpers only: shouldSuppressRapidTap closes
// over `state` (passed in via init); createConditionalFieldMountSlot
// and setConditionalFieldMounted close over zero orchestration
// symbols (DOM-only). deleteSelectedPolygonVertex was deferred per
// PLAN W3.5-C1 decision rule (>3 orchestration-scoped closures);
// it stays in the orchestration shim.
(() => {
  let _state = null;

  function init(dependencies) {
    _state = dependencies?.state ?? null;
  }

  function shouldSuppressRapidTap(actionKey, thresholdMs = 320) {
    return window.TT_BEAMER_INPUT_GUARDS.shouldSuppressRapidTap({
      state: _state,
      actionKey,
      thresholdMs,
    });
  }

  function createConditionalFieldMountSlot(field, anchorName) {
    if (!field || !field.parentElement) {
      return null;
    }
    const parent = field.parentElement;
    const anchor = document.createComment(`${anchorName}-mount-anchor`);
    parent.insertBefore(anchor, field.nextSibling);
    return {
      field,
      parent,
      anchor,
    };
  }

  function setConditionalFieldMounted(slot, mounted) {
    if (!slot?.field || !slot.parent || !slot.anchor) {
      return;
    }
    if (mounted) {
      if (!slot.field.isConnected) {
        slot.parent.insertBefore(slot.field, slot.anchor);
      }
      return;
    }
    if (slot.field.isConnected) {
      slot.field.remove();
    }
  }

  window.TT_BEAMER_RUNTIME_ORCHESTRATION_HELPERS = {
    init,
    shouldSuppressRapidTap,
    createConditionalFieldMountSlot,
    setConditionalFieldMounted,
  };
})();
