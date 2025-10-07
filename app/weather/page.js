// app/weather/page.js
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Simple /weather page:
 * - Uses browser geolocation (with graceful fallback)
 * - Fetches current + 7-day forecast from Open-Meteo (no API key)
 * - Reverse geocodes to a friendly city/region label (Nominatim)
 * - °F by default, with a °C toggle
 */
export default function WeatherPage() {
  const [coords, setCoords] = useState(null); // { lat, lon }
  const [place, setPlace] = useState(null);   // "City, State"
  const [unit, setUnit] = useState("fahrenheit"); // "fahrenheit" | "celsius"
  const [data, setData] = useState(null);     // Open-Meteo response
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const abortRef = useRef(null);

  // Get location
  useEffect(() => {
    let mounted = true;
    if (!navigator?.geolocation) {
      setErr("Geolocation not supported by this browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mounted) return;
        const { latitude, longitude } = pos.coords || {};
        if (latitude == null || longitude == null) {
          setErr("Could not determine your location.");
          setLoading(false);
          return;
        }
        setCoords({ lat: latitude, lon: longitude });
      },
      () => {
        if (!mounted) return;
        setErr("Location permission was denied. Enter location manually (future enhancement).");
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );

    return () => { mounted = false; };
  }, []);

  // Fetch weather + reverse geocode whenever coords or unit changes
  useEffect(() => {
    if (!coords) return;

    const ac = new AbortController();
    abortRef.current = ac;

    async function reverseGeocode(lat, lon) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
          lat
        )}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`;
        const res = await fetch(url, { signal: ac.signal });
        if (!res.ok) return null;
        const j = await res.json();
        const a = j.address || {};
        const city =
          a.city || a.town || a.village || a.hamlet || a.county || a.suburb || a.municipality || null;
        const region = a.state || a.region || a.province || a.country_code?.toUpperCase() || "";
        if (city && region) return `${city}, ${region}`;
        if (city) return city;
        return j.name || null;
      } catch {
        return null;
      }
    }

    async function fetchWeather(lat, lon, unit) {
      const tempUnit = unit === "celsius" ? "celsius" : "fahrenheit";
      const windUnit = unit === "celsius" ? "kmh" : "mph";
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
        lat
      )}&longitude=${encodeURIComponent(
        lon
      )}&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_mean,weather_code&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&timezone=auto`;
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) throw new Error("Failed to fetch weather");
      return res.json();
    }

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [placeName, weather] = await Promise.all([
          reverseGeocode(coords.lat, coords.lon),
          fetchWeather(coords.lat, coords.lon, unit),
        ]);
        setPlace(placeName);
        setData(weather);
      } catch (e) {
        setErr(e?.message || "Failed to load weather.");
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [coords, unit]);

  const toEmoji = (code) => {
    // Minimal mapping for Open-Meteo weather codes
    // https://open-meteo.com/en/docs#weathervariables
    if (code == null) return "❓";
    if (code === 0) return "☀️";
    if ([1, 2].includes(code)) return "🌤️";
    if (code === 3) return "⛅";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
    if ([61, 63, 65].includes(code)) return "🌧️";
    if ([66, 67].includes(code)) return "🌧️❄️";
    if ([71, 73, 75, 77].includes(code)) return "❄️";
    if ([80, 81, 82].includes(code)) return "🌧️";
    if ([85, 86].includes(code)) return "🌨️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "☁️";
  };

  const unitLabel = unit === "celsius" ? "°C" : "°F";
  const windLabel = unit === "celsius" ? "km/h" : "mph";

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-10 text-black">
      <header className="mb-6 text-center">
        <h1 className="text-[32px] font-bold leading-tight">Weather</h1>
        {place && <p className="mt-1 text-black/70">{place}</p>}
      </header>

      {/* Unit toggle */}
      <div className="mx-auto mb-6 flex max-w-[640px] items-center justify-center gap-2">
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${unit === "fahrenheit" ? "bg-[#012A3D] text-white" : "bg-black/5"}`}
          onClick={() => setUnit("fahrenheit")}
        >
          °F
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm font-semibold ${unit === "celsius" ? "bg-[#012A3D] text-white" : "bg-black/5"}`}
          onClick={() => setUnit("celsius")}
        >
          °C
        </button>
      </div>

      {/* Status states */}
      {loading && (
        <div className="mx-auto max-w-[640px] rounded-md border border-black/10 bg-[#F7F8F9] p-4 text-center">
          Fetching local weather…
        </div>
      )}
      {!loading && err && (
        <div className="mx-auto max-w-[640px] rounded-md border border-black/10 bg-[#FDECEC] p-4 text-center text-[#7A1F1F]">
          {err}
        </div>
      )}

      {/* Content */}
      {!loading && !err && data && (
        <div className="mx-auto grid max-w-[960px] grid-cols-1 gap-6 md:grid-cols-3">
          {/* Current conditions card */}
          <section className="rounded-xl border border-black/10 bg-white p-5 md:col-span-1">
            <h2 className="mb-3 text-lg font-bold">Now</h2>
            <div className="flex items-center gap-3">
              <div className="text-4xl">{toEmoji(data?.current?.weather_code)}</div>
              <div>
                <div className="text-3xl font-bold">
                  {Math.round(data?.current?.temperature_2m)}{unitLabel}
                </div>
                {typeof data?.current?.apparent_temperature === "number" && (
                  <div className="text-black/70">
                    Feels like {Math.round(data.current.apparent_temperature)}{unitLabel}
                  </div>
                )}
                {typeof data?.current?.wind_speed_10m === "number" && (
                  <div className="text-black/70">
                    Wind {Math.round(data.current.wind_speed_10m)} {windLabel}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 7-day forecast */}
          <section className="rounded-xl border border-black/10 bg-white p-5 md:col-span-2">
            <h2 className="mb-3 text-lg font-bold">7-Day Outlook</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.isArray(data?.daily?.time) &&
                data.daily.time.map((iso, i) => (
                  <li key={iso} className="rounded-lg bg-[#F7F8F9] p-4">
                    <div className="mb-1 text-sm font-semibold">
                      {new Date(iso).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {toEmoji(data.daily.weather_code?.[i])}
                      </div>
                      <div className="text-sm">
                        <div className="font-semibold">
                          {Math.round(data.daily.temperature_2m_max?.[i])}{unitLabel}
                          <span className="text-black/60">
                            {" "} / {Math.round(data.daily.temperature_2m_min?.[i])}{unitLabel}
                          </span>
                        </div>
                        {typeof data.daily.precipitation_probability_mean?.[i] === "number" && (
                          <div className="text-black/60">
                            Precip: {Math.round(data.daily.precipitation_probability_mean[i])}%
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
