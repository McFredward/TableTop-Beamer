// lifecycle-live-editor sub-module — owns the
// Live Editor panel: openLiveEditor / editAnimation / discardLiveEditor
// / closeLiveEditor, plus the slider-event-listener wiring block (which
// the lifecycle shim previously hosted in init).
//
// The shim's renderRunningAnimationsList / dispatchClusterToggle still
// reference openLiveEditor / closeLiveEditor by bare name; the shim
// keeps `let openLiveEditor / closeLiveEditor` shadows reassigned in
// init from this module's namespace.
(() => {
  let ctx = null;
  // IIFE-local shadows of the lifecycle-state vars. The function bodies
  // (moved byte-identical from the lifecycle shim post-W3.4-C2) read
  // and write these locals; the W3.4-C1 bridge calls below mirror the
  // writes to the lifecycle-state module so applyLiveEditorValue (in
  // state) sees the same animationId when slider listeners fire. The
  // lifecycle shim subscribes to setLiveEditorAnimationId via
  // addLiveEditorAnimationIdListener (W3.4-C3a state-module addition)
  // so its own shadow stays in sync for the still-in-shim
  // renderRunningAnimationsList read at line ~593.
  let liveEditorAnimationId = null;
  let liveEditorSnapshot = null;
  let liveEditorDirty = false;
  let lifecycleState = null;
  // Slider listeners reference applyLiveEditorValue by bare name
  // (byte-identical to the original wiring); reassigned in init from
  // lifecycleState.applyLiveEditorValue.
  let applyLiveEditorValue = null;

  function init(dependencies) {
    ctx = dependencies?.ctx ?? dependencies;
    lifecycleState = dependencies?.lifecycleState ?? window.TT_BEAMER_RUNTIME_LIFECYCLE_STATE;
    applyLiveEditorValue = lifecycleState.applyLiveEditorValue;

    // Wire live editor close + discard buttons.
    ctx.liveEditorClose.addEventListener("click", closeLiveEditor);
    ctx.liveEditorDiscard?.addEventListener("click", discardLiveEditor);
    // Phase 50: "Save as default" commits the running-animation's
    // current live-editor field values back to the persistent
    // animation definition. Done leaves changes on the running
    // instance; Save makes them the new defaults for future starts.
    ctx.liveEditorSaveDefault?.addEventListener("click", saveLiveEditorAsDefault);

    // Wire live editor sliders.
    ctx.liveEditorOpacity.addEventListener("input", () => {
      const value = ctx.clampRoomOpacity(Number(ctx.liveEditorOpacity.value));
      ctx.liveEditorOpacityValue.textContent = value.toFixed(2);
      applyLiveEditorValue("opacity", value);
    });
    ctx.liveEditorIntensity.addEventListener("input", () => {
      const value = ctx.clampRoomIntensity(Number(ctx.liveEditorIntensity.value));
      ctx.liveEditorIntensityValue.textContent = value.toFixed(2);
      applyLiveEditorValue("intensity", value);
    });
    ctx.liveEditorSpeed.addEventListener("input", () => {
      const value = ctx.clampRoomSpeed(Number(ctx.liveEditorSpeed.value));
      ctx.liveEditorSpeedValue.textContent = `${value.toFixed(2)}x`;
      applyLiveEditorValue("speed", value);
      applyLiveEditorValue("playbackSpeed", value);
    });
    ctx.liveEditorSoundVolume.addEventListener("input", () => {
      const raw = Number(ctx.liveEditorSoundVolume.value);
      ctx.liveEditorSoundVolumeValue.textContent = `${Math.round(raw)}%`;
      applyLiveEditorValue("soundVolume", ctx.clampRoomSoundVolume(raw / 100));
    });
    ctx.liveEditorRotation.addEventListener("input", () => {
      const value = Math.max(-180, Math.min(180, Number(ctx.liveEditorRotation.value)));
      ctx.liveEditorRotationValue.textContent = `${value}°`;
      applyLiveEditorValue("rotationDeg", value);
    });
    ctx.liveEditorStretch.addEventListener("change", () => {
      const checked = ctx.liveEditorStretch.checked;
      applyLiveEditorValue("stretchToPolygon", checked);
      _applyLiveEditorStretchGate(checked);
    });
    ctx.liveEditorWidth.addEventListener("input", () => {
      const value = Math.max(0.1, Math.min(10, Number(ctx.liveEditorWidth.value)));
      ctx.liveEditorWidthValue.textContent = value.toFixed(2);
      applyLiveEditorValue("widthScale", value);
    });
    ctx.liveEditorHeight.addEventListener("input", () => {
      const value = Math.max(0.1, Math.min(10, Number(ctx.liveEditorHeight.value)));
      ctx.liveEditorHeightValue.textContent = value.toFixed(2);
      applyLiveEditorValue("heightScale", value);
    });
    ctx.liveEditorOffsetX.addEventListener("input", () => {
      const value = Math.max(-1, Math.min(1, Number(ctx.liveEditorOffsetX.value)));
      ctx.liveEditorOffsetXValue.textContent = value.toFixed(2);
      applyLiveEditorValue("offsetXScale", value);
    });
    ctx.liveEditorOffsetY.addEventListener("input", () => {
      const value = Math.max(-1, Math.min(1, Number(ctx.liveEditorOffsetY.value)));
      ctx.liveEditorOffsetYValue.textContent = value.toFixed(2);
      applyLiveEditorValue("offsetYScale", value);
    });
    // Outside-specific knobs. Populated + shown in
    // openLiveEditor when the target is a running outside global
    // animation.
    ctx.liveEditorOutsideMode?.addEventListener("change", () => {
      const value = ctx.liveEditorOutsideMode.value === "immersive" ? "immersive" : "standard";
      applyLiveEditorValue("mode", value);
    });
    ctx.liveEditorOutsideDirection?.addEventListener("change", () => {
      const value = ctx.liveEditorOutsideDirection.value === "reverse" ? "reverse" : "forward";
      applyLiveEditorValue("direction", value);
    });
    // Coded-specific Color picker — only surfaced when the
    // underlying coded effect is `solid-color`. Keeps non-solid-color
    // animations uncluttered.
    ctx.liveEditorColor?.addEventListener("input", () => {
      const raw = String(ctx.liveEditorColor.value || "").trim();
      const value = /^#[0-9a-f]{6}$/i.test(raw) ? raw : "#ff0000";
      applyLiveEditorValue("colorHex", value);
    });
  }

  // W3.4-C3b: openLiveEditor (180-line body post-C1-bridges) decomposed
  // into 4 named helpers + a thin outer orchestrator. Helper bodies are
  // byte-identical to the corresponding sub-blocks of openLiveEditor's
  // post-C3a state (verified via diff -w against the captured C3a body).

  function _buildLiveEditorSnapshot(animation, animationId) {
    liveEditorAnimationId = animationId;
    liveEditorDirty = false;
    // Snapshot the original values so Discard can restore them.
    liveEditorSnapshot = {
      opacity: animation.opacity,
      intensity: animation.intensity,
      speed: animation.speed,
      playbackSpeed: animation.playbackSpeed,
      soundVolume: animation.soundVolume,
      rotationDeg: animation.rotationDeg,
      stretchToPolygon: animation.stretchToPolygon,
      widthScale: animation.widthScale,
      heightScale: animation.heightScale,
      offsetXScale: animation.offsetXScale,
      offsetYScale: animation.offsetYScale,
      // Outside instance fields.
      mode: animation.mode,
      direction: animation.direction,
      // Coded-specific (solid-color) per-instance color.
      colorHex: animation.colorHex,
    };
    // W3.4-C1 bridge: mirror writes to the lifecycle-state module
    // so applyLiveEditorValue (now there) sees the same animationId
    // when slider listeners fire.
    lifecycleState.setLiveEditorAnimationId(animationId);
    lifecycleState.setLiveEditorSnapshot(liveEditorSnapshot);
    lifecycleState.clearLiveEditorDirty();
  }

  function _populateLiveEditorPanel(animation) {
    ctx.liveEditorPanel.hidden = false;
    // Auto-scroll the panel into view so the user sees the
    // editor open. The running-animations list can sit far below the
    // viewport and a silent panel-unhide was easy to miss.
    if (typeof ctx.liveEditorPanel.scrollIntoView === "function") {
      try {
        ctx.liveEditorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {
        ctx.liveEditorPanel.scrollIntoView();
      }
    }
    if (ctx.liveEditorPanel) {
      ctx.liveEditorPanel.classList.remove("has-unsaved");
    }
    if (ctx.liveEditorClose) {
      ctx.liveEditorClose.textContent = "Done";
    }

    // Build a descriptive title: animation name + room/cluster name.
    const effectLabel = animation.animationName || animation.type || "Animation";
    const board = ctx.getBoard(animation.boardId);
    let targetLabel = "";
    if (animation.scope === "room" && animation.roomId) {
      const room = board.rooms.find((r) => r.id === animation.roomId);
      targetLabel = room?.name ?? room?.label ?? animation.roomId;
    } else if (animation.scope === "cluster") {
      const cluster = ctx.getClusterTargetById(animation.clusterId, animation.boardId);
      targetLabel = cluster?.name ?? animation.clusterName ?? "Cluster";
    }
    ctx.liveEditorTitle.textContent = targetLabel
      ? `Editing: ${effectLabel} — ${targetLabel}`
      : `Editing: ${effectLabel}`;

    // Populate sliders from current animation values.
    const opacity = ctx.clampRoomOpacity(animation.opacity ?? 0.9);
    ctx.liveEditorOpacity.value = String(opacity);
    ctx.liveEditorOpacityValue.textContent = opacity.toFixed(2);

    const intensity = ctx.clampRoomIntensity(animation.intensity ?? 1);
    ctx.liveEditorIntensity.value = String(intensity);
    ctx.liveEditorIntensityValue.textContent = intensity.toFixed(2);

    const speed = ctx.clampRoomSpeed(animation.speed ?? 1);
    ctx.liveEditorSpeed.value = String(speed);
    ctx.liveEditorSpeedValue.textContent = `${speed.toFixed(2)}x`;

    const soundVolume = Math.round(ctx.clampRoomSoundVolume(animation.soundVolume ?? 1) * 100);
    ctx.liveEditorSoundVolume.value = String(soundVolume);
    ctx.liveEditorSoundVolumeValue.textContent = `${soundVolume}%`;

    // Transform fields — only visible for mp4/gif asset types.
    const assetType = String(animation.roomAssetType ?? "").toLowerCase();
    const showTransform = assetType === "mp4" || assetType === "gif";
    ctx.liveEditorTransform.hidden = !showTransform;

    if (showTransform) {
      const rotationDeg = Math.max(-180, Math.min(180, Number(animation.rotationDeg ?? 0)));
      ctx.liveEditorRotation.value = String(rotationDeg);
      ctx.liveEditorRotationValue.textContent = `${rotationDeg}°`;

      const stretched = Boolean(animation.stretchToPolygon);
      ctx.liveEditorStretch.checked = stretched;

      const widthScale = Math.max(0.1, Math.min(10, Number(animation.widthScale ?? 1)));
      ctx.liveEditorWidth.value = String(widthScale);
      ctx.liveEditorWidthValue.textContent = widthScale.toFixed(2);

      const heightScale = Math.max(0.1, Math.min(10, Number(animation.heightScale ?? 1)));
      ctx.liveEditorHeight.value = String(heightScale);
      ctx.liveEditorHeightValue.textContent = heightScale.toFixed(2);

      const offsetXScale = Math.max(-1, Math.min(1, Number(animation.offsetXScale ?? 0)));
      ctx.liveEditorOffsetX.value = String(offsetXScale);
      ctx.liveEditorOffsetXValue.textContent = offsetXScale.toFixed(2);

      const offsetYScale = Math.max(-1, Math.min(1, Number(animation.offsetYScale ?? 0)));
      ctx.liveEditorOffsetY.value = String(offsetYScale);
      ctx.liveEditorOffsetYValue.textContent = offsetYScale.toFixed(2);

      _applyLiveEditorStretchGate(stretched);
    }
  }

  // Phase 50 (2026-05-25): operator UAT — width/height/X/Y sliders
  // were marked `disabled` on the input element when Stretch-to-polygon
  // was on, but native disabled styling on <input type=range> is too
  // subtle and the operator couldn't tell visually that the sliders
  // were inert. Add `.is-disabled` on the parent <label> so the
  // existing CSS (.live-editor-panel label.is-disabled) drops opacity
  // and pointer-events. Both the initial-populate path AND the
  // change-listener path call this helper for parity.
  function _applyLiveEditorStretchGate(stretched) {
    const gatedInputs = [
      ctx.liveEditorWidth,
      ctx.liveEditorHeight,
      ctx.liveEditorOffsetX,
      ctx.liveEditorOffsetY,
    ];
    for (const input of gatedInputs) {
      if (!input) continue;
      input.disabled = stretched;
      const label = typeof input.closest === "function" ? input.closest("label") : null;
      if (label) label.classList.toggle("is-disabled", stretched);
    }
  }

  function _populateLiveEditorAdvancedFields(animation) {
    // Solid-color coded backbone — surface the Color picker
    // in the Live Editor only when the currently-running animation's
    // coded effect resolves to solid-color. Covers room-scoped coded
    // solid-color triggers (the main use case — "white lamp" clusters).
    if (ctx.liveEditorColor || ctx.liveEditorColorLabel) {
      let showColor = false;
      let effectiveColor = "#ff0000";
      if ((animation.scope === "room" || animation.scope === "cluster")
        && typeof ctx.resolveRoomCodedEffectType === "function") {
        const assetType = typeof ctx.normalizeRoomAssetType === "function"
          ? ctx.normalizeRoomAssetType(animation.roomAssetType)
          : animation.roomAssetType;
        if (assetType === "coded") {
          const resolved = ctx.resolveRoomCodedEffectType(animation.roomAssetRef || animation.type);
          showColor = resolved === "solid-color";
        }
      }
      if (showColor) {
        const def = typeof ctx.getRoomAnimationDefinitionById === "function"
          ? ctx.getRoomAnimationDefinitionById(animation.type, animation.boardId)
          : null;
        const raw = String(animation.colorHex ?? def?.colorHex ?? "#ff0000").trim();
        effectiveColor = /^#[0-9a-f]{6}$/i.test(raw) ? raw : "#ff0000";
      }
      if (ctx.liveEditorColorLabel) {
        ctx.liveEditorColorLabel.style.display = showColor ? "" : "none";
      }
      if (ctx.liveEditorColor && showColor) {
        ctx.liveEditorColor.value = effectiveColor;
      }
    }

    // Outside-specific knobs (mode/direction) for coded
    // outside backbones. Only show for global-scope animations whose
    // type is in the board's outside profile — other globals (inside)
    // don't have these concepts.
    const showOutsideFx = animation.scope === "global"
      && typeof ctx.isOutsideAnimationType === "function"
      && ctx.isOutsideAnimationType(animation.type, animation.boardId);
    if (ctx.liveEditorOutsideFx) {
      ctx.liveEditorOutsideFx.hidden = !showOutsideFx;
    }
    if (showOutsideFx) {
      // Fallback to the definition when the instance doesn't carry
      // mode/direction yet (e.g. legacy running animation from older snapshots).
      const outsideProfile = ctx.getOutsideFxProfile(animation.boardId);
      const definition = outsideProfile?.animations?.find((entry) => entry?.id === animation.type) ?? null;
      const effectiveMode = animation.mode ?? definition?.mode ?? "standard";
      const effectiveDirection = animation.direction ?? definition?.direction ?? "forward";
      if (ctx.liveEditorOutsideMode) {
        ctx.liveEditorOutsideMode.value = effectiveMode === "immersive" ? "immersive" : "standard";
      }
      if (ctx.liveEditorOutsideDirection) {
        ctx.liveEditorOutsideDirection.value = effectiveDirection === "reverse" ? "reverse" : "forward";
      }
    }
  }

  function _finalizeLiveEditorOpen(animation) {
    const defaults = ctx.state.defaultAnimationsByBoard[animation.boardId] || [];
    const isDefault = defaults.some(d => d.type === animation.type && d.roomId === animation.roomId && d.scope === animation.scope);
    if (ctx.liveEditorDefault) ctx.liveEditorDefault.checked = isDefault;
  }

  function openLiveEditor(animationId) {
    const { state } = ctx;
    const animation = state.runningAnimations.find((item) => item?.id === animationId);
    if (!animation) {
      closeLiveEditor();
      return;
    }
    _buildLiveEditorSnapshot(animation, animationId);
    _populateLiveEditorPanel(animation);
    _populateLiveEditorAdvancedFields(animation);
    _finalizeLiveEditorOpen(animation);
  }

  function discardLiveEditor() {
    if (liveEditorAnimationId !== null && liveEditorSnapshot) {
      const animation = ctx.state.runningAnimations.find(
        (item) => item?.id === liveEditorAnimationId,
      );
      if (animation) {
        Object.assign(animation, liveEditorSnapshot);
      }
    }
    liveEditorAnimationId = null;
    liveEditorSnapshot = null;
    liveEditorDirty = false;
    // W3.4-C1 bridge: mirror writes to the lifecycle-state module.
    lifecycleState.setLiveEditorAnimationId(null);
    lifecycleState.setLiveEditorSnapshot(null);
    lifecycleState.clearLiveEditorDirty();
    ctx.liveEditorPanel.hidden = true;
  }

  function closeLiveEditor() {
    if (liveEditorAnimationId !== null) {
      const animation = ctx.state.runningAnimations.find(
        (item) => item?.id === liveEditorAnimationId,
      );
      if (animation) {
        const makeDefault = Boolean(ctx.liveEditorDefault?.checked);
        if (!ctx.state.defaultAnimationsByBoard[animation.boardId]) {
          ctx.state.defaultAnimationsByBoard[animation.boardId] = [];
        }
        const defaults = ctx.state.defaultAnimationsByBoard[animation.boardId];
        // Remove any existing default for same type+roomId+scope
        const filtered = defaults.filter(d => !(d.type === animation.type && d.roomId === animation.roomId && d.scope === animation.scope));
        if (makeDefault) {
          filtered.push({
            type: animation.type,
            animationName: animation.animationName,
            scope: animation.scope,
            roomId: animation.roomId,
            boardId: animation.boardId,
            clusterId: animation.clusterId,
            clusterName: animation.clusterName,
            roomAssetType: animation.roomAssetType,
            roomAssetRef: animation.roomAssetRef,
            soundAssetRef: animation.soundAssetRef,
            opacity: animation.opacity,
            intensity: animation.intensity,
            speed: animation.speed,
            soundVolume: animation.soundVolume,
            rotationDeg: animation.rotationDeg,
            stretchToPolygon: animation.stretchToPolygon,
            widthScale: animation.widthScale,
            heightScale: animation.heightScale,
            offsetXScale: animation.offsetXScale,
            offsetYScale: animation.offsetYScale,
            // Persist the per-instance color on the default
            // so autostart reloads pick it back up. Without this, the
            // autostart path re-created the animation with the red
            // factory default every time.
            colorHex: animation.colorHex,
          });
        }
        ctx.state.defaultAnimationsByBoard[animation.boardId] = filtered;
        // Phase 50 (2026-05-22): the silent transform-persist on Done
        // was removed. Previously, clicking Done auto-saved transform
        // values to the animation definition — but the operator wanted
        // a CHOICE between temporary tweaks (just this run) and a
        // permanent default override. The new "Save as default for
        // this animation" button now handles the persistent path
        // (see `saveLiveEditorAsDefault` below). Done leaves the
        // running instance's tweaks intact for the rest of THIS run
        // but does not write to the definition, so the next manual
        // trigger picks up the un-tweaked defaults again.
        // Broadcast the updated animation values to all clients
        // (including /output/final) via an edit-room live mutation.
        void ctx.emitLiveMutation("edit-room", {
          animationId: animation.id,
          animation: ctx.buildAnimationSnapshotForLiveSync(animation),
        }).catch(() => {});
        // For cluster-scope edits, also broadcast each
        // linked room child so the server + other clients carry the
        // propagated field values. Without this, the next snapshot
        // from the server reverts member intensity/opacity back to
        // the pre-edit state (server never saw the child updates).
        if (animation.scope === "cluster") {
          for (const child of ctx.state.runningAnimations) {
            if (child?.parentClusterRunId === animation.id && child?.scope === "room") {
              void ctx.emitLiveMutation("edit-room", {
                animationId: child.id,
                animation: ctx.buildAnimationSnapshotForLiveSync(child),
              }).catch(() => {});
            }
          }
        }
      }
    }
    liveEditorAnimationId = null;
    // W3.4-C1 bridge: mirror to the lifecycle-state module.
    lifecycleState.setLiveEditorAnimationId(null);
    ctx.liveEditorPanel.hidden = true;
  }

  // Phase 50 (2026-05-22): commit the running animation's current
  // live-editor field values back to the persistent animation
  // definition so every future manual trigger of the same animation
  // applies these tweaks. Keeps the editor OPEN — the user may want
  // to continue tweaking. Silent direct save (no apply/discard bar)
  // because clicking the button IS the explicit commit. Field set
  // per scope: room = opacity/intensity/speed/volume/transform/color,
  // inside = intensity/speed, outside = intensity/speed/mode/direction.
  function saveLiveEditorAsDefault() {
    if (liveEditorAnimationId === null) return;
    const animation = ctx.state.runningAnimations.find(
      (item) => item?.id === liveEditorAnimationId,
    );
    if (!animation) return;

    const scopeForProfile = animation.scope === "cluster" ? "room" : animation.scope;
    let updated = false;

    if (scopeForProfile === "room") {
      const profile = ctx.getRoomFxProfile(animation.boardId);
      const def = profile?.animations?.find((d) => d.id === animation.type);
      if (def) {
        const next = ctx.normalizeRoomFxProfile({
          ...profile,
          animations: profile.animations.map((entry) =>
            entry.id !== def.id ? entry : {
              ...entry,
              opacity: animation.opacity ?? entry.opacity,
              intensity: animation.intensity ?? entry.intensity,
              speed: animation.speed ?? entry.speed,
              soundVolume: animation.soundVolume ?? entry.soundVolume,
              rotationDeg: animation.rotationDeg ?? entry.rotationDeg,
              stretchToPolygon: animation.stretchToPolygon ?? entry.stretchToPolygon,
              widthScale: animation.widthScale ?? entry.widthScale,
              heightScale: animation.heightScale ?? entry.heightScale,
              offsetXScale: animation.offsetXScale ?? entry.offsetXScale,
              offsetYScale: animation.offsetYScale ?? entry.offsetYScale,
              colorHex: animation.colorHex ?? entry.colorHex,
            },
          ),
        });
        ctx.setRoomFxProfile(animation.boardId, next);
        updated = true;
      }
    } else if (scopeForProfile === "inside") {
      const profile = ctx.getInsideFxProfile(animation.boardId);
      const def = profile?.animations?.find((d) => d.id === animation.type);
      if (def) {
        const next = ctx.normalizeInsideFxProfile({
          ...profile,
          animations: profile.animations.map((entry) =>
            entry.id !== def.id ? entry : {
              ...entry,
              intensity: animation.intensity ?? entry.intensity,
              speed: animation.speed ?? entry.speed,
            },
          ),
        });
        ctx.setInsideFxProfile(animation.boardId, next);
        updated = true;
      }
    } else if (scopeForProfile === "outside") {
      const profile = ctx.getOutsideFxProfile(animation.boardId);
      const def = profile?.animations?.find((d) => d.id === animation.type);
      if (def) {
        const next = ctx.normalizeOutsideFxProfile({
          ...profile,
          animations: profile.animations.map((entry) =>
            entry.id !== def.id ? entry : {
              ...entry,
              intensity: animation.intensity ?? entry.intensity,
              speed: animation.speed ?? entry.speed,
              mode: animation.mode ?? entry.mode,
              direction: animation.direction ?? entry.direction,
            },
          ),
        });
        ctx.setOutsideFxProfile(animation.boardId, next);
        updated = true;
      }
    }

    if (updated) {
      // Phase 50 (2026-05-25 v1.0.28): drop the matching guards and
      // clear the draft sync flag unconditionally for room-scope
      // edits — same rationale as patchAnimation in the editor pane.
      // ctx.state IS the runtime state here (live-editor inits with
      // the orchestration ctx directly, not the shell wrapper), so no
      // runtimeState indirection needed.
      if (scopeForProfile === "room" && ctx.state?.roomDraft) {
        ctx.state.roomDraft.lastSyncedAnimationId = null;
      }
      // Silent direct save + clean baseline — clicking Save IS the
      // explicit commit, no need to also force the user through the
      // apply/discard bar.
      if (typeof ctx.saveAndCaptureCleanBaseline === "function") {
        void ctx.saveAndCaptureCleanBaseline().catch(() => {});
      }
      if (ctx.triggerFeedback) {
        const name = animation.animationName || animation.type;
        ctx.triggerFeedback.textContent = `Status: saved "${name}" defaults — future starts apply these values`;
      }
      // Phase 50 (2026-05-25): operator UAT — "Das 'Save as default for
      // this animation' soll TROTZDEM auch zusätzlich den selben effect
      // wie 'Done' haben, wenn man es anklickt". After persisting the
      // values, close the editor like Done does (broadcasts edit-room
      // + persists the auto-start checkbox + hides the panel). The
      // status message set above survives closeLiveEditor since that
      // function does not touch triggerFeedback.
      closeLiveEditor();
    } else if (ctx.triggerFeedback) {
      ctx.triggerFeedback.textContent = `Status: no matching definition to save (scope=${animation.scope})`;
    }
  }

  function editAnimation(animationId) {
    const {
      state, switchBoard, getClusterTargetById, getRoomAnimationDefinitionById,
      normalizeRoomAssetType, normalizeRoomAssetRefForType, clampRoomOpacity,
      clampRoomIntensity, clampRoomSpeed, clampRoomSoundVolume, clampRoomDurationSec,
      clampClusterStaggerOffsetMs, isRoomAnimationType,
      roomAnimationSelect, roomOpacityInput, roomOpacityValue,
      roomIntensityInput, roomIntensityValue, roomSpeedInput, roomSpeedValue,
      roomSoundVolumeInput, roomSoundVolumeValue, roomDurationInput,
      roomStaggerStartInput, syncRoomStaggerOffsetControl, syncRoomDraftActionButton,
      syncRoomPanelFromSelection, renderRoomOverlay, triggerFeedback,
    } = ctx;
    const animation = state.runningAnimations.find((item) => item.id === animationId);
    if (!animation || (animation.scope !== "room" && animation.scope !== "cluster") || !isRoomAnimationType(animation.type)) {
      return;
    }
    // Phase 28 (B2/D-06): board-switch save-gate — when /output/ has unsaved
    // align-mode changes, block the editor's implicit board switch and
    // surface the locked toast. (No dropdown rollback needed; this entry
    // point is invoked from a click on a running-animation list item.)
    if (state.alignModeDirtyOnOutput) {
      if (triggerFeedback) {
        triggerFeedback.textContent = "Status: unsaved align changes on /output/ — save or discard there first to switch board.";
      }
      return;
    }
    switchBoard(animation.boardId, {
      emitLiveContext: true,
      reason: "edit-room-focus",
    });
    const isClusterScope = animation.scope === "cluster";
    const clusterTarget = isClusterScope
      ? getClusterTargetById(animation.clusterId, animation.boardId)
      : null;
    const fallbackRoomId = isClusterScope
      ? clusterTarget?.roomIds?.[0] ?? null
      : animation.roomId;
    state.selectedRoomId = fallbackRoomId;
    if (fallbackRoomId) {
      state.selectedRoomByBoard[animation.boardId] = fallbackRoomId;
    }
    state.roomDraft.targetType = isClusterScope ? "cluster" : "room";
    state.roomDraft.targetId = isClusterScope
      ? (clusterTarget?.clusterId ?? animation.clusterId ?? null)
      : animation.roomId;
    const roomDefinition = getRoomAnimationDefinitionById(animation.type, animation.boardId);
    const definitionAssetType = normalizeRoomAssetType(
      animation.roomAssetType ?? roomDefinition?.assetType,
    );
    const definitionAssetRef = normalizeRoomAssetRefForType(
      definitionAssetType,
      animation.roomAssetRef ?? roomDefinition?.assetRef,
      roomDefinition?.assetRef,
    );
    state.roomDraft.editTargetId = animation.id;
    state.roomDraft.animationId = animation.type;
    state.roomDraft.opacity = clampRoomOpacity(animation.opacity ?? 0.9);
    state.roomDraft.intensity = clampRoomIntensity(animation.intensity);
    state.roomDraft.speed = clampRoomSpeed(animation.speed ?? 1);
    state.roomDraft.soundVolume = clampRoomSoundVolume(animation.soundVolume ?? 1);
    state.roomDraft.durationSec = animation.durationMs
      ? clampRoomDurationSec(Math.round(animation.durationMs / 1000))
      : 18;
    state.roomDraft.staggerStart = isClusterScope
      ? animation.clusterStartMode === "staggered"
      : state.roomDraft.staggerStart;
    state.roomDraft.staggerOffsetMs = isClusterScope
      ? clampClusterStaggerOffsetMs(animation.clusterStartOffsetMs)
      : clampClusterStaggerOffsetMs(state.roomDraft.staggerOffsetMs);

    if (!animation.roomAssetType || !animation.roomAssetRef) {
      animation.roomAssetType = definitionAssetType;
      animation.roomAssetRef = definitionAssetRef;
    }

    roomAnimationSelect.value = state.roomDraft.animationId;
    roomOpacityInput.value = String(state.roomDraft.opacity);
    roomOpacityValue.textContent = state.roomDraft.opacity.toFixed(2);
    roomIntensityInput.value = String(state.roomDraft.intensity);
    roomIntensityValue.textContent = state.roomDraft.intensity.toFixed(2);
    roomSpeedInput.value = String(state.roomDraft.speed);
    roomSpeedValue.textContent = `${state.roomDraft.speed.toFixed(2)}x`;
    roomSoundVolumeInput.value = String(Math.round(state.roomDraft.soundVolume * 100));
    roomSoundVolumeValue.textContent = `${Math.round(state.roomDraft.soundVolume * 100)}%`;
    roomDurationInput.value = String(state.roomDraft.durationSec);
    if (roomStaggerStartInput) {
      roomStaggerStartInput.checked = state.roomDraft.staggerStart;
    }
    syncRoomStaggerOffsetControl();
    syncRoomDraftActionButton();

    syncRoomPanelFromSelection({ preserveDraftState: true });
    renderRoomOverlay();
    triggerFeedback.textContent = `Status: ${animation.id} loaded into editor${isClusterScope ? " (cluster)" : ""}`;
  }

  window.TT_BEAMER_RUNTIME_LIFECYCLE_LIVE_EDITOR = {
    init,
    openLiveEditor,
    editAnimation,
    discardLiveEditor,
    closeLiveEditor,
  };
})();
