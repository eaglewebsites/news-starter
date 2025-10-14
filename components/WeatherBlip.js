// components/WeatherBlip.js
"use client";

import Link from "@/components/SafeLink";
import { useEffect, useRef, useState } from "react";

/**
 * Weather pill with reserved space to prevent layout shift.
 * - Shows a subtle placeholder pill until ready (prevents header jump)
 * - Geolocates, fetches Open-Meteo temp (°F), optional reverse geocode label
 */
export default function WeatherBlip({ href = "/weather", className = "" }) {
  const [tempF, setTempF] = useState(null);
  const [label, setLabel] = useState(null);
  const [ready, setReady] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const ac = new AbortController();
    abortRef.current = ac;

    async function reverseGeocode(lat, lon) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
          lat
        )}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`;
        const res = await fetch(url, { signal: ac.signal });
        if (!res.ok) return null;
        const data = await res.json();
        const a = data.address || {};
        const city =
          a.city ||
          a.town ||
          a.village ||
          a.hamlet ||
          a.county ||
          a.suburb ||
          a.municipality ||
          null;
        const region = a.state || a.region || a.province || a.country_code?.toUpperCase() || "";
        if (city && region) return `${city}, ${region}`;
        if (city) return city;
        return data.name || null;
      } catch {
        return null;
      }
    }

    async function fetchTemp(lat, lon) {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
        lat
      )}&longitude=${encodeURIComponent(
        lon
      )}&current=temperature_2m&temperature_unit=fahrenheit&timezone=auto`;
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) throw new Error("weather fetch failed");
      const data = await res.json();
      const t = data?.current?.temperature_2m;
      if (typeof t === "number") return t;
      throw new Error("no temperature");
    }

    function onGeoSuccess(pos) {
      const { latitude, longitude } = pos.coords || {};
      if (latitude == null || longitude == null) {
        setReady(true);
        return;
      }
      Promise.allSettled([fetchTemp(latitude, longitude), reverseGeocode(latitude, longitude)])
        .then(([tRes, gRes]) => {
          if (!mounted) return;
          if (tRes.status === "fulfilled") setTempF(Math.round(tRes.value));
          if (gRes.status === "fulfilled" && gRes.value) setLabel(gRes.value);
        })
        .finally(() => mounted && setReady(true));
    }

    function onGeoError() {
      setReady(true);
    }

    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError, {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000,
      });
    } else {
      setReady(true);
    }

    return () => {
      mounted = false;
      ac.abort();
    };
  }, []);

  // Placeholder pill to reserve space (prevents header shift)
  const Placeholder = (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold",
        "min-w-[140px]", // reserve typical width
        "opacity-60 animate-pulse",
        className,
      ].join(" ")}
      aria-hidden="true"
    >
      <span className="inline-block h-4 w-4 rounded-full bg-white/30" />
      <span className="w-20 rounded bg-white/20">&nbsp;</span>
    </div>
  );

  if (!ready) return Placeholder;
  if (tempF == null && !label) return null;

  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/15",
        "min-w-[140px]", // keep width stable even after load
        className,
      ].join(" ")}
      title="Weather"
    >
      {/* Cloud icon (white stroke) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          d="M17 16a4 4 0 0 0 0-8 5 5 0 0 0-9.584-1.002A4 4 0 0 0 7 16h10z"
          strokeLinejoin="round"
        />
      </svg>
      <span className="whitespace-nowrap">
        {tempF != null ? `${tempF}°F` : "—"}
        {label ? ` • ${label}` : ""}
      </span>
    </Link>
  );
}
