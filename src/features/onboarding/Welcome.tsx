/**
 * First-launch card above the empty dock. One choice: bring your apps over,
 * or start clean.
 */

import { motion } from "motion/react";
import { useState } from "react";
import { t } from "../../i18n";
import type { DockEdge } from "../../ipc/types";
import { bloomOffset, edgePanelStyle } from "../dock/menuStore";
import { springs } from "../../engine/animation/springs";
import { notify } from "../feedback/toastStore";
import { importStarterApps, startEmpty } from "./firstRun";
import "./welcome.css";

export function Welcome({ edge }: { edge: DockEdge }) {
  const [busy, setBusy] = useState(false);

  const run = (action: () => Promise<void>) => {
    setBusy(true);
    action().catch((e) => {
      notify.error(t.errors.setupFailed, e);
      setBusy(false);
    });
    // success needs no cleanup: the settings event flips
    // onboardingComplete and this card unmounts
  };

  return (
    <motion.div
      className="welcome-card surface"
      style={{
        ...edgePanelStyle(edge, "calc(var(--icon-size) * 1.2 + 52px)"),
        width: 340,
        zIndex: 90,
      }}
      initial={{ opacity: 0, scale: 0.97, ...bloomOffset(edge) }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
      transition={springs.bloom}
    >
      <h1>{t.welcome.title}</h1>
      <div className="welcome-actions">
        <button className="welcome-primary" disabled={busy} onClick={() => run(importStarterApps)}>
          {busy ? t.welcome.importing : t.welcome.importApps}
        </button>
        <button className="welcome-secondary" disabled={busy} onClick={() => run(startEmpty)}>
          {t.welcome.startEmpty}
        </button>
      </div>
      <p className="welcome-hint">{t.welcome.tip}</p>
    </motion.div>
  );
}
