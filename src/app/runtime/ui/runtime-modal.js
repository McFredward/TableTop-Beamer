// In-app modal dialogs (confirm + prompt) styled with the
// application's panel palette so they don't fall back to the browser's
// native window.confirm / window.prompt UI. Returns a Promise that
// resolves to the user's choice. Keyboard-accessible: Escape cancels,
// Enter confirms when the input matches expectations.
(() => {
  let activeBackdrop = null;

  function ensureCleanup() {
    if (activeBackdrop && activeBackdrop.parentNode) {
      activeBackdrop.parentNode.removeChild(activeBackdrop);
    }
    activeBackdrop = null;
  }

  function buildBackdrop() {
    const backdrop = document.createElement("div");
    backdrop.className = "tt-modal-backdrop";
    return backdrop;
  }

  function buildDialog({ title, body, danger }) {
    const dialog = document.createElement("div");
    dialog.className = `tt-modal${danger ? " tt-modal-danger" : ""}`;
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    if (title) {
      const heading = document.createElement("h3");
      heading.className = "tt-modal-title";
      heading.textContent = title;
      dialog.append(heading);
    }
    if (body) {
      const para = document.createElement("p");
      para.className = "tt-modal-body";
      // Preserve newlines in body text via white-space:pre-line in CSS.
      para.textContent = body;
      dialog.append(para);
    }
    return dialog;
  }

  function buildButtonRow(dialog, buttons) {
    const row = document.createElement("div");
    row.className = "tt-modal-actions";
    for (const btn of buttons) {
      const el = document.createElement("button");
      el.type = "button";
      el.textContent = btn.label;
      el.className = `tt-modal-btn${btn.kind ? ` tt-modal-btn-${btn.kind}` : ""}`;
      if (btn.disabled) el.disabled = true;
      el.addEventListener("click", () => btn.onClick(el));
      btn.el = el;
      row.append(el);
    }
    dialog.append(row);
    return row;
  }

  function showConfirm({
    title = "Confirm",
    body = "",
    confirmLabel = "OK",
    cancelLabel = "Cancel",
    danger = false,
  } = {}) {
    ensureCleanup();
    return new Promise((resolve) => {
      const backdrop = buildBackdrop();
      const dialog = buildDialog({ title, body, danger });
      const close = (value) => {
        document.removeEventListener("keydown", onKey, true);
        ensureCleanup();
        resolve(value);
      };
      const buttons = [
        { label: cancelLabel, kind: "ghost", onClick: () => close(false) },
        {
          label: confirmLabel,
          kind: danger ? "danger" : "primary",
          onClick: () => close(true),
        },
      ];
      buildButtonRow(dialog, buttons);
      backdrop.append(dialog);
      backdrop.addEventListener("pointerdown", (event) => {
        if (event.target === backdrop) close(false);
      });
      function onKey(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          close(false);
        } else if (event.key === "Enter") {
          event.preventDefault();
          close(true);
        }
      }
      document.addEventListener("keydown", onKey, true);
      document.body.append(backdrop);
      activeBackdrop = backdrop;
      // Focus confirm button by default.
      requestAnimationFrame(() => buttons[1].el?.focus());
    });
  }

  function showPrompt({
    title = "Enter value",
    body = "",
    placeholder = "",
    initialValue = "",
    expectedValue = null,
    confirmLabel = "OK",
    cancelLabel = "Cancel",
    danger = false,
  } = {}) {
    ensureCleanup();
    return new Promise((resolve) => {
      const backdrop = buildBackdrop();
      const dialog = buildDialog({ title, body, danger });
      const input = document.createElement("input");
      input.type = "text";
      input.className = "tt-modal-input";
      input.placeholder = placeholder;
      input.value = initialValue;
      input.autocomplete = "off";
      input.spellcheck = false;
      dialog.append(input);

      const close = (value) => {
        document.removeEventListener("keydown", onKey, true);
        ensureCleanup();
        resolve(value);
      };
      const matchesExpected = (raw) => {
        if (expectedValue === null) return true;
        return String(raw ?? "").trim() === String(expectedValue).trim();
      };
      const confirmBtn = {
        label: confirmLabel,
        kind: danger ? "danger" : "primary",
        disabled: !matchesExpected(initialValue),
        onClick: () => close(input.value),
      };
      const buttons = [
        { label: cancelLabel, kind: "ghost", onClick: () => close(null) },
        confirmBtn,
      ];
      buildButtonRow(dialog, buttons);

      // Live-validate the typed value against expected when provided.
      // Keeps the destructive button gated behind a (trimmed) match so
      // a trailing space the user can't see doesn't keep blocking them.
      function syncConfirmEnabled() {
        if (expectedValue === null) return;
        confirmBtn.el.disabled = !matchesExpected(input.value);
      }
      input.addEventListener("input", syncConfirmEnabled);

      backdrop.append(dialog);
      backdrop.addEventListener("pointerdown", (event) => {
        if (event.target === backdrop) close(null);
      });
      function onKey(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          close(null);
        } else if (event.key === "Enter") {
          if (confirmBtn.el.disabled) return;
          event.preventDefault();
          close(input.value);
        }
      }
      document.addEventListener("keydown", onKey, true);
      document.body.append(backdrop);
      activeBackdrop = backdrop;
      requestAnimationFrame(() => input.focus());
    });
  }

  window.TT_BEAMER_RUNTIME_MODAL = { showConfirm, showPrompt };
})();
