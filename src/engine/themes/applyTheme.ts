/**
 * Theme applier: projects settings onto the root element. Components never
 * read settings for styling; they read tokens.
 */

import type { Settings } from "../../ipc/types";

export type ThemeId = "system" | "light" | "dark";

/** Older settings files name a retired colour theme. Night was the only dark
 *  one; the rest follow the system. */
export function normalizeTheme(theme: string): ThemeId {
  if (theme === "light" || theme === "dark") return theme;
  return theme === "night" ? "dark" : "system";
}

function isHexColor(hex: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(hex.trim());
}

/** Black or white, whichever reads on the accent (WCAG relative luminance). */
function contrastOn(hex: string): string {
  const v = parseInt(hex.trim().slice(1), 16);
  const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#000000" : "#ffffff";
}

export function applyAppearance(settings: Settings, wallpaperAccent?: string | null): void {
  const el = document.documentElement;
  const root = el.style;
  const a = settings.appearance;

  el.dataset.theme = normalizeTheme(a.theme);

  // wallpaper sync takes over the accent when it has a colour to offer
  const accent = a.wallpaperSync && wallpaperAccent ? wallpaperAccent : a.accent;
  if (isHexColor(accent)) {
    root.setProperty("--accent", accent);
    root.setProperty("--accent-contrast", contrastOn(accent));
  } else {
    root.removeProperty("--accent");
    root.removeProperty("--accent-contrast");
  }

  root.setProperty("--icon-size", `${settings.dock.iconSize}px`);
  root.setProperty("--dock-opacity", String(a.transparency));
  root.setProperty("--anim-speed", String(a.animationSpeed));
}
