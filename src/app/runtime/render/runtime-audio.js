// Phase 14-2: audio pipeline module.
//
// Owns the Audio() voice pool, the active-animation audio map, the
// pending start-delay timers, and the cross-client revision memory
// used by the Phase 11 global-trigger loop-once guards. The module
// also owns the audio status + mapping UI sync helpers so every
// audio path lives in one place.
//
// Dependencies injected via ctx:
//   state, liveSync, outputRole, OUTPUT_ROLE_FINAL
//   DOM refs: audioStatus, triggerFeedback, animationSpeedInput,
//             animationSpeedValue, animationSpeedStatus,
//             audioMappingAnimationSelect, audioMappingStatus,
//             audioMappingSoundSelect
//   Constants: ALL_SOUND_ASSET_PATHS, ALL_ANIMATION_TYPES,
//              GLOBAL_ANIMATIONS, SOUND_MAPPING_NONE
//   Helpers: persistBoardProfiles, clampAnimationSpeed,
//            clampRoomSoundVolume, getGlobalTriggerRevision,
//            getGlobalTriggerKey, getAnimationStartedAtEpochMs,
//            getMappedSoundPathForAnimation, getAnimationLabel,
//            normalizeAnimationSoundPath, getGlobalAnimationCategory
(() => {
  let ctx = null;

  const audioAssetPoolByPath = new Map();
  const audioAssetVoiceCursorByPath = {};
  const activeAnimationAudioById = new Map();
  const pendingAnimationAudioStartTimers = new Map();
  const startedGlobalAudioRevisionByTriggerKey = new Map();

  function init(dependencies) {
    ctx = dependencies;
  }

  function syncAudioStatus() {
    const state = ctx.state;
    const volumePercent = Math.round(state.audio.volume * 100);
    const roleMuted = ctx.outputRole !== ctx.OUTPUT_ROLE_FINAL;
    const mode = state.audio.enabled ? "ON" : "OFF";
    ctx.audioStatus.textContent = roleMuted
      ? `Audio: muted in Control view (final-output-only, mapping ${mode}, ${volumePercent}%)`
      : `Audio: ${mode} (${volumePercent}%)`;
  }

  function isOutputAudibleRole() {
    return ctx.outputRole === ctx.OUTPUT_ROLE_FINAL;
  }

  function isAudioPlaybackAllowed() {
    return isOutputAudibleRole() && ctx.state.audio.enabled;
  }

  function persistRuntimeSoundSettingsChange(failureMessage) {
    const persisted = ctx.persistBoardProfiles();
    if (!persisted) {
      ctx.triggerFeedback.textContent = failureMessage;
    }
    return persisted;
  }

  function syncAnimationSpeedPanel() {
    const state = ctx.state;
    const speed = ctx.clampAnimationSpeed(state.animationSpeed);
    state.animationSpeed = speed;
    ctx.animationSpeedInput.value = String(speed);
    ctx.animationSpeedValue.textContent = `${speed.toFixed(2)}x`;
    ctx.animationSpeedStatus.textContent = `Animation Speed: ${speed.toFixed(2)}x`;
  }

  function createAudioAssetVoice(path) {
    const voice = new Audio(path);
    voice.preload = "auto";
    return voice;
  }

  function getAudioAssetPool(path) {
    if (!audioAssetPoolByPath.has(path)) {
      const pool = [
        createAudioAssetVoice(path),
        createAudioAssetVoice(path),
        createAudioAssetVoice(path),
        createAudioAssetVoice(path),
        createAudioAssetVoice(path),
      ];
      audioAssetPoolByPath.set(path, pool);
    }
    return audioAssetPoolByPath.get(path);
  }

  function warmEventSoundAssets() {
    const paths = new Set(ctx.ALL_SOUND_ASSET_PATHS);
    for (const path of paths) {
      const pool = getAudioAssetPool(path);
      for (const voice of pool) {
        voice.volume = isAudioPlaybackAllowed() ? ctx.state.audio.volume : 0;
        voice.load();
      }
    }
  }

  function applyAudioGain() {
    const state = ctx.state;
    const targetVolume = isAudioPlaybackAllowed() ? state.audio.volume : 0;
    for (const pool of audioAssetPoolByPath.values()) {
      for (const voice of pool) {
        voice.volume = targetVolume;
      }
    }
    for (const [animationId, active] of activeAnimationAudioById.entries()) {
      if (!active?.voice) {
        continue;
      }
      const instanceVolume = isAudioPlaybackAllowed() ? state.audio.volume * ctx.clampRoomSoundVolume(active.soundVolume ?? 1) : 0;
      active.voice.volume = instanceVolume;
      activeAnimationAudioById.set(animationId, {
        ...active,
        soundVolume: ctx.clampRoomSoundVolume(active.soundVolume ?? 1),
      });
    }
  }

  function stopAllAudioVoices() {
    for (const pool of audioAssetPoolByPath.values()) {
      for (const voice of pool) {
        voice.pause();
        voice.currentTime = 0;
      }
    }
  }

  // Phase 15-6: stopAnimationSound accepts an optional `graceful` flag.
  // When graceful=true, the current audio iteration is NOT cut off —
  // the voice is allowed to play out to its natural `ended` event,
  // and only the "keep looping" onEnded handler is unhooked so the
  // sound doesn't replay. Used by hardStopRuntimeEffects for global
  // inside non-loop animations so users don't hear an abrupt cut.
  function stopAnimationSound(animationId, { graceful = false } = {}) {
    const pendingTimer = pendingAnimationAudioStartTimers.get(animationId);
    if (pendingTimer) {
      window.clearTimeout(pendingTimer);
      pendingAnimationAudioStartTimers.delete(animationId);
    }
    const active = activeAnimationAudioById.get(animationId);
    if (!active) {
      return;
    }
    const { voice, onEnded } = active;
    if (voice && onEnded) {
      voice.removeEventListener("ended", onEnded);
    }
    if (voice && !graceful) {
      voice.pause();
      voice.currentTime = 0;
    }
    activeAnimationAudioById.delete(animationId);
  }

  function getAnimationAudioLifecycleKey(animation) {
    if (!animation || !animation.id) {
      return null;
    }
    const triggerRevision = ctx.getGlobalTriggerRevision(animation);
    if (animation.scope === "global" && triggerRevision !== null) {
      return `global:${animation.id}:${triggerRevision}`;
    }
    const startedAtEpochMs = ctx.getAnimationStartedAtEpochMs(animation);
    return `default:${animation.id}:${startedAtEpochMs}`;
  }

  function stopSoundsForInactiveAnimations() {
    const activeIds = new Set(ctx.state.runningAnimations.map((anim) => anim.id));
    for (const animationId of activeAnimationAudioById.keys()) {
      if (!activeIds.has(animationId)) {
        stopAnimationSound(animationId);
      }
    }
  }

  function enforceAudioLifecycleGuard() {
    if (isAudioPlaybackAllowed()) {
      return;
    }
    for (const animationId of Array.from(activeAnimationAudioById.keys())) {
      stopAnimationSound(animationId);
    }
    stopAllAudioVoices();
  }

  function playSoundForAnimation(animation) {
    if (!animation || !isAudioPlaybackAllowed()) {
      return;
    }
    if (animation.scope === "global" && animation.type === "outside-space") {
      stopAnimationSound(animation.id);
      return;
    }
    if (animation.scope === "cluster") {
      return;
    }
    const state = ctx.state;
    const lifecycleKey = getAnimationAudioLifecycleKey(animation);
    const triggerKey = animation.scope === "global" ? ctx.getGlobalTriggerKey(animation) : null;
    const triggerRevision = animation.scope === "global" ? ctx.getGlobalTriggerRevision(animation) : null;
    if (triggerKey && triggerRevision !== null) {
      const stopRevision = Number(ctx.liveSync.globalStopRevisionSeenByKey.get(triggerKey) ?? 0);
      if (stopRevision >= triggerRevision) {
        stopAnimationSound(animation.id);
        return;
      }
      const lastStartedRevision = Number(startedGlobalAudioRevisionByTriggerKey.get(triggerKey) ?? 0);
      if (triggerRevision < lastStartedRevision) {
        stopAnimationSound(animation.id);
        return;
      }
    }
    const active = activeAnimationAudioById.get(animation.id);
    if (active?.lifecycleKey && lifecycleKey && active.lifecycleKey === lifecycleKey) {
      if (active.voice) {
        const soundVolume = ctx.clampRoomSoundVolume(animation.soundVolume ?? active.soundVolume ?? 1);
        const instanceVolume = isAudioPlaybackAllowed() ? state.audio.volume * soundVolume : 0;
        active.voice.volume = instanceVolume;
        activeAnimationAudioById.set(animation.id, {
          ...active,
          soundVolume,
        });
      }
      return;
    }
    const startDelayMs = Math.max(0, Math.ceil((Number(animation.startedAt) || 0) - performance.now()));
    if (startDelayMs > 0) {
      stopAnimationSound(animation.id);
      const expectedLifecycleKey = lifecycleKey;
      const timerId = window.setTimeout(() => {
        pendingAnimationAudioStartTimers.delete(animation.id);
        const currentAnimation = state.runningAnimations.find((item) => item.id === animation.id) ?? null;
        const stillRunning = Boolean(currentAnimation);
        const currentLifecycleKey = currentAnimation ? getAnimationAudioLifecycleKey(currentAnimation) : null;
        if (expectedLifecycleKey && currentLifecycleKey && expectedLifecycleKey !== currentLifecycleKey) {
          return;
        }
        if (!stillRunning) {
          return;
        }
        playSoundForAnimation(currentAnimation);
      }, startDelayMs);
      pendingAnimationAudioStartTimers.set(animation.id, timerId);
      return;
    }
    // Phase 15-9: prefer the per-definition soundAssetRef if the
    // animation carries one. Fall back to the legacy
    // animationSoundMap lookup so existing persisted state still
    // plays the mapped sound during the migration window.
    const inlineSoundRef = typeof animation.soundAssetRef === "string"
      ? animation.soundAssetRef.trim()
      : "";
    let path;
    if (inlineSoundRef && inlineSoundRef !== ctx.SOUND_MAPPING_NONE) {
      path = ctx.ALL_SOUND_ASSET_PATHS.includes(inlineSoundRef) ? inlineSoundRef : null;
    } else if (inlineSoundRef === ctx.SOUND_MAPPING_NONE) {
      path = null;
    } else {
      path = ctx.getMappedSoundPathForAnimation(animation.type);
    }
    if (!path) {
      stopAnimationSound(animation.id);
      return;
    }
    const pool = getAudioAssetPool(path);
    if (!pool?.length) {
      return;
    }
    stopAnimationSound(animation.id);
    const nextIndex = audioAssetVoiceCursorByPath[path] ?? 0;
    const reusable = pool[nextIndex % pool.length];
    audioAssetVoiceCursorByPath[path] = (nextIndex + 1) % pool.length;
    const onEnded = () => {
      const stillRunning = state.runningAnimations.some((item) => item.id === animation.id);
      const stillActive = activeAnimationAudioById.get(animation.id)?.voice === reusable;
      if (!stillRunning || !stillActive || !isAudioPlaybackAllowed()) {
        stopAnimationSound(animation.id);
        return;
      }
      reusable.currentTime = 0;
      reusable.play().catch(() => {
        stopAnimationSound(animation.id);
      });
    };
    reusable.addEventListener("ended", onEnded);
    reusable.pause();
    reusable.currentTime = 0;
    const soundVolume = ctx.clampRoomSoundVolume(animation.soundVolume ?? 1);
    reusable.volume = state.audio.volume * soundVolume;
    activeAnimationAudioById.set(animation.id, {
      voice: reusable,
      onEnded,
      soundVolume,
      lifecycleKey,
    });
    if (triggerKey && triggerRevision !== null) {
      startedGlobalAudioRevisionByTriggerKey.set(triggerKey, triggerRevision);
    }
    reusable.play().catch(() => undefined);
  }

  // Phase 15-9: the standalone Sound Mapping panel was removed.
  // These two sync functions are retained as no-ops for callers
  // that still invoke them (e.g. syncRuntimePanelsFromState).
  // When the DOM refs are null, nothing to sync.
  function syncAudioMappingStatus() {
    if (!ctx.audioMappingAnimationSelect || !ctx.audioMappingStatus) return;
    const animationType = ctx.audioMappingAnimationSelect.value || ctx.ALL_ANIMATION_TYPES[0]?.id;
    if (!animationType) {
      ctx.audioMappingStatus.textContent = "Sound mapping: no animations available";
      return;
    }
    const label = ctx.getAnimationLabel(animationType);
    const mapped = ctx.normalizeAnimationSoundPath(animationType, ctx.state.animationSoundMap[animationType]);
    if (mapped === ctx.SOUND_MAPPING_NONE) {
      ctx.audioMappingStatus.textContent = `Sound-Mapping: ${label} -> none`;
      return;
    }
    const fileName = mapped.split("/").pop() ?? mapped;
    ctx.audioMappingStatus.textContent = `Sound-Mapping: ${label} -> ${fileName}`;
  }

  function syncAudioMappingPanel() {
    const state = ctx.state;
    const audioMappingAnimationSelect = ctx.audioMappingAnimationSelect;
    const audioMappingSoundSelect = ctx.audioMappingSoundSelect;
    if (!audioMappingAnimationSelect || !audioMappingSoundSelect) return;
    if (audioMappingAnimationSelect.childElementCount === 0) {
      for (const animation of ctx.ALL_ANIMATION_TYPES) {
        const option = document.createElement("option");
        option.value = animation.id;
        if (ctx.GLOBAL_ANIMATIONS.some((entry) => entry.id === animation.id)) {
          const categoryLabel = ctx.getGlobalAnimationCategory(animation.id) === "outside-ship"
            ? "Outside ship"
            : "Inside ship";
          option.textContent = `[${categoryLabel}] ${animation.label}`;
        } else {
          option.textContent = animation.label;
        }
        audioMappingAnimationSelect.append(option);
      }
    }

    const selectedAnimationType = ctx.ALL_ANIMATION_TYPES.some((entry) => entry.id === audioMappingAnimationSelect.value)
      ? audioMappingAnimationSelect.value
      : ctx.ALL_ANIMATION_TYPES[0]?.id;
    if (!selectedAnimationType) {
      return;
    }
    audioMappingAnimationSelect.value = selectedAnimationType;

    audioMappingSoundSelect.replaceChildren();
    const noneOption = document.createElement("option");
    noneOption.value = ctx.SOUND_MAPPING_NONE;
    noneOption.textContent = "none (no sound)";
    audioMappingSoundSelect.append(noneOption);

    for (const soundPath of ctx.ALL_SOUND_ASSET_PATHS) {
      const option = document.createElement("option");
      option.value = soundPath;
      option.textContent = soundPath.replace(/^\/?(resources\/)?sounds\//, "").replace(/^\/?(resources\/)?nemesis\/sounds\//, "");
      audioMappingSoundSelect.append(option);
    }

    const mapped = ctx.normalizeAnimationSoundPath(
      selectedAnimationType,
      state.animationSoundMap[selectedAnimationType],
    );
    const previousMapped = state.animationSoundMap[selectedAnimationType];
    state.animationSoundMap[selectedAnimationType] = mapped;
    if (previousMapped !== mapped) {
      persistRuntimeSoundSettingsChange(
        "Status: Sound mapping normalized, but persistence failed",
      );
    }
    audioMappingSoundSelect.value = mapped;
    syncAudioMappingStatus();
  }

  // Hard-stop helper used by the runtime's executeClearAll / panic
  // paths. Cancels every pending start-delay timer + clears the
  // active voice map.
  function clearAllActiveAnimationAudio() {
    for (const timeoutId of pendingAnimationAudioStartTimers.values()) {
      window.clearTimeout(timeoutId);
    }
    pendingAnimationAudioStartTimers.clear();
    activeAnimationAudioById.clear();
  }

  window.TT_BEAMER_RUNTIME_AUDIO = {
    init,
    syncAudioStatus,
    isOutputAudibleRole,
    isAudioPlaybackAllowed,
    persistRuntimeSoundSettingsChange,
    syncAnimationSpeedPanel,
    createAudioAssetVoice,
    getAudioAssetPool,
    warmEventSoundAssets,
    applyAudioGain,
    stopAllAudioVoices,
    stopAnimationSound,
    getAnimationAudioLifecycleKey,
    stopSoundsForInactiveAnimations,
    enforceAudioLifecycleGuard,
    playSoundForAnimation,
    syncAudioMappingStatus,
    syncAudioMappingPanel,
    clearAllActiveAnimationAudio,
  };
})();
