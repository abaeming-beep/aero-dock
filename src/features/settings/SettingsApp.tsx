/**
 * The settings window: a sidebar of sections and one section at a time.
 * Every change goes through the settings store, Rust and back as a
 * broadcast, so the dock restyles live while you drag a slider.
 */

import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import {
  Info,
  Layers,
  LayoutGrid,
  PanelBottom,
  Palette,
  SlidersHorizontal,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { applyAppearance, normalizeTheme, type ThemeId } from "../../engine/themes/applyTheme";
import { ipc } from "../../ipc/commands";
import type { DockEdge, MonitorInfoEx, Settings, StorageInfo } from "../../ipc/types";
import { useSettings } from "../../state/settingsStore";
import { REPO_URL } from "../../links";
import { AudioCard } from "./AudioCard";
import { ModesCard } from "./ModesCard";
import { WidgetsCard } from "./WidgetsCard";
import { AeroSegmented, AeroSlider, AeroToggle, CtlLabel, HelpTip } from "./controls";
import { t } from "../../i18n";
import "./settings.css";

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;

/** How long a status line stays before it clears itself. */
const STATUS_MS = 6000;

type SectionId = keyof Omit<typeof t.settings.nav, "label">;

const SECTIONS: { id: SectionId; Icon: LucideIcon; help?: string }[] = [
  { id: "general", Icon: SlidersHorizontal },
  { id: "dock", Icon: PanelBottom },
  { id: "appearance", Icon: Palette },
  { id: "modes", Icon: Layers },
  { id: "audio", Icon: Volume2, help: t.audio.help },
  { id: "widgets", Icon: LayoutGrid, help: t.widgets.help },
  { id: "about", Icon: Info },
];

/** One status line under the content. The window has room to say what
 * happened, so nothing here needs a modal. */
interface Status {
  tone: "ok" | "error";
  text: string;
}

export function SettingsApp() {
  const { settings, hydrate, apply } = useSettings();
  const [section, setSection] = useState<SectionId>("general");
  const [status, setStatus] = useState<Status | null>(null);
  const [monitors, setMonitors] = useState<MonitorInfoEx[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const [hydrateFailed, setHydrateFailed] = useState(false);
  useEffect(() => {
    hydrate().catch((e) => {
      console.error("settings hydrate failed", e);
      setHydrateFailed(true);
    });
    ipc
      .listMonitors()
      .then(setMonitors)
      .catch((e) => console.warn("monitor list unavailable", e));
    ipc
      .storageInfo()
      .then(setStorage)
      .catch((e) => console.warn("storage info unavailable", e));
  }, [hydrate]);

  useEffect(() => {
    if (settings) applyAppearance(settings);
  }, [settings]);

  useEffect(() => {
    if (!status) return;
    const id = setTimeout(() => setStatus(null), STATUS_MS);
    return () => clearTimeout(id);
  }, [status]);

  // This is what fills the window until settings arrive from Rust (or says
  // so if they never do).
  if (!settings) {
    return (
      <div className="settings-root settings-root-centered">
        {hydrateFailed ? (
          <div className="settings-splash">
            <p>{t.settings.readFailed}</p>
            <p className="settings-splash-hint">{t.settings.readFailedHint}</p>
          </div>
        ) : (
          <div className="settings-splash">
            <span className="flyout-spinner" aria-hidden />
            <p>{t.settings.loading}</p>
          </div>
        )}
      </div>
    );
  }
  const { dock, appearance } = settings;

  const set = (fn: (draft: Settings) => void) => {
    apply(fn).catch((e) => {
      console.error("settings update failed", e);
      setStatus({ tone: "error", text: `${t.errors.saveChange}: ${e}` });
    });
  };

  const toggleStartup = async (on: boolean) => {
    try {
      if (on) await enable();
      else await disable();
      const actual = await isEnabled();
      set((d) => {
        d.launchAtStartup = actual;
      });
    } catch (e) {
      console.error("autostart toggle failed", e);
      setStatus({ tone: "error", text: `${t.errors.startup}: ${e}` });
    }
  };

  const doImport = async (file: File) => {
    try {
      const json = await file.text();
      await ipc.importSettings(json);
      setStatus({ tone: "ok", text: t.settings.imported(file.name) });
    } catch (e) {
      console.error("import failed", e);
      setStatus({ tone: "error", text: `${t.errors.importFile}: ${e}` });
    }
  };

  const openLink = (url: string) =>
    ipc
      .launch(url)
      .catch((e) => setStatus({ tone: "error", text: `${t.errors.openBrowser}: ${e}` }));

  const onStatus = (tone: Status["tone"], text: string) => setStatus({ tone, text });
  const current = SECTIONS.find((s) => s.id === section);

  return (
    <div className="settings-root">
      <nav className="settings-nav" aria-label={t.settings.nav.label}>
        {SECTIONS.map(({ id, Icon }) => (
          <button
            key={id}
            className="settings-nav-item"
            data-active={id === section}
            aria-current={id === section ? "page" : undefined}
            aria-label={t.settings.nav[id]}
            title={t.settings.nav[id]}
            onClick={() => setSection(id)}
          >
            <Icon size={18} aria-hidden />
            <span>{t.settings.nav[id]}</span>
          </button>
        ))}
      </nav>

      <main className="settings-main">
        {/* keyed so a new section starts at the top rather than mid-scroll */}
        <div className="settings-scroll" key={section}>
          <header className="settings-heading">
            <h1>{t.settings.nav[section]}</h1>
            {current?.help && <HelpTip text={current.help} />}
          </header>

          {section === "general" && (
            <section className="settings-card">
              <AeroToggle
                label={t.settings.launchAtStartup}
                checked={settings.launchAtStartup}
                onChange={toggleStartup}
              />
              <AeroToggle
                label={t.settings.hideTaskbar}
                checked={settings.hideTaskbar}
                hint={t.settings.hideTaskbarHint}
                onChange={(v) => {
                  ipc.setTaskbarHidden(v).catch((e) => {
                    console.error("taskbar toggle failed", e);
                    setStatus({ tone: "error", text: `${t.errors.taskbar}: ${e}` });
                  });
                  set((d) => void (d.hideTaskbar = v));
                }}
              />
              <div className="ctl-row">
                <CtlLabel label={t.settings.settingsFile} />
                <div className="ctl-actions">
                  <button
                    className="aero-button"
                    onClick={() =>
                      ipc
                        .exportSettingsFile()
                        .then((path) => setStatus({ tone: "ok", text: t.settings.savedTo(path) }))
                        .catch((e) => {
                          console.error("export failed", e);
                          setStatus({ tone: "error", text: `${t.errors.exportSettings}: ${e}` });
                        })
                    }
                  >
                    {t.settings.export}
                  </button>
                  <button className="aero-button" onClick={() => importRef.current?.click()}>
                    {t.settings.import}
                  </button>
                  <input
                    ref={importRef}
                    type="file"
                    accept=".json"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) doImport(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
              <div className="ctl-row">
                <CtlLabel label={t.settings.quitLabel} hint={t.settings.quitHint} />
                <div className="ctl-actions">
                  <button
                    className="aero-button aero-button-danger"
                    onClick={() =>
                      ipc
                        .quitApp()
                        .catch((e) =>
                          setStatus({ tone: "error", text: `${t.errors.quit}: ${e}` }),
                        )
                    }
                  >
                    {t.settings.quit}
                  </button>
                </div>
              </div>
            </section>
          )}

          {section === "dock" && (
            <>
              <section className="settings-card">
                <AeroSegmented<DockEdge>
                  label={t.settings.position}
                  value={dock.edge}
                  options={[
                    { value: "bottom", label: t.settings.bottom },
                    { value: "top", label: t.settings.top },
                    { value: "left", label: t.settings.left },
                    { value: "right", label: t.settings.right },
                  ]}
                  onChange={(edge) => set((d) => void (d.dock.edge = edge))}
                />
                {monitors.length > 1 && (
                  <AeroSegmented<string>
                    label={t.settings.monitor}
                    value={dock.monitor ?? ""}
                    options={monitors.map((m) => ({
                      value: m.isPrimary ? "" : m.name,
                      label: `${m.name.replace(/^\\\\\.\\/, "")}${m.isPrimary ? t.settings.primary : ""}`,
                    }))}
                    onChange={(name) => set((d) => void (d.dock.monitor = name || null))}
                  />
                )}
                <AeroSlider
                  label={t.settings.iconSize}
                  value={dock.iconSize}
                  min={32}
                  max={80}
                  step={2}
                  format={(v) => `${v}px`}
                  onChange={(v) => set((d) => void (d.dock.iconSize = v))}
                />
                <AeroToggle
                  label={t.settings.magnification}
                  checked={dock.magnification}
                  onChange={(v) => set((d) => void (d.dock.magnification = v))}
                />
                {dock.magnification && (
                  <AeroSlider
                    label={t.settings.magnificationAmount}
                    value={dock.magnificationScale}
                    min={1.1}
                    max={1.9}
                    step={0.05}
                    format={(v) => `${Math.round((v - 1) * 100)}%`}
                    onChange={(v) => set((d) => void (d.dock.magnificationScale = v))}
                  />
                )}
                <AeroToggle
                  label={t.settings.floating}
                  checked={dock.floating}
                  onChange={(v) => set((d) => void (d.dock.floating = v))}
                />
                <AeroToggle
                  label={t.settings.showRunning}
                  checked={dock.showRunningApps}
                  onChange={(v) => set((d) => void (d.dock.showRunningApps = v))}
                />
                <AeroToggle
                  label={t.settings.autoHide}
                  checked={dock.autoHide}
                  hint={t.settings.autoHideHint}
                  onChange={(v) => set((d) => void (d.dock.autoHide = v))}
                />
                {dock.autoHide && (
                  <AeroSlider
                    label={t.settings.hideAfter}
                    value={dock.autoHideDelayMs}
                    min={200}
                    max={5000}
                    step={100}
                    format={(v) =>
                      v >= 1000 ? t.settings.seconds((v / 1000).toFixed(1)) : `${v}ms`
                    }
                    onChange={(v) => set((d) => void (d.dock.autoHideDelayMs = v))}
                  />
                )}
              </section>

              <h2 className="settings-group-title">{t.settings.dockItems}</h2>
              <section className="settings-card">
                <AeroToggle
                  label={t.settings.settingsButton}
                  checked={dock.showSettingsButton}
                  onChange={(v) => set((d) => void (d.dock.showSettingsButton = v))}
                />
                <AeroToggle
                  label={t.settings.clock}
                  checked={dock.showClock}
                  onChange={(v) => set((d) => void (d.dock.showClock = v))}
                />
                <AeroToggle
                  label={t.settings.status}
                  checked={dock.showSystemStatus}
                  onChange={(v) => set((d) => void (d.dock.showSystemStatus = v))}
                />
              </section>
            </>
          )}

          {section === "appearance" && (
            <section className="settings-card">
              <AeroSegmented<ThemeId>
                label={t.settings.theme}
                value={normalizeTheme(appearance.theme)}
                options={[
                  { value: "system", label: t.settings.themeSystem },
                  { value: "light", label: t.settings.themeLight },
                  { value: "dark", label: t.settings.themeDark },
                ]}
                onChange={(v) => set((d) => void (d.appearance.theme = v))}
              />
              <div className="ctl-row">
                <CtlLabel label={t.settings.accent} />
                <div className="ctl-actions">
                  <input
                    type="color"
                    className="ctl-colour"
                    aria-label={t.settings.accent}
                    value={appearance.accent}
                    onChange={(e) => set((d) => void (d.appearance.accent = e.target.value))}
                  />
                </div>
              </div>
              <AeroToggle
                label={t.settings.wallpaperTint}
                checked={appearance.wallpaperSync}
                hint={t.settings.wallpaperTintHint}
                onChange={(v) => set((d) => void (d.appearance.wallpaperSync = v))}
              />
              <AeroSlider
                label={t.settings.dockOpacity}
                value={appearance.transparency}
                min={0.3}
                max={1}
                format={pctFmt}
                onChange={(v) => set((d) => void (d.appearance.transparency = v))}
              />
              <AeroSlider
                label={t.settings.animationSpeed}
                value={appearance.animationSpeed}
                min={0.5}
                max={2}
                format={(v) => `${v.toFixed(2)}×`}
                onChange={(v) => set((d) => void (d.appearance.animationSpeed = v))}
              />
            </section>
          )}

          {section === "modes" && <ModesCard settings={settings} onStatus={onStatus} />}

          {section === "audio" && <AudioCard />}

          {section === "widgets" && <WidgetsCard settings={settings} onStatus={onStatus} />}

          {section === "about" && (
            <section className="settings-card">
              <div className="ctl-row">
                <CtlLabel label={t.settings.version} />
                <span className="settings-about-value">AB Dock {__APP_VERSION__}</span>
              </div>
              {storage && (
                <div className="ctl-row ctl-row-stacked">
                  <span className="ctl-label">
                    {t.settings.storage} ({storage.portable ? t.settings.portable : t.settings.installed})
                  </span>
                  <span className="settings-note settings-path">{storage.dataDir}</span>
                </div>
              )}
              <div className="ctl-row">
                <CtlLabel label={t.settings.project} />
                <div className="ctl-actions">
                  <button className="aero-button" onClick={() => void openLink(REPO_URL)}>
                    {t.settings.github}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>

        {status && (
          <p className="settings-status" data-tone={status.tone} role="status">
            {status.text}
          </p>
        )}
      </main>
    </div>
  );
}
