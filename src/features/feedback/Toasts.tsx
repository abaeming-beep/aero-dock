/**
 * The toast stack beside the dock. Click one to dismiss it early.
 */

import { AnimatePresence, motion } from "motion/react";
import { springs } from "../../engine/animation/springs";
import type { DockEdge } from "../../ipc/types";
import { bloomOffset, edgePanelStyle } from "../dock/menuStore";
import { t } from "../../i18n";
import { useToasts } from "./toastStore";
import "./toasts.css";

export function Toasts({ edge }: { edge: DockEdge }) {
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);

  return (
    <div
      className="toast-stack"
      style={{
        ...edgePanelStyle(edge, "calc(var(--icon-size) * 1.2 + 42px)"),
        zIndex: 120,
      }}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {items.map((toast) => (
          <motion.button
            key={toast.id}
            className="toast surface"
            data-tone={toast.tone}
            initial={{ opacity: 0, scale: 0.97, ...bloomOffset(edge) }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
            transition={springs.bloom}
            onClick={() => dismiss(toast.id)}
            title={t.dock.dismiss}
          >
            {toast.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
