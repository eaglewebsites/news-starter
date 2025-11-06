// components/CategoryLoadMore.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSiteKeySync } from "@/lib/site-detection-client";

/* ------------------------------ helpers ------------------------------ */
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
function sanitizeSnippet(s = "") {
  let out = String(s)
    .replace(/&amp;nbsp;/gi, " ")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/\u00a0/g, " ");
  out = out.replace(/(^|[^<])\/>/g, "$1");
  out = out.replace(/^[\s"“”‘’'(){}\[\]<>«»‹›▪•▶▸►›]+/u, "");
  out = out.replace(/[ \t]{2,}/g, " ").trim();
  return out;
}
function stripHtmlToText(html = "") {
  return sanitizeSnippet(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}
function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function stripLeadingTitle(text, title) {
  if (!text || !title) return sanitizeSnippet(text);
  let out = text.trimStart();
  const esc = escapeRegExp(String(title).trim());
  const reOne = new RegExp(String.raw`^[\s\p{P}\p{S}]*${esc}(?:(?=[\s\p{P}\p{S}])|$)`, "iu");
  for (let i = 0; i < 4; i++) {
    const next = out.replace(reOne, "").trimStart();
    if (next === out) break;
    out = next;
  }
  out = out.replace(/^[\s"“”‘’'(){}\[\]<>«»‹›:;.,\-–—/\\|•▪▶▸►›>]+/u, "").trimStart();
  return sanitizeSnippet(out);
}
function stripFigcaptions(html = "") { return String(html).replace(/<figcaption[\s\S]*?<\/figcaption>/gi, " "); }
function stripFigures(html = "") { return String(html).replace(/<figure[\s\S]*?<\/figure>/gi, " "); }

function makeSnippet(p, maxLen = 240, titleForStrip = "", isObits = false) {
  let raw =
    p.snippet ?? p._snippet ?? p.excerpt ?? p.dek ?? p.summary ?? p.description ?? p.teaser ??
    p.preview ?? p.subtitle ?? p.subhead ?? p.sub_head ??
    p.body ?? p.body_html ?? p.content_html ?? p.html ?? p.article_html ?? p.content ?? "";

  if (isObits) {
    raw = stripFigures(raw);
    raw = stripFigcaptions(raw);
  }

  let text = stripHtmlToText(raw);
  if (!text) return "";
  text = stripLeadingTitle(text, titleForStrip);
  text = sanitizeSnippet(text);
  text = text.replace(/^[>"“”‘’']+/, "").trimStart();

  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  return cut.replace(/\s+\S*$/, "") + "…";
}

function internalHrefForApp(p) {
  const id = p.id || p.post_id || p.uuid || p.guid;
  if (id) return `/posts/${encodeURIComponent(String(id))}`;
  const slug = p.slug || p.post_slug || p.seo_slug || "";
  if (slug) return `/posts/${encodeURIComponent(String(slug))}`;
  const derived = deriveSlugFromLinks(p);
  if (derived) return `/posts/${encodeURIComponent(derived)}`;
  const titleSlug = slugifyTitle(p.title || p.post_title);
  if (titleSlug) return `/posts/${encodeURIComponent(titleSlug)}`;
  return "#";
}
function deriveHref(post) { return post.href || internalHrefForApp(post); }
function deriveImage(post) {
  return (
    pick(post, [
      "featured_image_url","featured_image","featuredImage","image_url","image",
      "featured_image_thumbnail","thumbnail","thumb","media.0.url","photo","og_image",
    ]) || null
  );
}
function toDate(val) { try { const d = new Date(val); return isNaN(d.getTime()) ? null : d; } catch { return null; } }
function timeAgo(dateish) {
  const d = toDate(dateish);
  if (!d) return "";
  const diff = Date.now() - d.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
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
function stableId(p) {
  const id = p.id || p.post_id || p.uuid || p.guid;
  if (id) return String(id);
  const slug = p.slug || p.post_slug || p.seo_slug;
  if (slug) return String(slug);
  const href = p.href || p.url || p.link || p.permalink || p.web_url || p.webUrl || p.perma_link || "";
  if (href) {
    try {
      const u = new URL(href, "https://example.com");
      return `${u.pathname.replace(/\/+$/, "")}` || href;
    } catch {
      return href.split("?")[0].split("#")[0] || href;
    }
  }
  return p.title || p.post_title || "untitled";
}
function normalizePostInternal(p, siteKey, isObits) {
  const href = internalHrefForApp(p);
  const titleForStrip = p.title ?? p.post_title ?? "";
  const snippet = makeSnippet(p, 240, titleForStrip, isObits);
  return {
    id: stableId(p),
    href,
    title: p.title ?? p.post_title ?? "Untitled",
    image: p.image ?? p.featured_image ?? p.image_url ?? null,
    updated: p.updated ?? p.updated_at ?? p.published_at ?? null,
    _snippet: snippet,
  };
}
function arrayFromApi(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.posts)) return data.posts;
  if (data.data && Array.isArray(data.data.items)) return data.data.items;
  if (data.data && Array.isArray(data.data)) return data.data;
  return [];
}
function capitalize(s) { return (s ?? "").slice(0, 1).toUpperCase() + (s ?? "").slice(1); }

/* ----------------------------- inline ad block ----------------------------- */
/** Optional CLS-safe in-feed ad box (mobile 300x250, desktop 728x90). */
function InlineInFeedAd({ id }) {
  return (
    <li className="py-6">
      <div id={id} data-slot="infeed" className="w-full flex items-center justify-center">
        <div className="block lg:hidden h-[250px] w-[300px] bg-neutral-200 text-neutral-700 flex items-center justify-center">
          AD IN-FEED
        </div>
        <div className="hidden lg:flex h-[90px] w-[728px] bg-neutral-200 text-neutral-700 items-center justify-center">
          AD IN-FEED
        </div>
      </div>
    </li>
  );
}

/* -------------------------------- component -------------------------------- */
export default function CategoryLoadMore({
  slug,
  siteKey,                 // optional; falls back to client detection
  initialOffset = 0,
  initialIds = [],
  pageSize = 24,
  seedFromItems = [],
  noCropImages,
  thumbClass,
  focusUnderline = true,

  /** Insert an in-feed ad after every N items (0 = disabled) */
  inlineAdEvery = 0,
}) {
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(initialOffset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(true);

  const seenRef = useRef(new Set(initialIds));
  const lastSigRef = useRef("");

  const siteKeyLocal = siteKey || getSiteKeySync();
  const isObits = useMemo(() => (slug || "").toLowerCase().includes("obit"), [slug]);
  const forceNoCrop = noCropImages ?? isObits;

  const BASE = useMemo(
    () => (process.env.NEXT_PUBLIC_EAGLE_BASE_API || "").replace(/\/+$/, ""),
    []
  );

  // Seed the dedupe set with SSR items already on the page above us
  useEffect(() => {
    try {
      for (const raw of seedFromItems) {
        const id = stableId(raw);
        if (id) seenRef.current.add(id);
      }
    } catch {}
  }, [seedFromItems]);

  function pageSignature(list) {
    if (!list || !list.length) return "";
    const first = list[0]?.id || "";
    const last = list[list.length - 1]?.id || "";
    return `${first}__${last}__${list.length}`;
  }

  async function fetchVariant(nextOffset, variant) {
    let url;
    if (variant === "page") {
      const page = Math.floor(nextOffset / pageSize) + 1;
      url =
        `${BASE}/posts?` +
        `categories=${encodeURIComponent(slug)}` +
        `&public=true` +
        (siteKeyLocal ? `&sites=${encodeURIComponent(siteKeyLocal)}` : "") +
        `&status=published` +
        `&limit=${pageSize}` +
        `&page=${page}`;
    } else {
      url =
        `${BASE}/posts?` +
        `categories=${encodeURIComponent(slug)}` +
        `&public=true` +
        (siteKeyLocal ? `&sites=${encodeURIComponent(siteKeyLocal)}` : "") +
        `&status=published` +
        `&limit=${pageSize}` +
        `&offset=${nextOffset}`;
    }

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return arrayFromApi(data);
  }

  async function handleLoadMore() {
    if (loading || !hasMore) return;
    if (!BASE) { setError("Public API base is not configured."); return; }

    setLoading(true);
    setError("");

    let nextOffset = offset;
    let appended = 0;
    const MAX_JUMPS = 3;

    try {
      attemptLoop: for (let jump = 0; jump <= MAX_JUMPS; jump++) {
        const variants = ["offset", "page"];

        for (const variant of variants) {
          let arr = [];
          try { arr = await fetchVariant(nextOffset, variant); } catch { continue; }

          const normalized = arr.map((p) => normalizePostInternal(p, siteKeyLocal, isObits));
          const sig = pageSignature(normalized);
          if (sig && sig === lastSigRef.current) continue;

          const unseen = normalized.filter((p) => {
            const id = p.id || p.href || p.title;
            return id && !seenRef.current.has(id);
          });

          for (const p of normalized) {
            const id = p.id || p.href || p.title;
            if (id) seenRef.current.add(id);
          }

          if (unseen.length > 0) {
            setItems((prev) => [...prev, ...unseen]);
            appended += unseen.length;
            nextOffset += normalized.length;
            lastSigRef.current = sig;
            break attemptLoop; // success
          }

          lastSigRef.current = sig || lastSigRef.current;
        }

        nextOffset += pageSize; // both variants repeated → jump
      }

      setOffset(nextOffset);
      if (appended === 0) setHasMore(false);
    } catch {
      setError("Sorry, couldn’t load more stories.");
    } finally {
      setLoading(false);
    }
  }

  // Title link — force black; underline only on hover; keep focus-visible underline
  const titleLinkClasses = [
    "outline-none",
    "!text-black visited:!text-black hover:!text-black",
    "!no-underline hover:!underline underline-offset-2",
    focusUnderline ? "focus-visible:!underline" : "",
  ].join(" ").trim();

  const thumbBoxDefault =
    "relative overflow-hidden bg-black shrink-0 w-[160px] h-[100px] md:w-[220px] md:h-[130px]";
  const thumbBox = thumbClass || thumbBoxDefault;

  // Build list with optional in-feed ads
  function renderListWithAds(list) {
    const out = [];
    let adCount = 0;

    list.forEach((post, idx) => {
      const href = deriveHref(post);
      const img = deriveImage(post);
      const title = pick(root(post), ["title", "headline"]) || "Untitled";
      const updated =
        pick(root(post), ["updated","updated_at","modified","published","date","published_at"]) || null;

      const snippet = sanitizeSnippet(post._snippet || "");
      const alt = `${(isObits ? "Obituary: " : "")}${title}`;

      out.push(
        <li key={(post.id || post.slug || href || idx) + "::more-row"} className="py-4">
          <div className="flex items-start gap-4 md:gap-5">
            {/* thumbnail (linked) */}
            {forceNoCrop ? (
              <div className={thumbBox}>
                {img ? (
                  <a href={href} className="block !text-inherit !no-underline">
                    <img
                      src={img}
                      alt={alt}
                      className="block max-w-full max-h-full w-auto h-auto object-contain"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                    No image
                  </div>
                )}
              </div>
            ) : (
              <div className={thumbBox}>
                {img ? (
                  <a href={href} className="block !text-inherit !no-underline">
                    <img
                      src={img}
                      alt={alt}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                    No image
                  </div>
                )}
              </div>
            )}

            {/* text column */}
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-[20px] leading-[1]">
                <a href={href} className={titleLinkClasses}>
                  {title}
                </a>
              </h3>

              <div className="mt-1 text-[13px] leading-[1] font-light text-neutral-500">
                {updated ? `Updated ${timeAgo(updated)}` : ""}
              </div>

              {snippet ? (
                <p className="mt-2 text-[16px] leading-[1.5] font-normal text-neutral-800 line-clamp-3" title={snippet}>
                  {snippet}
                </p>
              ) : null}
            </div>
          </div>
        </li>
      );

      // Optional in-feed ad insertion
      if (inlineAdEvery > 0 && (idx + 1) % inlineAdEvery === 0) {
        adCount += 1;
        out.push(<InlineInFeedAd key={`infeed-${adCount}`} id={`infeed-${adCount}`} />);
      }
    });

    return out;
  }

  return (
    // IMPORTANT: no container/grid here — we inherit page layout and widths.
    <div className="mt-6">
      {items.length > 0 && (
        <ul className="divide-y divide-neutral-200">
          {renderListWithAds(items)}
        </ul>
      )}

      {/* Controls row */}
      <div className="mt-6 flex items-center justify-center">
        {error && <span className="mr-4 text-red-600">{error}</span>}
        {hasMore ? (
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-5 py-3 rounded-2xl shadow hover:shadow-md transition text-sm font-medium bg-black text-white disabled:opacity-60"
            aria-label={`Load more ${slug}`}
          >
            {loading ? "Loading…" : `Load More ${capitalize(slug)}`}
          </button>
        ) : (
          <span className="text-sm opacity-70">No more stories.</span>
        )}
      </div>
    </div>
  );
}
