// components/CategoryListWithLoadMore.js
"use client";

import { useCallback, useMemo, useState } from "react";
import StoryListWithAds from "@/components/StoryListWithAds";
import { getApiBase } from "@/lib/api-base";

export default function CategoryListWithLoadMore({
  slug,
  site,
  pageSize = 24,
  sectionTitle = "Category",
  initialItems = [],

  // Pass-through props for StoryListWithAds (e.g., obits tweaks)
  ...listProps
}) {
  const BASE = getApiBase();

  const [items, setItems] = useState(Array.isArray(initialItems) ? initialItems : []);
  const [offset, setOffset] = useState(items.length);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const hasMore = !exhausted && !loading;

  const loadMore = useCallback(async () => {
    if (!slug || loading || exhausted) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        categories: String(slug),
        public: "true",
        sites: site || "sandhills",
        status: "published",
        limit: String(pageSize),
        offset: String(offset),
      });

      const url = `${BASE}/posts?${qs.toString()}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`[category:load-more] ${res.status} ${res.statusText}`);
      const data = await res.json();

      const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setItems(prev => [...prev, ...arr]);
      setOffset(prev => prev + arr.length);
      if (arr.length < pageSize) setExhausted(true);
    } catch (e) {
      console.error("[category:load-more] failed:", e);
      setExhausted(true);
    } finally {
      setLoading(false);
    }
  }, [slug, site, pageSize, offset, loading, exhausted, BASE]);

  const footer = useMemo(() => {
    if (exhausted && items.length > 0) {
      return <div className="text-center text-sm text-neutral-500 py-4">No more stories.</div>;
    }
    if (hasMore) {
      return (
        <div className="flex justify-center py-4">
          <button
            type="button"
            onClick={loadMore}
            className="rounded bg-neutral-900 px-4 py-2 text-white hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            Load more
          </button>
        </div>
      );
    }
    return null;
  }, [hasMore, exhausted, items.length, loadMore]);

  return (
    <StoryListWithAds
      items={items}
      sectionTitle={sectionTitle}
      loading={loading}
      loadingMode="append"
      footer={footer}
      {...listProps}
    />
  );
}
