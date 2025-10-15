// lib/api-base.js
export function getApiBase() {
  const env = (typeof process !== "undefined" && process.env) ? process.env : {};

  // Soft warning if legacy vars still exist (dev only)
  if ((env.NEXT_PUBLIC_EAGLE_API_BASE || env.EAGLE_API_BASE) && env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(
      "[api-base] Legacy env detected (NEXT_PUBLIC_EAGLE_API_BASE / EAGLE_API_BASE). " +
      "Please remove them; using EAGLE_BASE_API / NEXT_PUBLIC_EAGLE_BASE_API."
    );
  }

  const base =
    env.NEXT_PUBLIC_EAGLE_BASE_API ??
    env.EAGLE_BASE_API ??
    "https://api.eaglewebservices.com/v3";

  const normalized = String(base).trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error(`[api-base] Invalid base URL: "${base}". Expected e.g. https://api.eaglewebservices.com/v3`);
  }
  return normalized;
}

export const NO_STORE = { cache: "no-store" };
