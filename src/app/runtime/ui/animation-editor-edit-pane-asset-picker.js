// Animation editor edit-pane — asset / sound picker cluster.
// Owns the GIF / MP4 file pickers (`buildAssetPickerRow` +
// `fetchAnimationResources`) and the Sound card + sound picker
// (`buildSoundCard` + `buildSoundPickerRow` + `fetchSoundResources`).
//
// Phase 24 W3.6-Cextra-edit-pane: extracted from
// animation-editor-edit-pane.js (Option B minimal split — shell drops
// 1006 → ~684, clearing the ≤800 line acceptance bar). Cluster has
// no `ctx.`/`state.` refs — only `patchAnimation` (injected via init)
// plus `window.confirm` / `window.TT_BEAMER_CONFIG` globals. The two
// private helpers `fetchAnimationResources` / `fetchSoundResources`
// move with their callers (only called from
// `buildAssetPickerRow` / `buildSoundPickerRow` respectively, per the
// W3.3-C3 cluster note).
(() => {
  // Injected at init time by animation-editor-edit-pane.js. Module-
  // private `let` keeps `buildAssetPickerRow` / `buildSoundPickerRow`
  // call sites byte-identical with the pre-W3.6 IIFE.
  let patchAnimation = null;

  // Phase 28 B3: track the last hash we saw per path so we can decide whether
  // re-uploading the same name is a real content change (when Plan 28-04 lands
  // the server-side hash). Until 28-04 lands, this map is unused; it stays here
  // as the contract that 28-04 wires up.
  const _lastSeenAssetHashByPath = new Map();
  const _lastSeenSoundHashByPath = new Map();

  function init(deps) {
    if (typeof deps?.patchAnimation === "function") patchAnimation = deps.patchAnimation;
  }

  // GIF/MP4 pickers — dropdown of resources/animations/*
  // plus Upload + Delete buttons. Replaces the previous free-text path input.
  function buildAssetPickerRow(scope, def, boardId) {
    const ext = def.assetType === "mp4" ? "mp4" : "gif";
    const wrap = document.createElement("div");
    wrap.className = "anim-editor-asset-picker";

    const label = document.createElement("label");
    label.className = "anim-editor-field-label";
    const cap = document.createElement("span");
    cap.textContent = ext === "mp4" ? "Video file" : "GIF file";
    const select = document.createElement("select");
    select.className = "anim-editor-asset-select";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = `Select ${ext.toUpperCase()}…`;
    select.append(placeholder);
    label.append(cap, select);

    const actions = document.createElement("div");
    actions.className = "anim-editor-asset-actions";

    const uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.className = "rd-btn rd-btn-ghost";
    uploadBtn.textContent = "Upload";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "rd-btn rd-btn-ghost";
    deleteBtn.textContent = "Delete";
    deleteBtn.disabled = true;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ext === "mp4" ? "video/mp4,.mp4" : "image/gif,.gif";
    fileInput.style.display = "none";

    const status = document.createElement("p");
    status.className = "rd-caption anim-editor-asset-status";

    actions.append(uploadBtn, deleteBtn, fileInput);
    wrap.append(label, actions, status);

    async function refreshList(selectedPath) {
      const files = await fetchAnimationResources(ext);
      select.replaceChildren();
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = files.length
        ? `Select ${ext.toUpperCase()}…`
        : `No ${ext.toUpperCase()} files uploaded`;
      select.append(ph);
      for (const file of files) {
        const opt = document.createElement("option");
        opt.value = file;
        opt.textContent = file.replace(/^\/resources\/animations\//, "");
        select.append(opt);
      }
      const current = selectedPath ?? String(def.assetRef || "").trim();
      if (current && files.includes(current)) {
        select.value = current;
        deleteBtn.disabled = false;
      } else {
        select.value = "";
        deleteBtn.disabled = true;
      }
    }

    select.addEventListener("change", () => {
      patchAnimation(scope, boardId, def.id, { assetRef: select.value });
      deleteBtn.disabled = !select.value;
    });

    uploadBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) return;
      status.textContent = `Uploading ${file.name}…`;
      uploadBtn.disabled = true;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const response = await fetch(
          `/api/resources/animations?filename=${encodeURIComponent(file.name)}`,
          { method: "POST", body: arrayBuffer },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok) {
          status.textContent = payload?.error || "Upload failed";
          return;
        }
        status.textContent = `Uploaded ${payload.filename}`;
        // Phase 28 B3 (D-07.1 + D-08): only fire dirty when the uploaded asset
        // is the currently-selected def's assetRef. Pure library uploads
        // (uploading a new file that isn't selected by anything) do NOT mark
        // dirty.
        const currentAssetRef = String(def.assetRef || "").trim();
        const uploadedPath = String(payload.path || "").trim();
        if (currentAssetRef && uploadedPath === currentAssetRef) {
          // Re-upload of the SAME path that the def already references = content
          // change (the user just replaced the bytes on disk under the same
          // name).
          // TODO(28-04): hash-diff gate per D-07.3 — when Plan 28-04 lands the
          // server-side `payload.hash`, replace the unconditional patchAnimation
          // here with `if (_lastSeenAssetHashByPath.get(uploadedPath) !== payload.hash)`
          // and then `_lastSeenAssetHashByPath.set(uploadedPath, payload.hash);`.
          patchAnimation(scope, boardId, def.id, { assetRef: payload.path });
        }
        // else: pure-library upload (no selection match) → no patchAnimation,
        // no dirty.
        await refreshList(payload.path);
      } catch (error) {
        status.textContent = "Upload failed";
        console.error("anim upload failed", error);
      } finally {
        uploadBtn.disabled = false;
      }
    });

    deleteBtn.addEventListener("click", async () => {
      const current = select.value;
      if (!current) return;
      const name = current.replace(/^\/resources\/animations\//, "");
      if (!window.confirm(`Delete ${name}? This removes it from disk.`)) return;
      status.textContent = `Deleting ${name}…`;
      deleteBtn.disabled = true;
      try {
        const response = await fetch(
          `/api/resources/animations?path=${encodeURIComponent(current)}`,
          { method: "DELETE" },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok) {
          status.textContent = payload?.error || "Delete failed";
          deleteBtn.disabled = false;
          return;
        }
        status.textContent = `Deleted ${name}`;
        if (String(def.assetRef || "").trim() === current) {
          patchAnimation(scope, boardId, def.id, { assetRef: "" });
        }
        await refreshList("");
      } catch (error) {
        status.textContent = "Delete failed";
        console.error("anim delete failed", error);
        deleteBtn.disabled = false;
      }
    });

    refreshList();

    return wrap;
  }

  async function fetchAnimationResources(ext) {
    try {
      const response = await fetch("/api/resources");
      if (!response.ok) return [];
      const payload = await response.json();
      const files = Array.isArray(payload?.files) ? payload.files : [];
      const pattern = new RegExp(`\\.${ext}$`, "i");
      return files
        .map((entry) => String(entry || "").trim())
        .filter((entry) => entry.startsWith("/resources/animations/") && pattern.test(entry))
        .sort();
    } catch {
      return [];
    }
  }

  function buildSoundCard(scope, def, boardId) {
    const card = document.createElement("section");
    card.className = "anim-editor-card";
    const eyebrow = document.createElement("p");
    eyebrow.className = "anim-editor-card-eyebrow";
    eyebrow.textContent = "Sound";
    card.append(eyebrow);
    card.append(buildSoundPickerRow(scope, def, boardId));
    return card;
  }

  // Sound picker — mirrors the GIF/MP4 asset picker but
  // targets /resources/sounds/ with audio extensions, and includes a
  // "No sound" entry mapped to SOUND_MAPPING_NONE.
  function buildSoundPickerRow(scope, def, boardId) {
    const config = window.TT_BEAMER_CONFIG || {};
    const noneValue = config.SOUND_MAPPING_NONE ?? "none";
    const extensions = ["mp3", "wav", "ogg", "m4a"];

    const wrap = document.createElement("div");
    wrap.className = "anim-editor-asset-picker";

    const label = document.createElement("label");
    label.className = "anim-editor-field-label";
    const cap = document.createElement("span");
    cap.textContent = "Sound file";
    const select = document.createElement("select");
    select.className = "anim-editor-asset-select";
    label.append(cap, select);

    const actions = document.createElement("div");
    actions.className = "anim-editor-asset-actions";

    const uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.className = "rd-btn rd-btn-ghost";
    uploadBtn.textContent = "Upload";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "rd-btn rd-btn-ghost";
    deleteBtn.textContent = "Delete";
    deleteBtn.disabled = true;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "audio/*,.mp3,.wav,.ogg,.m4a";
    fileInput.style.display = "none";

    const status = document.createElement("p");
    status.className = "rd-caption anim-editor-asset-status";

    actions.append(uploadBtn, deleteBtn, fileInput);
    wrap.append(label, actions, status);

    async function refreshList(selectedPath) {
      const files = await fetchSoundResources(extensions);
      const builtIn = Array.isArray(config.ALL_SOUND_ASSET_PATHS)
        ? config.ALL_SOUND_ASSET_PATHS
        : [];
      // Built-in paths + uploaded /resources/sounds/ entries. Merge
      // and dedupe so uploads land alongside the seeded map files.
      const merged = Array.from(new Set([...builtIn, ...files])).sort();
      select.replaceChildren();
      const noneOpt = document.createElement("option");
      noneOpt.value = noneValue;
      noneOpt.textContent = "No sound";
      select.append(noneOpt);
      for (const file of merged) {
        const opt = document.createElement("option");
        opt.value = file;
        opt.textContent = String(file).split("/").pop() || file;
        select.append(opt);
      }
      const current = selectedPath ?? String(def.soundAssetRef || noneValue);
      select.value = merged.includes(current) ? current : (current === noneValue ? noneValue : noneValue);
      // Delete is only enabled for user-uploaded files (not built-ins).
      const isUploaded = typeof select.value === "string"
        && select.value.startsWith("/resources/sounds/")
        && !builtIn.includes(select.value);
      deleteBtn.disabled = !isUploaded;
    }

    select.addEventListener("change", () => {
      patchAnimation(scope, boardId, def.id, { soundAssetRef: select.value });
      const builtIn = Array.isArray(config.ALL_SOUND_ASSET_PATHS) ? config.ALL_SOUND_ASSET_PATHS : [];
      const isUploaded = select.value.startsWith("/resources/sounds/") && !builtIn.includes(select.value);
      deleteBtn.disabled = !isUploaded;
    });

    uploadBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file) return;
      status.textContent = `Uploading ${file.name}…`;
      uploadBtn.disabled = true;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const response = await fetch(
          `/api/resources/sounds?filename=${encodeURIComponent(file.name)}`,
          { method: "POST", body: arrayBuffer },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok) {
          status.textContent = payload?.error || "Upload failed";
          return;
        }
        status.textContent = `Uploaded ${payload.filename}`;
        // Phase 28 B3 (D-07.1 + D-08): symmetric guard for sound assets. Only
        // fire dirty when the uploaded sound is the currently-selected def's
        // soundAssetRef. Pure library uploads do NOT mark dirty.
        const currentSoundRef = String(def.soundAssetRef || "").trim();
        const uploadedSoundPath = String(payload.path || "").trim();
        if (currentSoundRef && uploadedSoundPath === currentSoundRef) {
          // TODO(28-04): hash-diff gate per D-07.3 — see _lastSeenSoundHashByPath.
          // Plan 28-04 will replace the unconditional patchAnimation with a
          // hash-compare against the tracker map.
          patchAnimation(scope, boardId, def.id, { soundAssetRef: payload.path });
        }
        // else: pure-library sound upload (no selection match) → no
        // patchAnimation, no dirty.
        await refreshList(payload.path);
      } catch (error) {
        status.textContent = "Upload failed";
        console.error("sound upload failed", error);
      } finally {
        uploadBtn.disabled = false;
      }
    });

    deleteBtn.addEventListener("click", async () => {
      const current = select.value;
      if (!current || current === noneValue) return;
      const name = current.replace(/^\/resources\/sounds\//, "");
      if (!window.confirm(`Delete ${name}? This removes it from disk.`)) return;
      status.textContent = `Deleting ${name}…`;
      deleteBtn.disabled = true;
      try {
        const response = await fetch(
          `/api/resources/sounds?path=${encodeURIComponent(current)}`,
          { method: "DELETE" },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok) {
          status.textContent = payload?.error || "Delete failed";
          deleteBtn.disabled = false;
          return;
        }
        status.textContent = `Deleted ${name}`;
        if (String(def.soundAssetRef || "").trim() === current) {
          patchAnimation(scope, boardId, def.id, { soundAssetRef: noneValue });
        }
        await refreshList(noneValue);
      } catch (error) {
        status.textContent = "Delete failed";
        console.error("sound delete failed", error);
        deleteBtn.disabled = false;
      }
    });

    refreshList();
    return wrap;
  }

  async function fetchSoundResources(extensions) {
    try {
      const response = await fetch("/api/resources");
      if (!response.ok) return [];
      const payload = await response.json();
      const files = Array.isArray(payload?.files) ? payload.files : [];
      const extRegex = new RegExp(`\\.(${extensions.join("|")})$`, "i");
      return files
        .map((entry) => String(entry || "").trim())
        .filter((entry) => entry.startsWith("/resources/sounds/") && extRegex.test(entry))
        .sort();
    } catch {
      return [];
    }
  }

  window.TT_BEAMER_RUNTIME_ANIMATION_EDITOR_EDIT_PANE_ASSET_PICKER = {
    init,
    buildAssetPickerRow,
    buildSoundCard,
    buildSoundPickerRow,
  };
})();
