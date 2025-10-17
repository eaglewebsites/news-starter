// lib/site-detection-server.js
// Do NOT import 'server-only' here. Only import this file from server code (RSC, route handlers, etc).
import { headers } from "next/headers";

/** Map host -> your API "site key". Adjust as you add markets. */
function mapHostToSite(host = "") {
  const h = String(host).toLowerCase();

  // Known production domains
  if (h.includes("salinapost")) return "salina";
  if (h.includes("greatbendpost")) return "greatbend";
  if (h.includes("sandhillspost")) return "sandhills";

  // Local dev
  if (h.startsWith("localhost")) return "sandhills";

  // Render preview or custom envs:
  // If the hostname ends with onrender.com, use an env override if you want,
  // otherwise default to sandhills so menus/content don’t fall back.
  if (h.endsWith(".onrender.com")) {
    return process.env.DEFAULT_SITE_KEY || "sandhills";
  }

  // Final safety net: never return empty — default to sandhills
  return "sandhills";
}

export async function getCurrentSiteKey() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  return mapHostToSite(host);
}
