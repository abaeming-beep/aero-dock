/** The dock's own control: settings. */

import { Settings } from "lucide-react";
import { t } from "../../i18n";

export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="dock-control-btn"
      title={t.dock.settingsButton}
      aria-label={t.dock.settingsButton}
      onClick={onClick}
    >
      <Settings size={16} aria-hidden />
    </button>
  );
}
