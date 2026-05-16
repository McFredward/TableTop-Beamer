#!/usr/bin/env python3
"""
Hook RTCPeerConnection so we can call getStats() on it after reload.

This bypasses mediasoup-client internal references and instead intercepts
EVERY RTCPeerConnection created by the page.
"""
import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright


def ts():
    return datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=5173)
    p.add_argument("--chrome", default="/opt/google/chrome/chrome")
    p.add_argument("--xvfb-display", default=":98")
    args = p.parse_args()

    url = f"http://127.0.0.1:{args.port}/output/"

    INSTRUMENT = """
    (() => {
      window.__rtcPCs = [];
      const orig = window.RTCPeerConnection;
      window.RTCPeerConnection = function(...a) {
        const pc = new orig(...a);
        window.__rtcPCs.push(pc);
        console.info('[rtc-instrument] new RTCPeerConnection #' + window.__rtcPCs.length);
        pc.addEventListener('iceconnectionstatechange', () => {
          console.info('[rtc-instrument] pc#' + window.__rtcPCs.indexOf(pc) +
            ' iceConnectionState=' + pc.iceConnectionState);
        });
        pc.addEventListener('connectionstatechange', () => {
          console.info('[rtc-instrument] pc#' + window.__rtcPCs.indexOf(pc) +
            ' connectionState=' + pc.connectionState);
        });
        return pc;
      };
      window.RTCPeerConnection.prototype = orig.prototype;
      Object.assign(window.RTCPeerConnection, orig);
    })();
    """

    GET_STATS = """
    async () => {
      const out = [];
      for (let i = 0; i < (window.__rtcPCs||[]).length; i++) {
        const pc = window.__rtcPCs[i];
        try {
          const stats = await pc.getStats();
          const kept = [];
          for (const r of stats.values()) {
            if (r.type === 'inbound-rtp' && r.kind === 'video') {
              kept.push({type:'inbound-rtp',
                packetsReceived: r.packetsReceived,
                bytesReceived: r.bytesReceived,
                framesReceived: r.framesReceived,
                framesDecoded: r.framesDecoded,
                framesDropped: r.framesDropped,
                keyFramesDecoded: r.keyFramesDecoded,
                pliCount: r.pliCount,
                jitter: r.jitter,
              });
            }
            if (r.type === 'transport') {
              kept.push({type:'transport',
                dtlsState: r.dtlsState,
                iceState: r.iceState,
                bytesReceived: r.bytesReceived,
                packetsReceived: r.packetsReceived,
              });
            }
            if (r.type === 'candidate-pair' && r.state === 'succeeded') {
              kept.push({type:'candidate-pair',
                state: r.state,
                bytesReceived: r.bytesReceived,
                packetsReceived: r.packetsReceived,
                currentRoundTripTime: r.currentRoundTripTime,
              });
            }
          }
          out.push({
            pcIndex: i,
            connectionState: pc.connectionState,
            iceConnectionState: pc.iceConnectionState,
            stats: kept,
          });
        } catch (err) {
          out.push({ pcIndex: i, error: String(err) });
        }
      }
      return out;
    }
    """

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

        page.add_init_script(INSTRUMENT)
        page.on("console", lambda m: print(f"[stats] {ts()} CONSOLE/{m.type} {m.text}") if "rtc-instrument" in m.text or "[receiver]" in m.text or "monitor" in m.text else None)

        # Cycle 1
        print(f"\n[stats] {ts()} === CYCLE 1: load ===")
        page.goto(url, wait_until="domcontentloaded", timeout=15000)
        time.sleep(20)
        cycle1 = page.evaluate(GET_STATS)
        print(f"[stats] cycle1 final stats:\n{json.dumps(cycle1, indent=2)}")

        # Cycle 2: reload
        print(f"\n[stats] {ts()} === CYCLE 2: reload ===")
        page.reload(wait_until="domcontentloaded", timeout=15000)
        time.sleep(15)
        cycle2 = page.evaluate(GET_STATS)
        print(f"[stats] cycle2 final stats:\n{json.dumps(cycle2, indent=2)}")

        browser.close()


if __name__ == "__main__":
    main()
