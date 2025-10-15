// components/CategoryListWithLoadMore.js
"use client";

import { useCallback, useMemo, useState } from "react";
import StoryListWithAds from "@/components/StoryListWithAds";

function root(obj) {
  return obj && typeof obj === "object" && obj.data && typeof obj.data === "object" ? obj.data : obj;
}

function getApiBase() {
  return process.env.NEXT_PUBLIC_EAGLE_BASE_API?.replace(/\/+$/, "") ||
         process.env.EAGLE_BASE_API?.replace(/\/+$/, "") ||
         "https://api.eaglewebservices.com/v3";
}

async function fetchCategoryBatch({ slug, site, limit, offset }) {
  const BASE = getApiBase();
  const qs = new URLSearchParams({
    categories: slug,
    public: "true",
    sites: site || "sandhills",
    status: "published",
    limit: String(limit),
    offset: String(offset),
  });
  const url = `${BASE}/posts?${qs.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`[category/load-more] ${res.status} ${res.statusText}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
}

export default function CategoryListWithLoadMore({
  slug,
  site,
  pageSize = 24,
  sectionTitle = "Category",
  initialItems = [],
  ...listProps // ← pass-thru (showControls, searchPlaceholder, etc.)
}) {
  const [items, setItems] = useState(initialItems);
  const [offset, setOffset] = useState(initialItems.length || 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [done, setDone] = useState(false);

  const canLoadMore = !loadingMore && !done;

  const onLoadMore = useCallback(async () => {
    if (!canLoadMore) return;
    setLoadingMore(true);
    try {
      const batch = await fetchCategoryBatch({ slug, site, limit: pageSize, offset });
      if (!batch.length) {
        setDone(true);
      } else {
        setItems(prev => [...prev, ...batch]);
        setOffset(prev => prev + batch.length);
      }
    } catch (e) {
      console.error("[category] load more failed:", e);
      setDone(true);
    } finally {
      setLoadingMore(false);
    }
  }, [canLoadMore, slug, site, pageSize, offset]);

  const footer = useMemo(() => (
    <div className="mt-4">
      <button
        type="button"
        onClick={onLoadMore}
        disabled={!canLoadMore}
        className={[
          "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold",
          canLoadMore
            ? "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
            : "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400",
        ].join(" ")}
      >
        {loadingMore ? "Loading…" : `Load More ${sectionTitle}`}
      </button>
    </div>
  ), [onLoadMore, canLoadMore, loadingMore, sectionTitle]);

  return (
    <StoryListWithAds
      items={items}
      sectionTitle={sectionTitle}
      footer={!done ? footer : null}
      loading={loadingMore}
      loadingMode="append"
      {...listProps}
    />
  );
}
