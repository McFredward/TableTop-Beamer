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
  readFileSync,
  unlinkSync,
  createWriteStream,
} from "node:fs";
import http from "node:http";
import path from "node:path";

const ALARM_MP3 = path.resolve("./resources/sounds/alarm.mp3");
const TMPDIR = "/tmp/ttbeamer-wave0";
const CAPTURED_WEBM = path.join(TMPDIR, "captured.webm");
const DECODED_WAV = path.join(TMPDIR, "decoded.wav");
const DISPLAY = ":99";

// puppeteer-stream's chrome extension cannot capture file:// pages
// (activeTab permission is bound to http(s)://). We therefore serve
// the fixture + alarm.mp3 over a tiny in-process http server.
function startFixtureServer(alarmBytes, htmlBody) {
  const server = http.createServer((req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(htmlBody);
      return;
    }
    if (req.url === "/alarm.mp3") {
      res.writeHead(200, {
        "content-type": "audio/mpeg",
        "content-length": alarmBytes.length,
      });
      res.end(alarmBytes);
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

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

    // 3. Start tiny http server that serves alarm.mp3 + autoplay HTML.
    //    puppeteer-stream's chrome extension cannot capture file:// pages
    //    (activeTab permission is bound to http(s)://).
    const alarmBytes = readFileSync(ALARM_MP3);
    const htmlBody = `<!doctype html><html><body>
        <audio id="a" autoplay loop src="/alarm.mp3"></audio>
        <script>
          const a = document.getElementById("a");
          a.play().catch(e => { document.title = "PLAY_FAIL:" + e.message; });
        </script>
      </body></html>`;
    const { server, port } = await startFixtureServer(alarmBytes, htmlBody);
    t.after(() => {
      try {
        server.close();
      } catch {
        /* ignore */
      }
    });
    const fixtureUrl = `http://127.0.0.1:${port}/`;

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

    // 5. Headful Chromium via puppeteer-stream.
    //    puppeteer-stream uses puppeteer-core internally and does NOT
    //    bundle Chrome. We resolve the executable from (in order):
    //      a) SSR_BROWSER_BIN env override
    //      b) puppeteer's bundled chrome (puppeteer.executablePath())
    //      c) /usr/bin/chromium-browser as last-ditch fallback
    const puppeteer = await import("puppeteer");
    let resolvedBrowserPath = process.env.SSR_BROWSER_BIN;
    if (!resolvedBrowserPath) {
      try {
        resolvedBrowserPath = puppeteer.default.executablePath();
      } catch {
        resolvedBrowserPath = "/usr/bin/chromium-browser";
      }
    }
    const { launch, getStream } = await import("puppeteer-stream");
    const browser = await launch({
      executablePath: resolvedBrowserPath,
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
    await page.goto(fixtureUrl, { waitUntil: "load" });
    // Give the chrome extension time to gain activeTab permission on
    // the new http:// origin before requesting capture.
    await new Promise((r) => setTimeout(r, 1000));

    // puppeteer-stream's Chrome extension requires video: true to gain
    // tabCapture permission; audio-only capture is rejected with
    // "Extension has not been invoked" on Chrome 131+. We capture both
    // and let ffmpeg ignore the (mostly black) video track.
    const stream = await getStream(page, {
      audio: true,
      video: true,
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
