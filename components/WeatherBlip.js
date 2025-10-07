// components/WeatherBlip.js
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * A small weather pill that:
 * - asks for location permission (browser geolocation)
 * - fetches current temperature from Open-Meteo (°F)
 * - reverse-geocodes to a readable place label (Nominatim), if possible
 * - falls back gracefully (hides if denied/unavailable)
 *
 * Renders nothing until it has something meaningful to show.
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

    // helper: reverse geocode -> human label (optional)
    async function reverseGeocode(lat, lon) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
          lat
        )}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`;
        const res = await fetch(url, {
          signal: ac.signal,
          headers: {
            // Nominatim appreciates a descriptive UA; browsers set one automatically, this is just polite.
          },
        });
        if (!res.ok) return null;
        const data = await res.json();
        // Choose a decent label: city/town/village -> state/region
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

    // helper: fetch current temp in °F
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
        .finally(() => {
          if (mounted) setReady(true);
        });
    }

    function onGeoError() {
      // If denied/unavailable, just mark ready without data (component renders nothing)
      setReady(true);
    }

    // Ask for geolocation with a sensible timeout
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError, {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000, // up to 5 minutes cached
      });
    } else {
      setReady(true);
    }

    return () => {
      mounted = false;
      ac.abort();
    };
  }, []);

  // Render nothing until we have something to show (or we’re sure we don’t)
  if (!ready || (tempF == null && !label)) return null;

  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/15",
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
