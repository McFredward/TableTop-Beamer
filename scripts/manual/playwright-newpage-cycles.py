#!/usr/bin/env python3
"""
Pi-reload simulation using NEW PAGES instead of reload(). Each cycle creates
a fresh page (closes the old one), more closely matching what happens when
the Pi's Chromium kiosk reloads (entirely new document tree).
"""
import argparse
import os
import sys
import time
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=5173)
    p.add_argument("--cycles", type=int, default=5)
    p.add_argument("--per-cycle-budget", type=float, default=30.0)
    p.add_argument("--chrome", default="/opt/google/chrome/chrome")
    p.add_argument("--xvfb-display", default=":98")
    args = p.parse_args()

    url = f"http://127.0.0.1:{args.port}/output/"
    print(f"[newpage] cycles={args.cycles} budget={args.per_cycle_budget}s")

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

        for cycle in range(1, args.cycles + 1):
            t0 = time.monotonic()
            ctx = browser.new_context()
            page = ctx.new_page()
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=15000)
                connected = False
                advanced = False
                deadline = t0 + args.per_cycle_budget
                while time.monotonic() < deadline:
                    s = page.evaluate("""() => {
                      const v = document.querySelector('video.ssr-video, video');
                      return { rs: v?.readyState ?? 0, ct: v?.currentTime ?? 0 };
                    }""")
                    if s["rs"] == 4:
                        connected = True
                        if s["ct"] > 0.5:
                            advanced = True
                            break
                    time.sleep(0.5)
                elapsed = time.monotonic() - t0
                status = "OK" if advanced else "FAIL"
                print(f"[newpage] cycle {cycle}: {status} elapsed={elapsed:.2f} "
                      f"connected={connected} advanced={advanced}")
            finally:
                try: page.close()
                except: pass
                try: ctx.close()
                except: pass
            time.sleep(1)

        browser.close()


if __name__ == "__main__":
    main()
