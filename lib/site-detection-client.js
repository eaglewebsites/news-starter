// lib/site-detection-client.js
'use client';

/** Client-side host -> site key mapping (used by client components only). */
function mapHostToSite(host = "") {
  const h = String(host).toLowerCase();

  if (h.includes("salinapost")) return "salina";
  if (h.includes("greatbendpost")) return "greatbend";
  if (h.includes("sandhillspost")) return "sandhills";

  if (h.startsWith("localhost")) return "sandhills";
  if (h.endsWith(".onrender.com")) {
    // Client doesn’t read server envs; if you want a different default for previews,
    // you can expose one via NEXT_PUBLIC_DEFAULT_SITE_KEY. Otherwise use sandhills.
    return process.env.NEXT_PUBLIC_DEFAULT_SITE_KEY || "sandhills";
  }

  return "sandhills"; // never return empty so the UI doesn’t fall back
}

/** Synchronous client-side lookup (safe in Client Components). */
export function getSiteKeySync() {
  if (typeof window === "undefined") return "sandhills";
  return mapHostToSite(window.location.host || "");
}
