// components/StoryListWithAds.js
"use client";

import { useMemo, useState } from "react";
import SafeLink from "@/components/SafeLink";
import EmbedIframe from "@/components/EmbedIframe";

/* ------------------------------ small helpers ------------------------------ */

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

function deriveHref(post) {
  const slug = pick(post, ["slug", "seo_slug", "post_slug"]);
  const id   = pick(post, ["id", "uuid", "guid"]);
  const href = pick(post, ["href", "url"]);
  if (href) return href;
  if (slug) return `/posts/${encodeURIComponent(slug)}`;
  if (id)   return `/posts/${encodeURIComponent(String(id))}`;
  return "#";
}

function deriveImage(post) {
  return (
    pick(post, [
      "featured_image_url",
      "featured_image",
      "featuredImage",
      "image_url",
      "image",
      "featured_image_thumbnail",
      "thumbnail",
      "thumb",
      "media.0.url",
      "photo",
      "og_image",
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

function looksLikeObitsList({ sectionTitle, items }) {
  const title = (sectionTitle || "").toLowerCase();
  if (title.includes("obit")) return true;

  try {
    for (const raw of items || []) {
      const post = root(raw);
      const cats = pick(post, ["categories"]) || [];
      if (Array.isArray(cats)) {
        for (const c of cats) {
          const s = String(c || "").toLowerCase();
          if (s.includes("obit")) return true;
        }
      }
    }
  } catch {}
  return false;
}

/* ------------------------------- skeleton row ------------------------------ */

function SkeletonRow({ thumbClass }) {
  const thumbBox = thumbClass || "relative overflow-hidden bg-black shrink-0 w-[160px] h-[100px] md:w-[220px] md:h-[130px]";
  return (
    <li className="py-4">
      <div className="flex items-start gap-4 md:gap-5 animate-pulse">
        <div className={thumbBox}>
          <div className="absolute inset-0 bg-neutral-800/40" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="h-5 w-3/4 rounded bg-neutral-200" />
          <div className="mt-2 h-3 w-1/3 rounded bg-neutral-200" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-full rounded bg-neutral-200" />
            <div className="h-4 w-11/12 rounded bg-neutral-200" />
            <div className="h-4 w-10/12 rounded bg-neutral-200" />
          </div>
        </div>
      </div>
    </li>
  );
}

/* --------------------------------- component -------------------------------- */

export default function StoryListWithAds({
  items = [],
  sectionTitle = "Most Recent Stories",
  adSlots = 6,
  footer = null,

  /** Force no-crop mode; otherwise it auto-enables for Obituaries */
  noCropImages,

  /** Override the thumbnail wrapper classes (size/background/etc.) */
  thumbClass,

  /** Optional explicit alt prefix; auto "Obituary: " if obits and not provided */
  altPrefix,

  /** Include focus-visible underline on titles for better keyboard nav (default: true) */
  focusUnderline = true,

  /** Skeleton controls */
  loading = false,
  skeletonCount = 6,
  loadingMode = "append",

  /** Controls (Filter + Search) */
  showControls = false,
  searchPlaceholder = "Search…",
  categoryLabel = "Filter",

  /** OPTIONAL: custom renderer for the snippet area (item) => ReactNode */
  renderSnippet,
}) {
  const autoObits = looksLikeObitsList({ sectionTitle, items });
  const forceNoCrop = noCropImages ?? autoObits;

  const defaultThumbBox =
    "relative overflow-hidden bg-black shrink-0 w-[160px] h-[100px] md:w-[220px] md:h-[130px]";
  const thumbBox = thumbClass || defaultThumbBox;

  const CoverThumb = ({ src, alt, href }) => (
    <div className={thumbBox}>
      {src ? (
        <SafeLink href={href} className="block">
          <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        </SafeLink>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">No image</div>
      )}
    </div>
  );

  const ContainThumb = ({ src, alt, href }) => (
    <div className={`flex items-center justify-center ${thumbBox}`}>
      {src ? (
        <SafeLink href={href} className="block">
          <img src={src} alt={alt} className="block max-w-full max-h-full w-auto h-auto" loading="lazy" />
        </SafeLink>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">No image</div>
      )}
    </div>
  );

  const Thumb = forceNoCrop ? ContainThumb : CoverThumb;

  /* --------------------------- filter/search state -------------------------- */

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const categories = useMemo(() => {
    const set = new Set();
    for (const raw of items) {
      const post = root(raw);
      const cats = pick(post, ["categories"]);
      if (Array.isArray(cats)) {
        for (const c of cats) {
          const val = String(c || "").trim();
          if (val) set.add(val);
        }
      }
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((raw) => {
      const post = root(raw);

      if (cat !== "all") {
        const cats = pick(post, ["categories"]);
        const matchCat =
          Array.isArray(cats) && cats.some((c) => String(c || "").toLowerCase() === cat.toLowerCase());
        if (!matchCat) return false;
      }

      if (q) {
        const title = (pick(post, ["title", "headline"]) || "").toString().toLowerCase();
        const snip = (raw._snippet || "").toString().toLowerCase();
        if (!title.includes(q) && !snip.includes(q)) return false;
      }

      return true;
    });
  }, [items, query, cat]);

  const showReplace = loading && loadingMode === "replace";
  const showAppend = loading && loadingMode === "append";

  const skeletons = (
    <>
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <SkeletonRow key={`skeleton-${i}`} thumbClass={thumbBox} />
      ))}
    </>
  );

  const computedAltPrefix =
    altPrefix !== undefined ? altPrefix : (autoObits ? "Obituary: " : "");

  /* ---------------------------------- view ---------------------------------- */

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-[100px]">
      <h2 className="section-underline-local text-xl font-bold tracking-tight text-black mb-3">
        {sectionTitle}
      </h2>

      {/* Controls Row — with collapsible Filter and styled Search */}
      {showControls && (
        <div className="mb-6">
          {/* Filter toggle header */}
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-semibold underline underline-offset-[3px] text-neutral-900"
            aria-expanded={filterOpen}
            aria-controls="category-filter-panel"
            onClick={() => setFilterOpen((v) => !v)}
          >
            {categoryLabel}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className={[
                "h-4 w-4 transition-transform duration-200",
                filterOpen ? "rotate-180" : "rotate-0",
              ].join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {/* Collapsible select */}
          <div
            id="category-filter-panel"
            className={[
              "overflow-hidden transition-all duration-200",
              filterOpen ? "max-h-24 opacity-100 mt-2" : "max-h-0 opacity-0",
            ].join(" ")}
          >
            <div className="inline-block border-b border-neutral-300">
              <select
                aria-label="Filter category"
                className="appearance-none bg-transparent px-0 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-0"
                value={cat}
                onChange={(e) => setCat(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c === "all" ? "All" : c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search (icon + uppercase placeholder, underline-only) */}
          <div className="mt-3 flex items-center gap-2 border-b border-neutral-300 pb-2">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5 flex-none text-neutral-800"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>

            <input
              type="search"
              inputMode="search"
              aria-label="Search list"
              placeholder={searchPlaceholder.toUpperCase()}
              className="w-full bg-transparent py-1.5 text-[14px] tracking-wide text-neutral-900 placeholder:text-neutral-700 placeholder:uppercase focus:outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {(query || cat !== "all") && (
            <button
              type="button"
              onClick={() => { setQuery(""); setCat("all"); }}
              className="mt-2 text-sm font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left: stories */}
        <div>
          <ul className="divide-y divide-neutral-200">
            {showReplace ? (
              skeletons
            ) : (
              <>
                {(visibleItems.length ? visibleItems : (query || cat !== "all") ? [] : items).map((raw, idx) => {
                  const post = root(raw);
                  const href = deriveHref(post);
                  const img = deriveImage(post);
                  const title = pick(post, ["title", "headline"]) || "Untitled";
                  const updated =
                    pick(post, ["updated", "updated_at", "modified", "date", "published_at"]) || null;

                  const snippet = raw._snippet || "";
                  const embedHtml = raw._embedHtml || ""; // ← vendor snippet if allowed
                  const id =
                    pick(post, ["id", "uuid", "guid", "slug", "seo_slug", "post_slug"]) || `row-${idx}`;

                  const alt = `${(altPrefix !== undefined ? altPrefix : (looksLikeObitsList({sectionTitle, items}) ? "Obituary: " : ""))}${title}`;

                  return (
                    <li key={(post.id || post.slug || href || idx) + "::row"} className="py-4">
                      <div className="flex items-start gap-4 md:gap-5">
                        {/* thumbnail — clickable */}
                        {img ? (
                          (noCropImages ?? looksLikeObitsList({sectionTitle, items})) ? (
                            <div className={`flex items-center justify-center ${thumbBox}`}>
                              <SafeLink href={href} className="block">
                                <img src={img} alt={alt} className="block max-w-full max-h-full w-auto h-auto" loading="lazy" />
                              </SafeLink>
                            </div>
                          ) : (
                            <div className={thumbBox}>
                              <SafeLink href={href} className="block">
                                <img src={img} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                              </SafeLink>
                            </div>
                          )
                        ) : (
                          <div className={thumbBox}>
                            <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">No image</div>
                          </div>
                        )}

                        {/* text column */}
                        <div className="min-w-0 flex-1">
                          {/* title — clickable */}
                          <h3 className="font-bold text-[20px] leading-[1] text-black">
                            <SafeLink
                              href={href}
                              className={[
                                "outline-none",
                                "hover:underline",
                                focusUnderline ? "focus-visible:underline" : "",
                              ].join(" ")}
                            >
                              {title}
                            </SafeLink>
                          </h3>

                          <div className="mt-1 text-[13px] leading-[1] font-light text-neutral-500">
                            {updated ? `Updated ${timeAgo(updated)}` : ""}
                          </div>

                          {/* Snippet/Embed — outside links, runs in iframe so vendor scripts initialize */}
                          {typeof renderSnippet === "function" ? (
                            renderSnippet(raw)
                          ) : embedHtml ? (
                            <EmbedIframe
                              html={embedHtml}
                              className="mt-2 block"
                              minHeight={160}
                              maxHeight={2000}
                            />
                          ) : (
                            <p
                              className="mt-2 text-[16px] leading-[1.5] font-normal text-neutral-800 line-clamp-3"
                              data-snipsrc={snippet ? "server" : "none"}
                              data-snippetlen={snippet ? snippet.length : 0}
                              data-postid={id}
                              title={snippet || ""}
                            >
                              {snippet}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}

                {(query || cat !== "all") && visibleItems.length === 0 && (
                  <li className="py-10 text-center text-sm text-neutral-500">
                    No results match your filters.
                  </li>
                )}

                {showAppend ? skeletons : null}
              </>
            )}
          </ul>

          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>

        {/* Right: vertical ad rail (scrolls with page) */}
        <aside className="hidden lg:block">
          <div className="flex flex-col gap-8">
            {Array.from({ length: adSlots }).map((_, i) => (
              <div
                key={i}
                className="flex h-[250px] w-[300px] items-center justify-center bg-neutral-200 text-neutral-700"
              >
                AD HERE
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
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
    updated: p.updated ?? p.updated_at ?? null,
  };
}

function capitalize(s) {
  return (s ?? "").slice(0, 1).toUpperCase() + (s ?? "").slice(1);
}
