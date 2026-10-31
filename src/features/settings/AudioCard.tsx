/**
 * The volume mixer, mirroring what scrolling a dock icon does.
 *
 * Only apps that currently hold an audio session appear, which is the
 * same rule the Windows mixer follows: an app that is not making sound
 * has no volume to set.
 */

import { useEffect } from "react";
import { useAppAudio } from "../../state/audioStore";
import { t } from "../../i18n";
import { AeroSlider } from "./controls";

export function AudioCard() {
  const levels = useAppAudio((a) => a.levels);
  const refresh = useAppAudio((a) => a.refresh);
  const setLevel = useAppAudio((a) => a.setLevel);
  const toggleMute = useAppAudio((a) => a.toggleMute);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const apps = Object.values(levels).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="settings-card">
      {apps.length === 0 ? (
        <div className="settings-empty">
          {t.audio.nothing}
          <button className="aero-button" onClick={() => void refresh()}>
            {t.audio.checkAgain}
          </button>
        </div>
      ) : (
        <>
          {apps.map((app) => (
            <div key={app.exe} className="audio-row">
              <AeroSlider
                label={app.name}
                value={app.muted ? 0 : app.volume}
                min={0}
                max={100}
                step={1}
                format={(v) => (app.muted ? t.common.muted : `${Math.round(v)}%`)}
                onChange={(v) => void setLevel(app.exe, Math.round(v))}
              />
              <button className="aero-button" onClick={() => void toggleMute(app.exe)}>
                {app.muted ? t.common.unmute : t.common.mute}
              </button>
            </div>
          ))}
          <div className="audio-actions">
            <button className="aero-button" onClick={() => void refresh()}>
              {t.audio.refresh}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
