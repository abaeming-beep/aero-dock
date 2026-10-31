/**
 * Keeps the dock's transparent window space from eating clicks. At rest
 * the OS window is limited to the panel, so clicks beside it reach the
 * windows behind. While `open` is true the whole window comes back, because
 * tooltips, magnified icons and flyouts are drawn outside the panel and the
 * region clips drawing as well as input.
 */

import { useEffect, useRef, type RefObject } from "react";
import { ipc } from "../../ipc/commands";

// Waits for the magnification spring: each resize of the panel restarts it.
const SETTLE_MS = 150;
// room for the panel's shadow, which the region would otherwise cut off
const SHADOW_PAD = 10;

export function useDockHitRegion(barRef: RefObject<HTMLElement | null>, open: boolean) {
  const sent = useRef<string | null>(null);

  useEffect(() => {
    const send = (rect: Parameters<typeof ipc.setDockHitRect>[0]) => {
      const key = JSON.stringify(rect);
      if (key === sent.current) return;
      sent.current = key;
      ipc.setDockHitRect(rect).catch((e) => {
        // a failed send must be retried, not remembered as applied
        sent.current = null;
        console.warn("dock hit region failed", e);
      });
    };

    if (open) {
      send(null);
      return;
    }

    const bar = barRef.current;
    if (!bar) return;

    const apply = () => {
      const r = bar.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const dpr = window.devicePixelRatio;
      const left = Math.max(0, r.left - SHADOW_PAD);
      const top = Math.max(0, r.top - SHADOW_PAD);
      const right = Math.min(window.innerWidth, r.right + SHADOW_PAD);
      const bottom = Math.min(window.innerHeight, r.bottom + SHADOW_PAD);
      send({
        x: Math.floor(left * dpr),
        y: Math.floor(top * dpr),
        width: Math.ceil((right - left) * dpr),
        height: Math.ceil((bottom - top) * dpr),
        radius: 0,
      });
    };

    let timer = setTimeout(apply, SETTLE_MS);
    const settle = () => {
      clearTimeout(timer);
      timer = setTimeout(apply, SETTLE_MS);
    };
    // the panel grows with its icons, and moves when the window is resized
    const observer = new ResizeObserver(settle);
    observer.observe(bar);
    observer.observe(document.documentElement);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [barRef, open]);
}
