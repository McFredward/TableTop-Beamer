// runtime controls module.
//
// Owns the high-level runtime control surface that doesn't fit into
// any other module:
//   - recordTriggerIntent (input guard bridge)
//   - hardStopRuntimeEffects / executeClearAll (clear-all pipeline)
//   - resetClearAllGuard / armClearAllGuard (clear-all confirm flow)
//   - settings subtab state machine (normalize/persist/sync/set/restore)
//   - upsertGlobalAnimation (global trigger dispatch)
//
// Dependencies injected via ctx.
(() => {
  let ctx = null;

  function init(dependencies) {
    ctx = dependencies;
  }

  function recordTriggerIntent() {
    window.TT_BEAMER_INPUT_GUARDS.recordTriggerIntent(ctx.state);
  }

  // Inside non-loop globals stop with `graceful: true` so the active
  // sample plays to its natural `ended` event (no click on short SFX);
  // outside / loop animations still hard-cut so ambient audio doesn't
  // drift across triggers.
  function shouldGracefulStopAudio(animation) {
    if (!animation || animation.scope !== "global") return false;
    // Outside animations get the hard stop so the ambient track doesn't
    // drift into silence uncontrollably when the user clears the board.
    // Any type listed in the board's outside profile counts as outside —
    // the old hardcoded "outside-space" fallback is kept only for
    // backwards compatibility with boards that still carry that id.
    const boardId = animation.boardId ?? ctx.state.boardId;
    if (ctx.isOutsideAnimationType?.(animation.type, boardId)) return false;
    if (animation.type === "outside-space") return false;
    return !animation.loopUntilStopped;
  }

  function hardStopRuntimeEffects({ clearVisuals = true } = {}) {
    const state = ctx.state;
    let anyGraceful = false;
    for (const animation of state.runningAnimations) {
      const graceful = shouldGracefulStopAudio(animation);
      if (graceful) {
        anyGraceful = true;
      }
      ctx.stopAnimationSound(animation.id, { graceful });
    }
    // Only flush the entire voice map when nothing wants a graceful
    // fade-out. Otherwise the graceful voices would be orphaned.
    if (!anyGraceful) {
      ctx.clearAllActiveAnimationAudio();
    }
    if (clearVisuals) {
      ctx.ashParticles.length = 0;
    }
  }

  function executeClearAll() {
    const state = ctx.state;
    const clearDefaults = Boolean(ctx.stopAllIncludeDefaultsCheckbox?.checked);
    if (ctx.getOutputRole() === ctx.OUTPUT_ROLE_CONTROL) {
      void ctx.emitLiveMutation("clear-all", {
        priorityHint: "high",
        reason: "control-clear-all",
        clearDefaults,
      }).then(() => {
        ctx.triggerFeedback.textContent = clearDefaults
          ? "Pending: Clear All (incl. defaults) command accepted"
          : "Pending: Clear All command accepted (waiting for snapshot)";
      }).catch(() => {
        ctx.triggerFeedback.textContent = "Status: Clear All command failed";
      });
      return;
    }
    if (clearDefaults) {
      hardStopRuntimeEffects({ clearVisuals: true });
      for (const board of ctx.getBoards()) {
        ctx.updateOutsideFxProfile(board.id, { enabled: false });
      }
      state.runningAnimations = [];
    } else {
      // Keep default animations (id prefix "default-") running
      for (const animation of state.runningAnimations) {
        if (String(animation?.id || "").startsWith("default-")) continue;
        const graceful = shouldGracefulStopAudio(animation);
        ctx.stopAnimationSound(animation.id, { graceful });
      }
      ctx.ashParticles.length = 0;
      state.runningAnimations = state.runningAnimations.filter(
        (a) => String(a?.id || "").startsWith("default-"),
      );
    }
    ctx.persistBoardProfiles();
    ctx.clearRoomDraftEditTarget();
    ctx.syncOutsideFxPanel();
    ctx.renderRunningAnimationsList();
    ctx.refreshGlobalButtons();
    ctx.triggerFeedback.textContent = "Status: Clear All executed";
    void ctx.emitLiveMutation("clear-all", {
      priorityHint: "high",
      clearDefaults,
    });
  }

  function resetClearAllGuard() {
    const state = ctx.state;
    if (state.clearAllGuard.timeoutId !== null) {
      window.clearTimeout(state.clearAllGuard.timeoutId);
    }
    state.clearAllGuard.armedUntil = 0;
    state.clearAllGuard.timeoutId = null;
    if (ctx.stopAllButton) {
      ctx.stopAllButton.textContent = "Clear All";
      ctx.stopAllButton.classList.remove("is-armed");
    }
  }

  function armClearAllGuard() {
    const state = ctx.state;
    resetClearAllGuard();
    state.clearAllGuard.armedUntil = performance.now() + 2600;
    if (ctx.stopAllButton) {
      ctx.stopAllButton.textContent = "Confirm Clear All";
      ctx.stopAllButton.classList.add("is-armed");
    }
    state.clearAllGuard.timeoutId = window.setTimeout(() => {
      resetClearAllGuard();
    }, 2700);
  }

  function normalizeSettingsSubtab(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "animations" || normalized === "system") {
      return normalized;
    }
    return "board";
  }

  function persistSettingsSubtab(nextSubtab) {
    // Subtab memory is ephemeral per browser-tab session.
    try {
      window.sessionStorage.setItem(ctx.SETTINGS_SUBTAB_STORAGE_KEY, nextSubtab);
    } catch {
      // Best-effort only.
    }
  }

  function syncSettingsSubtabVisibility() {
    const state = ctx.state;
    const activeSubtab = normalizeSettingsSubtab(state.settingsSubtab);
    for (const button of ctx.settingsSubtabButtons) {
      const tabId = normalizeSettingsSubtab(button.dataset.settingsSubtab);
      const isActive = tabId === activeSubtab;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    }
    for (const section of ctx.settingsTabbedSections) {
      const tabId = normalizeSettingsSubtab(section.dataset.settingsTab);
      const isActive = tabId === activeSubtab;
      section.classList.toggle("settings-subtab-hidden", !isActive);
      section.setAttribute("aria-hidden", isActive ? "false" : "true");
      if ("inert" in section) {
        section.inert = !isActive;
      }
    }
    if (ctx.settingsSubtabStatus) {
      ctx.settingsSubtabStatus.textContent = `Settings focus: ${ctx.SETTINGS_SUBTAB_LABELS[activeSubtab] ?? ctx.SETTINGS_SUBTAB_LABELS.board}`;
    }
  }

  function setSettingsSubtab(nextSubtab, { persist = true } = {}) {
    const state = ctx.state;
    state.settingsSubtab = normalizeSettingsSubtab(nextSubtab);
    syncSettingsSubtabVisibility();
    if (persist) {
      persistSettingsSubtab(state.settingsSubtab);
    }
    // Animations subtab auto-opens the full-page editor
    // (per the redesign — the three sidebar panels it replaces are
    // queued for removal in W3b-5). Other subtabs close the editor.
    const editor = window.TT_BEAMER_ANIMATION_EDITOR_VIEW;
    if (editor && state.uiView === "settings") {
      if (state.settingsSubtab === "animations") {
        if (!editor.isOpen()) editor.open();
      } else if (editor.isOpen()) {
        // Already on a different subtab — close without re-navigating
        // (the close() hook would push back to "board" otherwise).
        document.body.removeAttribute("data-animation-editor-open");
        const page = document.querySelector("#animation-editor-page");
        if (page) page.hidden = true;
      }
    }
  }

  function restoreSettingsSubtabPreference() {
    const state = ctx.state;
    let stored = "";
    try {
      stored = window.sessionStorage.getItem(ctx.SETTINGS_SUBTAB_STORAGE_KEY) || "";
    } catch {
      stored = "";
    }
    // "animations" must never be the restored default.
    // The full-page editor is a deliberate destination, not a landing
    // screen; a stale "animations" preference used to leave the sidebar
    // blank on reload (legacy panels removed, editor didn't auto-open).
    if (stored === "animations") stored = "";
    setSettingsSubtab(stored || (state.settingsSubtab !== "animations" ? state.settingsSubtab : "") || "board", { persist: false });
  }

  // Phase 58 Wave 3.4: detect re-trigger of a frozen reversible-freeze
  // instance and mutate its phase in place. Returns true if it
  // handled the trigger (caller skips the stop path). The render
  // layer reacts to the new playbackPhase by swapping video.src and
  // resuming playback in the new direction.
  function advanceReversibleFreezePhaseIfPossible(existing) {
    if (!existing) return false;
    const mode = existing.playbackMode || "loop";
    if (mode !== "play-then-freeze") return false;
    const onRet = existing.onRetrigger || "instant-disappear";
    if (onRet !== "reverse-then-freeze-first" && onRet !== "reverse-then-disappear") {
      return false;
    }
    // Phase 58 Wave 3.8l (2026-06-08): accept ANY phase, mirroring the
    // room single-room re-trigger block (Wave 3.7m). Operator spec:
    // inside reverse-on-retrigger must behave exactly like rooms — a tap
    // MID-playback (before the freeze) flips the direction from the
    // current frame instead of stopping the instance. The old gate
    // required a frozen-* phase, so a mid-playback re-trigger of an
    // inside play-then-freeze + reverse animation fell through to the
    // upsert stop path and the animation DISAPPEARED. v1.2.18 flip
    // mapping (same as rooms): forward / unset / frozen-last → reverse;
    // reverse / frozen-first → forward. The gif timeline mirror (inside
    // gif path) / mp4 src-swap reset to the boundary of the OTHER
    // direction, which is exactly the requested entry point.
    const phase = existing.playbackPhase || "forward";
    existing.playbackPhase = (phase === "forward" || phase === "frozen-last")
      ? "reverse"
      : "forward";
    // Phase 58 Wave 3.4: clear the ended-dispatched guard so the
    // render layer detects the next EOS and transitions the phase
    // again (frozen-last/first or disappear depending on mode).
    existing._endedDispatched = false;
    existing._phaseChangedAt = performance.now();
    // Phase 58 Wave 3.5: use the existing edit-room mutation so the
    // server accepts the broadcast (custom action types are silently
    // dropped by the server's LIVE_MUTATION_TYPES guard). edit-room
    // updates the running instance's snapshot, propagating phase to
    // /output/ clients via the standard pipeline.
    existing.startedAt = performance.now();
    existing.startedAtEpochMs = Date.now();
    try {
      if (typeof ctx.emitLiveMutation === "function") {
        void ctx.emitLiveMutation("edit-room", {
          animationId: existing.id,
          animation: typeof ctx.buildAnimationSnapshotForLiveSync === "function"
            ? ctx.buildAnimationSnapshotForLiveSync(existing)
            : existing,
        }).catch(() => undefined);
      }
    } catch { /* defensive */ }
    if (ctx.triggerFeedback) {
      ctx.triggerFeedback.textContent = `Status: ${ctx.getAnimationLabel?.(existing.type) ?? existing.type} ${existing.playbackPhase === "reverse" ? "reversing" : "playing"}`;
    }
    if (typeof ctx.renderRunningAnimationsList === "function") ctx.renderRunningAnimationsList();
    if (typeof ctx.refreshGlobalButtons === "function") ctx.refreshGlobalButtons();
    return true;
  }

  function upsertGlobalAnimation(type, defaultDurationSec, { playSound = true } = {}) {
    const state = ctx.state;
    const existing = state.runningAnimations.find(
      (anim) => anim.scope === "global" && anim.type === type && anim.boardId === state.boardId,
    );
    // Phase 58-w3.9h: re-trigger (toggle ON) of a fading-out instance cancels
    // the fade-out and resumes fading IN from the current opacity, instead of
    // toggling it off again. Must run before the stop/advance branches below.
    if (existing) {
      const stopPipeline = window.TT_BEAMER_RUNTIME_LIFECYCLE_STOP_PIPELINE;
      if (stopPipeline?.cancelFadeOutIfFading
        && stopPipeline.cancelFadeOutIfFading(existing)) {
        return;
      }
    }
    // Resolve the category dynamically. Custom outside animations
    // created by the user aren't in GLOBAL_ANIMATIONS (which only knows the
    // built-in outside-space), so we also check the board's outside profile.
    const outsideProfileForCategory = ctx.getOutsideFxProfile(state.boardId);
    const isOutsideByProfile = outsideProfileForCategory?.animations?.some((a) => a.id === type) ?? false;
    const isOutside = isOutsideByProfile || ctx.getGlobalAnimationCategory(type) === "outside-ship";
    // Only one outside animation may play at a time. When we're
    // about to start a new outside, stop any other outside animation
    // currently running on this board so the switch is clean.
    if (isOutside && !existing) {
      const outsideIds = new Set(
        (outsideProfileForCategory?.animations ?? []).map((a) => a.id),
      );
      outsideIds.add("outside-space");
      const otherRunningOutside = state.runningAnimations.filter(
        (anim) =>
          anim.scope === "global"
          && anim.boardId === state.boardId
          && anim.type !== type
          && outsideIds.has(anim.type),
      );
      for (const other of otherRunningOutside) {
        ctx.stopAnimation(other.id);
      }
    }
    // Look up the matching global animation definition so
    // we can copy its per-definition soundAssetRef onto the dispatched
    // animation entry. For inside globals the type == definition.id;
    // for outside we also match by id.
    const lookupProfile = isOutside
      ? ctx.getOutsideFxProfile(state.boardId)
      : ctx.getInsideFxProfile(state.boardId);
    const matchedDefinition = lookupProfile?.animations?.find((entry) => entry.id === type) ?? null;
    const definitionSoundAssetRef = matchedDefinition?.soundAssetRef ?? "none";
    // Phase 58: per-animation playback mode from the matching
    // definition. Non-loop modes (play-once-disappear / play-then-freeze /
    // boomerang) flip the instance into hold=true so the render layer
    // can manage video lifecycle without the legacy duration-based
    // auto-removal racing the freeze/disappear handling.
    const definitionPlaybackMode = matchedDefinition?.playbackMode ?? "loop";
    const definitionOnRetrigger = matchedDefinition?.onRetrigger ?? "instant-disappear";
    const definitionPlaybackDirection = matchedDefinition?.playbackDirection ?? "forward";
    // Phase 58 Wave 3.8n: inside transform (1:1 with rooms). Seed the
    // running instance from the definition's transform fields and expose
    // its asset type as roomAssetType so the live-editor Transform
    // fieldset (gated on roomAssetType / mp4 + gif) shows for inside —
    // exactly like a room instance. Outside is excluded: it renders on
    // its own full-layer path without a per-instance transform, so
    // surfacing inert transform sliders there would only confuse. Same
    // Phase 50 factory-default-mask discipline as the room dispatch:
    // every field is forwarded explicitly into createAnimation below.
    const insideTransformSeed = (!isOutside && matchedDefinition) ? {
      roomAssetType: matchedDefinition.assetType,
      roomAssetRef: matchedDefinition.assetRef,
      rotationDeg: matchedDefinition.rotationDeg ?? 0,
      stretchToPolygon: matchedDefinition.stretchToPolygon !== false,
      widthScale: matchedDefinition.widthScale ?? 1,
      heightScale: matchedDefinition.heightScale ?? 1,
      offsetXScale: matchedDefinition.offsetXScale ?? 0,
      offsetYScale: matchedDefinition.offsetYScale ?? 0,
    } : {};
    // Phase 58-w3.9s: forward ALL coded-effect options from the definition
    // onto the running instance (mirrors insideTransformSeed). Without this
    // a triggered coded inside/outside animation lost its configured options
    // — most visibly, a "Snowstorm" definition (snowStorm=true) rendered as
    // calm Snow on the dashboard AND /output because the instance carried no
    // snow options and the render reads instance-first (operator 2026-06-28:
    // "Storm" only differed in the editor preview, not on the board). Only
    // present values are copied so the renderer's own defaults still apply
    // for anything the definition omits. Keys mirror createAnimation's coded
    // params + the server's codedOptionKeys.
    const codedOptionsSeed = {};
    if (matchedDefinition) {
      const CODED_OPTION_KEYS = [
        "colorHex", "heatShowSource", "heatSyncNearestSource", "heatIrregularPulse",
        "workerStyle", "workerCount", "workerGroups", "workerLanternShare",
        "workerTrails", "workerSize", "workerSwayAmount", "workerClothingBrightness",
        "workerTrailIntensity", "workerCenterExclusion", "workerCenterExclusionRadius",
        "workerExclusionOffsetX", "workerExclusionOffsetY", "workerExclusionRingVisible",
        "snowDensity", "snowSpeed", "snowStorm", "snowFlakeSize",
      ];
      for (const key of CODED_OPTION_KEYS) {
        if (matchedDefinition[key] !== undefined && matchedDefinition[key] !== null) {
          codedOptionsSeed[key] = matchedDefinition[key];
        }
      }
    }
    const isNonLoopMode = definitionPlaybackMode !== "loop";
    // Phase 58 Wave 3.8m (2026-06-08): the per-trigger "Loop until
    // stopped" dashboard switch was removed — looping is now driven
    // entirely by the animation's own playbackMode. A loop-mode
    // animation (and every outside animation, which is conceptually
    // continuous) loops until the operator toggles it off; non-loop
    // modes manage their own lifecycle via isNonLoopMode below. This
    // also retires the legacy 4s GLOBAL_ONE_SHOT_DURATION_SEC auto-
    // removal for inside globals (it only applied when a loop animation
    // was triggered with the switch OFF — which silently removed a loop
    // animation after 4s, the opposite of "as configured").
    const effectiveLoopUntilStopped = isOutside || definitionPlaybackMode === "loop";
    const normalizedDefaultDurationSec = Number(defaultDurationSec);
    // Phase 58: non-loop modes always behave as hold=true so the render
    // layer manages cleanup (pause-at-end for freeze; explicit
    // stopAnimation for play-once-disappear). Without this override, a
    // 4s GLOBAL_ONE_SHOT_DURATION_SEC could remove a "play-then-freeze"
    // instance from the running list before the render layer freezes
    // the video.
    const effectiveDefaultDurationSec = (effectiveLoopUntilStopped || isNonLoopMode)
      ? null
      : (Number.isFinite(normalizedDefaultDurationSec) && normalizedDefaultDurationSec > 0
        ? normalizedDefaultDurationSec
        : null);
    // Phase 58 Wave 3.4: re-trigger of a frozen reversible-freeze
    // instance should advance the phase (forward→reverse, reverse→
    // forward) instead of stopping. Operator-confirmed semantic: pick
    // "Freeze, reverse on re-trigger" and clicks should ping-pong
    // through forward → frozen-last → reverse → frozen-first → forward.
    if (existing && advanceReversibleFreezePhaseIfPossible(existing)) {
      return;
    }
    // Phase 58 Wave 3.8o (2026-06-08): make the inside reversible-freeze
    // re-trigger DETERMINISTIC by mirroring the room dispatch. The room
    // path pushes its instance into state.runningAnimations at create time
    // (runtime-room-dispatch.js) and the server preserves the client id
    // (trigger-room), so the re-trigger candidate is ALWAYS found on the
    // next press regardless of snapshot-roundtrip timing and the phase
    // flip (edit-room) always targets a stable id. upsertGlobalAnimation
    // previously pushed NOTHING locally — the running list for inside
    // globals was populated only by the snapshot roundtrip, so `existing`
    // was present-or-absent purely as a function of timing: a press during
    // the roundtrip window re-issued trigger-global (server bumped the
    // revision and restarted at phase=forward → "nothing happens"), or, if
    // the instance was momentarily unflippable, fell through to the
    // STOP+REMOVE toggle branch (animation "disappears"); when the snapshot
    // had already landed it worked — three outcomes from one action.
    //
    // Fix: for the reversible-freeze family ONLY (play-then-freeze +
    // reverse-*), create+push the instance locally with a STABLE id and let
    // the server preserve that id (applyGlobalMutationPatch). hold=true
    // reversible-freeze globals are exempt from the finite one-shot replay
    // subsystem, so a stable, revision-less id is safe. Subsequent presses
    // then reliably hit advanceReversibleFreezePhaseIfPossible above. WS is
    // ordered from the single CONTROL client, so the trigger-global create
    // is always processed before any later edit-room phase flip.
    const isReversibleFreezeGlobal =
      !isOutside
      && definitionPlaybackMode === "play-then-freeze"
      && (definitionOnRetrigger === "reverse-then-freeze-first"
        || definitionOnRetrigger === "reverse-then-disappear");
    if (!existing && isReversibleFreezeGlobal) {
      const animation = ctx.createAnimation({
        type,
        scope: "global",
        boardId: state.boardId,
        intensity: Number(matchedDefinition?.intensity) || 1,
        speed: Number(matchedDefinition?.speed) || 1,
        opacity: Number(matchedDefinition?.opacity) || 1,
        mode: matchedDefinition?.mode ?? "",
        direction: matchedDefinition?.direction ?? "",
        soundVolume: playSound ? 1 : 0,
        soundAssetRef: playSound ? definitionSoundAssetRef : "none",
        hold: true,
        durationSec: 0,
        playbackMode: definitionPlaybackMode,
        onRetrigger: definitionOnRetrigger,
        playbackDirection: definitionPlaybackDirection,
        // Phase 58 Wave 3.8z (2026-06-08): stamp the definition NAME onto
        // the running instance so the Active Animations list shows the
        // animation's name (e.g. "Snow") instead of the bare type id —
        // exactly like room dispatch stamps selectedDefinition.name.
        animationName: matchedDefinition?.name,
        ...insideTransformSeed,
        ...codedOptionsSeed,
        // Phase 58-w3.9h: optional fade-in/fade-out (per-definition).
        fadeEnabled: matchedDefinition?.fadeEnabled === true,
        fadeDurationMs: matchedDefinition?.fadeDurationMs ?? 800,
      });
      // Stable, revision-less id (mirrors the server id scheme without the
      // per-trigger revision suffix) so the snapshot merges in place and
      // every phase-flip edit-room targets the same id.
      animation.id = `global-${state.boardId}:${type}`;
      animation.triggerKey = `${state.boardId}:${type}`;
      state.runningAnimations.push(animation);
      void ctx.emitLiveMutation("trigger-global", {
        animationType: type,
        action: "start",
        boardId: state.boardId,
        outsideHint: false,
        // Non-loop hold instance (effectiveDefaultDurationSec === null);
        // loopUntilStopped:true maps to server hold=true / durationMs=null
        // so the 4s GLOBAL_ONE_SHOT default never auto-expires it.
        loopUntilStopped: true,
        playSound,
        animation: ctx.buildAnimationSnapshotForLiveSync(animation),
      }).then(() => {
        ctx.triggerFeedback.textContent = `Pending: ${ctx.getAnimationLabel(type)} start accepted (waiting for snapshot)`;
      }).catch(() => {
        ctx.triggerFeedback.textContent = `Status: ${ctx.getAnimationLabel(type)} start command failed`;
      });
      ctx.renderRunningAnimationsList();
      ctx.refreshGlobalButtons();
      return;
    }
    if (ctx.getOutputRole() === ctx.OUTPUT_ROLE_CONTROL) {
      if (existing) {
        ctx.stopAnimation(existing.id);
      } else {
        // Align outside/inside global animations with the
        // room model — copy the definition's tunable fields onto the
        // running instance at trigger time so Settings only edits the
        // DEFAULT and the running animation's values live on the
        // instance (Live Editor target). Without this snapshot, the
        // draw path reaches back into the definition every frame,
        // which (a) prevents per-instance Live Editor edits from
        // being visible, and (b) makes toggle-off+on "revert" to the
        // last committed-to-server definition since the live-sync
        // snapshot roundtrip overwrites the local pending changes.
        const animation = ctx.createAnimation({
          type,
          scope: "global",
          boardId: state.boardId,
          intensity: Number(matchedDefinition?.intensity) || 1,
          speed: Number(matchedDefinition?.speed) || 1,
          opacity: Number(matchedDefinition?.opacity) || 1,
          mode: matchedDefinition?.mode ?? "",
          direction: matchedDefinition?.direction ?? "",
          soundVolume: playSound ? 1 : 0,
          soundAssetRef: playSound ? definitionSoundAssetRef : "none",
          hold: effectiveDefaultDurationSec === null,
          durationSec: effectiveDefaultDurationSec ?? 0,
          playbackMode: definitionPlaybackMode,
          onRetrigger: definitionOnRetrigger,
          playbackDirection: definitionPlaybackDirection,
          // Phase 58 Wave 3.8z: stamp definition name (see above) so the
          // Active Animations list labels inside/outside globals by name.
          animationName: matchedDefinition?.name,
          // Phase 58 Wave 3.8n: inside transform seed (empty for outside).
          ...insideTransformSeed,
          ...codedOptionsSeed,
          // Phase 58-w3.9h: optional fade-in/fade-out (per-definition).
          fadeEnabled: matchedDefinition?.fadeEnabled === true,
          fadeDurationMs: matchedDefinition?.fadeDurationMs ?? 800,
        });
        void ctx.emitLiveMutation("trigger-global", {
          animationType: type,
          action: "start",
          boardId: state.boardId,
          outsideHint: isOutside,
          loopUntilStopped: effectiveDefaultDurationSec === null,
          playSound,
          animation: ctx.buildAnimationSnapshotForLiveSync(animation),
        }).then(() => {
          ctx.triggerFeedback.textContent = `Pending: ${ctx.getAnimationLabel(type)} start accepted (waiting for snapshot)`;
        }).catch(() => {
          ctx.triggerFeedback.textContent = `Status: ${ctx.getAnimationLabel(type)} start command failed`;
        });
      }
      return;
    }
    if (existing) {
      ctx.stopAnimationSound(existing.id);
      state.runningAnimations = state.runningAnimations.filter((anim) => anim.id !== existing.id);
      if (isOutside) {
        ctx.updateOutsideFxProfile(existing.boardId, { enabled: false });
        ctx.persistBoardProfiles();
        ctx.syncOutsideFxPanel();
      }
      ctx.triggerFeedback.textContent = `Status: ${ctx.getAnimationLabel(type)} stopped`;
      void ctx.emitStopAnimationCommand(existing.id, {
        priorityHint: "high",
        targetAnimation: existing,
      });
    } else {
      const animation = ctx.createAnimation({
        type,
        scope: "global",
        intensity: Number(matchedDefinition?.intensity) || 1,
        speed: Number(matchedDefinition?.speed) || 1,
        opacity: Number(matchedDefinition?.opacity) || 1,
        mode: matchedDefinition?.mode ?? "",
        direction: matchedDefinition?.direction ?? "",
        soundVolume: playSound ? 1 : 0,
        soundAssetRef: playSound ? definitionSoundAssetRef : "none",
        hold: effectiveDefaultDurationSec === null,
        durationSec: effectiveDefaultDurationSec ?? 0,
        playbackMode: definitionPlaybackMode,
        onRetrigger: definitionOnRetrigger,
        playbackDirection: definitionPlaybackDirection,
        // Phase 58 Wave 3.8z: stamp definition name (see above) so the
        // Active Animations list labels inside/outside globals by name.
        animationName: matchedDefinition?.name,
        // Phase 58 Wave 3.8n: inside transform seed (empty for outside).
        ...insideTransformSeed,
        ...codedOptionsSeed,
        // Phase 58-w3.9h: optional fade-in/fade-out (per-definition).
        fadeEnabled: matchedDefinition?.fadeEnabled === true,
        fadeDurationMs: matchedDefinition?.fadeDurationMs ?? 800,
      });
      ctx.triggerFeedback.textContent = `Pending: ${ctx.getAnimationLabel(type)} start accepted (waiting for snapshot)`;
      void ctx.emitLiveMutation("trigger-global", {
        animationType: type,
        action: "start",
        boardId: state.boardId,
        outsideHint: isOutside,
        loopUntilStopped: effectiveDefaultDurationSec === null,
        playSound,
        animation: ctx.buildAnimationSnapshotForLiveSync(animation),
      }).catch(() => {
        ctx.triggerFeedback.textContent = `Status: ${ctx.getAnimationLabel(type)} start command failed`;
      });
    }
    ctx.renderRunningAnimationsList();
    ctx.refreshGlobalButtons();
  }

  window.TT_BEAMER_RUNTIME_RUNTIME_CONTROLS = {
    init,
    recordTriggerIntent,
    hardStopRuntimeEffects,
    executeClearAll,
    resetClearAllGuard,
    armClearAllGuard,
    normalizeSettingsSubtab,
    persistSettingsSubtab,
    syncSettingsSubtabVisibility,
    setSettingsSubtab,
    restoreSettingsSubtabPreference,
    upsertGlobalAnimation,
  };
})();
