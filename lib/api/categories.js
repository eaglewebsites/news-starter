// lib/menu-api.js
import "server-only";
import { getCurrentSiteKey } from "@/lib/site-detection-server";

/** Base API (override via EAGLE_BASE_API / NEXT_PUBLIC_EAGLE_BASE_API) */
const API_BASE =
  (process.env.EAGLE_BASE_API || process.env.NEXT_PUBLIC_EAGLE_BASE_API || "https://api.eaglewebservices.com/v3").replace(/\/+$/, "");

/** Safe fallback so the UI never renders an empty menu */
const FALLBACK_MENU = {
  links: [
    { title: "Local", link: "/section/local" },
    { title: "Sports", link: "/section/sports" },
    { title: "Obituaries", link: "/section/obituaries" },
    { title: "Opinion", link: "/section/opinion" },
    { title: "Weather", link: "/section/weather" },
  ],
};

/**
 * Remove only the contaminant domain "sandhillspost.dev".
 * Leaves ALL other external domains intact (e.g., weather.com).
 */
function stripDevDomain(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/https?:\/\/sandhillspost\.dev/gi, "")
    .replace(/sandhillspost\.dev/gi, "");
}

/** Pick a usable link field and clean the contaminant domain */
function pickLink(hrefish) {
  if (typeof hrefish === "string" && hrefish.trim()) return stripDevDomain(hrefish.trim());
  return "/";
}

/** Collect sublinks from many possible shapes and normalize them recursively */
function collectSublinks(raw = {}) {
  const directArrays = [
    raw.sublinks, raw.subLinks, raw.children, raw.links, raw.items,
    raw.submenu, raw.subMenu, raw.menuItems, raw.subnav, raw.subNav,
  ].filter(Array.isArray);

  const nestedArrays = [
    raw?.submenu?.links, raw?.submenu?.items,
    raw?.subMenu?.links, raw?.subMenu?.items,
    raw?.children?.links, raw?.children?.items,
    raw?.subnav?.links, raw?.subnav?.items,
    raw?.subNav?.links, raw?.subNav?.items,
  ].filter(Array.isArray);

  const merged = [];
  for (const arr of [...directArrays, ...nestedArrays]) {
    if (Array.isArray(arr) && arr.length) merged.push(...arr);
  }

  return merged.map(normalizeItem);
}

/** Normalize a single menu item into a stable shape */
function normalizeItem(link = {}) {
  const title =
    link.title || link.label || link.name || link.text || "";

  const linkField =
    link.link ?? link.href ?? link.url ?? link.path ?? "/";

  const item = {
    title,
    link: pickLink(linkField),
    external: !!link.external,
    target: link.target || undefined,
  };

  const sublinks = collectSublinks(link);
  if (sublinks.length) item.sublinks = sublinks;

  return item;
}

/**
 * Fetch the site menu from the Eagle API; if siteKey is falsy we request without ?site=
 */
export async function fetchSiteMenu(siteKey) {
  const detected = siteKey ?? (await getCurrentSiteKey()) ?? "";
  const qp = detected ? `?site=${encodeURIComponent(detected)}` : "";
  const url = `${API_BASE}/menus${qp}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "EWS-NextApp/1.0 (+menu-fetch)" },
    });

    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[menu] non-200:", res.status, await res.text());
      }
      return FALLBACK_MENU;
    }

    const json = await res.json();
    const rawLinks = json?.data?.[0]?.links ?? [];

    if (Array.isArray(rawLinks) && rawLinks.length > 0) {
      const links = rawLinks.map(normalizeItem);
      return { links };
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[menu] fetch error", err);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn("[menu] using FALLBACK_MENU");
  }
  return FALLBACK_MENU;
}

// Optional helpers export for testing
export const __menuHelpers = {
  stripDevDomain,
  pickLink,
  normalizeItem,
  collectSublinks,
  FALLBACK_MENU,
  API_BASE,
};
