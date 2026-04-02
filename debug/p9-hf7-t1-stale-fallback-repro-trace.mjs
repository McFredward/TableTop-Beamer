import { writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const BASELINE_REF = process.env.TT_BEAMER_HF7_T1_BASELINE_REF ?? "afceb3e";
const OUTPUT_PATH = process.env.TT_BEAMER_HF7_T1_OUTPUT ?? "debug/p9-hf7-t1-stale-fallback-repro-output.json";

async function gitShow(ref, filePath) {
  const { stdout } = await execFileAsync("git", ["show", `${ref}:${filePath}`], {
    maxBuffer: 20 * 1024 * 1024,
  });
  return String(stdout || "");
}

function countMatches(text, pattern) {
  const regex = new RegExp(pattern, "g");
  const matches = String(text || "").match(regex);
  return Array.isArray(matches) ? matches.length : 0;
}

async function main() {
  const [runtimeBefore, serverBefore] = await Promise.all([
    gitShow(BASELINE_REF, "src/app/runtime/runtime-orchestration.js"),
    gitShow(BASELINE_REF, "server.mjs"),
  ]);

  const evidence = {
    schema: "tt-beamer.p9-hf7-t1-stale-fallback-repro.v1",
    measuredAt: new Date().toISOString(),
    baselineRef: BASELINE_REF,
    runtimeFallbackBranches: {
      clientPathAssignments: countMatches(runtimeBefore, "dataset\\.finalOutputPath\\s*=\\s*\\\"client\\\""),
      clientModeBranch: countMatches(runtimeBefore, "mode\\s*===\\s*\\\"client\\\""),
      autoModeReturn: countMatches(runtimeBefore, "return\\s+\\\"auto\\\""),
      healthGatedFallback: countMatches(runtimeBefore, "stream-timeout"),
    },
    serverFallbackBranches: {
      modeAutoConstant: countMatches(serverBefore, "FINAL_STREAM_MODE_AUTO"),
      modeClientConstant: countMatches(serverBefore, "FINAL_STREAM_MODE_CLIENT"),
      acceptedModeValues: countMatches(serverBefore, "FINAL_STREAM_MODE_VALUES"),
      contextPatchUsesIncomingFinalMode: countMatches(serverBefore, "payload\\?\\.finalOutputMode"),
    },
  };

  evidence.prefxFallbackPathPresent =
    evidence.runtimeFallbackBranches.clientPathAssignments > 0
    && evidence.runtimeFallbackBranches.clientModeBranch > 0
    && evidence.serverFallbackBranches.modeClientConstant > 0;

  if (!evidence.prefxFallbackPathPresent) {
    throw new Error("expected pre-fix fallback path markers were not found in baseline ref");
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
}

main().catch((error) => {
  console.error(`[p9-hf7-t1-stale-fallback-repro-trace] ${error.message}`);
  process.exitCode = 1;
});
