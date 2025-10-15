// components/CategoryLoadMore.js
"use client";

import { useMemo, useRef, useState } from "react";
import CategoryCard from "@/components/CategoryCard";
import { getApiBase, NO_STORE } from "@/lib/api-base";

export default function CategoryLoadMore({
  slug,
  siteKey,
  initialOffset = 0,
  initialIds = [],
  pageSize = 24,
}) {
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(initialOffset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(true);

  const seenRef = useRef(new Set(initialIds));
  const BASE = useMemo(() => getApiBase(), []);

  async function handleLoadMore() {
    if (loading || !hasMore) return;
    if (!BASE) {
      setError("Public API base is not configured.");
      return;
    }

    setLoading(true);
    setError("");

    let nextOffset = offset;
    let appended = 0;
    const MAX_RETRIES = 2;

    try {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const url =
          `${BASE}/posts?` +
          `categories=${encodeURIComponent(slug)}` +
          `&public=true` +
          `&sites=${encodeURIComponent(siteKey)}` +
          `&status=published` +
          `&limit=${pageSize}` +
          `&offset=${nextOffset}`;

        const res = await fetch(url, NO_STORE);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.items) ? data.items
          : Array.isArray(data?.results) ? data.results
          : Array.isArray(data?.posts) ? data.posts
          : Array.isArray(data?.data?.items) ? data.data.items
          : Array.isArray(data?.data) ? data.data
          : [];

        const normalized = arr.map((p) => normalizePostInternal(p, siteKey));

        const unseen = normalized.filter((p) => {
          const id = p.id || p.slug || p.href || p.title;
          return id && !seenRef.current.has(id);
        });

        for (const p of normalized) {
          const id = p.id || p.slug || p.href || p.title;
          if (id) seenRef.current.add(id);
        }

        if (unseen.length > 0) {
          setItems((prev) => [...prev, ...unseen]);
          appended += unseen.length;
          nextOffset += normalized.length;
          break;
        }

        nextOffset += pageSize;
      }

      setOffset(nextOffset);
      if (appended < pageSize) setHasMore(false);
    } catch (e) {
      setError("Sorry, couldn’t load more stories.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8">
      {items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((post) => (
            <div key={post.id}>
              <CategoryCard post={post} />
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-center">
        {error && <span className="mr-4 text-red-600">{error}</span>}
        {hasMore ? (
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-5 py-3 rounded-2xl shadow hover:shadow-md transition text-sm font-medium bg-black text-white disabled:opacity-60"
            aria-label={`Load more ${slug} news`}
          >
            {loading ? "Loading…" : `Load More ${capitalize(slug)} News`}
          </button>
        ) : (
          <span className="text-sm opacity-70">No more stories.</span>
        )}
      </div>
    </div>
  );
}

/** Helpers: derive slug, slugify title, and construct ?orig= fallback */
function deriveSlugFromLinks(p) {
  const link =
    p.href || p.url || p.link || p.permalink || p.web_url || p.webUrl || p.perma_link || "";
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

function getMarketOrigin(siteKey) {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_ORIGIN;
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) return fromEnv.replace(/\/+$/, "");
  const map = {
    sandhills: "https://sandhillspost.com",
    salina: "https://salinapost.com",
    greatbend: "https://greatbendpost.com",
  };
  const origin = map[(siteKey || "").toLowerCase()] || "https://sandhillspost.com";
  return origin.replace(/\/+$/, "");
}

function buildExternalUrl(p, siteKey) {
  const link =
    p.href || p.url || p.link || p.permalink || p.web_url || p.webUrl || p.perma_link || "";
  if (typeof link === "string" && /^https?:\/\//i.test(link)) return link;

  const explicitSlug = p.slug || p.post_slug || p.seo_slug;
  const derivedSlug  = deriveSlugFromLinks(p);
  const titleSlug    = slugifyTitle(p.title || p.post_title);
  const id           = p.id || p.post_id || p.uuid || p.guid;

  const slugOrId = explicitSlug || derivedSlug || titleSlug || id;
  if (!slugOrId) return "";

  const origin = getMarketOrigin(siteKey);
  return `${origin}/posts/${encodeURIComponent(slugOrId)}`;
}

function normalizePostInternal(p, siteKey) {
  const explicitSlug = p.slug || p.post_slug || p.seo_slug;
  const derivedSlug  = deriveSlugFromLinks(p);
  const titleSlug    = slugifyTitle(p.title || p.post_title);
  const id           = p.id || p.post_id || p.uuid || p.guid;

  const base =
    explicitSlug ? `/posts/${encodeURIComponent(explicitSlug)}`
    : derivedSlug ? `/posts/${encodeURIComponent(derivedSlug)}`
    : titleSlug   ? `/posts/${encodeURIComponent(titleSlug)}`
    : id          ? `/posts/${encodeURIComponent(id)}`
    : "#";

  if (base === "#") {
    return {
      id: p.id ?? explicitSlug ?? derivedSlug ?? titleSlug ?? ("tmp_" + Math.random().toString(36).slice(2)),
      href: base,
      title: p.title ?? p.post_title ?? "Untitled",
      image: p.image ?? p.featured_image ?? p.image_url ?? null,
      updated: p.updated ?? p.updated_at ?? p.published_at ?? null,
    };
  }

  const orig = buildExternalUrl(p, siteKey);
  const href = orig ? `${base}?orig=${encodeURIComponent(orig)}` : base;

  return {
    id: p.id ?? explicitSlug ?? derivedSlug ?? titleSlug ?? ("tmp_" + Math.random().toString(36).slice(2)),
    href,
    title: p.title ?? p.post_title ?? "Untitled",
    image: p.image ?? p.featured_image ?? p.image_url ?? null,
    updated: p.updated ?? p.updated_at ?? p.published_at ?? null,
  };
}

function capitalize(s) {
  return (s ?? "").slice(0, 1).toUpperCase() + (s ?? "").slice(1);
}
