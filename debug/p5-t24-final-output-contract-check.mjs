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
  const indexHtml = await readFile(path.join(ROOT, "index.html"), "utf8");
  const styles = await readFile(path.join(ROOT, "src/styles.css"), "utf8");

  expect(indexHtml.includes('href="/src/styles.css"'), "index.html must load /src/styles.css as absolute path");
  expect(indexHtml.includes('src="/src/app.js"'), "index.html must load /src/app.js as absolute path");
  expect(
    styles.includes('body[data-output-role="final-output"] #board-image,') && styles.includes("display: none !important;"),
    "final-output CSS hide guard missing",
  );
  expect(
    styles.includes('body[data-output-role="final-output"].align-mode-active #room-overlay'),
    "align-mode overlay exception missing",
  );

  console.log("FINAL_CONTRACT=PASS");
}

main().catch((error) => {
  console.error(`FINAL_CONTRACT=FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
