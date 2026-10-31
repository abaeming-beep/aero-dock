/** The shell every widget sits in: panel, drag and resize. */

import { GripHorizontal } from "lucide-react";
import { useCallback, useRef } from "react";
import { ipc } from "../../ipc/commands";
import { t } from "../../i18n";
import type { WidgetInstance } from "../../ipc/types";
import { definitionFor } from "./registry";

/** Corner radius of a widget, shared with the hit region so the clickable
 *  area matches the panel rather than clipping square corners. */
export const WIDGET_RADIUS = 14;

/** Matches MAX_SIZE in core/widgets.rs. Clamping here too means a resize
 *  stops at the limit instead of snapping back after it is saved. */
const MAX_SIZE = 1600;
/** Matches KEEP_REACHABLE in commands/widgets.rs. */
const KEEP_REACHABLE = 44;

interface Props {
  widget: WidgetInstance;
  allowNetwork: boolean;
  /** Live geometry during a drag, before it has been persisted. */
  onGeometry: (id: string, x: number, y: number, w: number, h: number) => void;
  onDragState: (dragging: boolean) => void;
  editing: boolean;
}

type Mode = { kind: "move" | "resize"; startX: number; startY: number; ox: number; oy: number; ow: number; oh: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function WidgetFrame({ widget, allowNetwork, onGeometry, onDragState, editing }: Props) {
  const def = definitionFor(widget.kind);
  const mode = useRef<Mode | null>(null);

  const begin = useCallback(
    (e: React.PointerEvent, kind: "move" | "resize") => {
      // Primary button only. Right-clicking a widget used to start a drag
      // and carry it off with the pointer, which is not what anyone means
      // by a right-click.
      if (e.button !== 0) return;
      if (widget.locked) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      mode.current = {
        kind,
        startX: e.screenX,
        startY: e.screenY,
        ox: widget.x,
        oy: widget.y,
        ow: widget.width,
        oh: widget.height,
      };
      // The hit region is only the widget, so a drag that leaves it would
      // lose the pointer. Opening the whole overlay up keeps the capture.
      onDragState(true);
    },
    [widget, onDragState],
  );

  const move = useCallback(
    (e: React.PointerEvent) => {
      const m = mode.current;
      if (!m) return;
      const dx = e.screenX - m.startX;
      const dy = e.screenY - m.startY;
      if (m.kind === "move") {
        // Stop a drag at the edge rather than letting the widget leave the
        // desktop, which would leave nothing to grab it by. Rust clamps the
        // saved value too; this is what makes it feel deliberate.
        const keepX = Math.min(KEEP_REACHABLE, m.ow);
        const keepY = Math.min(KEEP_REACHABLE, m.oh);
        const x = clamp(m.ox + dx, keepX - m.ow, window.innerWidth - keepX);
        const y = clamp(m.oy + dy, keepY - m.oh, window.innerHeight - keepY);
        onGeometry(widget.id, x, y, m.ow, m.oh);
      } else {
        const minW = def?.minWidth ?? 120;
        const minH = def?.minHeight ?? 120;
        onGeometry(
          widget.id,
          m.ox,
          m.oy,
          clamp(m.ow + dx, minW, MAX_SIZE),
          clamp(m.oh + dy, minH, MAX_SIZE),
        );
      }
    },
    [widget.id, def, onGeometry],
  );

  const end = useCallback(
    (e: React.PointerEvent) => {
      if (!mode.current) return;
      mode.current = null;
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      onDragState(false);
      ipc
        .placeWidget(widget.id, widget.x, widget.y, widget.width, widget.height)
        .catch((err) => console.warn("could not save the widget position", err));
    },
    [widget.id, widget.x, widget.y, widget.width, widget.height, onDragState],
  );

  const Body = def?.component;

  return (
    <div
      className="aero-widget"
      data-editing={editing}
      data-locked={widget.locked}
      style={{
        left: widget.x,
        top: widget.y,
        width: widget.width,
        height: widget.height,
        opacity: widget.opacity,
        // a per-widget tint overrides the theme accent for its own subtree
        ...(widget.accent ? ({ "--accent": widget.accent } as React.CSSProperties) : {}),
      }}
      onPointerDown={(e) => begin(e, "move")}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {def?.bare ? (
        <div className="aero-widget-bare">
          {Body ? <Body widget={widget} allowNetwork={allowNetwork} /> : null}
        </div>
      ) : (
        <div className="aero-widget-panel surface">
          <div className="aero-widget-body">
            {Body ? <Body widget={widget} allowNetwork={allowNetwork} /> : null}
          </div>
        </div>
      )}

      {editing && !widget.locked && (
        <span
          className="aero-widget-resize"
          title={t.widgets.resize}
          onPointerDown={(e) => begin(e, "resize")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <GripHorizontal size={12} aria-hidden style={{ rotate: "-45deg" }} />
        </span>
      )}
    </div>
  );
}
