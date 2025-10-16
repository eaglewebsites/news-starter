// lib/menu-api.js
import "server-only";
import { getApiBase } from "./api-base";

/** Base API */
const API_BASE = getApiBase();

/** Alternate site params the API accepts (keep/tweak as needed) */
const SITE_PARAM = {
  sandhills: ["sandhills", "sandhillspost"],
};

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

function stripDevDomain(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/https?:\/\/sandhillspost\.dev/gi, "")
    .replace(/sandhillspost\.dev/gi, "");
}

function pickLink(hrefish) {
  if (typeof hrefish === "string" && hrefish.trim()) return stripDevDomain(hrefish.trim());
  return "/";
}

function collectSublinks(raw = {}) {
  const direct = [
    raw.sublinks, raw.subLinks, raw.children, raw.links, raw.items,
    raw.submenu, raw.subMenu, raw.menuItems, raw.subnav, raw.subNav,
  ].filter(Array.isArray);

  const nested = [
    raw?.submenu?.links, raw?.submenu?.items,
    raw?.subMenu?.links, raw?.subMenu?.items,
    raw?.children?.links, raw?.children?.items,
    raw?.subnav?.links, raw?.subnav?.items,
    raw?.subNav?.links, raw?.subNav?.items,
  ].filter(Array.isArray);

  const merged = [];
  for (const arr of [...direct, ...nested]) {
    if (arr?.length) merged.push(...arr);
  }
  return merged.map(normalizeItem);
}

function normalizeItem(link = {}) {
  const title = link.title || link.label || link.name || link.text || "";
  const linkField = link.link ?? link.href ?? link.url ?? link.path ?? "/";

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

export async function fetchSiteMenu(siteKey = "sandhills") {
  const candidates = SITE_PARAM[siteKey] || [siteKey];

  for (const siteParam of candidates) {
    const url = `${API_BASE}/menus?site=${encodeURIComponent(siteParam)}`;
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "EWS-NextApp/1.0 (+menu-fetch)",
        },
      });

      if (!res.ok) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[menu] non-200:", res.status, await res.text());
        }
        continue;
      }

      const json = await res.json();
      const rawLinks = json?.data?.[0]?.links ?? [];

      if (Array.isArray(rawLinks) && rawLinks.length > 0) {
        const links = rawLinks.map(normalizeItem);
        return { links };
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[menu] fetch error for", siteParam, err);
      }
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn("[menu] using FALLBACK_MENU");
  }
  return FALLBACK_MENU;
}

export const __menuHelpers = {
  stripDevDomain,
  pickLink,
  normalizeItem,
  collectSublinks,
  SITE_PARAM,
  FALLBACK_MENU,
  API_BASE,
};
