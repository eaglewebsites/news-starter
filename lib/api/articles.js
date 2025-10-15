// lib/articles.js
import "server-only";
import { getApiBase, NO_STORE } from "@/lib/api-base";
import { getCurrentSiteKey } from "@/lib/site-detection";

const BASE = getApiBase();

/**
 * Map raw API article to UI-friendly shape
 */
function mapArticle(raw = {}) {
  const id = raw?.id ?? raw?._id ?? raw?.slug ?? "";
  return {
    id,
    slug: raw?.slug || String(id),
    title: raw?.title || "Untitled",
    dek: raw?.dek || raw?.excerpt || "",
    body: raw?.body || raw?.html || "", // supports HTML body for now
    author: raw?.author || raw?.byline || "",
    updated: raw?.updated || raw?.updated_at || raw?.published_at || null,
    published: raw?.published_at || raw?.created_at || null,
    image: raw?.image || raw?.featured_image || null,
    imageAlt: raw?.image_alt || raw?.featured_image_alt || raw?.title || "",
    imageCaption: raw?.image_caption || raw?.caption || "",
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    category: raw?.category || raw?.primary_category || "",
    site: raw?.site || "",
    canonical: raw?.canonical || raw?.url || "",
    related: Array.isArray(raw?.related)
      ? raw.related.map((r) => ({
          id: r?.id ?? r?._id ?? r?.slug,
          title: r?.title,
          href: r?.href || `/posts/${r?.id ?? r?.slug}`,
          image: r?.image || null,
          updated: r?.updated || r?.published_at || null,
        }))
      : [],
  };
}

/**
 * Fetch a single article by ID (or slug).
 * Note: Pending the final `/post` endpoint shape, this tries both common patterns.
 */
export async function fetchArticleById(id, { debug = false } = {}) {
  const site = (await getCurrentSiteKey()) || "";

  const candidates = [
    `${BASE}/post?id=${encodeURIComponent(id)}&site=${encodeURIComponent(site)}`,
    `${BASE}/posts/${encodeURIComponent(id)}?site=${encodeURIComponent(site)}`,
  ];

  let lastErr;
  for (const url of candidates) {
    try {
      const res = await fetch(url, NO_STORE);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = json?.data || json?.post || json;
      if (!data) throw new Error("Empty article payload");
      const article = mapArticle(data);
      if (debug) console.log("[fetchArticleById]", { url, site, id, have: !!article?.id });
      return article;
    } catch (e) {
      lastErr = e;
      if (debug) console.warn("[fetchArticleById] failed", url, e);
    }
  }
  throw new Error(lastErr?.message || "Article fetch failed");
}

// --- fetchRelated: best-effort related stories by API or tags ---
export async function fetchRelated(articleId, { limit = 6 } = {}) {
  const API_BASE = BASE; // reuse the same resolved base from helper

  // Helper: safe fetch JSON
  async function getJSON(url) {
    const res = await fetch(url, {
      ...NO_STORE,
      headers: { Accept: "application/json", "User-Agent": "EWS-NextApp/1.0 (+related)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  // 1) Try a dedicated related endpoint (both common patterns)
  const candidateUrls = [
    `${API_BASE}/articles/${encodeURIComponent(articleId)}/related`,
    `${API_BASE}/related?articleId=${encodeURIComponent(articleId)}`,
  ];
  for (const url of candidateUrls) {
    try {
      const json = await getJSON(url);
      const list = normalizeRelatedList(json?.data || json || [], { limit });
      if (list.length) return list;
    } catch {
      // try next strategy
    }
  }

  // 2) Fallback: derive related by tags/section
  try {
    const articleJson = await getJSON(`${API_BASE}/articles/${encodeURIComponent(articleId)}`);
    const article = articleJson?.data || articleJson || {};
    const tags = toArray(article.tags).map(String).filter(Boolean);
    const sectionSlug =
      (article.section && (article.section.slug || article.section)) || null;

    const queries = [];
    if (tags.length) {
      queries.push(`${API_BASE}/articles?tag=${encodeURIComponent(tags[0])}&limit=${limit + 1}`);
    }
    if (sectionSlug) {
      queries.push(
        `${API_BASE}/articles?section=${encodeURIComponent(sectionSlug)}&limit=${limit + 1}`
      );
    }
    // Always include a generic latest list as last resort
    queries.push(`${API_BASE}/articles?limit=${limit + 1}`);

    for (const q of queries) {
      try {
        const j = await getJSON(q);
        const list = normalizeRelatedList(j?.data || j || [], { excludeId: articleId, limit });
        if (list.length) return list;
      } catch {
        // try next
      }
    }
  } catch {
    // ignore
  }

  // 3) Nothing found — return empty array
  return [];
}

// --- helpers (local to this module) ---
function toArray(x) {
  return Array.isArray(x) ? x : x ? [x] : [];
}

function normalizeRelatedList(items, { excludeId, limit = 6 } = {}) {
  const out = [];
  for (const it of toArray(items)) {
    const id = it.id || it.uuid || it.slug || it._id || it.guid || null;
    if (excludeId && String(id) === String(excludeId)) continue;

    const title = it.title || it.headline || it.name || it.label || "Untitled";

    const href = it.href || it.url || (id ? `/posts/${id}` : "/");

    const updated =
      it.updated || it.updateDate || it.modified || it.published || it.publishDate || null;

    // image normalization
    const imageSrc =
      it.image?.src ||
      it.imageUrl ||
      it.featuredImage?.src ||
      it.teaserImage?.src ||
      it.thumbnail?.src ||
      it.image ||
      null;

    out.push({
      id,
      title,
      href,
      updated,
      image: imageSrc ? { src: imageSrc, alt: it.image?.alt || it.title || "" } : undefined,
    });

    if (out.length >= limit) break;
  }
  return out;
}
