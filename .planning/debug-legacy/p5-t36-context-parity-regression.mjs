import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function waitForServerReady(child, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("server startup timeout"));
    }, timeoutMs);

    function onData(chunk) {
      const text = String(chunk || "");
      if (text.includes("TT Beamer server listening on")) {
        cleanup();
        resolve();
      }
    }

    function onExit(code) {
      cleanup();
      reject(new Error(`server exited early with code ${code}`));
    }

    function cleanup() {
      clearTimeout(timeout);
      child.stdout?.off("data", onData);
      child.stderr?.off("data", onData);
      child.off("exit", onExit);
    }

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("exit", onExit);
  });
}

async function withServer(port, run) {
  const child = spawn("node", ["server.mjs"], {
    cwd: ROOT,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      TT_BEAMER_LIVE_LOG_PATH: path.join(ROOT, "logs", "p5-t36-regression.jsonl"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await waitForServerReady(child);
    return await run();
  } finally {
    child.kill("SIGTERM");
  }
}

async function main() {
  const appJs = await readFile(path.join(ROOT, "src/app.js"), "utf8");
  const serverJs = await readFile(path.join(ROOT, "server.mjs"), "utf8");
  const runtimeStateJs = await readFile(path.join(ROOT, "src/app/lib/state/runtime-state.js"), "utf8");
  const indexHtml = await readFile(path.join(ROOT, "index.html"), "utf8");

  expect(appJs.includes('emitLiveMutation("context-update"'), "context-update emitter missing in app");
  expect(appJs.includes("selectedBoard"), "selectedBoard sync handling missing in app");
  expect(appJs.includes("selectedLayout"), "selectedLayout sync handling missing in app");

  expect(serverJs.includes('"context-update"'), "context-update mutation type missing in server allow-list");
  expect(serverJs.includes("applyContextUpdatePatch"), "server context-update apply patch missing");
  expect(serverJs.includes("selectedBoard: null"), "live snapshot selectedBoard default missing");
  expect(serverJs.includes("selectedLayout: null"), "live snapshot selectedLayout default missing");

  expect(!runtimeStateJs.includes("outputRoute"), "legacy outputRoute runtime state still present");
  expect(!appJs.includes("output-route-select"), "legacy output-route UI selector still referenced in app");
  expect(!indexHtml.includes("output-route-select"), "legacy output-route control still present in index.html");

  const port = 4196;
  await withServer(port, async () => {
    const finalResponse = await fetch(`http://127.0.0.1:${port}/output/final`);
    expect(finalResponse.ok, `GET /output/final failed with ${finalResponse.status}`);
    const finalHtml = await finalResponse.text();
    expect(finalHtml.includes("id=\"fx-canvas\""), "final output response missing FX canvas");
    expect(!finalHtml.includes("output-route-select"), "final output response still includes output-route UI");
  });

  console.log("P5_T36_CONTEXT_PARITY_GUARDS=PASS");
}

main().catch((error) => {
  console.error(`P5_T36_CONTEXT_PARITY_GUARDS=FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
