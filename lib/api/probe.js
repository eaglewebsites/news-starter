// lib/api/probe.js
export const NO_STORE = { cache: "no-store" };

export function getApiBase() {
  const fromEnv = process.env.EAGLE_API_BASE;
  const base = (fromEnv && String(fromEnv).trim()) || "https://api.eaglewebservices.com/v3";
  const normalized = base.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error(`[EAGLE_API_BASE] Invalid value: "${fromEnv}". Expected a full URL like https://api.eaglewebservices.com/v3`);
  }
  return normalized;
}

function enc(v) { return encodeURIComponent(String(v ?? "")); }
function s(v) { return v == null ? "" : String(v); }
function lc(v) { return s(v).toLowerCase(); }

function isIdMatch(item, token) {
  const t = s(token);
  return (
    s(item.id) === t ||
    s(item.post_id) === t ||
    s(item.uuid) === t ||
    s(item.guid) === t ||
    s(item.nid) === t ||
    s(item.node_id) === t
  );
}
function isSlugMatch(item, token) {
  const t = lc(token);
  return (
    lc(item.slug) === t ||
    lc(item.post_slug) === t ||
    lc(item.seo_slug) === t
  );
}

export function buildCandidates(BASE, token, siteKey) {
  const qp = {
    common: `public=true&status=published`,
    common_old: `public=true&status=publish`,
    site_singular: `site=${enc(siteKey)}`,
    site_plural: `sites=${enc(siteKey)}`,
  };

  const urls = [
    // With sites, slug-like
    `${BASE}/posts?slug=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts?post_slug=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts?seo_slug=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,

    // With sites, path
    `${BASE}/posts/${enc(token)}?${qp.common}&${qp.site_plural}`,
    `${BASE}/posts/${enc(token)}?${qp.common_old}&${qp.site_plural}`,

    // With sites, id-like
    `${BASE}/posts?id=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts?post_id=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts?uuid=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts?guid=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts?nid=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,
    `${BASE}/posts?node_id=${enc(token)}&${qp.common}&${qp.site_plural}&limit=5`,

    // With sites, search
    `${BASE}/posts?search=${enc(token)}&${qp.common}&${qp.site_plural}&limit=10`,
    `${BASE}/search?search=${enc(token)}&${qp.site_plural}&limit=10`,

    // Try site= (singular)
    `${BASE}/posts?slug=${enc(token)}&${qp.common}&${qp.site_singular}&limit=5`,
    `${BASE}/posts/${enc(token)}?${qp.common}&${qp.site_singular}`,
    `${BASE}/posts?id=${enc(token)}&${qp.common}&${qp.site_singular}&limit=5`,

    // Without public/status
    `${BASE}/posts?slug=${enc(token)}&${qp.site_plural}&limit=5`,
    `${BASE}/posts/${enc(token)}?${qp.site_plural}`,
    `${BASE}/posts?id=${enc(token)}&${qp.site_plural}&limit=5`,

    // No site filter
    `${BASE}/posts?slug=${enc(token)}&${qp.common}&limit=5`,
    `${BASE}/posts/${enc(token)}?${qp.common}`,
    `${BASE}/posts?id=${enc(token)}&${qp.common}&limit=5`,
    `${BASE}/posts?search=${enc(token)}&${qp.common}&limit=10`,

    // Bare-minimum last resorts
    `${BASE}/posts?slug=${enc(token)}&limit=5`,
    `${BASE}/posts/${enc(token)}`,
    `${BASE}/posts?id=${enc(token)}&limit=5`,
  ];

  // De-dupe
  return Array.from(new Set(urls));
}

function summarizeJson(js) {
  if (Array.isArray(js)) {
    const first = js[0] ?? {};
    return {
      kind: "array",
      length: js.length,
      firstKeys: Object.keys(first || {}).slice(0, 12),
    };
  }
  if (js && typeof js === "object") {
    return {
      kind: "object",
      keys: Object.keys(js).slice(0, 20),
    };
  }
  return { kind: typeof js };
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

export async function probeDetailEndpoints({ token, siteKey }) {
  const BASE = getApiBase();
  const urls = buildCandidates(BASE, token, siteKey);

  const results = [];
  for (const url of urls) {
    let status = 0;
    let ok = false;
    let summary = null;
    let exact = false;
    let type = "unknown";

    try {
      const res = await fetch(url, NO_STORE);
      status = res.status;
      ok = res.ok;

      let js = null;
      try {
        js = await res.json();
      } catch {
        js = null;
      }

      summary = summarizeJson(js);

      // try to detect an exact match
      if (js && typeof js === "object" && !Array.isArray(js)) {
        const obj = js.post && typeof js.post === "object" ? js.post : js;
        exact = isIdMatch(obj, token) || isSlugMatch(obj, token);
        type = "object";
      } else {
        const arr = extractArray(js);
        if (arr.length) {
          type = "array";
          const hit = arr.find((p) => isIdMatch(p, token) || isSlugMatch(p, token));
          exact = Boolean(hit);
        }
      }
    } catch (e) {
      status = -1;
      ok = false;
      summary = { kind: "error", message: e?.message || String(e) };
    }

    results.push({ url, status, ok, exact, summary, type });
  }

  return results;
}
