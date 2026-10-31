/**
 * Whatever Windows is playing.
 *
 * This reads the system media session, the same one the volume flyout
 * shows, so it works with anything that registers: browsers, Spotify, the
 * built-in player. There is no per-app integration and nothing to set up.
 */

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { t } from "../../../i18n";
import { ipc } from "../../../ipc/commands";
import type { MediaAction, NowPlaying } from "../../../ipc/types";
import type { WidgetProps } from "../registry";

const POLL_MS = 2000;

function Glyph({ action, playing }: { action: MediaAction; playing: boolean }) {
  if (action === "playpause") {
    const Icon = playing ? Pause : Play;
    return <Icon size={18} aria-hidden />;
  }
  const Icon = action === "previous" ? SkipBack : SkipForward;
  return <Icon size={15} aria-hidden />;
}

export function MusicWidget(_: WidgetProps) {
  const [track, setTrack] = useState<NowPlaying | null>(null);

  const refresh = useCallback(() => {
    ipc
      .widgetNowPlaying()
      .then(setTrack)
      .catch(() => {
        // nothing playing is the common case, not an error worth showing
      });
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const send = (action: MediaAction) => {
    ipc
      .widgetMediaControl(action)
      // read back straight away so the button reflects what happened
      .then(() => setTimeout(refresh, 180))
      .catch(() => undefined);
  };

  if (!track?.active) {
    return <div className="w-empty">{t.widgets.music.nothing}</div>;
  }

  return (
    <div className="w-music">
      <div className="w-music-text">
        <div className="w-music-title" title={track.title}>
          {track.title}
        </div>
        <div className="w-music-artist" title={track.artist}>
          {track.artist || track.album || t.widgets.music.unknownArtist}
        </div>
      </div>
      <div className="w-music-controls">
        {(["previous", "playpause", "next"] as MediaAction[]).map((action) => (
          <button
            key={action}
            className="w-music-btn"
            data-primary={action === "playpause"}
            aria-label={
              action === "playpause"
                ? track.playing
                  ? t.widgets.music.pause
                  : t.widgets.music.play
                : t.widgets.music[action]
            }
            // the frame drags on pointerdown, so a button press must not
            // also start moving the widget
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => send(action)}
          >
            <Glyph action={action} playing={track.playing} />
          </button>
        ))}
      </div>
    </div>
  );
}
