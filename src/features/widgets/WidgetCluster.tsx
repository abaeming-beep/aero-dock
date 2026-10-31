/**
 * The dock's system corner: clock, battery, and Recycle Bin.
 *
 * Interactions: click the bin to open it, right-click to empty (system
 * confirmation).
 */

import {
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LOCALE, t } from "../../i18n";
import { ipc } from "../../ipc/commands";
import { useSystem } from "../../state/systemStore";
import { notify } from "../feedback/toastStore";
import "./widgets.css";

function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // tick exactly on the minute
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, 60_000 - (Date.now() % 60_000) + 20);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return now;
}

function batteryIcon(percent: number, charging: boolean) {
  if (charging) return BatteryCharging;
  if (percent <= 20) return BatteryLow;
  return percent <= 60 ? BatteryMedium : BatteryFull;
}

interface WidgetClusterProps {
  showClock?: boolean;
  showStatus?: boolean;
}

export function WidgetCluster({ showClock = true, showStatus = true }: WidgetClusterProps) {
  const { status, hydrate } = useSystem();
  const now = useClock();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const time = now.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString(LOCALE, { month: "short", day: "numeric" });
  const fullDate = now.toLocaleDateString(LOCALE, { dateStyle: "full" });
  const Battery = status ? batteryIcon(status.battery.percent, status.battery.charging) : null;

  const binTooltip = status
    ? status.recycleBin.items === 0
      ? t.system.binEmpty
      : t.system.binItems(status.recycleBin.items)
    : t.system.bin;

  if (!showClock && !showStatus) return null;

  return (
    <div className="widget-cluster">
      {showClock && (
      <div className="widget-clock" title={fullDate}>
        <span className="widget-time">{time}</span>
        <span className="widget-date">{date}</span>
      </div>
      )}
      {showStatus && (
      <div className="widget-glyphs">
        {status?.battery.present && Battery && (
          <button
            className="widget-chip"
            data-state={status.battery.percent <= 20 && !status.battery.charging ? "alert" : undefined}
            title={t.system.battery(status.battery.percent, status.battery.charging)}
            onClick={() =>
              ipc
                .launch("ms-settings:batterysaver")
                .catch(notify.on(t.errors.openPower))
            }
          >
            <Battery size={16} aria-hidden />
          </button>
        )}
        <button
          className="widget-chip"
          data-state={(status?.recycleBin.items ?? 0) > 0 ? "active" : undefined}
          title={t.system.binTitle(binTooltip)}
          onClick={() => ipc.openRecycleBin().catch(notify.on(t.errors.openBin))}
          onContextMenu={(e) => {
            e.preventDefault();
            ipc.emptyRecycleBin().catch(notify.on(t.errors.emptyBin));
          }}
        >
          <Trash2 size={16} aria-hidden />
        </button>
      </div>
      )}
    </div>
  );
}
