import { writeFile } from "node:fs/promises";

const BASE_URL = process.env.TT_BEAMER_BASE_URL ?? "http://127.0.0.1:4173";
const OUTPUT_PATH = process.env.TT_BEAMER_HF9_T4_OUTPUT ?? "debug/p9-hf9-t4-receiver-contract-output.json";

async function requestJson(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function main() {
  const finalResponse = await fetch(`${BASE_URL}/output/final`);
  const finalHtml = await finalResponse.text();
  const { response: healthResponse, payload: healthPayload } = await requestJson("/api/health");

  const checks = {
    finalStatus200: finalResponse.status === 200,
    noScriptTags: !/<script\b/i.test(finalHtml),
    noPollingKeywords: !/(EventSource|setInterval|fetch\(|XMLHttpRequest)/i.test(finalHtml),
    fullscreenShellPresent: /\.final-video\s*\{[\s\S]*width:\s*100vw;[\s\S]*height:\s*100vh;/i.test(finalHtml),
    streamImgPresent: /<img[^>]+src="\/api\/final-stream\/video"/i.test(finalHtml),
    canonicalVideoEndpointAdvertised: healthResponse.status === 200 && healthPayload?.finalStreamVideoEndpoint === "/api/final-stream/video",
  };

  const result = {
    schema: "tt-beamer.p9-hf9-t4-receiver-contract.v1",
    measuredAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    checks,
  };

  result.pass = Object.values(checks).every(Boolean);

  await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  if (!result.pass) {
    throw new Error("receiver-only contract regression detected");
  }
}

main().catch((error) => {
  console.error(`[p9-hf9-t4-receiver-contract] ${error.message}`);
  process.exitCode = 1;
});
