/**
 * Weather, and the only part of Aero Dock that leaves the machine.
 *
 * The README promises the app makes no network requests, so this widget
 * has to earn its exception rather than quietly break the promise. It
 * asks for nothing until two separate things are true: the permission
 * switch in settings is on, and a location has been set. Until then it
 * says so on its face instead of fetching anything.
 *
 * Open-Meteo is used because it needs no account, no key and no
 * identifying header. The request carries a latitude and a longitude and
 * nothing else, so there is no profile to attach it to.
 */

import {
  Cloud,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { t } from "../../../i18n";
import type { WidgetProps } from "../registry";

/** Refreshed on the quarter hour; weather does not change faster. */
const POLL_MS = 15 * 60 * 1000;

interface Reading {
  temperature: number;
  code: number;
  wind: number;
  isDay: boolean;
}

/** The WMO codes Open-Meteo returns, grouped into what to draw. */
function describe(code: number): { label: string; icon: Icon } {
  if (code === 0) return { label: t.widgets.weather.clear, icon: "sun" };
  if (code <= 2) return { label: t.widgets.weather.partlyCloudy, icon: "partly" };
  if (code === 3) return { label: t.widgets.weather.overcast, icon: "cloud" };
  if (code <= 48) return { label: t.widgets.weather.fog, icon: "cloud" };
  if (code <= 57) return { label: t.widgets.weather.drizzle, icon: "rain" };
  if (code <= 67) return { label: t.widgets.weather.rain, icon: "rain" };
  if (code <= 77) return { label: t.widgets.weather.snow, icon: "snow" };
  if (code <= 82) return { label: t.widgets.weather.showers, icon: "rain" };
  if (code <= 86) return { label: t.widgets.weather.snowShowers, icon: "snow" };
  return { label: t.widgets.weather.thunderstorm, icon: "storm" };
}

type Icon = "sun" | "partly" | "cloud" | "rain" | "snow" | "storm";

function WeatherIcon({ icon, isDay }: { icon: Icon; isDay: boolean }) {
  const Glyph = {
    sun: isDay ? Sun : Moon,
    partly: isDay ? CloudSun : CloudMoon,
    cloud: Cloud,
    rain: CloudRain,
    snow: CloudSnow,
    storm: CloudLightning,
  }[icon];
  return <Glyph className="w-weather-icon" strokeWidth={1.5} aria-hidden />;
}

export function WeatherWidget({ widget, allowNetwork }: WidgetProps) {
  const { latitude, longitude, place, celsius } = widget.options;
  const [reading, setReading] = useState<Reading | null>(null);
  const [failed, setFailed] = useState(false);

  const located = latitude !== null && longitude !== null;
  // Both switches, every time. The permission is checked here, next to the
  // call that would leave the machine, rather than somewhere that can drift
  // out of step with it.
  const permitted = allowNetwork && located;

  const fetchWeather = useCallback(async () => {
    if (!permitted) return;
    try {
      const url =
        "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${encodeURIComponent(String(latitude))}` +
        `&longitude=${encodeURIComponent(String(longitude))}` +
        "&current=temperature_2m,weather_code,wind_speed_10m,is_day" +
        `&temperature_unit=${celsius ? "celsius" : "fahrenheit"}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`weather responded ${res.status}`);
      const json = (await res.json()) as {
        current?: {
          temperature_2m?: number;
          weather_code?: number;
          wind_speed_10m?: number;
          is_day?: number;
        };
      };
      const c = json.current;
      if (!c || c.temperature_2m === undefined) throw new Error("no reading");
      setReading({
        temperature: Math.round(c.temperature_2m),
        code: c.weather_code ?? 0,
        wind: Math.round(c.wind_speed_10m ?? 0),
        isDay: c.is_day !== 0,
      });
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [permitted, latitude, longitude, celsius]);

  useEffect(() => {
    if (!permitted) return;
    void fetchWeather();
    const id = setInterval(() => void fetchWeather(), POLL_MS);
    return () => clearInterval(id);
  }, [permitted, fetchWeather]);

  if (!located) {
    return (
      <div className="w-empty">
        {t.widgets.weather.needLocation}
      </div>
    );
  }
  if (!allowNetwork) {
    return (
      <div className="w-empty">
        {t.widgets.weather.offline}
      </div>
    );
  }
  if (failed && !reading) {
    return <div className="w-empty">{t.widgets.weather.failed}</div>;
  }
  if (!reading) {
    return <div className="w-empty">{t.widgets.weather.loading}</div>;
  }

  const { label, icon } = describe(reading.code);

  return (
    <div className="w-weather">
      <WeatherIcon icon={icon} isDay={reading.isDay} />
      <div className="w-weather-text">
        <div className="w-weather-temp">
          {reading.temperature}
          <span className="w-weather-unit">{celsius ? "°C" : "°F"}</span>
        </div>
        <div className="w-weather-label">{label}</div>
        <div className="w-weather-place">{place || t.widgets.weather.yourLocation}</div>
      </div>
    </div>
  );
}
