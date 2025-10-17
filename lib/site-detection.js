// lib/site-detection.js
import { headers } from "next/headers";

/**
 * Map hostnames -> site keys used by your API.
 * Fill this out with all 11 domains (apex + www + any subdomains).
 */
const HOST_TO_SITE = {
  // examples (edit these as needed)
  "sandhillspost.com": "sandhills",
  "www.sandhillspost.com": "sandhills",

  "salinapost.com": "salina",
  "www.salinapost.com": "salina",

  "greatbendpost.com": "greatbend",
  "www.greatbendpost.com": "greatbend",

  // local/dev
  "localhost:3000": "sandhills", // dev only — change to whichever market you want while developing
};

/** internal: normalize host */
function normalizeHost(h) {
  return String(h || "").trim().toLowerCase();
}

/** Server-side: async (works in `app`/RSC) */
export async function getCurrentSiteKey() {
  try {
    const h = await headers();
    const host = normalizeHost(h.get("x-forwarded-host") || h.get("host") || "");
    if (HOST_TO_SITE[host]) return HOST_TO_SITE[host];

    // Fallback heuristics: take the registrable (second-level) domain without TLD
    // e.g., "news.example.com" -> "news"; "www.sandhillspost.com" -> "sandhillspost"
    const guess = host.split(":")[0].split(".").filter(Boolean);
    if (guess.length >= 2) return guess[guess.length - 2]; // second-level label
    if (guess.length === 1) return guess[0];
  } catch {}
  // Final fallback for unknown hosts in dev; returns empty string in prod so callers can decide.
  return process.env.NODE_ENV === "development" ? "sandhills" : "";
}

/** Client-side: sync (safe in Client Components) */
export function getSiteKeySync() {
  if (typeof window !== "undefined") {
    const host = normalizeHost(window.location.host);
    if (HOST_TO_SITE[host]) return HOST_TO_SITE[host];
    const guess = host.split(":")[0].split(".").filter(Boolean);
    if (guess.length >= 2) return guess[guess.length - 2];
    if (guess.length === 1) return guess[0];
  }
  return process.env.NODE_ENV === "development" ? "sandhills" : "";
}
