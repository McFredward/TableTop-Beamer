// Phase 31 Wave 0 — D-D2 audio-in-stream feasibility smoke gate.
//
// This test is the BLOCKING escalation point for D-D2. It runs:
//   - real Xvfb on DISPLAY=:99
//   - real headful Chromium under that display
//   - puppeteer-stream tab capture (audio + video)
//   - real ffmpeg decode of the captured webm to PCM s16le
//   - RMS amplitude check on the decoded PCM
//
// PASS = puppeteer-stream actually delivers audio from a Chromium tab
//        playing alarm.mp3. WebRTC stream pipeline (Plan 02+) is then
//        feasible per RESEARCH.md § Audio-Capture Risk.
//
// FAIL with rms < 0.01 = "silent capture", D-D2 escalation triggered:
//   Fallback A: PipeWire-loopback (load-module module-null-sink)
//   Fallback B: revert D-D2 — re-discuss with user (Pi-local audio)
//
// The test SKIPs unless WAVE0_AUDIO_SMOKE=1 is set, because it spawns
// real Xvfb + Chromium and is heavy (~10s + 4s capture + ffmpeg decode).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  createWriteStream,
} from "node:fs";
import path from "node:path";

const ALARM_MP3 = path.resolve("./resources/sounds/alarm.mp3");
const TMPDIR = "/tmp/ttbeamer-wave0";
const HTML_FIXTURE = path.join(TMPDIR, "audio-fixture.html");
const CAPTURED_WEBM = path.join(TMPDIR, "captured.webm");
const DECODED_WAV = path.join(TMPDIR, "decoded.wav");
const DISPLAY = ":99";

function hasBin(name) {
  return new Promise((resolve) => {
    try {
      const proc = spawn("which", [name]);
      proc.on("error", () => resolve(false));
      proc.on("exit", (code) => resolve(code === 0));
    } catch {
      resolve(false);
    }
  });
}

test(
  "Wave 0 audio gate: Xvfb + Chromium + puppeteer-stream capture alarm.mp3 with non-silent RMS",
  { timeout: 90_000 },
  async (t) => {
    if (process.env.WAVE0_AUDIO_SMOKE !== "1") {
      t.skip(
        "Set WAVE0_AUDIO_SMOKE=1 to run the audio-capture smoke (requires Xvfb + Chromium + ffmpeg on PATH)",
      );
      return;
    }

    // 1. Preflight binaries
    assert.ok(
      await hasBin("Xvfb"),
      "Xvfb not on PATH — install via `apt install xvfb`",
    );
    assert.ok(await hasBin("ffmpeg"), "ffmpeg not on PATH");
    assert.ok(existsSync(ALARM_MP3), `alarm.mp3 not found at ${ALARM_MP3}`);

    // 2. Tmp dir
    mkdirSync(TMPDIR, { recursive: true });

    // 3. HTML fixture that auto-plays alarm.mp3 from a file:// URL
    writeFileSync(
      HTML_FIXTURE,
      `<!doctype html><html><body>
        <audio id="a" autoplay loop src="file://${ALARM_MP3}"></audio>
        <script>
          const a = document.getElementById("a");
          a.play().catch(e => { document.title = "PLAY_FAIL:" + e.message; });
        </script>
      </body></html>`,
    );

    // 4. Spawn Xvfb
    const xvfb = spawn(
      "Xvfb",
      [DISPLAY, "-screen", "0", "640x480x24"],
      { stdio: "ignore" },
    );
    await new Promise((r) => setTimeout(r, 500));
    t.after(() => {
      try {
        xvfb.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    });

    // 5. Headful Chromium via puppeteer-stream
    const { launch, getStream } = await import("puppeteer-stream");
    const browser = await launch({
      executablePath:
        process.env.SSR_BROWSER_BIN || "/usr/bin/chromium-browser",
      headless: false, // CRITICAL: NOT --headless=new (disables audio)
      defaultViewport: { width: 640, height: 480 },
      args: [
        "--no-sandbox",
        "--autoplay-policy=no-user-gesture-required",
        "--use-gl=egl",
        `--display=${DISPLAY}`,
      ],
      env: { ...process.env, DISPLAY },
    });
    t.after(async () => {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    });

    const page = await browser.newPage();
    await page.goto(`file://${HTML_FIXTURE}`);

    const stream = await getStream(page, {
      audio: true,
      video: false,
      frameSize: 100,
    });
    const captureFile = createWriteStream(CAPTURED_WEBM);
    stream.pipe(captureFile);

    // 6. Capture for 4s (alarm.mp3 is ~3s, looped)
    await new Promise((r) => setTimeout(r, 4000));
    stream.destroy();
    await new Promise((r) => captureFile.on("close", r));

    // 7. Decode webm → wav via ffmpeg (mono 16kHz s16le)
    await new Promise((res, rej) => {
      const ff = spawn(
        "ffmpeg",
        [
          "-y",
          "-i",
          CAPTURED_WEBM,
          "-ac",
          "1",
          "-ar",
          "16000",
          DECODED_WAV,
        ],
        { stdio: "pipe" },
      );
      ff.on("exit", (c) => (c === 0 ? res() : rej(new Error("ffmpeg decode failed"))));
    });

    // 8. RMS amplitude check (silence floor 0.01 normalized)
    const wav = readFileSync(DECODED_WAV);
    let sumSq = 0;
    let n = 0;
    for (let i = 44; i + 1 < wav.length; i += 2) {
      const s = wav.readInt16LE(i) / 32768;
      sumSq += s * s;
      n++;
    }
    const rms = Math.sqrt(sumSq / Math.max(1, n));
    console.log(
      `[wave0-audio] RMS amplitude: ${rms.toFixed(4)} (threshold > 0.01)`,
    );
    assert.ok(
      rms > 0.01,
      `Audio capture appears silent (RMS=${rms}). D-D2 escalation: see RESEARCH.md § Audio-Capture Risk fallbacks.`,
    );

    try {
      unlinkSync(HTML_FIXTURE);
      unlinkSync(CAPTURED_WEBM);
      unlinkSync(DECODED_WAV);
    } catch {
      /* ignore */
    }
  },
);

test(
  "Wave 0 scaffold: alarm.mp3 fixture exists in resources/sounds/",
  () => {
    assert.ok(
      existsSync("./resources/sounds/alarm.mp3"),
      "alarm.mp3 must exist as the audio gate fixture",
    );
  },
);
