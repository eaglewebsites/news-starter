// lib/api/categories.js
import { getCurrentSiteKey } from "@/lib/site-detection";

/** Eagle API base (env override allowed) */
const EAGLE_API_BASE =
  (process.env.NEXT_PUBLIC_EAGLE_API_BASE || "https://api.eaglewebservices.com/v3").replace(
    /\/+$/,
    ""
  );

/** Title-case "local-news" => "Local News" */
function toTitle(s = "") {
  return String(s)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

/** Slugify in a forgiving way: "Local News" -> "local-news" */
function slugify(x = "") {
  let s = String(x).toLowerCase().trim();
  s = s.replace(/&/g, " and ");
  s = s.replace(/['’]/g, "");
  s = s.replace(/[^a-z0-9]+/g, "-");
  s = s.replace(/^-+|-+$/g, "");
  return s;
}

/** Best-effort JSON fetch with logging */
async function getJSON(url, init = {}) {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "EWS-NextApp/1.0 (+category)",
      },
      ...init,
    });
    const ct = res.headers.get("content-type") || "";
    const isJSON = ct.includes("application/json");
    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[category] GET", res.status, url, "ct=" + ct, "json=" + isJSON);
      }
      return null;
    }
    if (!isJSON) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[category] 200 but not JSON:", url, "ct=" + ct);
      }
      return null;
    }
    const json = await res.json();
    if (process.env.NODE_ENV !== "production") {
      console.log("[category] HIT", url);
    }
    return json;
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[category] fetch error:", url, e);
    }
    return null;
  }
}

/** Map siteKey -> public host */
function siteBaseFromKey(siteKey) {
  const map = {
    sandhills: "https://sandhillspost.com",
    salina: "https://salinapost.com",
    northplatte: "https://northplattepost.com",
  };
  return map[siteKey] || `https://${siteKey}post.com`;
}

/** Date helpers */
function epoch(d) {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
}
function bestDate(p = {}) {
  return (
    epoch(p.published) ||
    epoch(p.updated) ||
    epoch(p.created_at) ||
    epoch(p.updated_at) ||
    epoch(p.date) ||
    0
  );
}

/** Extract categories of many shapes => flat string array */
function extractCategories(p = {}) {
  const possible = [p.categories, p.category, p.section, p.sections, p.tags];
  const out = [];
  for (const v of possible) {
    if (!v) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (!item) continue;
        if (typeof item === "string") out.push(item);
        else if (typeof item === "object") out.push(item.slug || item.name || item.title || "");
      }
    } else if (typeof v === "string") {
      out.push(v);
    } else if (typeof v === "object") {
      out.push(v.slug || v.name || v.title || "");
    }
  }
  return out.filter(Boolean);
}

const CATEGORY_ALIASES = {
  local: ["local", "local-news", "news", "local news"],
  sports: ["sports", "sport"],
  obituaries: ["obituaries", "obits"],
};

/** strict-ish category check using slug + aliases */
function matchesCategoryStrict(p = {}, wantedSlug = "") {
  if (!wantedSlug) return true;
  const want = slugify(wantedSlug);
  const candidates = new Set([want, ...(CATEGORY_ALIASES[want] || []).map(slugify)]);
  const cats = extractCategories(p).map(slugify);
  return cats.some((c) => {
    for (const token of candidates) {
      if (c === token || c.includes(token) || token.includes(c)) return true;
    }
    return false;
  });
}

/** site filter (if post lists sites) */
function matchesSite(p = {}, siteKey = "") {
  if (!siteKey) return true;
  const s = p.sites;
  if (!s) return true;
  if (Array.isArray(s)) {
    return s.map((v) => String(v).toLowerCase()).includes(siteKey.toLowerCase());
  }
  if (typeof s === "string") {
    return String(s).toLowerCase() === siteKey.toLowerCase();
  }
  return true;
}

/** Normalize post-like objects */
function normalizePost(p = {}) {
  const id = p.id || p.uuid || p.slug || p._id || String(Math.random());
  const href =
    p.href || p.url || (p.slug ? `/posts/${p.slug}` : p.id ? `/posts/${p.id}` : "#");

  const title = p.title || p.headline || "Untitled";
  const image =
    p.featured_image ||
    p.image?.src ||
    p.featuredImage?.src ||
    p.thumb ||
    p.thumbnail ||
    null;

  const updated =
    p.published || p.updated || p.created_at || p.updated_at || p.date || null;

  return { id, href, title, image, updated };
}

function extractArray(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;            // <— support top-level arrays
  if (Array.isArray(obj.posts)) return obj.posts;
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.data)) return obj.data;
  const k = Object.keys(obj).find((x) => Array.isArray(obj[x]));
  return k ? obj[k] : [];
}

/** DEBUG: pretty-print category-ish fields for a few posts */
function debugPrintCategories(label, arr = []) {
  if (process.env.NODE_ENV === "production") return;
  console.log(`[category][debug] ${label}: got ${arr.length} posts`);
  arr.slice(0, 8).forEach((p, i) => {
    console.log(
      `[category][debug] #${i + 1} id=${p.id || p.slug || "(no id)"} title="${(p.title || "").slice(0, 60)}"`
    );
    console.log("  categories:", p.categories);
    console.log("  category:", p.category);
    console.log("  section:", p.section);
    console.log("  sections:", p.sections);
    console.log("  tags:", p.tags);
    console.log("  sites:", p.sites);
  });
}

/**
 * Fetch posts for a category slug.
 * Flow:
 *  1) Try on-site JSON (usually HTML, but harmless).
 *  2) Try Eagle API scoped by categories= and sections= using EAGLE_API_BASE.
 *  3) STRICT FILTER (site + category aliases/partials).
 *  4) IF 0 => BROAD site-wide fetch and re-filter locally.
 *  5) If still 0 and slug === "local", accept UNCATEGORIZED + explicit "news"/"local".
 *  6) If still 0, FINAL FALLBACK: return latest site posts (so page never empty).
 */
export async function fetchCategoryPosts(slug, { limit = 24, offset = 0 } = {}) {
  const siteKey = await getCurrentSiteKey();
  const base = siteBaseFromKey(siteKey);

  // 1) public-site attempts (likely not JSON)
  const attempts = [
    `${base}/category/${encodeURIComponent(slug)}.json`,
    `${base}/category/${encodeURIComponent(slug)}?format=json`,
    `${base}/api/category/${encodeURIComponent(slug)}`,
  ];

  let data = null;
  for (const url of attempts) {
    data = await getJSON(url);
    if (data) break;
    if (process.env.NODE_ENV !== "production") console.log("[category] miss", url);
  }

  // 2) targeted Eagle calls — switch to sites= and categories= (plural)
  let raw = extractArray(data);
  if (raw.length === 0) {
    const page = 1;
    const lim = Math.max(limit, 24);

    const targeted = [
      // Primary (matches legacy app): categories (plural) + sites + public + status
      `${EAGLE_API_BASE}/posts?sites=${encodeURIComponent(siteKey)}&categories=${encodeURIComponent(
        slug
      )}&public=true&status=published&limit=${lim}&page=${page}`,
      // Secondary: sections (plural) — some installs use sections instead of categories
      `${EAGLE_API_BASE}/posts?sites=${encodeURIComponent(siteKey)}&sections=${encodeURIComponent(
        slug
      )}&public=true&status=published&limit=${lim}&page=${page}`,
    ];

    for (const url of targeted) {
      if (process.env.NODE_ENV !== "production") console.log("[category] FETCH", url);
      const d = await getJSON(url);
      if (!d) {
        if (process.env.NODE_ENV !== "production") console.log("[category] miss", url);
        continue;
      }
      const arr = extractArray(d);
      if (arr.length) {
        raw = arr;
        break;
      }
    }
  }

  debugPrintCategories("targeted feed", raw);

  // 3) strict filter on whatever raw we have
  let filtered = raw.filter((p) => matchesSite(p, siteKey)).filter((p) => matchesCategoryStrict(p, slug));

  // 4) If still 0, ALWAYS fetch broad site feed and re-filter
  if (filtered.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[category] 0 strict matches on targeted feed. Broad fetch…");
    }

    const broadUrl = `${EAGLE_API_BASE}/posts?sites=${encodeURIComponent(
      siteKey
    )}&public=true&status=published&limit=200&page=1`;

    const broad = await getJSON(broadUrl);
    const broadRaw = extractArray(broad);

    debugPrintCategories("broad feed", broadRaw);

    // re-apply strict on broad
    filtered = broadRaw
      .filter((p) => matchesSite(p, siteKey))
      .filter((p) => matchesCategoryStrict(p, slug));

    // 5) If still 0 and slug === "local", accept UNCATEGORIZED + explicit "news"/"local"
    if (filtered.length === 0 && slugify(slug) === "local") {
      const wantSet = new Set(["local", "local-news", "news"]);
      filtered = broadRaw
        .filter((p) => matchesSite(p, siteKey))
        .filter((p) => {
          const cats = extractCategories(p).map(slugify);
          if (cats.length === 0) return true; // uncategorized => treat as Local
          return cats.some((c) => wantSet.has(c));
        });
      if (process.env.NODE_ENV !== "production") {
        console.warn("[category] using 'local' fallback on broad feed. Count:", filtered.length);
      }
    }

    // 6) FINAL FALLBACK: still 0? show latest site posts so page isn't empty
    if (filtered.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[category] final fallback: showing latest site posts (no category filter).");
      }
      filtered = broadRaw.filter((p) => matchesSite(p, siteKey));
    }
  }

  // sort newest-first
  filtered.sort((a, b) => bestDate(b) - bestDate(a));
  const items = limit || limit === 0 ? filtered.slice(0, limit) : filtered;

  if (process.env.NODE_ENV !== "production") {
    console.log("[category] final items:", items.length, "slug=", slug);
  }

  return {
    slug,
    label: toTitle(slug),
    items: items.map(normalizePost),
  };
}
