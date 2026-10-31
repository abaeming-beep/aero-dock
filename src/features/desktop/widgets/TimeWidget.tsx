/**
 * A port of the "TiMe - Digital" Rainmeter skin by VClouds, licensed
 * CC BY-NC-SA 3.0 (the rest of this project is MIT; see
 * conventions/worklog.md).
 *
 * Text floating on the wallpaper with no panel. Positions, sizes and colours
 * are the skin's own, laid out on a stage of the skin's size and scaled as a
 * whole, so resizing the widget keeps the composition. The names stay in
 * English because the skin's typeface has no Hangul.
 */

import { useEffect, useState } from "react";
import type { WidgetProps } from "../registry";

/** Room for the widest line, "WEDNESDAY". Matches default_size in Rust. */
const STAGE_W = 680;
const STAGE_H = 200;

const pad = (n: number) => String(n).padStart(2, "0");

export function TimeWidget({ widget }: WidgetProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const scale = Math.min(widget.width / STAGE_W, widget.height / STAGE_H);
  const name = (options: Intl.DateTimeFormatOptions) =>
    now.toLocaleDateString("en-US", options).toUpperCase();

  return (
    <div
      className="w-time"
      style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}
    >
      <span className="w-time-day">{name({ weekday: "long" })}</span>
      <span className="w-time-date">{pad(now.getDate())}</span>
      <span className="w-time-month">
        {name({ month: "long" })} {now.getFullYear()}
      </span>
      <span className="w-time-clock">
        TiMe - {now.getHours()}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
      </span>
    </div>
  );
}
