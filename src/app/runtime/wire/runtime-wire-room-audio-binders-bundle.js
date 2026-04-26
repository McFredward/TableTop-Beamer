// Bundle export / import wiring extracted from
// runtime-wire-room-audio-binders.js (W3.6-C2 Option B minimal split).
//
// Owns the unified per-board package export/import flow:
// - Export: #bundle-export-board → /api/boards/bundle-export.
// - Package import: zip upload (with embedded-name preview via local
//   zip reader) → /api/boards/bundle-import.
// - Image import: image-only upload → /api/boards/import.
//
// The original `(function wireBundleExportImport() { ... })()` IIFE
// (309 lines / file 483-791) moves verbatim into the body of the new
// `wireRoomAudioBindersBundle(ctx)` entry point. Only outer-scope
// dependencies are `state` + `triggerFeedback` (both ctx-injected).
//
// Wire-binder pattern preserved per RESEARCH §1 / §9 #10:
// `wireXxxBindersTopic(ctx)` entry-point — NO `init({ctx})`.
(() => {
  function wireRoomAudioBindersBundle(ctx) {
    const { state, triggerFeedback } = ctx;

    (function wireBundleExportImport() {
      const exportButton = document.querySelector("#bundle-export-board");
      const tabButtons = Array.from(document.querySelectorAll(".bundle-import-tab"));
      const tabPanels = Array.from(document.querySelectorAll("[data-bundle-import-panel]"));
      const packageFileInput = document.querySelector("#bundle-import-package-file");
      const packageCard = document.querySelector("#bundle-import-package-card");
      const packageNameInput = document.querySelector("#bundle-import-package-name");
      const packageUploadButton = document.querySelector("#bundle-import-package-upload");
      const imageFileInput = document.querySelector("#bundle-import-image-file");
      const imageCard = document.querySelector("#bundle-import-image-card");
      const imageNameInput = document.querySelector("#bundle-import-image-name");
      const imageUploadButton = document.querySelector("#bundle-import-image-upload");
      const bundleStatus = document.querySelector("#bundle-status");
      const setStatus = (msg) => { if (bundleStatus) bundleStatus.textContent = msg; };

      let pendingPackageFile = null;
      let pendingImageFile = null;

      function switchTab(targetKey) {
        for (const btn of tabButtons) {
          const isActive = btn.dataset.bundleImportTab === targetKey;
          btn.classList.toggle("is-active", isActive);
          btn.setAttribute("aria-selected", String(isActive));
        }
        for (const panel of tabPanels) {
          const isActive = panel.dataset.bundleImportPanel === targetKey;
          if (isActive) {
            panel.removeAttribute("hidden");
          } else {
            panel.setAttribute("hidden", "");
          }
        }
      }

      for (const btn of tabButtons) {
        btn.addEventListener("click", () => switchTab(btn.dataset.bundleImportTab));
      }

      function formatFileSize(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) return "";
        if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / 1024).toFixed(0)} KB`;
      }

      function updateFileCard(cardRoot, file, { emptyIcon, filledIcon }) {
        if (!cardRoot) return;
        const iconEl = cardRoot.querySelector(".bundle-file-card-icon");
        const nameEl = cardRoot.querySelector(".bundle-file-card-name");
        const metaEl = cardRoot.querySelector(".bundle-file-card-meta");
        const clearEl = cardRoot.querySelector(".bundle-file-card-clear");
        if (!file) {
          cardRoot.classList.add("is-empty");
          if (iconEl) iconEl.textContent = emptyIcon;
          if (nameEl) nameEl.textContent = "No file selected";
          if (metaEl) metaEl.textContent = "";
          if (clearEl) clearEl.hidden = true;
          return;
        }
        cardRoot.classList.remove("is-empty");
        if (iconEl) iconEl.textContent = filledIcon;
        if (nameEl) nameEl.textContent = file.name;
        if (metaEl) metaEl.textContent = formatFileSize(file.size);
        if (clearEl) clearEl.hidden = false;
      }

      function updateFileCardMeta(cardRoot, metaText) {
        if (!cardRoot) return;
        const metaEl = cardRoot.querySelector(".bundle-file-card-meta");
        if (metaEl) metaEl.textContent = metaText;
      }

      document.querySelectorAll(".bundle-file-card-clear").forEach((button) => {
        button.addEventListener("click", () => {
          const which = button.dataset.bundleClear;
          if (which === "package") resetPackageForm();
          else if (which === "image") resetImageForm();
        });
      });

      exportButton?.addEventListener("click", async () => {
        const boardId = state.boardId;
        if (!boardId) { setStatus("No board selected."); return; }
        try {
          setStatus(`Preparing package for ${boardId}… (bundling assets, this can take a moment)`);
          const resp = await fetch(`/api/boards/bundle-export?boardId=${encodeURIComponent(boardId)}`);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const blob = await resp.blob();
          let downloadName = null;
          const cd = resp.headers.get("content-disposition") || "";
          const match = cd.match(/filename\s*=\s*"?([^";]+)"?/i);
          if (match) downloadName = match[1];
          if (!downloadName) {
            const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            downloadName = `tt-beamer-board-${boardId}-${stamp}.zip`;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = downloadName;
          document.body.append(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
          const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
          setStatus(`Saved ${downloadName} (${sizeMB} MB). Share this file.`);
        } catch (error) {
          setStatus(`Export failed: ${error?.message || error}`);
        }
      });

      // Browser-side reader: pulls package.json out of a zip File so we
      // can prefill the rename field from the board's embedded metadata
      // name without sending the whole package over the wire first.
      async function readPackageManifestFromZip(file) {
        const buf = await file.arrayBuffer();
        const view = new DataView(buf);
        const total = view.byteLength;
        const maxScan = Math.max(0, total - 65558);
        let eocd = -1;
        for (let i = total - 22; i >= maxScan; i--) {
          if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
        }
        if (eocd === -1) throw new Error("not a valid .zip (no EOCD)");
        const totalEntries = view.getUint16(eocd + 10, true);
        const centralStart = view.getUint32(eocd + 16, true);
        let p = centralStart;
        const td = new TextDecoder("utf-8");
        for (let i = 0; i < totalEntries; i++) {
          if (view.getUint32(p, true) !== 0x02014b50) throw new Error("bad central directory");
          const method = view.getUint16(p + 10, true);
          const compressedSize = view.getUint32(p + 20, true);
          const nameLen = view.getUint16(p + 28, true);
          const extraLen = view.getUint16(p + 30, true);
          const commentLen = view.getUint16(p + 32, true);
          const localOffset = view.getUint32(p + 42, true);
          const filename = td.decode(new Uint8Array(buf, p + 46, nameLen));
          if (filename === "package.json") {
            if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("bad local header");
            const lnl = view.getUint16(localOffset + 26, true);
            const lel = view.getUint16(localOffset + 28, true);
            const dataStart = localOffset + 30 + lnl + lel;
            const raw = new Uint8Array(buf, dataStart, compressedSize);
            let json;
            if (method === 0) {
              json = td.decode(raw);
            } else if (method === 8) {
              const ds = new DecompressionStream("deflate-raw");
              const writer = ds.writable.getWriter();
              writer.write(raw);
              writer.close();
              const inflated = await new Response(ds.readable).arrayBuffer();
              json = td.decode(new Uint8Array(inflated));
            } else {
              throw new Error(`unsupported compression method ${method}`);
            }
            return JSON.parse(json);
          }
          p += 46 + nameLen + extraLen + commentLen;
        }
        throw new Error("package.json not found in zip");
      }

      function resetPackageForm() {
        pendingPackageFile = null;
        if (packageFileInput) packageFileInput.value = "";
        updateFileCard(packageCard, null, { emptyIcon: "📄", filledIcon: "📦" });
        if (packageNameInput) { packageNameInput.value = ""; packageNameInput.disabled = true; }
        if (packageUploadButton) packageUploadButton.disabled = true;
      }

      function resetImageForm() {
        pendingImageFile = null;
        if (imageFileInput) imageFileInput.value = "";
        updateFileCard(imageCard, null, { emptyIcon: "🖼️", filledIcon: "🖼️" });
        if (imageNameInput) { imageNameInput.value = ""; imageNameInput.disabled = true; }
        if (imageUploadButton) imageUploadButton.disabled = true;
      }

      packageFileInput?.addEventListener("change", async () => {
        const file = packageFileInput.files?.[0] ?? null;
        if (!file) { resetPackageForm(); return; }
        const mime = String(file.type || "").toLowerCase();
        const isPackage = /\.zip$/i.test(file.name)
          || mime === "application/zip"
          || mime === "application/x-zip-compressed";
        if (!isPackage) {
          setStatus(`Not a .zip package: ${file.name}`);
          resetPackageForm();
          return;
        }
        pendingPackageFile = file;
        updateFileCard(packageCard, file, { emptyIcon: "📄", filledIcon: "📦" });
        updateFileCardMeta(packageCard, `${formatFileSize(file.size)} · reading name…`);
        if (packageUploadButton) packageUploadButton.disabled = true;
        if (packageNameInput) { packageNameInput.disabled = true; packageNameInput.value = ""; }
        try {
          const manifest = await readPackageManifestFromZip(file);
          const embeddedName = String(
            manifest?.board?.metadata?.name
              ?? manifest?.board?.label
              ?? manifest?.boardId
              ?? "",
          ).trim();
          if (packageNameInput) {
            packageNameInput.value = embeddedName;
            packageNameInput.disabled = false;
          }
          if (packageUploadButton) packageUploadButton.disabled = false;
          updateFileCardMeta(packageCard, formatFileSize(file.size));
          setStatus(`Package ready: "${embeddedName || manifest?.boardId || "unknown"}" — review the name, then click Upload.`);
        } catch (error) {
          updateFileCardMeta(packageCard, formatFileSize(file.size));
          setStatus(`Could not read package metadata: ${error?.message || error}. You can still upload; the embedded name will be used.`);
          if (packageNameInput) { packageNameInput.value = ""; packageNameInput.disabled = false; }
          if (packageUploadButton) packageUploadButton.disabled = false;
        }
      });

      packageUploadButton?.addEventListener("click", async () => {
        if (!pendingPackageFile) return;
        const file = pendingPackageFile;
        const renameTo = packageNameInput?.value?.trim() ?? "";
        packageUploadButton.disabled = true;
        if (packageFileInput) packageFileInput.disabled = true;
        if (packageNameInput) packageNameInput.disabled = true;
        try {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
          setStatus(`Uploading ${file.name} (${sizeMB} MB)… — this can take a moment for packages with videos`);
          const url = renameTo
            ? `/api/boards/bundle-import?renameTo=${encodeURIComponent(renameTo)}`
            : "/api/boards/bundle-import";
          const resp = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/zip" },
            body: file,
          });
          if (!resp.ok) {
            const body = await resp.json().catch(() => ({}));
            throw new Error(body?.error || `HTTP ${resp.status}`);
          }
          const body = await resp.json();
          const wrote = Number(body.resourcesWritten) || 0;
          const skipped = Number(body.resourcesSkipped) || 0;
          const extra = wrote || skipped
            ? ` · ${wrote} new asset${wrote === 1 ? "" : "s"}${skipped ? `, ${skipped} already on disk (skipped)` : ""}`
            : "";
          setStatus(`Imported "${body.boardId}"${extra}. Reload the page to see it in the list.`);
          triggerFeedback.textContent = `Status: Board ${body.boardId} imported`;
          resetPackageForm();
        } catch (error) {
          setStatus(`Import failed: ${error?.message || error}`);
          if (packageUploadButton) packageUploadButton.disabled = false;
          if (packageNameInput) packageNameInput.disabled = false;
        } finally {
          if (packageFileInput) packageFileInput.disabled = false;
        }
      });

      imageFileInput?.addEventListener("change", () => {
        const file = imageFileInput.files?.[0] ?? null;
        if (!file) { resetImageForm(); return; }
        const mime = String(file.type || "").toLowerCase();
        const isImage = mime.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name);
        if (!isImage) {
          setStatus(`Not a supported image: ${file.name}`);
          resetImageForm();
          return;
        }
        pendingImageFile = file;
        updateFileCard(imageCard, file, { emptyIcon: "🖼️", filledIcon: "🖼️" });
        if (imageNameInput) {
          const stem = file.name.replace(/\.[^.]+$/, "").trim();
          imageNameInput.value = stem;
          imageNameInput.disabled = false;
        }
        if (imageUploadButton) imageUploadButton.disabled = false;
        setStatus(`Image ready — edit the board name if you like, then click Upload.`);
      });

      imageUploadButton?.addEventListener("click", async () => {
        if (!pendingImageFile) return;
        const file = pendingImageFile;
        imageUploadButton.disabled = true;
        if (imageFileInput) imageFileInput.disabled = true;
        if (imageNameInput) imageNameInput.disabled = true;
        try {
          setStatus(`Uploading ${file.name}…`);
          const form = new FormData();
          form.append("image", file, file.name);
          const nameValue = imageNameInput?.value?.trim() ?? "";
          if (nameValue) form.append("boardName", nameValue);
          const resp = await fetch("/api/boards/import", { method: "POST", body: form });
          if (!resp.ok) {
            const body = await resp.json().catch(() => ({}));
            throw new Error(body?.error || `HTTP ${resp.status}`);
          }
          const body = await resp.json();
          setStatus(`Created board "${body.boardId ?? body.board?.boardId ?? "(new)"}" — reload to see it.`);
          triggerFeedback.textContent = `Status: New board created from image`;
          resetImageForm();
        } catch (error) {
          setStatus(`Import failed: ${error?.message || error}`);
          if (imageUploadButton) imageUploadButton.disabled = false;
          if (imageNameInput) imageNameInput.disabled = false;
        } finally {
          if (imageFileInput) imageFileInput.disabled = false;
        }
      });
    })();
  }

  window.TT_BEAMER_RUNTIME_WIRE_ROOM_AUDIO_BINDERS_BUNDLE = {
    wireRoomAudioBindersBundle,
  };
})();
