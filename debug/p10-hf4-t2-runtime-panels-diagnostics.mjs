import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const runtimePanelsSource = readFileSync(new URL("../src/app/ui/runtime-panels-controller.js", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

function executeOrder(order) {
  const logs = [];
  const context = vm.createContext({
    window: {
      TT_BEAMER_LOGGER: {
        createLogger: () => ({
          info: (...args) => logs.push({ level: "info", args }),
          warn: (...args) => logs.push({ level: "warn", args }),
          error: (...args) => logs.push({ level: "error", args }),
        }),
      },
    },
  });

  for (const scriptName of order) {
    const source = scriptName === "app" ? appSource : runtimePanelsSource;
    vm.runInContext(source, context, { filename: `${scriptName}.js` });
  }

  const api = context.window.TT_BEAMER_RUNTIME_PANELS;
  const bindCallable = typeof api?.syncRuntimePanelsFromState === "function";
  let bindInvoked = false;
  if (bindCallable) {
    api.syncRuntimePanelsFromState({
      state: { boardId: "board-a", roomDraft: { animationId: "room-a", opacity: 1, intensity: 1, speed: 1, soundVolume: 1 }, audio: { enabled: true, volume: 0.5 } },
      switchBoard: () => { bindInvoked = true; },
      roomAnimationSelect: { value: "" },
      roomOpacityInput: { value: "" },
      roomOpacityValue: { textContent: "" },
      clampRoomOpacity: (value) => Number(value),
      roomIntensityValue: { textContent: "" },
      roomSpeedValue: { textContent: "" },
      clampRoomSpeed: (value) => Number(value),
      roomSoundVolumeValue: { textContent: "" },
      clampRoomSoundVolume: (value) => Number(value),
      roomHoldInput: { checked: false },
      roomDurationInput: { value: "", disabled: false },
      syncRoomDraftActionButton: () => {},
      audioEnabledInput: { checked: false },
      audioVolumeInput: { value: "" },
      audioVolumeValue: { textContent: "" },
      applyAudioGain: () => {},
      enforceAudioLifecycleGuard: () => {},
      syncAudioStatus: () => {},
      syncAudioMappingPanel: () => {},
      syncAnimationSpeedPanel: () => {},
      syncHitareaCalibrationPanel: () => {},
      syncRoomGeometryPanel: () => {},
      syncPolygonEditorPanel: () => {},
      syncShipPolygonEditorPanel: () => {},
      syncRoomFxPanel: () => {},
      syncOutsideFxPanel: () => {},
      syncAlignModePanel: () => {},
      syncBoardZoomPanel: () => {},
      syncDashboardZoneVisibility: () => {},
      updateMobilePerformanceStatus: () => {},
    });
  }

  const missingWarning = logs.find((entry) => entry.level === "warn" && entry.args?.[0] === "domain-modules-missing");
  const missingDomains = Array.isArray(missingWarning?.args?.[1]?.missing) ? missingWarning.args[1].missing : [];

  return {
    order,
    runtimePanelsExposed: Boolean(api),
    bindCallable,
    missingDomains,
    bindInvoked,
    pass: Boolean(api) && bindCallable && bindInvoked,
  };
}

const scenarios = [
  executeOrder(["runtime-panels", "app"]),
  executeOrder(["app", "runtime-panels"]),
];

const output = {
  suite: "p10-hf4-t2-runtime-panels-diagnostics",
  result: scenarios.every((entry) => entry.pass) ? "PASS" : "FAIL",
  scenarios,
};

writeFileSync(new URL("./p10-hf4-t2-runtime-panels-diagnostics-output.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

assert.ok(
  scenarios.every((entry) => entry.pass),
  "Runtime panel API must remain exposed + bind-callable across load-order scenarios",
);

console.log(JSON.stringify(output, null, 2));
