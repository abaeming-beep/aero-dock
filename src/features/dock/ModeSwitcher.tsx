/**
 * The Modes tile and its flyout.
 *
 * Switching is one click: the tile shows which mode is loaded, the
 * flyout lists the rest. Everything the switch actually does happens in
 * Rust (pins, per-app audio, and the window layout when that is turned
 * on); this only reports what came back.
 */

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { springs } from "../../engine/animation/springs";
import { ipc } from "../../ipc/commands";
import type { DockEdge, Settings } from "../../ipc/types";
import { t } from "../../i18n";
import { notify } from "../feedback/toastStore";
// the glyph rules are shared with the settings picker so both ends agree
import { ModeGlyph } from "../settings/ModeIconPicker";
import { bloomOffset, flyoutStyle, type MenuAnchor, anchorFor } from "./menuStore";
import "./modes.css";

/** Width of the flyout, and the room the dock window has to reserve. */
export const MODE_FLYOUT_WIDTH = 232;
export const MODE_FLYOUT_HEIGHT = 300;

interface SwitcherState {
  open: boolean;
  anchor: MenuAnchor | null;
  setOpen: (open: boolean, anchor?: MenuAnchor | null) => void;
}

/** Lives outside the component so DockBar can size the window for it. */
export const useModeSwitcher = create<SwitcherState>((set) => ({
  open: false,
  anchor: null,
  setOpen: (open, anchor) => set({ open, anchor: open ? (anchor ?? null) : null }),
}));

/** Say what a switch did without making the user read numbers. */
function describe(report: {
  modeName: string;
  audioApplied: number;
  windowsMoved: number;
  appsLaunched: number;
}): string {
  const bits: string[] = [];
  if (report.windowsMoved > 0) {
    bits.push(t.modes.report.windows(report.windowsMoved));
  }
  if (report.appsLaunched > 0) {
    bits.push(t.modes.report.apps(report.appsLaunched));
  }
  if (report.audioApplied > 0) {
    bits.push(t.modes.report.volumes);
  }
  return bits.length > 0 ? `${report.modeName}: ${bits.join(", ")}` : report.modeName;
}

export function ModeSwitcher({ settings, edge }: { settings: Settings; edge: DockEdge }) {
  const { open, anchor, setOpen } = useModeSwitcher();
  const ref = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);

  const active = settings.modes.modes.find((m) => m.id === settings.modes.activeId);

  // dismiss on a click elsewhere or Escape, same as the context menu
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest(".mode-flyout") && !el.closest(".mode-tile")) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  if (!settings.modes.enabled || settings.modes.modes.length === 0) return null;

  const switchTo = (id: string) => {
    if (busy) return;
    setBusy(true);
    setOpen(false);
    ipc
      .switchMode(id)
      .then((report) => notify.info(describe(report)))
      .catch(notify.on(t.errors.switchMode))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button
        ref={ref}
        className="mode-tile"
        data-busy={busy}
        aria-label={t.modes.tile(active?.name ?? t.modes.none)}
        aria-expanded={open}
        title={active ? t.modes.tile(active.name) : t.modes.heading}
        onClick={() => {
          const el = ref.current;
          setOpen(!open, el ? anchorFor(el) : null);
        }}
      >
        <span className="mode-tile-glyph">
          {active ? <ModeGlyph name={active.name} glyph={active.glyph} /> : "M"}
        </span>
      </button>

      <AnimatePresence>
        {open && anchor && (
          <motion.div
            className="mode-flyout surface"
            style={flyoutStyle(edge, anchor, MODE_FLYOUT_WIDTH, 12, MODE_FLYOUT_HEIGHT)}
            initial={{ opacity: 0, scale: 0.97, ...bloomOffset(edge) }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
            transition={springs.bloom}
          >
            <div className="mode-flyout-title">{t.modes.heading}</div>
            {settings.modes.modes.map((mode) => (
              <button
                key={mode.id}
                className="mode-row"
                data-active={mode.id === settings.modes.activeId}
                onClick={() => switchTo(mode.id)}
              >
                <span className="mode-row-glyph">
                  <ModeGlyph name={mode.name} glyph={mode.glyph} size={14} />
                </span>
                <span className="mode-row-body">
                  <span className="mode-row-name">{mode.name}</span>
                  <span className="mode-row-meta">
                    {t.modes.flyoutMeta(mode.pinned.length)}
                    {mode.workspace.windows.length > 0 &&
                      t.modes.flyoutWindows(mode.workspace.windows.length)}
                  </span>
                </span>
              </button>
            ))}
            <div className="mode-flyout-separator" />
            <button
              className="mode-row"
              onClick={() => {
                ipc
                  .captureWorkspace()
                  .then(() => notify.info(t.modes.savedDesktop(active?.name)))
                  .catch(notify.on(t.errors.saveWorkspace));
                setOpen(false);
              }}
            >
              {t.modes.saveToMode}
            </button>
            <button
              className="mode-row"
              onClick={() => {
                ipc.openSettings().catch(notify.on(t.errors.openSettings));
                setOpen(false);
              }}
            >
              {t.modes.manage}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
