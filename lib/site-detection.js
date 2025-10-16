// lib/site-detection.js

// NOTE: Do NOT import `headers` at module top in files used by the client bundle.
// We only import it inside an async function that's executed on the server.
let _headers; // lazy import holder

/** Map a hostname to your internal "site key" */
function hostToSiteKey(hostname = "") {
  const h = String(hostname || "").toLowerCase();

  // Example mappings — extend as you add markets.
  if (h.includes("sandhillspost") || h.includes("sandhills")) return "sandhills";
  if (h.includes("salinapost") || h.includes("salina")) return "salina";
  if (h.includes("greatbendpost") || h.includes("greatbend")) return "greatbend";

  // localhost & unknown -> default
  if (h.includes("localhost") || /^[\d.]+(?::\d+)?$/.test(h)) return "sandhills";
  return "sandhills";
}

/** SERVER-ONLY: get hostname via next/headers (must be awaited) */
async function getHostFromHeaders() {
  if (!_headers) {
    // import lazily to avoid bundling into client
    const mod = await import("next/headers");
    _headers = mod.headers;
  }
  const h = await _headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  return host;
}

/** CLIENT-ONLY: get hostname from window */
function getHostFromWindow() {
  try {
    return typeof window !== "undefined" ? window.location.host : "";
  } catch {
    return "";
  }
}

/**
 * getCurrentSiteKey:
 * - On the server, awaits next/headers() correctly.
 * - On the client, uses window.location.
 */
export async function getCurrentSiteKey() {
  // Client bundle path
  if (typeof window !== "undefined") {
    return hostToSiteKey(getHostFromWindow());
  }
  // Server bundle path
  const host = await getHostFromHeaders();
  return hostToSiteKey(host);
}

/** Convenience sync helper for client-only code (falls back to default on server) */
export function getSiteKeySync() {
  return hostToSiteKey(getHostFromWindow());
}
