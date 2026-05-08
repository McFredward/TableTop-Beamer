#!/usr/bin/env python3
"""
Phase 33 iter-3 — Pi-reload cycle test.

Loads /output/, lets it connect, then reloads N times. Asserts each reload
gets to readyState=4 with currentTime advancing within timeout.
"""
import argparse
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
    p.add_argument("--cycles", type=int, default=10)
    p.add_argument("--per-cycle-budget", type=float, default=20.0,
                   help="Max seconds per cycle to reach playable + currentTime advance")
    p.add_argument("--chrome", default="/opt/google/chrome/chrome")
    p.add_argument("--xvfb-display", default=":98")
    args = p.parse_args()

    url = f"http://127.0.0.1:{args.port}/output/"
    print(f"[reload-cycle] target={url} cycles={args.cycles} budget={args.per_cycle_budget}s")

    cycle_results: list[dict] = []

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
            ],
        )
        ctx = browser.new_context()
        page = ctx.new_page()

        for cycle in range(1, args.cycles + 1):
            t0 = time.monotonic()
            if cycle == 1:
                page.goto(url, wait_until="domcontentloaded", timeout=15000)
            else:
                page.reload(wait_until="domcontentloaded", timeout=15000)

            connected = False
            advancing = False
            initial_ct = None
            deadline = t0 + args.per_cycle_budget
            while time.monotonic() < deadline:
                state = page.evaluate("""() => {
                  const v = document.querySelector('video.ssr-video, video');
                  return {
                    readyState: v?.readyState ?? 0,
                    currentTime: v?.currentTime ?? 0,
                  };
                }""")
                if state["readyState"] == 4:
                    if not connected:
                        connected = True
                        initial_ct = state["currentTime"]
                        connected_t = time.monotonic() - t0
                    elif state["currentTime"] > (initial_ct or 0) + 0.5:
                        advancing = True
                        elapsed = time.monotonic() - t0
                        cycle_results.append({
                            "cycle": cycle,
                            "ok": True,
                            "elapsed_s": round(elapsed, 2),
                            "connected_at_s": round(connected_t, 2),
                            "currentTime": round(state["currentTime"], 2),
                        })
                        print(f"[reload-cycle] {ts()} cycle {cycle}: OK "
                              f"elapsed={elapsed:.2f}s connected_at={connected_t:.2f}s "
                              f"currentTime={state['currentTime']:.2f}")
                        break
                time.sleep(0.5)
            else:
                cycle_results.append({
                    "cycle": cycle,
                    "ok": False,
                    "reason": f"timeout after {args.per_cycle_budget}s "
                              f"(connected={connected}, advancing={advancing})",
                })
                print(f"[reload-cycle] {ts()} cycle {cycle}: FAIL "
                      f"(connected={connected}, advancing={advancing})")

            # Brief inter-cycle pause to mimic operator behavior
            time.sleep(1.0)

        browser.close()

    ok_count = sum(1 for r in cycle_results if r["ok"])
    print()
    print(f"=== RELOAD CYCLE SUMMARY ===")
    print(f"Cycles: {len(cycle_results)} total / {ok_count} ok / {len(cycle_results)-ok_count} fail")
    if cycle_results:
        elapseds = [r["elapsed_s"] for r in cycle_results if r.get("elapsed_s") is not None]
        if elapseds:
            print(f"Elapsed: min={min(elapseds):.2f}s avg={sum(elapseds)/len(elapseds):.2f}s "
                  f"max={max(elapseds):.2f}s")

    return 0 if ok_count == len(cycle_results) else 1


if __name__ == "__main__":
    sys.exit(main())
