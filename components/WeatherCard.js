// components/WeatherCard.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const POSSIBLE_COORD_KEYS = [
  "EW_GEO_COORDS",
  "WEATHERBLIP_COORDS",
  "weather.coords",
  "geo.coords",
  "coords",
];

function readStoredCoords() {
  for (const key of POSSIBLE_COORD_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const v = JSON.parse(raw);
      if (v && typeof v === "object") {
        if ("lat" in v && "lng" in v) return { lat: +v.lat, lon: +v.lng };
        if ("latitude" in v && "longitude" in v)
          return { lat: +v.latitude, lon: +v.longitude };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function fetchCurrentWeather({ lat, lon }, signal) {
  const u = new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude", String(lat));
  u.searchParams.set("longitude", String(lon));
  u.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,wind_speed_10m,weather_code"
  );
  u.searchParams.set("temperature_unit", "fahrenheit");
  u.searchParams.set("windspeed_unit", "mph");
  u.searchParams.set("precipitation_unit", "inch");
  u.searchParams.set("timezone", "auto");

  const res = await fetch(u.toString(), { cache: "no-store", signal });
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  return res.json();
}

function iconForWMO(code) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 66, 67].includes(code)) return "🌧️";
  if ([71, 73, 75, 77].includes(code)) return "🌨️";
  if ([80, 81, 82].includes(code)) return "🌦️";
  if ([85, 86].includes(code)) return "🌨️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

export default function WeatherCard() {
  const [coords, setCoords] = useState(null);
  const [wx, setWx] = useState(null);
  const [status, setStatus] = useState("idle");
  const [nowTime, setNowTime] = useState(new Date());
  const abortRef = useRef(null);

  // Live clock (update every minute)
  useEffect(() => {
    const t = setInterval(() => setNowTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Discover coords
  useEffect(() => {
    let cancelled = false;

    function tryStored() {
      const c = readStoredCoords();
      if (c) {
        setCoords(c);
        return true;
      }
      return false;
    }

    async function maybeReadIfGranted() {
      if (!("permissions" in navigator)) return;
      try {
        // @ts-ignore
        const perm = await navigator.permissions.query({ name: "geolocation" });
        if (perm.state === "granted") {
          await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (cancelled) return;
                setCoords({
                  lat: pos.coords.latitude,
                  lon: pos.coords.longitude,
                });
                resolve();
              },
              () => resolve(),
              { maximumAge: 300000, timeout: 8000 }
            );
          });
        }
      } catch {}
    }

    function onStorage(e) {
      if (POSSIBLE_COORD_KEYS.includes(e.key)) {
        const c = readStoredCoords();
        if (c) setCoords(c);
      }
    }

    window.addEventListener("storage", onStorage);
    const hadStored = tryStored();
    if (!hadStored) {
      maybeReadIfGranted().then(() => {
        if (!cancelled && !readStoredCoords() && !coords) setStatus("nocoords");
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Fetch weather
  useEffect(() => {
    if (!coords) return;
    setStatus("loading");
    const controller = new AbortController();
    abortRef.current = controller;

    fetchCurrentWeather(coords, controller.signal)
      .then((data) => {
        setWx(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));

    return () => controller.abort();
  }, [coords]);

  const now = useMemo(() => {
    if (!wx?.current) return null;
    const c = wx.current;
    return {
      tempF: typeof c.temperature_2m === "number" ? Math.round(c.temperature_2m) : null,
      feelsF:
        typeof c.apparent_temperature === "number"
          ? Math.round(c.apparent_temperature)
          : null,
      windMph:
        typeof c.wind_speed_10m === "number"
          ? Math.round(c.wind_speed_10m)
          : null,
      wmo: c.weather_code ?? null,
    };
  }, [wx]);

  const formattedDate = useMemo(
    () =>
      nowTime.toLocaleDateString(undefined, {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    [nowTime]
  );

  const formattedTime = useMemo(
    () =>
      nowTime.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    [nowTime]
  );

  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">Now</div>
        <div className="text-xs text-neutral-500">
          {formattedDate} · {formattedTime}
        </div>
      </div>

      {status === "nocoords" && (
        <p className="text-sm text-neutral-600">
          Enable location in the header to see local weather.
        </p>
      )}
      {status === "loading" && (
        <div className="animate-pulse space-y-2">
          <div className="h-6 w-20 rounded bg-neutral-200" />
          <div className="h-4 w-28 rounded bg-neutral-200" />
          <div className="h-4 w-24 rounded bg-neutral-200" />
        </div>
      )}
      {status === "error" && (
        <p className="text-sm text-red-600">Couldn’t load weather.</p>
      )}

      {status === "ready" && now && (
        <div className="flex items-start gap-3">
          <div className="text-2xl leading-none">{iconForWMO(now.wmo)}</div>
          <div className="space-y-1">
            <div className="text-3xl font-bold">
              {now.tempF != null ? `${now.tempF}°F` : "—"}
            </div>
            <div className="text-sm text-neutral-600">
              {now.feelsF != null ? `Feels like ${now.feelsF}°F` : " "}
            </div>
            <div className="text-sm text-neutral-600">
              {now.windMph != null ? `Wind ${now.windMph} mph` : " "}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
