// lib/api-base.js
export function getApiBase() {
  // Order: explicit client → explicit server → legacy client → legacy server → default
  const base =
    process.env.NEXT_PUBLIC_EAGLE_BASE_API ??
    process.env.EAGLE_BASE_API ??
    process.env.NEXT_PUBLIC_EAGLE_API_BASE ??
    process.env.EAGLE_API_BASE ??
    "https://api.eaglewebservices.com/v3";

  return base.replace(/\/+$/, ""); // strip trailing slash
}

export const NO_STORE = { cache: "no-store" };
