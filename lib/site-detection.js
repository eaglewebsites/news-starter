// lib/site-detection.js
import { headers } from "next/headers";
import { SITES } from "./sites";

// Always returns a lowercase site key like "sandhills"
export async function getCurrentSiteKey() {
  try {
    // ✅ Next 15: must await headers()
    const h = await headers();
    const host = (h.get("x-forwarded-host") || h.get("host") || "").toLowerCase();

    // Try to match against your configured domains
    for (const [key, cfg] of Object.entries(SITES)) {
      if (Array.isArray(cfg.domains) && cfg.domains.some((d) => host.includes(d))) {
        return key;
      }
    }
  } catch (err) {
    console.warn("[getCurrentSiteKey] headers() not available, falling back. Error:", err);
  }

  // Fallback to the first site (or hardcode "sandhills" if you prefer)
  return Object.keys(SITES)[0] || "sandhills";
}



