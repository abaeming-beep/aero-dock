/**
 * Every spring in AB Dock is defined here so the whole app's "feel"
 * is tuned from one file. Short and settled: nothing overshoots visibly.
 */

export const springs = {
  /** Icon magnification following the cursor. */
  magnify: { mass: 0.08, stiffness: 190, damping: 16 },
  /** Launch nudge: a small acknowledgement, not a bounce. */
  bounce: { type: "spring", stiffness: 420, damping: 26, mass: 0.6 } as const,
  /** Drag. */
  drag: { stiffness: 260, damping: 22, mass: 0.5 },
  /** Neighbours getting out of the way during a reorder. Stiffer than
   * `drag` on purpose: the gap has to open before the cursor arrives,
   * or the drag reads as laggy even though the tile is tracking 1:1. */
  reorder: { type: "spring", stiffness: 520, damping: 38, mass: 0.4 } as const,
  /** Panels and menus opening. */
  bloom: { type: "spring", stiffness: 520, damping: 40, mass: 0.7 } as const,
  /** Dock slide for auto-hide. */
  slide: { type: "spring", stiffness: 210, damping: 26, mass: 0.8 } as const,
} as const;
