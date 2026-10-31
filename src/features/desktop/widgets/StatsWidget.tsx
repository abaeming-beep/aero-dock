/**
 * Processor, memory and uptime.
 *
 * Polling is deliberately slow. The number people look at is the trend,
 * not the instant, and a widget that wakes the machine twice a second to
 * draw a bar is a worse citizen than one that updates every two.
 */

import { useEffect, useState } from "react";
import { t } from "../../../i18n";
import { ipc } from "../../../ipc/commands";
import type { SystemLoad } from "../../../ipc/types";
import type { WidgetProps } from "../registry";

const POLL_MS = 2000;

function uptimeLabel(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return t.widgets.stats.days(d, h);
  if (h > 0) return t.widgets.stats.hours(h, m);
  return t.widgets.stats.minutes(m);
}

function Meter({ label, percent, detail }: { label: string; percent: number; detail: string }) {
  return (
    <div className="w-stat">
      <div className="w-stat-top">
        <span className="w-stat-label">{label}</span>
        <span className="w-stat-value">{percent}%</span>
      </div>
      <div className="w-stat-track">
        <div className="w-stat-fill" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <div className="w-stat-detail">{detail}</div>
    </div>
  );
}

export function StatsWidget(_: WidgetProps) {
  const [load, setLoad] = useState<SystemLoad | null>(null);

  useEffect(() => {
    let alive = true;
    const read = () => {
      ipc
        .widgetSystemLoad()
        .then((next) => {
          if (alive) setLoad(next);
        })
        .catch(() => {
          // a missed sample is not worth surfacing; the next one lands
          // two seconds later
        });
    };
    read();
    const id = setInterval(read, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!load) {
    return <div className="w-empty">{t.widgets.stats.reading}</div>;
  }

  const gb = (mb: number) => (mb / 1024).toFixed(1);

  return (
    <div className="w-stats">
      <Meter label={t.widgets.stats.processor} percent={load.cpuPercent} detail={t.widgets.stats.allCores} />
      <Meter
        label={t.widgets.stats.memory}
        percent={load.memoryPercent}
        detail={t.widgets.stats.memoryDetail(gb(load.memoryUsedMb), gb(load.memoryTotalMb))}
      />
      <div className="w-stat-uptime">{t.widgets.stats.uptime(uptimeLabel(load.uptimeSeconds))}</div>
    </div>
  );
}
