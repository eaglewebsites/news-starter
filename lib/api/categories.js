// lib/api/categories.js
import { getCurrentSiteKey } from "@/lib/site-detection";

const NO_STORE = { cache: "no-store" };
const DEBUG = false; // set true only if needed

function getApiBase() {
  const fromEnv = process.env.EAGLE_API_BASE;
  const base = (fromEnv && String(fromEnv).trim()) || "https://api.eaglewebservices.com/v3";
  const normalized = base.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error(`[EAGLE_API_BASE] Invalid value: "${fromEnv}".`);
  }
  return normalized;
}

function extractArray(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.posts)) return data.posts;
  if (data.data && Array.isArray(data.data.items)) return data.data.items;
  if (data.data && Array.isArray(data.data)) return data.data;
  return [];
}

function deriveSlugFromLinks(p) {
  const link = p.href || p.url || p.link || p.permalink || p.web_url || p.webUrl || p.perma_link || "";
  if (typeof link !== "string" || !link) return "";
  try {
    const u = new URL(link);
    const idx = u.pathname.toLowerCase().indexOf("/posts/");
    if (idx >= 0) {
      const rest = u.pathname.slice(idx + "/posts/".length);
      const seg = rest.split("/").filter(Boolean)[0];
      if (seg) return decodeURIComponent(seg);
    }
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length > 0) return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    const path = String(link || "").trim();
    const idx2 = path.toLowerCase().indexOf("/posts/");
    if (idx2 >= 0) {
      const rest = path.slice(idx2 + "/posts/".length);
      const seg = rest.split("/").filter(Boolean)[0];
      if (seg) return decodeURIComponent(seg);
    }
    const parts = path.split("/").filter(Boolean);
    if (parts.length > 0) return decodeURIComponent(parts[parts.length - 1]);
  }
  return "";
}

function slugifyTitle(title) {
  if (!title) return "";
  return String(title)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function internalHref(p) {
  const id = p.id || p.post_id || p.uuid || p.guid;
  if (id) return `/posts/${encodeURIComponent(String(id))}`;

  const slug = p.slug || p.post_slug || p.seo_slug || "";
  const derived = deriveSlugFromLinks(p);
  const titleSlug = slugifyTitle(p.title || p.post_title);
  const seg = (slug && String(slug)) || (derived && String(derived)) || (titleSlug && String(titleSlug)) || "";
  return seg ? `/posts/${encodeURIComponent(seg)}` : "#";
}

function normalizePost(p) {
  const explicitSlug = p.slug || p.post_slug || p.seo_slug;
  const derivedSlug = deriveSlugFromLinks(p);
  const titleSlug = slugifyTitle(p.title || p.post_title);
  const idForKey = p.id ?? p.post_id ?? p.uuid ?? p.guid ?? explicitSlug ?? derivedSlug ?? titleSlug ?? tmpId();

  return {
    id: idForKey,
    href: internalHref(p),
    title: p.title ?? p.post_title ?? "Untitled",
    image: p.image ?? p.featured_image ?? p.image_url ?? null,
    updated: p.updated ?? p.updated_at ?? p.published_at ?? null,
  };
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = item.id || item.href || item.title;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function tmpId() {
  return "tmp_" + Math.random().toString(36).slice(2);
}

export async function fetchCategoryPosts({
  slug,
  limit = 24,
  offset = 0,
  site,
} = {}) {
  if (!slug) throw new Error("[category] Missing required param: slug");

  const siteKey = (site ?? (await getCurrentSiteKey()) ?? "sandhills").toLowerCase();
  const BASE = getApiBase();

  const url =
    `${BASE}/posts?` +
    `categories=${encodeURIComponent(slug)}` +
    `&public=true` +
    `&sites=${encodeURIComponent(siteKey)}` +
    `&status=published` +
    `&limit=${limit}` +
    `&offset=${offset}`;

  if (DEBUG) console.log("[category][fetch]", url);

  const res = await fetch(url, NO_STORE);
  if (!res.ok) throw new Error(`[category] fetch failed ${res.status} ${res.statusText}`);

  const raw = await res.json();
  const arr = extractArray(raw).map((p) => normalizePost(p));
  return dedupe(arr);
}
