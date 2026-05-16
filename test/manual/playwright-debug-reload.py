#!/usr/bin/env python3
"""
Phase 33 iter-3 — debug a single reload to capture EVERY signal.

1. Loads /output/ fresh, waits for stable video (≤30s).
2. Reloads.
3. Captures EVERYTHING during cycle 2: console, WS frames, state, video timeline.
4. Reports.
"""
import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright


def ts() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3]


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=5173)
    p.add_argument("--observe", type=float, default=30.0)
    p.add_argument("--chrome", default="/opt/google/chrome/chrome")
    p.add_argument("--xvfb-display", default=":98")
    args = p.parse_args()

    url = f"http://127.0.0.1:{args.port}/output/"

    all_logs: list[str] = []
    ws_log: list[str] = []
    samples: list[dict] = []

    def log(line):
        all_logs.append(line)
        print(line, flush=True)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=False,
            executable_path=args.chrome,
            env={**os.environ, "DISPLAY": args.xvfb_display},
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--autoplay-policy=no-user-gesture-required",
                "--use-gl=angle",
                "--use-angle=default",
            ],
        )
        ctx = browser.new_context()
        page = ctx.new_page()

        def on_ws(ws):
            ws_log.append(f"{ts()} WS-OPEN {ws.url}")
            log(f"[debug] {ts()} WS-OPEN {ws.url}")
            url_short = ws.url.split("?")[1] if "?" in ws.url else ws.url
            ws.on("close", lambda: log(f"[debug] {ts()} WS-CLOSE {url_short}"))
            # Capture frames (text only) — keep small
            ws.on("framereceived", lambda d: _maybe_log_frame(d, "RECV", url_short))
            ws.on("framesent", lambda d: _maybe_log_frame(d, "SENT", url_short))

        def _maybe_log_frame(payload, direction, url_short):
            try:
                txt = payload.decode("utf-8") if isinstance(payload, (bytes, bytearray)) else str(payload)
            except Exception:
                txt = repr(payload)[:100]
            # Only log signaling RPC / interesting messages, not heartbeats
            if "heartbeat" in txt or "live-hello" in txt or "live-snapshot" in txt:
                return  # noisy
            log(f"[debug] {ts()} WS-{direction} [{url_short}] {txt[:200]}")

        def on_console(msg):
            t = msg.text
            level = msg.type
            if "[receiver]" in t or "monitor" in t or "[gif" in t.lower() and "decode-success" in t:
                log(f"[debug] {ts()} CONSOLE/{level} {t[:200]}")

        page.on("websocket", on_ws)
        page.on("console", on_console)
        page.on("pageerror", lambda e: log(f"[debug] {ts()} PAGEERROR {e}"))

        # ── Cycle 1: fresh load ─────────────────────────────────────
        log(f"\n[debug] === CYCLE 1: fresh load ===")
        page.goto(url, wait_until="domcontentloaded", timeout=15000)

        # Wait for video to play + currentTime to advance
        deadline = time.monotonic() + 30.0
        baseline = None
        while time.monotonic() < deadline:
            state = page.evaluate("""() => {
              const v = document.querySelector('video.ssr-video, video');
              return { rs: v?.readyState ?? 0, ct: v?.currentTime ?? 0 };
            }""")
            if state["rs"] == 4:
                if baseline is None:
                    baseline = state["ct"]
                elif state["ct"] > baseline + 0.5:
                    log(f"[debug] cycle 1 stable: rs=4 ct={state['ct']:.2f}")
                    break
            time.sleep(0.5)
        else:
            log(f"[debug] CYCLE 1 FAIL: never advanced")
            browser.close()
            return 1

        # ── Cycle 2: reload — observe everything ────────────────────
        log(f"\n[debug] === CYCLE 2: reload ===")
        page.reload(wait_until="domcontentloaded", timeout=15000)

        deadline = time.monotonic() + args.observe
        next_sample = time.monotonic()
        while time.monotonic() < deadline:
            now = time.monotonic()
            if now >= next_sample:
                state = page.evaluate("""() => {
                  const v = document.querySelector('video.ssr-video, video');
                  const banner = document.getElementById('ssr-reconnect-banner');
                  return {
                    rs: v?.readyState ?? 0,
                    ct: v?.currentTime ?? 0,
                    paused: v?.paused ?? null,
                    vw: v?.videoWidth ?? 0,
                    vh: v?.videoHeight ?? 0,
                    bvis: banner ? !banner.hidden : null,
                    btext: banner?.textContent?.trim()?.slice(0, 60) ?? null,
                  };
                }""")
                samples.append({"t": ts(), **state})
                log(f"[debug] {ts()} sample rs={state['rs']} ct={state['ct']:.2f} "
                    f"paused={state['paused']} vsize={state['vw']}x{state['vh']} "
                    f"banner={state['bvis']}/{state['btext']!r}")
                next_sample = now + 2.0
            time.sleep(0.2)

        # ── Final getStats() probe to check RTC inbound counters ─────
        # Walk every video element + every track and find an active RTC pc.
        # Chrome exposes RTCPeerConnection via the video element's
        # captureStream(), but mediasoup-client's pc is the source.
        try:
            stats = page.evaluate("""async () => {
              try {
                const v = document.querySelector('video.ssr-video, video');
                const ms = v?.srcObject;
                const tracks = ms?.getTracks?.() ?? [];
                const trackInfo = tracks.map((t) => ({
                  kind: t.kind, label: t.label, readyState: t.readyState,
                  muted: t.muted, enabled: t.enabled, id: t.id,
                }));
                // Try common mediasoup-client internal references
                const candidates = [
                  window.__ssrRecvTransport,
                  window.__ssrConsumer,
                  window.mediasoupClient,
                ].filter(Boolean);
                return {
                  videoEl: v ? {
                    readyState: v.readyState,
                    currentTime: v.currentTime,
                    paused: v.paused,
                    videoWidth: v.videoWidth, videoHeight: v.videoHeight,
                    networkState: v.networkState,
                    error: v.error?.code ?? null,
                    srcObjectKind: ms ? ms.constructor?.name : null,
                  } : null,
                  tracks: trackInfo,
                  candidates: candidates.length,
                  windowKeys: Object.keys(window).filter(k => k.includes('ssr') || k.includes('media')),
                };
              } catch (err) {
                return { error: String(err) };
              }
            }""")
            log(f"[debug] getStats: {json.dumps(stats, indent=2)}")
        except Exception as e:
            log(f"[debug] getStats failed: {e}")

        browser.close()

    print(f"\n=== END ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
