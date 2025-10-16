// lib/api-base.js
export function getApiBase() {
  const env = (typeof process !== "undefined" && process.env) ? process.env : {};

  const base =
    env.NEXT_PUBLIC_EAGLE_BASE_API ?? // client-safe (and also available on server)
    env.EAGLE_BASE_API ??             // server-only
    "https://api.eaglewebservices.com/v3";

  const normalized = String(base).trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error(`[api-base] Invalid base URL: "${base}". Expected e.g. https://api.eaglewebservices.com/v3`);
  }
  return normalized;
}

export const NO_STORE = { cache: "no-store" };
