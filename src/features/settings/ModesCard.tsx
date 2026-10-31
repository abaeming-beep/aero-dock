/**
 * Managing Dock Modes from the settings window.
 *
 * A mode owns its pins, its saved window layout and its per-app volumes.
 * Everything here goes through a Rust command and comes back as the full
 * settings struct on `settings://changed`, so nothing is mirrored twice.
 */

import { useState } from "react";
import { ipc } from "../../ipc/commands";
import type { DockMode, Settings } from "../../ipc/types";
import { t } from "../../i18n";
import { ModeGlyph, ModeIconPicker } from "./ModeIconPicker";
import { AeroToggle, CtlLabel } from "./controls";

interface Props {
  settings: Settings;
  onStatus: (tone: "ok" | "error", text: string) => void;
}

/** "just now", "12 minutes ago", "3 days ago". */
function savedAgo(capturedAt: number): string {
  if (capturedAt === 0) return t.modes.saved.nothing;
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - capturedAt);
  if (seconds < 60) return t.modes.saved.justNow;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t.modes.saved.minutes(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t.modes.saved.hours(hours);
  const days = Math.floor(hours / 24);
  return t.modes.saved.days(days);
}

function ModeRow({
  mode,
  active,
  onStatus,
}: {
  mode: DockMode;
  active: boolean;
  onStatus: Props["onStatus"];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(mode.name);
  const [glyph, setGlyph] = useState(mode.glyph);
  const [apps, setApps] = useState(mode.autoSwitchApps.join(", "));

  const fail = (what: string) => (e: unknown) => onStatus("error", `${what}: ${e}`);

  return (
    <div className="mode-card" data-active={active}>
      <div className="mode-card-head">
        <span className="mode-card-glyph">
          <ModeGlyph name={mode.name} glyph={mode.glyph} />
        </span>
        <div className="mode-card-title">
          <strong>{mode.name}</strong>
          <span className="mode-card-meta">
            {t.modes.meta(mode.pinned.length, mode.workspace.windows.length, mode.audio.length)}
          </span>
        </div>
        {active ? (
          <span className="mode-card-badge">{t.modes.active}</span>
        ) : (
          <button
            className="aero-button"
            onClick={() =>
              ipc
                .switchMode(mode.id)
                .then((r) => onStatus("ok", t.modes.switched(r.modeName)))
                .catch(fail(t.errors.switchMode))
            }
          >
            {t.modes.switchTo}
          </button>
        )}
      </div>

      <p className="mode-card-note">{t.modes.workspace(savedAgo(mode.workspace.capturedAt))}</p>

      <div className="mode-card-actions">
        <button
          className="aero-button"
          onClick={() =>
            ipc
              .captureWorkspace(mode.id)
              .then(() => onStatus("ok", t.modes.savedWindows(mode.name)))
              .catch(fail(t.errors.saveWorkspace))
          }
        >
          {t.modes.saveWindows}
        </button>
        <button
          className="aero-button"
          disabled={mode.workspace.windows.length === 0}
          onClick={() =>
            ipc
              .restoreWorkspace(mode.id)
              .then((r) =>
                onStatus(
                  "ok",
                  t.modes.restored(r.moved, r.launched, r.missing),
                ),
              )
              .catch(fail(t.errors.restoreWorkspace))
          }
        >
          {t.modes.restoreWindows}
        </button>
        <button
          className="aero-button"
          disabled={mode.workspace.windows.length === 0}
          onClick={() =>
            ipc
              .clearWorkspace(mode.id)
              .then(() => onStatus("ok", t.modes.cleared(mode.name)))
              .catch(fail(t.errors.clearWorkspace))
          }
        >
          {t.modes.clear}
        </button>
        <button className="aero-button" onClick={() => setEditing((v) => !v)}>
          {editing ? t.common.done : t.common.edit}
        </button>
      </div>

      {editing && (
        <div className="mode-card-edit">
          <label className="ctl-row">
            <span className="ctl-label">{t.modes.name}</span>
            <input
              className="ctl-text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() =>
                ipc
                  .renameMode(mode.id, name, glyph)
                  .catch(fail(t.errors.renameMode))
              }
            />
          </label>
          <div className="mode-icon-field">
            <span className="ctl-label">{t.modes.tileIcon}</span>
            <ModeIconPicker
              name={name}
              glyph={glyph}
              onChange={(next) => {
                setGlyph(next);
                ipc.renameMode(mode.id, name, next).catch(fail(t.errors.saveIcon));
              }}
            />
          </div>
          <div className="ctl-row ctl-row-stacked">
            <CtlLabel label={t.modes.autoApps} hint={t.modes.autoAppsHint} />
            <input
              className="ctl-text"
              value={apps}
              placeholder="code.exe, slack.exe"
              onChange={(e) => setApps(e.target.value)}
              onBlur={() =>
                ipc
                  .setModeApps(
                    mode.id,
                    apps
                      .split(",")
                      .map((a) => a.trim())
                      .filter(Boolean),
                  )
                  .catch(fail(t.errors.saveAppList))
              }
            />
          </div>
          <div className="mode-card-actions">
            <button
              className="aero-button aero-button-danger"
              onClick={() =>
                ipc
                  .deleteMode(mode.id)
                  .then(() => onStatus("ok", t.modes.deleted(mode.name)))
                  .catch(fail(t.errors.deleteMode))
              }
            >
              {t.modes.deleteMode}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ModesCard({ settings, onStatus }: Props) {
  const [newName, setNewName] = useState("");
  const modes = settings.modes;

  return (
    <>
      <section className="settings-card">
      <AeroToggle
        label={t.modes.useModes}
        checked={modes.enabled}
        hint={t.modes.useModesHint}
        onChange={(v) =>
          ipc
            .enableModes(v)
            .then(() =>
              onStatus(
                "ok",
                v
                  ? t.modes.enabled
                  : t.modes.disabled,
              ),
            )
            .catch((e) => onStatus("error", `${t.errors.changeModes}: ${e}`))
        }
      />

      {modes.enabled && (
        <>
          <AeroToggle
            label={t.modes.restoreOnSwitch}
            checked={modes.restoreWorkspaceOnSwitch}
            hint={t.modes.restoreOnSwitchHint}
            onChange={(v) =>
              ipc
                .setRestoreWorkspaceOnSwitch(v)
                .catch((e) => onStatus("error", `${t.errors.changeThat}: ${e}`))
            }
          />
          <AeroToggle
            label={t.modes.autoSwitch}
            checked={modes.autoSwitch}
            hint={t.modes.autoSwitchHint}
            onChange={(v) =>
              ipc
                .setAutoSwitch(v)
                .catch((e) => onStatus("error", `${t.errors.changeThat}: ${e}`))
            }
          />
        </>
      )}
      </section>

      {modes.enabled && (
        <>
          <div className="mode-list">
            {modes.modes.map((mode) => (
              <ModeRow
                key={mode.id}
                mode={mode}
                active={mode.id === modes.activeId}
                onStatus={onStatus}
              />
            ))}
          </div>

          <section className="settings-card">
          <div className="ctl-row">
            <CtlLabel label={t.modes.newMode} hint={t.modes.newModeHint} />
            <div className="ctl-actions">
              <input
                className="ctl-text ctl-text-mid"
                value={newName}
                placeholder={t.modes.newModePlaceholder}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button
                className="aero-button"
                disabled={!newName.trim()}
                onClick={() =>
                  ipc
                    .createMode(newName.trim(), null, false)
                    .then(() => {
                      onStatus("ok", t.modes.added(newName.trim()));
                      setNewName("");
                    })
                    .catch((e) => onStatus("error", `${t.errors.addMode}: ${e}`))
                }
              >
                {t.modes.addEmpty}
              </button>
              <button
                className="aero-button"
                disabled={!newName.trim()}
                onClick={() =>
                  ipc
                    .createMode(newName.trim(), null, true)
                    .then(() => {
                      onStatus("ok", t.modes.addedWithPins(newName.trim()));
                      setNewName("");
                    })
                    .catch((e) => onStatus("error", `${t.errors.addMode}: ${e}`))
                }
              >
                {t.modes.copyCurrent}
              </button>
            </div>
          </div>
          </section>
        </>
      )}
    </>
  );
}
