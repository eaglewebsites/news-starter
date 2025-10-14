// components/CategoryListWithLoadMore.js
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StoryListWithAds from "./StoryListWithAds";

/* --------------------- utils --------------------- */
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
function uniqueMerge(existing, incoming) {
  const seen = new Set();
  const keyOf = (o) => {
    const p = o && o.data ? o.data : o;
    return String(
      p?.id ?? p?.uuid ?? p?.guid ?? p?.slug ?? p?.seo_slug ?? p?.post_slug ?? Math.random()
    );
  };
  const out = [];
  for (const it of existing) {
    const k = keyOf(it);
    if (!seen.has(k)) { seen.add(k); out.push(it); }
  }
  for (const it of incoming) {
    const k = keyOf(it);
    if (!seen.has(k)) { seen.add(k); out.push(it); }
  }
  return out;
}

/* --------------------- batch enrichment --------------------- */
function toBatchContexts(items) {
  return items.map((raw) => {
    const p = root(raw);
    return {
      key: pick(p, ["slug", "seo_slug", "post_slug"]) || pick(p, ["id", "uuid", "guid"]) || pick(p, ["title", "headline"]) || Math.random().toString(36).slice(2),
      id:  pick(p, ["id", "uuid", "guid"]) || null,
      uuid: pick(p, ["uuid"]) || null,
      guid: pick(p, ["guid"]) || null,
      slug: pick(p, ["slug"]) || null,
      seo_slug: pick(p, ["seo_slug"]) || null,
      post_slug: pick(p, ["post_slug"]) || null,
      title: pick(p, ["title", "headline"]) || null,
    };
  });
}
async function enrichBatch(items, siteKey) {
  if (!items.length) return items;
  const contexts = toBatchContexts(items);
  try {
    const res = await fetch("/api/post/summary/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ site: siteKey || "sandhills", items: contexts }),
    });
    if (!res.ok) return items;
    const json = await res.json();
    if (!json || !json.ok || !json.map) return items;

    const map = json.map;
    // apply snippets by matching key (slug preferred)
    return items.map((raw) => {
      const p = root(raw);
      const key =
        pick(p, ["slug", "seo_slug", "post_slug"]) ||
        pick(p, ["id", "uuid", "guid"]) ||
        pick(p, ["title", "headline"]);
      const snip = key ? map[key] : "";
      return snip ? { ...raw, _snippet: snip } : raw;
    });
  } catch {
    return items;
  }
}

/* --------------------- component --------------------- */
export default function CategoryListWithLoadMore({
  initialItems = [],
  slug,
  site,
  pageSize = 24,
  sectionTitle,
  adSlots = 6,
}) {
  const [items, setItems] = useState(initialItems || []);
  const [offset, setOffset] = useState((initialItems || []).length || 0);
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState(null);
  const enrichingRef = useRef(false);

  // Initial batch enrichment (fast, single call)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!items.length) return;
      if (enrichingRef.current) return;
      enrichingRef.current = true;
      try {
        const enriched = await enrichBatch(items, site);
        if (alive) setItems(enriched);
      } finally {
        enrichingRef.current = false;
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // once

  // Revalidate snippets on Back/visibility/page-show (bfcache)
  useEffect(() => {
    const ensure = async () => {
      if (enrichingRef.current) return;
      const missing = items.some((it) => !it?._snippet);
      if (!missing) return;
      enrichingRef.current = true;
      try {
        const enriched = await enrichBatch(items, site);
        setItems(enriched);
      } finally {
        enrichingRef.current = false;
      }
    };

    const onShow = () => ensure();
    const onVis = () => { if (document.visibilityState === "visible") ensure(); };

    window.addEventListener("pageshow", onShow);          // fires on bfcache restore
    document.addEventListener("visibilitychange", onVis); // tab/back visibility

    return () => {
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [items, site]);

  const loadMore = useCallback(async () => {
    if (loading || ended) return;
    setLoading(true);
    setError(null);
    try {
      const url = new URL("https://api.eaglewebservices.com/v3/posts");
      url.searchParams.set("categories", slug);
      url.searchParams.set("public", "true");
      url.searchParams.set("sites", site || "sandhills");
      url.searchParams.set("status", "published");
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(offset));

      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = normalizeArray(await res.json());
      if (!Array.isArray(data) || data.length === 0) {
        setEnded(true);
        setLoading(false);
        return;
      }

      // Batch-enrich the new slice before merging (fast)
      const enrichedSlice = await enrichBatch(data, site);
      setItems((prev) => uniqueMerge(prev, enrichedSlice));
      setOffset((o) => o + data.length);
      if (data.length < pageSize) setEnded(true);
    } catch (e) {
      setError(e?.message || "Failed to load more");
    } finally {
      setLoading(false);
    }
  }, [slug, site, pageSize, offset, loading, ended]);

  const footer = useMemo(() => {
    return (
      <div className="flex items-center justify-start">
        {!ended ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-[#012A3D] hover:text-white"
          >
            {loading ? "Loading…" : `Load More ${sectionTitle?.replace(/^Most Recent\s+/i, "").replace(/\s+Stories$/i, "") || "Stories"}`}
          </button>
        ) : (
          <span className="text-sm text-neutral-500">No more stories.</span>
        )}
        {error && <span className="ml-3 text-sm text-red-600">{error}</span>}
      </div>
    );
  }, [ended, loading, error, loadMore, sectionTitle]);

  return (
    <StoryListWithAds
      items={items}
      sectionTitle={sectionTitle}
      adSlots={adSlots}
      footer={footer}
    />
  );
}
