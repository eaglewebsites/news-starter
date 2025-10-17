// lib/api/articles.js
import "server-only";
import { getCurrentSiteKey } from '@/lib/site-detection-server'
import { getApiBase, NO_STORE } from "../api-base";

const BASE = getApiBase();

function mapArticle(raw = {}) {
  const id = raw?.id ?? raw?._id ?? raw?.slug ?? "";
  return {
    id,
    slug: raw?.slug || String(id),
    title: raw?.title || "Untitled",
    dek: raw?.dek || raw?.excerpt || "",
    body: raw?.body || raw?.html || "",
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

export async function fetchRelated(articleId, { limit = 6 } = {}) {
  const API_BASE = getApiBase();

  async function getJSON(url) {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "EWS-NextApp/1.0 (+related)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  }

  const candidateUrls = [
    `${API_BASE}/articles/${encodeURIComponent(articleId)}/related`,
    `${API_BASE}/related?articleId=${encodeURIComponent(articleId)}`,
  ];
  for (const url of candidateUrls) {
    try {
      const json = await getJSON(url);
      const list = normalizeRelatedList(json?.data || json || [], { limit });
      if (list.length) return list;
    } catch (_) {}
  }

  try {
    const articleJson = await getJSON(`${API_BASE}/articles/${encodeURIComponent(articleId)}`);
    const article = articleJson?.data || articleJson || {};
    const tags = toArray(article.tags).map(String).filter(Boolean);
    const sectionSlug = (article.section && (article.section.slug || article.section)) || null;

    const queries = [];
    if (tags.length) {
      queries.push(`${API_BASE}/articles?tag=${encodeURIComponent(tags[0])}&limit=${limit + 1}`);
    }
    if (sectionSlug) {
      queries.push(`${API_BASE}/articles?section=${encodeURIComponent(sectionSlug)}&limit=${limit + 1}`);
    }
    queries.push(`${API_BASE}/articles?limit=${limit + 1}`);

    for (const q of queries) {
      try {
        const j = await getJSON(q);
        const list = normalizeRelatedList(j?.data || j || [], { excludeId: articleId, limit });
        if (list.length) return list;
      } catch (_) {}
    }
  } catch (_) {}

  return [];
}

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
    const updated = it.updated || it.updateDate || it.modified || it.published || it.publishDate || null;

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
