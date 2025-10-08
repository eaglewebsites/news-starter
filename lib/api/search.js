// lib/api/search.js
import { getCurrentSiteKey } from "@/lib/site-detection";

const LOCAL_BASE = "https://{site}/search";
const LOCAL_API  = "https://{site}/api/search";
const EAGLE_BASE = "https://api.eaglewebservices.com/v3";

/* ---------- helpers ---------- */
function htmlToText(html = "", maxLen = 220) {
  try {
    let t = String(html).replace(/<[^>]*>/g, " ");
    t = t
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    t = t.replace(/\s+/g, " ").trim();
    if (t.length > maxLen) t = t.slice(0, maxLen - 1).trimEnd() + "…";
    return t;
  } catch {
    return "";
  }
}

// Fetch text; try JSON; if not JSON, try to extract a posts array from HTML.
async function fetchSmart(url, headers) {
  try {
    const res = await fetch(url, { cache: "no-store", headers });
    const text = await res.text();

    // Try direct JSON
    try {
      const json = JSON.parse(text);
      return { ok: res.ok, status: res.status, json, url };
    } catch {
      // Not JSON — try to extract "posts":[ ... ] from HTML/text
      const posts = extractPostsArrayFromText(text);
      if (posts) {
        return { ok: res.ok, status: res.status, json: { posts }, url };
      }
      return { ok: res.ok, status: res.status, json: null, url };
    }
  } catch (err) {
    return { ok: false, status: 0, json: null, url, err };
  }
}

// Heuristic: find `"posts": [ ... ]` even inside HTML.
// Not a perfect parser, but works for many SSR pages that embed JSON.
function extractPostsArrayFromText(text) {
  try {
    const keyIdx = text.indexOf('"posts"');
    if (keyIdx === -1) return null;

    // Find the first '[' after "posts"
    const bracketStart = text.indexOf("[", keyIdx);
    if (bracketStart === -1) return null;

    // Walk forward to find the matching closing ']'
    let depth = 0;
    for (let i = bracketStart; i < text.length; i++) {
      const ch = text[i];
      if (ch === "[") depth++;
      else if (ch === "]") {
        depth--;
        if (depth === 0) {
          const arrText = text.slice(bracketStart, i + 1);
          try {
            const arr = JSON.parse(arrText);
            return Array.isArray(arr) ? arr : null;
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

function normalizePosts(arr) {
  return arr.map((r, idx) => {
    const id = r.id ?? r.uuid ?? r._id ?? String(idx);
    const href = `/posts/${id}`; // using ID route per your sample
    const title = r.title || "Untitled";
    const updated = r.updated_at || r.published || r.created_at || r.date || null;
    const image =
      r.featured_image_thumbnail ||
      r.featured_image ||
      r.image?.src ||
      r.image ||
      r.thumbnail?.src ||
      r.thumbnail ||
      null;
    const snippet = r.snippet || r.excerpt || r.summary || (r.body ? htmlToText(r.body, 220) : "");

    return { id: String(id), href, title, updated, image, snippet };
  });
}

/* ---------- main ---------- */
export async function searchArticles(term) {
  if (!term || typeof term !== "string") return [];

  const siteKey = (await getCurrentSiteKey()) || "sandhills";
  const localBase = LOCAL_BASE.replace("{site}", `${siteKey}post.com`);
  const localApi  = LOCAL_API.replace("{site}", `${siteKey}post.com`);

  // Try a wide set of permutations (local first, then Eagle)
  const attempts = [
    // Local page variants
    { who: "local?search", url: `${localBase}?search=${encodeURIComponent(term)}`,         hdr: "local" },
    { who: "local?q",      url: `${localBase}?q=${encodeURIComponent(term)}`,              hdr: "local" },
    { who: "local?search&format=json", url: `${localBase}?search=${encodeURIComponent(term)}&format=json`, hdr: "local" },
    { who: "local?search&json=1",      url: `${localBase}?search=${encodeURIComponent(term)}&json=1`,      hdr: "local" },

    // Local /api variants
    { who: "localAPI?search", url: `${localApi}?search=${encodeURIComponent(term)}`,       hdr: "local" },
    { who: "localAPI?q",      url: `${localApi}?q=${encodeURIComponent(term)}`,            hdr: "local" },

    // Eagle variants
    { who: "eagle /v3/search?search", url: `${EAGLE_BASE}/search?search=${encodeURIComponent(term)}&site=${encodeURIComponent(siteKey)}`, hdr: "eagle" },
    { who: "eagle /v3/search?q",      url: `${EAGLE_BASE}/search?q=${encodeURIComponent(term)}&site=${encodeURIComponent(siteKey)}`,      hdr: "eagle" },
    { who: "eagle /v3/search/posts?search", url: `${EAGLE_BASE}/search/posts?search=${encodeURIComponent(term)}&site=${encodeURIComponent(siteKey)}`, hdr: "eagle" },
    { who: "eagle /v3/search/posts?q",      url: `${EAGLE_BASE}/search/posts?q=${encodeURIComponent(term)}&site=${encodeURIComponent(siteKey)}`,      hdr: "eagle" },
  ];

  const headers = {
    local: {    Accept: "application/json", "User-Agent": "EWS-NextApp/1.0 (+search-local)" },
    eagle: {    Accept: "application/json", "User-Agent": "EWS-NextApp/1.0 (+search-fallback)" },
  };

  for (const a of attempts) {
    const { ok, json, status, url } = await fetchSmart(a.url, headers[a.hdr]);

    // Prefer explicit posts array, else common containers
    let posts = Array.isArray(json?.posts)
      ? json.posts
      : Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.results)
      ? json.results
      : Array.isArray(json)
      ? json
      : [];

    if (posts.length > 0) {
      console.log(`[search] using ${a.who} (${status}) — ${posts.length} item(s) from ${url}`);
      return normalizePosts(posts);
    }

    if (!ok) {
      console.warn(`[search] ${a.who} HTTP ${status} — trying next`);
    } else if (!json) {
      console.warn(`[search] ${a.who} returned non-JSON — trying next`);
    } else {
      console.warn(`[search] ${a.who} had 0 items — keys: ${Object.keys(json)}`);
    }
  }

  console.warn("[search] all attempts returned 0 items");
  return [];
}
