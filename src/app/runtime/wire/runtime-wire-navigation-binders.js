// Phase 14-2: navigation + board import + quick mode event binders.
//
// Wires board select, board import (JSON + image), view navigation
// (dashboard / settings), settings subtab buttons, quick mode state
// buttons, and trigger/manage zone toggles. Exposed as
// wireNavigationBinders(ctx).
(() => {
  function wireNavigationBinders(ctx) {
    const {
      state,
      triggerFeedback,
      boardSelect,
      boardImportButton,
      boardImportFileInput,
      boardImportImageInput,
      boardImportNameInput,
      boardImportIdInput,
      boardStatus,
      openDashboardViewButton,
      openSettingsViewButton,
      settingsSubtabButtons,
      quickModeOffButton,
      quickModeToggleButton,
      quickModeClearButton,
      openTriggerZoneButton,
      openManageZoneButton,
      SETTINGS_SUBTAB_LABELS,
      switchBoard,
      importBoardFromFile,
      importBoardFromImage,
      setActiveView,
      syncShipPolygonEditorPanel,
      getBoard,
      reportActionError,
      normalizeSettingsSubtab,
      setSettingsSubtab,
      setQuickMode,
      setDashboardZone,
    } = ctx;

    boardSelect.addEventListener("change", () => switchBoard(boardSelect.value, {
      emitLiveContext: true,
      reason: "board-select",
    }));

    boardImportButton?.addEventListener("click", async () => {
      const jsonFile = boardImportFileInput?.files?.[0] ?? null;
      const imageFile = boardImportImageInput?.files?.[0] ?? null;
      boardImportButton.disabled = true;
      try {
        let result;
        if (jsonFile) {
          result = await importBoardFromFile(jsonFile);
        } else if (imageFile) {
          result = await importBoardFromImage(imageFile, {
            boardName: boardImportNameInput?.value ?? "",
            boardId: boardImportIdInput?.value ?? "",
          });
          setActiveView("settings");
          syncShipPolygonEditorPanel();
          triggerFeedback.textContent =
            `Status: image board imported (${result?.boardId || "unknown"}) - start manual Play Area and room polygon drawing in Settings`;
        } else {
          throw new Error("Please choose either a JSON board file or an image file");
        }
        const importedBoardId = result?.boardId || "unknown";
        if (!imageFile) {
          triggerFeedback.textContent = `Status: board import succeeded (${importedBoardId})`;
        }
        boardStatus.textContent = `Active board: ${getBoard().label}`;
        if (boardImportFileInput) {
          boardImportFileInput.value = "";
        }
        if (boardImportImageInput) {
          boardImportImageInput.value = "";
        }
        if (boardImportNameInput) {
          boardImportNameInput.value = "";
        }
        if (boardImportIdInput) {
          boardImportIdInput.value = "";
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Board import failed";
        reportActionError(`Status: ${message}`, {
          toastText: `Board import failed: ${message}`,
          dedupeKey: "board-import-failed",
        });
      } finally {
        boardImportButton.disabled = false;
      }
    });

    openDashboardViewButton.addEventListener("click", () => {
      setActiveView("dashboard");
    });

    openSettingsViewButton.addEventListener("click", () => {
      setActiveView("settings");
    });

    for (const button of settingsSubtabButtons) {
      button.addEventListener("click", () => {
        const nextTab = normalizeSettingsSubtab(button.dataset.settingsSubtab);
        if (nextTab === normalizeSettingsSubtab(state.settingsSubtab)) {
          return;
        }
        setSettingsSubtab(nextTab);
        triggerFeedback.textContent = `Status: Settings tab switched to ${SETTINGS_SUBTAB_LABELS[nextTab] ?? SETTINGS_SUBTAB_LABELS.board}`;
      });
    }

    // Phase 22 W2e: 3-segment quick-mode bar. Activate / Deactivate
    // merged into Toggle (see toggleRoomAnimationByQuickTap).
    quickModeOffButton?.addEventListener("click", () => {
      setQuickMode("off");
    });

    quickModeToggleButton?.addEventListener("click", () => {
      setQuickMode("toggle");
    });

    quickModeClearButton?.addEventListener("click", () => {
      setQuickMode("clear");
    });

    openTriggerZoneButton?.addEventListener("click", () => {
      setDashboardZone("trigger", { announce: true });
    });

    openManageZoneButton?.addEventListener("click", () => {
      setDashboardZone("manage", { announce: true });
    });
  }

  window.TT_BEAMER_RUNTIME_WIRE_NAVIGATION_BINDERS = {
    wireNavigationBinders,
  };
})();
