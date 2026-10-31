/**
 * Managing desktop widgets from the settings window.
 *
 * Every control here goes through a Rust command and comes back as the
 * whole settings struct on `settings://changed`, so nothing is mirrored
 * twice and the overlay redraws itself.
 */

import { useState } from "react";
import { WIDGETS } from "../desktop/registry";
import { ipc } from "../../ipc/commands";
import type { Settings, WidgetInstance, WidgetKind } from "../../ipc/types";
import { t } from "../../i18n";
import { AeroSegmented, AeroSlider, AeroToggle, CtlLabel } from "./controls";

interface Props {
  settings: Settings;
  onStatus: (tone: "ok" | "error", text: string) => void;
}

const DEFAULT_ACCENT = "#2563eb";

function WidgetRow({
  widget,
  allowWeather,
  onStatus,
}: {
  widget: WidgetInstance;
  allowWeather: boolean;
  onStatus: Props["onStatus"];
}) {
  const [open, setOpen] = useState(false);
  const def = WIDGETS.find((w) => w.kind === widget.kind);
  const fail = (what: string) => (e: unknown) => onStatus("error", `${what}: ${e}`);
  const style = (patch: Parameters<typeof ipc.styleWidget>[1]) =>
    ipc.styleWidget(widget.id, patch).catch(fail(t.errors.changeWidget));

  const opts = widget.options;

  return (
    <div className="mode-card">
      <div className="mode-card-head">
        <span className="mode-card-glyph">{(def?.label ?? "?").charAt(0)}</span>
        <div className="mode-card-title">
          <strong>{def?.label ?? widget.kind}</strong>
          <span className="mode-card-meta">
            {Math.round(widget.width)} × {Math.round(widget.height)}
            {widget.locked && t.widgets.locked}
          </span>
        </div>
        <button className="aero-button" onClick={() => setOpen((v) => !v)}>
          {open ? t.common.done : t.common.edit}
        </button>
      </div>

      {open && (
        <div className="mode-card-edit">
          <AeroSlider
            label={t.common.opacity}
            value={widget.opacity}
            min={0.3}
            max={1}
            step={0.02}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => void style({ opacity: v })}
          />
          {!def?.bare && (
            <div className="ctl-row">
              <span className="ctl-label">{t.widgets.tint}</span>
              <div className="ctl-actions">
                <input
                  type="color"
                  className="ctl-colour"
                  aria-label={t.widgets.tintAria}
                  value={widget.accent ?? DEFAULT_ACCENT}
                  onChange={(e) => void style({ accent: e.target.value })}
                />
                <button className="aero-button" onClick={() => void style({ accent: null })}>
                  {t.widgets.useTheme}
                </button>
              </div>
            </div>
          )}
          <AeroToggle
            label={t.widgets.lock}
            checked={widget.locked}
            onChange={(v) => void style({ locked: v })}
          />

          {widget.kind === "clock" && (
            <>
              <AeroSegmented<string>
                label={t.widgets.face}
                value={opts.analog ? "analog" : "digital"}
                options={[
                  { value: "analog", label: t.widgets.analog },
                  { value: "digital", label: t.widgets.digital },
                ]}
                onChange={(v) => void style({ options: { ...opts, analog: v === "analog" } })}
              />
              <AeroToggle
                label={t.widgets.showSeconds}
                checked={opts.seconds}
                onChange={(v) => void style({ options: { ...opts, seconds: v } })}
              />
              <AeroToggle
                label={t.widgets.twentyFourHour}
                checked={opts.twentyFourHour}
                onChange={(v) => void style({ options: { ...opts, twentyFourHour: v } })}
              />
            </>
          )}

          {widget.kind === "weather" && (
            <>
              <AeroSegmented<string>
                label={t.widgets.units}
                value={opts.celsius ? "c" : "f"}
                options={[
                  { value: "c", label: t.widgets.celsius },
                  { value: "f", label: t.widgets.fahrenheit },
                ]}
                onChange={(v) => void style({ options: { ...opts, celsius: v === "c" } })}
              />
              <label className="ctl-row">
                <span className="ctl-label">{t.widgets.placeName}</span>
                <input
                  className="ctl-text"
                  defaultValue={opts.place ?? ""}
                  placeholder={t.widgets.placePlaceholder}
                  onBlur={(e) => void style({ options: { ...opts, place: e.target.value || null } })}
                />
              </label>
              <div className="ctl-row">
                <span className="ctl-label">{t.widgets.coordinates}</span>
                <div className="ctl-actions">
                  <input
                    className="ctl-text ctl-text-short"
                    defaultValue={opts.latitude ?? ""}
                    placeholder="51.5"
                    aria-label={t.widgets.latitude}
                    onBlur={(e) =>
                      void style({
                        options: {
                          ...opts,
                          latitude: e.target.value.trim() === "" ? null : Number(e.target.value),
                        },
                      })
                    }
                  />
                  <input
                    className="ctl-text ctl-text-short"
                    defaultValue={opts.longitude ?? ""}
                    placeholder="-0.13"
                    aria-label={t.widgets.longitude}
                    onBlur={(e) =>
                      void style({
                        options: {
                          ...opts,
                          longitude: e.target.value.trim() === "" ? null : Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
              {!allowWeather && (
                <p className="mode-card-note">{t.widgets.weatherOffline}</p>
              )}
            </>
          )}

          <div className="mode-card-actions">
            <button
              className="aero-button aero-button-danger"
              onClick={() =>
                ipc
                  .removeWidget(widget.id)
                  .then(() => onStatus("ok", t.widgets.removed(def?.label)))
                  .catch(fail(t.errors.removeWidget))
              }
            >
              {t.widgets.remove}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function WidgetsCard({ settings, onStatus }: Props) {
  const w = settings.widgets;
  const fail = (what: string) => (e: unknown) => onStatus("error", `${what}: ${e}`);

  return (
    <>
      <section className="settings-card">
      <AeroToggle
        label={t.widgets.show}
        checked={w.enabled}
        onChange={(v) =>
          ipc
            .enableWidgets(v)
            .then(() =>
              onStatus("ok", v ? t.widgets.on : t.widgets.off),
            )
            .catch(fail(t.errors.changeWidgets))
        }
      />

      {w.enabled && (
          <AeroToggle
            label={t.widgets.allowNetwork}
            checked={w.allowWeatherNetwork}
            hint={t.widgets.allowNetworkHint}
            onChange={(v) =>
              ipc
                .allowWeatherNetwork(v)
                .then(() => onStatus("ok", v ? t.widgets.networkOn : t.widgets.networkOff))
                .catch(fail(t.errors.changeThat))
            }
          />
      )}
      </section>

      {w.enabled && (
        <>
          <div className="mode-list">
            {w.widgets.map((widget) => (
              <WidgetRow
                key={widget.id}
                widget={widget}
                allowWeather={w.allowWeatherNetwork}
                onStatus={onStatus}
              />
            ))}
          </div>

          <section className="settings-card">
          <div className="ctl-row ctl-row-stacked">
            <CtlLabel label={t.widgets.add} />
            <div className="widget-add">
              {WIDGETS.map((def) => (
                <button
                  key={def.kind}
                  className="aero-button"
                  title={def.description}
                  onClick={() =>
                    ipc
                      .addWidget(def.kind as WidgetKind)
                      .then(() => onStatus("ok", t.widgets.added(def.label)))
                      .catch(fail(t.errors.addWidget))
                  }
                >
                  {def.label}
                </button>
              ))}
            </div>
          </div>
          </section>
        </>
      )}
    </>
  );
}
