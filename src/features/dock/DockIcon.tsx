/**
 * A single dock icon: cursor-distance magnification, hover label,
 * launch nudge. All motion is springs on transform.
 */

import {
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { springs } from "../../engine/animation/springs";
import { t } from "../../i18n";
import type { DockEdge } from "../../ipc/types";
import type { DockItemView } from "../../state/dockStore";
import { exeKey, useAppAudio } from "../../state/audioStore";
import { useMenu } from "./menuStore";

interface DockIconProps {
  item: DockItemView;
  /** Cursor position along the dock axis; Infinity = cursor away. */
  mouseAxis: MotionValue<number>;
  iconSize: number;
  magnify: boolean;
  magScale: number;
  vertical: boolean;
  edge: DockEdge;
  /** A reorder drag is in progress somewhere in the dock. */
  dragging: boolean;
  onLaunch: (item: DockItemView, target?: HTMLElement) => void;
  onContext: (item: DockItemView, target: HTMLElement) => void;
  /** Fired after dwelling on an icon that has open windows. */
  onHoverPreview: (item: DockItemView, target: HTMLElement) => void;
}

const PREVIEW_DWELL_MS = 550;
/** How long a scroll keeps the window previews away. Matches the volume
 *  indicator's own lifetime so the two never overlap. */
const VOLUME_PREVIEW_MUTE_MS = 1500;

function Speaker({ muted }: { muted: boolean }) {
  const Icon = muted ? VolumeX : Volume2;
  return <Icon className="dock-volume-icon" aria-hidden />;
}

/** Tooltip entrance offset: the pill drifts in from the dock's edge.
 * Centering lives in CSS `translate` because motion owns `transform`. */
function labelFrom(edge: DockEdge): { x: number; y: number } {
  switch (edge) {
    case "bottom":
      return { x: 0, y: 6 };
    case "top":
      return { x: 0, y: -6 };
    case "left":
      return { x: -6, y: 0 };
    case "right":
      return { x: 6, y: 0 };
  }
}

export function DockIcon({
  item,
  mouseAxis,
  iconSize,
  magnify,
  magScale,
  vertical,
  edge,
  dragging,
  onLaunch,
  onContext,
  onHoverPreview,
}: DockIconProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  // a flyout already names what you're pointing at, and the pill would
  // otherwise float over its bottom edge
  const flyoutOpen = useMenu((m) => m.item !== null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // While the volume is being adjusted the window previews stay out of the
  // way. They are a hover affordance, and a deliberate scroll outranks one.
  const previewMutedUntil = useRef(0);

  // per-app audio: scroll to change, middle-click to mute
  const audio = useAppAudio((a) => a.levels[exeKey(item.audioExe)]);
  const audioTick = useAppAudio((a) => a.tick);
  const nudgeVolume = useAppAudio((a) => a.nudge);
  const toggleMute = useAppAudio((a) => a.toggleMute);
  // `audioTick` is read so the indicator re-renders when its timer runs out
  void audioTick;
  const adjusting = useAppAudio.getState().isVisible(item.audioExe) && audio !== undefined;

  // distance from cursor to this icon's center along the dock axis
  const distance = useTransform(mouseAxis, (cursor) => {
    const el = ref.current;
    if (!el || !Number.isFinite(cursor)) return Infinity;
    const rect = el.getBoundingClientRect();
    const center = vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
    return cursor - center;
  });

  const reach = iconSize * 2.6;
  const peak = magnify ? magScale : 1;
  const targetWidth = useTransform(distance, [-reach, 0, reach], [
    iconSize,
    iconSize * peak,
    iconSize,
  ]);
  const width = useSpring(targetWidth, springs.magnify);

  // When a drag starts, every icon springs back to its base size. Letting
  // that animate resizes tiles under the cursor mid-drag, which is a big
  // part of what felt like lag, so jump straight to the end value.
  useEffect(() => {
    if (dragging) width.jump(iconSize);
  }, [dragging, iconSize, width]);

  // launch nudge (offset perpendicular to the dock edge)
  const bounce = useMotionValue(0);
  const y = useTransform(bounce, (b) => (vertical ? 0 : b));
  const x = useTransform(bounce, (b) => (vertical ? b : 0));

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      // a small nudge away from the edge, then settle
      animate(bounce, vertical ? -4 : -6, springs.bounce).then(() =>
        animate(bounce, 0, springs.bounce),
      );
      onLaunch(item, e.currentTarget);
    },
    [bounce, item, onLaunch, vertical],
  );

  const initial = item.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <motion.button
      ref={ref}
      className="dock-icon"
      style={vertical ? { height: width, width: "var(--icon-size)", x, y } : { width, x, y }}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onContext(item, e.currentTarget);
      }}
      onWheel={(e) => {
        // one notch per detent, up scrolls louder
        const notches = -Math.sign(e.deltaY);
        if (notches === 0) return;
        // a preview opened by hovering would sit right on top of the
        // readout, so retire it and keep it away while the pill is up
        clearTimeout(dwellTimer.current);
        previewMutedUntil.current = Date.now() + VOLUME_PREVIEW_MUTE_MS;
        const m = useMenu.getState();
        if (m.kind === "windows" && m.item?.id === item.id) m.close();
        void nudgeVolume(item.audioExe, notches);
      }}
      onMouseDown={(e) => {
        // stop the middle-button autoscroll cursor appearing
        if (e.button === 1) e.preventDefault();
      }}
      onAuxClick={(e) => {
        if (e.button !== 1) return;
        e.preventDefault();
        void toggleMute(item.audioExe);
      }}
      onMouseEnter={(e) => {
        setHovered(true);
        const m = useMenu.getState();
        if (m.kind === "windows" && m.item?.id === item.id) {
          // back onto the icon that owns the open preview: keep it
          m.cancelScheduledClose();
        } else if (item.windows.length > 0) {
          const el = e.currentTarget;
          dwellTimer.current = setTimeout(() => {
            if (Date.now() < previewMutedUntil.current) return;
            onHoverPreview(item, el);
          }, PREVIEW_DWELL_MS);
        }
      }}
      onMouseLeave={() => {
        setHovered(false);
        clearTimeout(dwellTimer.current);
        // leaving the icon that owns the open preview: dismiss it soon
        // unless the cursor lands on the flyout itself
        const m = useMenu.getState();
        if (m.kind === "windows" && m.item?.id === item.id) {
          m.scheduleClose(450);
        }
      }}
      aria-label={item.name}
    >
      {adjusting && audio ? (
        <motion.span
          className="dock-label dock-volume-pill"
          data-edge={edge}
          initial={{ opacity: 0, scale: 0.9, ...labelFrom(edge) }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          transition={springs.bloom}
        >
          <Speaker muted={audio.muted} />
          <span className="dock-volume-value">
            {audio.muted ? t.common.muted : `${audio.volume}%`}
          </span>
          <span className="dock-volume-track" aria-hidden>
            <span
              className="dock-volume-fill"
              style={{ width: `${audio.muted ? 0 : audio.volume}%` }}
            />
          </span>
        </motion.span>
      ) : (
        hovered &&
        !flyoutOpen &&
        !dragging && (
          <motion.span
            className="dock-label"
            data-edge={edge}
            initial={{ opacity: 0, scale: 0.9, ...labelFrom(edge) }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            transition={springs.bloom}
          >
            {item.name}
          </motion.span>
        )
      )}
      <span className="dock-icon-face">
        {item.kind === "stack" ? (
          <span className="dock-stack">
            {item.children.slice(0, 4).map((child, i) =>
              item.childIcons[i] ? (
                <img key={child.id} src={item.childIcons[i]!} alt="" draggable={false} />
              ) : (
                <span key={child.id} className="dock-stack-slot" />
              ),
            )}
          </span>
        ) : item.iconSrc ? (
          <img src={item.iconSrc} alt="" draggable={false} />
        ) : (
          <span className="dock-icon-glyph">{initial}</span>
        )}
      </span>
      {audio?.muted && (
        <span className="dock-muted-badge" title={t.dock.isMuted(item.name)}>
          <Speaker muted />
        </span>
      )}
      {item.windows.length > 0 && (
        <span className="dock-indicator" data-focused={item.focused} />
      )}
    </motion.button>
  );
}
