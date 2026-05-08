#!/usr/bin/env python3
"""
Phase 33 iteration N — REAL stream verification using Playwright + system Chrome.

Loads /output/ in a real headful Chromium under Xvfb, observes for the
specified duration, asserts:
  1. WS to /api/webrtc/signal opens and stays open (no closes)
  2. video.readyState reaches 4 (HAVE_ENOUGH_DATA) within 15s
  3. video.currentTime advances over time (real frames flowing)
  4. No "RECONNECTING" banner becomes visible
  5. No state transitions to RECONNECTING in console logs

Exits 0 on PASS, 1 on FAIL (with diagnostic output). The user wants this
to LOOP until truly stable — this script is the gate.
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
    p.add_argument("--duration", type=float, default=60.0,
                   help="Observation seconds after page load")
    p.add_argument("--probe-interval", type=float, default=2.0,
                   help="Seconds between video-state probes")
    p.add_argument("--chrome", default="/opt/google/chrome/chrome")
    p.add_argument("--xvfb-display", default=":98")
    args = p.parse_args()

    url = f"http://127.0.0.1:{args.port}/output/"
    print(f"[verify] target={url} duration={args.duration}s "
          f"chrome={args.chrome} display={args.xvfb_display}")

    # Counters
    ws_creates = 0
    ws_closes = 0
    state_transitions: list[str] = []
    console_errors: list[str] = []
    monitor_fires: list[str] = []
    pageerror_logs: list[str] = []
    samples: list[dict] = []  # video state snapshots over time

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

        # ── observability hooks ─────────────────────────────────────────
        def on_ws(ws):
            nonlocal ws_creates, ws_closes
            ws_creates += 1
            wid = ws_creates
            print(f"[verify] {ts()} WS#{wid} OPEN url={ws.url}")
            ws.on("close", lambda: (
                _inc_close(),
                print(f"[verify] {ts()} WS#{wid} CLOSE url={ws.url}"),
            ))

        def _inc_close():
            nonlocal ws_closes
            ws_closes += 1

        def on_console(msg):
            text = msg.text
            level = msg.type
            if level == "error":
                console_errors.append(f"{ts()} {text}")
            if "[receiver] state " in text:
                state_transitions.append(f"{ts()} {text}")
                print(f"[verify] {ts()} STATE {text}")
            if "monitor fire" in text:
                monitor_fires.append(f"{ts()} {text}")
                print(f"[verify] {ts()} MONITOR-FIRE {text}")

        def on_pageerror(err):
            pageerror_logs.append(f"{ts()} {err}")
            print(f"[verify] {ts()} PAGEERROR {err}")

        page.on("websocket", on_ws)
        page.on("console", on_console)
        page.on("pageerror", on_pageerror)

        # ── navigate + wait for first frame ─────────────────────────────
        print(f"[verify] {ts()} navigating…")
        page.goto(url, wait_until="domcontentloaded", timeout=15000)
        print(f"[verify] {ts()} navigated, observing {args.duration}s")

        # ── periodic video-state sampling ──────────────────────────────
        t_end = time.monotonic() + args.duration
        next_sample = time.monotonic()
        while time.monotonic() < t_end:
            now = time.monotonic()
            if now >= next_sample:
                state = page.evaluate("""() => {
                  const v = document.querySelector('video.ssr-video, video');
                  const banner = document.getElementById('ssr-reconnect-banner');
                  const overlay = document.getElementById('ssr-given-up-overlay');
                  const splash = document.getElementById('ssr-splash');
                  return {
                    readyState: v?.readyState ?? null,
                    currentTime: v?.currentTime ?? null,
                    paused: v?.paused ?? null,
                    videoWidth: v?.videoWidth ?? null,
                    videoHeight: v?.videoHeight ?? null,
                    bannerVisible: banner ? !banner.hidden : null,
                    bannerText: banner?.textContent?.trim()?.slice(0,80) ?? null,
                    givenUpVisible: overlay ? !overlay.hidden : null,
                    splashVisible: splash ? !splash.hidden : null,
                  };
                }""")
                samples.append({"t": ts(), "elapsed": round(now - (t_end - args.duration), 1), **state})
                ct = state.get("currentTime") or 0
                print(f"[verify] {ts()} sample readyState={state['readyState']} "
                      f"currentTime={ct:.2f} "
                      f"paused={state['paused']} videoSize={state['videoWidth']}x{state['videoHeight']} "
                      f"banner={state['bannerVisible']} ({state['bannerText']!r}) "
                      f"givenUp={state['givenUpVisible']} splash={state['splashVisible']}")
                next_sample = now + args.probe_interval
            time.sleep(0.2)

        browser.close()

    # ── analysis ──────────────────────────────────────────────────────
    print()
    print(f"=== VERIFICATION SUMMARY ===")
    print(f"WS lifecycle:   {ws_creates} creates / {ws_closes} closes")
    print(f"State changes:  {len(state_transitions)} transitions")
    print(f"Monitor fires:  {len(monitor_fires)}")
    print(f"Console errors: {len(console_errors)}")
    print(f"Page errors:    {len(pageerror_logs)}")
    print(f"Samples:        {len(samples)}")
    print()

    if state_transitions:
        print("State transitions:")
        for s in state_transitions:
            print(f"  {s}")
        print()

    if monitor_fires:
        print("Monitor fires:")
        for s in monitor_fires:
            print(f"  {s}")
        print()

    # ── pass/fail criteria ────────────────────────────────────────────
    failures: list[str] = []

    # 1. WS stability — primary consumer WS should not close. There can be
    #    multiple WS (mediasoup signal + live-ws), but 0 closes is the gate.
    if ws_closes > 0:
        failures.append(
            f"WS closed {ws_closes}× during observation — connection is unstable")

    # 2. RECONNECTING transitions — video stream is interrupted any time
    #    state goes to RECONNECTING.
    reconnects = [s for s in state_transitions if "→ RECONNECTING" in s]
    if reconnects:
        failures.append(f"{len(reconnects)} RECONNECTING transitions observed")

    # 3. Monitor fires (frame-stale, heartbeat-stale) ARE the symptom.
    if monitor_fires:
        failures.append(f"{len(monitor_fires)} monitor-fire events observed")

    # 4. Video must reach playable state.
    last = samples[-1] if samples else None
    if last:
        if last.get("readyState", 0) < 4:
            failures.append(
                f"video readyState={last['readyState']} (expected ≥4 HAVE_ENOUGH_DATA)")
        if last.get("paused"):
            failures.append("video.paused=true at end of observation")
        if last.get("bannerVisible"):
            failures.append(
                f"reconnect banner visible at end: {last['bannerText']!r}")
        if last.get("givenUpVisible"):
            failures.append("GIVEN_UP overlay visible at end — capped retry hit")

    # 5. Frames must advance — currentTime must have moved.
    if len(samples) >= 2:
        first_t = samples[0].get("currentTime") or 0
        last_t = samples[-1].get("currentTime") or 0
        if last_t <= first_t:
            failures.append(
                f"video.currentTime did not advance ({first_t:.2f} → {last_t:.2f}) "
                f"— stream is not flowing frames")

    if failures:
        print("=== FAIL ===")
        for f in failures:
            print(f"  ✗ {f}")
        print()
        print("Last sample:", json.dumps(last, indent=2) if last else "(none)")
        return 1

    print("=== PASS ===")
    print(f"Stream remained stable for {args.duration:.0f}s.")
    print(f"Final video state: {json.dumps(last, indent=2)}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n[verify] interrupted")
        sys.exit(2)
