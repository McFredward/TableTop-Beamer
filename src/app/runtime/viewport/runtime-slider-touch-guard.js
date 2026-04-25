// Prevent accidental slider activation while scrolling on mobile.
//
// On touch devices, range inputs capture touch events even during vertical
// scroll gestures, causing unintended value changes. This module intercepts
// touch interactions on range inputs and only allows them through if the
// user makes a deliberate horizontal gesture (starts on the slider and
// moves predominantly horizontally).
//
// Approach: on touchstart on a range input, prevent the default and track
// finger movement. If the first significant movement is horizontal (>8px
// horizontal before >8px vertical), unlock the slider and let it track.
// If vertical movement wins, let the scroll happen naturally.
(() => {
  const THRESHOLD = 8; // px before deciding direction

  function init() {
    if (!("ontouchstart" in window) && !navigator.maxTouchPoints) {
      return; // desktop — no guard needed
    }

    document.addEventListener("touchstart", onTouchStart, { passive: false });
  }

  function onTouchStart(event) {
    const target = event.target;
    if (!target || target.type !== "range") return;

    // Capture start position
    const touch = event.touches[0];
    if (!touch) return;

    const startX = touch.clientX;
    const startY = touch.clientY;
    let decided = false;
    let unlocked = false;

    // Temporarily disable pointer events on the slider so scrolling works
    target.style.pointerEvents = "none";

    function onTouchMove(moveEvent) {
      if (decided) return;
      const moveTouch = moveEvent.touches[0];
      if (!moveTouch) return;

      const dx = Math.abs(moveTouch.clientX - startX);
      const dy = Math.abs(moveTouch.clientY - startY);

      if (dx >= THRESHOLD || dy >= THRESHOLD) {
        decided = true;
        if (dx > dy) {
          // Horizontal gesture — unlock slider
          unlocked = true;
          target.style.pointerEvents = "";
          // Set the slider value based on touch position
          updateSliderFromTouch(target, moveTouch);
          // Continue tracking
          target.addEventListener("touchmove", onSliderTrack, { passive: true });
        }
        // If vertical: pointer-events stays "none", scroll happens naturally
      }
    }

    function onSliderTrack(trackEvent) {
      const trackTouch = trackEvent.touches[0];
      if (trackTouch) {
        updateSliderFromTouch(target, trackTouch);
      }
    }

    function onTouchEnd() {
      decided = true;
      target.style.pointerEvents = "";
      target.removeEventListener("touchmove", onSliderTrack);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);

      if (unlocked) {
        // Fire a final change event so listeners pick up the value
        target.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { once: true });
    document.addEventListener("touchcancel", onTouchEnd, { once: true });

    // Prevent the slider from immediately capturing the touch
    event.preventDefault();
  }

  function updateSliderFromTouch(slider, touch) {
    const rect = slider.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const step = parseFloat(slider.step) || 1;
    const raw = min + fraction * (max - min);
    const stepped = Math.round(raw / step) * step;
    const clamped = Math.max(min, Math.min(max, stepped));

    if (slider.value !== String(clamped)) {
      slider.value = clamped;
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  window.TT_BEAMER_RUNTIME_SLIDER_TOUCH_GUARD = { init };
})();
