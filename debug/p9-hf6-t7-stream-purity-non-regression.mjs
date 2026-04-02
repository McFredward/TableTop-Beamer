import { spawn } from "node:child_process";

const OUTPUT_PATH = process.env.TT_BEAMER_HF6_T7_OUTPUT ?? "debug/p9-hf6-t7-stream-purity-non-regression-output.json";

async function main() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["debug/p9-hf5-t6-stream-purity-matrix.mjs"], {
      stdio: "inherit",
      env: {
        ...process.env,
        TT_BEAMER_HF5_T6_OUTPUT: OUTPUT_PATH,
      },
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`hf5 stream-purity matrix failed with code ${code}`));
    });
  });
}

main().catch((error) => {
  console.error(`[p9-hf6-t7-stream-purity-non-regression] ${error.message}`);
  process.exitCode = 1;
});
