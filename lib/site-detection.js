// lib/site-detection.js
// Safe for BOTH client and server. No top-level import of next/headers.

/** Map a hostname to your internal "site key". Adjust as needed. */
export function mapHostToSiteKey(hostname = "") {
  const h = String(hostname).toLowerCase();

  // examples — tweak to your 11 markets
  if (h.includes("salina")) return "salina";
  if (h.includes("greatbend")) return "greatbend";
  if (h.includes("hays")) return "hays";
  if (h.includes("sandhill")) return "sandhills";

  // localhost/dev domains can default to sandhills (or read from ENV if you want)
  if (h.includes("localhost") || h.includes("127.0.0.1")) return "sandhills";

  // fallback
  return "sandhills";
}

/**
 * Get the current site key from the request host (server) or window.location (client).
 * - On the client: uses window.location.hostname
 * - On the server: dynamically imports next/headers and reads request headers
 */
export async function getCurrentSiteKey() {
  // Client path
  if (typeof window !== "undefined") {
    try {
      return mapHostToSiteKey(window.location.hostname);
    } catch {
      return "sandhills";
    }
  }

  // Server path (no top-level import to keep client bundles clean)
  try {
    const { headers } = await import("next/headers");
    const h = headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "";
    return mapHostToSiteKey(host);
  } catch {
    return "sandhills";
  }
}
