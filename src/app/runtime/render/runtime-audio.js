// audio pipeline module.
//
// Owns the Audio() voice pool, the active-animation audio map, the
// pending start-delay timers, and the cross-client revision memory
// used by the global-trigger loop-once guards.
//
// Dependencies injected via ctx:
//   state, liveSync, outputRole, OUTPUT_ROLE_FINAL
//   DOM refs: audioStatus, triggerFeedback, animationSpeedInput,
//             animationSpeedValue, animationSpeedStatus
//   Constants: ALL_SOUND_ASSET_PATHS, SOUND_MAPPING_NONE
//   Helpers: persistBoardProfiles, clampAnimationSpeed,
//            clampRoomSoundVolume, getGlobalTriggerRevision,
//            getGlobalTriggerKey, getAnimationStartedAtEpochMs
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

  function syncAudioGain() {
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

  // stopAnimationSound accepts an optional `graceful` flag.
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
    if (animation.scope === "global"
      && (ctx.isOutsideAnimationType?.(animation.type, animation.boardId ?? ctx.state.boardId)
        || animation.type === "outside-space")) {
      // Outside animations drive their audio through a different path
      // (bound to the outside layer). Short-circuit the generic
      // per-animation sound player here.
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
    // Per-animation soundAssetRef is the sole source of audio.
    // The animation factory populates this field on creation, and
    // Phase 29 Wave 3 boot migration backfills any pre-existing
    // animations whose ref was empty.
    const inlineSoundRef = typeof animation.soundAssetRef === "string"
      ? animation.soundAssetRef.trim()
      : "";
    let path;
    if (inlineSoundRef && inlineSoundRef !== ctx.SOUND_MAPPING_NONE) {
      // Accept any /resources/sounds/*.{mp3,wav,ogg,m4a} so
      // user-uploaded sounds work alongside the built-in map.
      if (ctx.ALL_SOUND_ASSET_PATHS.includes(inlineSoundRef)) {
        path = inlineSoundRef;
      } else if (/^\/resources\/sounds\/.+\.(mp3|wav|ogg|m4a)$/i.test(inlineSoundRef)) {
        path = inlineSoundRef;
      } else {
        path = null;
      }
    } else {
      path = null;
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
    applyAudioGain: syncAudioGain,
    stopAllAudioVoices,
    stopAnimationSound,
    getAnimationAudioLifecycleKey,
    stopSoundsForInactiveAnimations,
    enforceAudioLifecycleGuard,
    playSoundForAnimation,
    clearAllActiveAnimationAudio,
  };
})();
