// app/category/[slug]/page.js
import CategoryListWithLoadMore from "@/components/CategoryListWithLoadMore";

/* ---------------- helpers to match client enrichment ---------------- */
function root(obj) {
  return obj && typeof obj === "object" && obj.data && typeof obj.data === "object" ? obj.data : obj;
}
function pick(obj, paths = []) {
  const o = root(obj);
  for (const p of paths) {
    const v = p.split(".").reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), o);
    if (v != null && v !== "") return v;
  }
  return undefined;
}
function normalizeArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return [payload];
  }
  return [];
}
function contextsFor(items) {
  return items.map((raw) => {
    const p = root(raw);
    return {
      key:
        pick(p, ["slug", "seo_slug", "post_slug"]) ||
        pick(p, ["id", "uuid", "guid"]) ||
        pick(p, ["title", "headline"]) ||
        Math.random().toString(36).slice(2),
      id: pick(p, ["id", "uuid", "guid"]) || null,
      uuid: pick(p, ["uuid"]) || null,
      guid: pick(p, ["guid"]) || null,
      slug: pick(p, ["slug"]) || null,
      seo_slug: pick(p, ["seo_slug"]) || null,
      post_slug: pick(p, ["post_slug"]) || null,
      title: pick(p, ["title", "headline"]) || null,
    };
  });
}

/* ---------------- simple site key + base URL helpers ---------------- */
function getSiteKey() {
  return (process.env.NEXT_PUBLIC_SITE_KEY || process.env.EAGLE_DEFAULT_SITE || "sandhills").toLowerCase();
}
function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/* ---------------- server fetch for category page ---------------- */
async function fetchCategoryPage({ slug, site, limit = 24, offset = 0 }) {
  const url = new URL("https://api.eaglewebservices.com/v3/posts");
  url.searchParams.set("categories", slug);
  url.searchParams.set("public", "true");
  url.searchParams.set("sites", site || "sandhills");
  url.searchParams.set("status", "published");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  if (process.env.NODE_ENV !== "production") {
    console.log("[category][fetch]", url.toString());
  }

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`[category] ${res.status} ${res.statusText}`);
  const json = await res.json();
  const arr = normalizeArray(json);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[category][result]",
      slug,
      "→",
      Array.isArray(arr) ? `${arr.length} items` : "0 items",
      `(limit=${limit}, offset=${offset}, site=${site})`
    );
  }
  return arr;
}

/* ---------------- SSR batch enrichment so snippets survive Back ---------------- */
async function ssrEnrichSnippets(items, siteKey) {
  if (!items?.length) return items;
  const base = getBaseUrl();

  const payload = {
    site: siteKey || "sandhills",
    items: contextsFor(items),
  };

  let map = null;
  try {
    const res = await fetch(`${base}/api/post/summary/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.ok && json.map) map = json.map;
    }
  } catch {
    // if it fails, we’ll render without snippets; client will enrich
  }

  if (!map) return items;

  return items.map((raw) => {
    const p = root(raw);
    const key =
      pick(p, ["slug", "seo_slug", "post_slug"]) ||
      pick(p, ["id", "uuid", "guid"]) ||
      pick(p, ["title", "headline"]);
    const snip = key ? map[key] : "";
    return snip ? { ...raw, _snippet: snip } : raw;
  });
}

export default async function CategoryPage({ params }) {
  // In newer Next versions, params is an async getter.
  const { slug } = await params; // <-- await fixes the “sync dynamic APIs” error
  const PAGE_SIZE = 24;

  const siteKey = getSiteKey();

  // 1) fetch first page
  const initialItems = await fetchCategoryPage({
    slug,
    site: siteKey,
    limit: PAGE_SIZE,
    offset: 0,
  });

  // 2) enrich on the server so snippets are in initial HTML
  const initialWithSnippets = await ssrEnrichSnippets(initialItems, siteKey);

  // 3) hand off to client for rendering + Load More
  return (
    <CategoryListWithLoadMore
      initialItems={initialWithSnippets}
      slug={slug}
      site={siteKey}
      pageSize={PAGE_SIZE}
      sectionTitle={`Most Recent ${slug?.charAt(0)?.toUpperCase()}${slug?.slice(1)} Stories`}
      adSlots={6}
    />
  );
}
