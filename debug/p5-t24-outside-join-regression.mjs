import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const appJs = await readFile(path.join(ROOT, "src/app.js"), "utf8");
  const serverJs = await readFile(path.join(ROOT, "server.mjs"), "utf8");

  expect(appJs.includes("outsideFxByBoard:"), "runtime snapshot must include outsideFxByBoard");
  expect(appJs.includes("snapshot?.outsideFxByBoard"), "live snapshot apply must read top-level outsideFxByBoard");
  expect(appJs.includes('emitLiveMutation("outside-update"'), "outside-update mutation emitter missing");
  expect(serverJs.includes('"outside-update"'), "server mutation allow-list missing outside-update");
  expect(serverJs.includes("outsideFxByBoard:"), "server live snapshot patch missing outsideFxByBoard");
  expect(serverJs.includes('buildLiveSessionEnvelope("live-hello"'), "join hello snapshot envelope missing");

  console.log("OUTSIDE_JOIN_SYNC=PASS");
}

main().catch((error) => {
  console.error(`OUTSIDE_JOIN_SYNC=FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
