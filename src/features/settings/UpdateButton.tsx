/**
 * Check for an update, then offer to install what it found. The dock's
 * startup check may already have found one, so this starts by asking.
 */

import { useEffect, useState } from "react";
import { t } from "../../i18n";
import { ipc } from "../../ipc/commands";

interface UpdateButtonProps {
  onStatus: (tone: "ok" | "error", text: string) => void;
}

export function UpdateButton({ onStatus }: UpdateButtonProps) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ipc
      .pendingUpdate()
      .then((version) => setAvailable(version !== null))
      .catch((e) => console.warn("pending update unavailable", e));
  }, []);

  const check = () => {
    setBusy(true);
    ipc
      .checkForUpdate()
      .then((version) => {
        setAvailable(version !== null);
        onStatus("ok", version === null ? t.settings.upToDate : t.settings.updateFound(version));
      })
      .catch((e) => {
        console.warn("update check failed", e);
        onStatus("error", t.errors.checkUpdate);
      })
      .finally(() => setBusy(false));
  };

  const install = () => {
    setBusy(true);
    // on success the app closes, so only a failure comes back here
    ipc.installUpdate().catch((e) => {
      onStatus("error", `${t.errors.installUpdate}: ${e}`);
      setBusy(false);
    });
  };

  const label = available
    ? busy
      ? t.settings.installingUpdate
      : t.settings.installUpdate
    : busy
      ? t.settings.checkingUpdate
      : t.settings.checkUpdate;

  return (
    <button className="aero-button" disabled={busy} onClick={available ? install : check}>
      {label}
    </button>
  );
}
