// components/StoryListWithAds.js
"use client";

import { useMemo, useState } from "react";
import EmbedIframe from "@/components/EmbedIframe";
import RightRailAds from "@/components/RightRailAds";

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

/* -------------------- snippet cleanup -------------------- */
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

/* ------------------------------- skeleton row ------------------------------ */
function SkeletonRow({ thumbClass }) {
  const thumbBox = thumbClass || "relative overflow-hidden bg-black shrink-0 w-[160px] h-[100px] md:w-[220px] md:h-[130px]";
  return (
    <li className="py-4">
      <div className="flex items-start gap-4 md:gap-5 animate-pulse">
        <div className={thumbBox}><div className="absolute inset-0 bg-neutral-800/40" /></div>
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

/* ----------------------------- inline ad block ----------------------------- */
/**
 * A simple, CLS-safe in-feed ad box. You can replace the inner <div> with
 * Taboola/Audience/GAM calls and use `id` to target each slot uniquely.
 *
 * Sizes:
 *  - mobile: 300x250
 *  - lg+: centered 728x90 (still inside the content column)
 */
function InlineInFeedAd({ id }) {
  return (
    <li className="py-6">
      <div
        id={id}
        data-slot="infeed"
        className="w-full flex items-center justify-center"
      >
        {/* Mobile 300x250 placeholder */}
        <div className="block lg:hidden h-[250px] w-[300px] bg-neutral-200 text-neutral-700 flex items-center justify-center">
          AD IN-FEED
        </div>
        {/* Desktop 728x90 placeholder */}
        <div className="hidden lg:flex h-[90px] w-[728px] bg-neutral-200 text-neutral-700 items-center justify-center">
          AD IN-FEED
        </div>
      </div>
    </li>
  );
}

/* -------------------------------- component -------------------------------- */
export default function StoryListWithAds({
  items = [],
  sectionTitle = "Most Recent Stories",
  adSlots = 6,
  footer = null,
  noCropImages,
  thumbClass,
  altPrefix,
  focusUnderline = true,
  loading = false,
  skeletonCount = 6,
  loadingMode = "append",
  showControls = false,
  searchPlaceholder = "Search…",
  categoryLabel = "Filter",
  renderSnippet,

  /** NEW: insert in-feed ads after every N stories (0 = disabled) */
  inlineAdEvery = 5,
}) {
  const autoObits = looksLikeObitsList({ sectionTitle, items });

  const defaultThumbBox =
    "relative overflow-hidden bg-black shrink-0 w-[160px] h-[100px] md:w-[220px] md:h-[130px]";
  const thumbBox = thumbClass || defaultThumbBox;

  const CoverThumb = ({ src, alt, href }) => (
    <div className={thumbBox}>
      {src ? (
        <a href={href} className="block !text-inherit !no-underline">
          <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        </a>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">No image</div>
      )}
    </div>
  );

  const ContainThumb = ({ src, alt, href }) => (
    <div className={`flex items-center justify-center ${thumbBox}`}>
      {src ? (
        <a href={href} className="block !text-inherit !no-underline">
          <img src={src} alt={alt} className="block max-w-full max-h-full w-auto h-auto" loading="lazy" />
        </a>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">No image</div>
      )}
    </div>
  );

  const Thumb = (noCropImages ?? autoObits) ? ContainThumb : CoverThumb;

  // Title LINK: force black always; underline only on hover; keep focus-visible underline
  const titleLinkClasses = [
    "outline-none",
    "!text-black visited:!text-black hover:!text-black",
    "!no-underline hover:!underline underline-offset-2",
    focusUnderline ? "focus-visible:!underline" : "",
  ].join(" ").trim();

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

  // Build list with optional in-feed ads
  function renderListWithAds(list) {
    const out = [];
    let adCount = 0;

    list.forEach((raw, idx) => {
      const post = root(raw);
      const href = deriveHref(post);
      const img = deriveImage(post);
      const title = pick(post, ["title", "headline"]) || "Untitled";
      const updated =
        pick(post, ["updated", "updated_at", "modified", "date", "published_at"]) || null;

      const snippet = stripLeadingTitle(raw._snippet || "", String(title || ""));
      const embedHtml = raw._embedHtml || "";
      const id =
        pick(post, ["id", "uuid", "guid", "slug", "seo_slug", "post_slug"]) || `row-${idx}`;

      const alt = `${(computedAltPrefix ?? "")}${title}`;

      out.push(
        <li key={(post.id || post.slug || href || idx) + "::row"} className="py-4">
          <div className="flex items-start gap-4 md:gap-5">
            {/* thumbnail (link) */}
            {img ? (
              (noCropImages ?? autoObits) ? (
                <div className={`flex items-center justify-center ${thumbBox}`}>
                  <a href={href} className="block !text-inherit !no-underline">
                    <img src={img} alt={alt} className="block max-w-full max-h-full w-auto h-auto" loading="lazy" />
                  </a>
                </div>
              ) : (
                <div className={thumbBox}>
                  <a href={href} className="block !text-inherit !no-underline">
                    <img src={img} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  </a>
                </div>
              )
            ) : (
              <div className={thumbBox}>
                <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">No image</div>
              </div>
            )}

            {/* text column */}
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-[20px] leading-[1]">
                {/* Only the TITLE is a link; forced black and underline-on-hover only */}
                <a href={href} className={titleLinkClasses}>
                  {title}
                </a>
              </h3>

              <div className="mt-1 text-[13px] leading-[1] font-light text-neutral-500">
                {updated ? `Updated ${timeAgo(updated)}` : ""}
              </div>

              {typeof renderSnippet === "function" ? (
                renderSnippet(raw)
              ) : embedHtml ? (
                <EmbedIframe html={embedHtml} className="mt-2 block" minHeight={160} maxHeight={2000} />
              ) : snippet ? (
                <p
                  className="mt-2 text-[16px] leading-[1.5] font-normal text-neutral-800 line-clamp-3"
                  data-snipsrc="server"
                  data-snippetlen={snippet.length}
                  data-postid={id}
                  title={snippet}
                >
                  {snippet}
                </p>
              ) : null}
            </div>
          </div>
        </li>
      );

      // Insert an in-feed ad after every N stories
      if (inlineAdEvery > 0 && (idx + 1) % inlineAdEvery === 0) {
        adCount += 1;
        out.push(<InlineInFeedAd key={`infeed-${adCount}`} id={`infeed-${adCount}`} />);
      }
    });

    return out;
  }

  return (
    // not-prose prevents any `.prose a` rules from leaking in
    <section className="not-prose mx-auto w-full max-w-6xl px-4 pb-[100px]">
      <h2 className="section-underline-local text-xl font-bold tracking-tight text-black mb-3">
        {sectionTitle}
      </h2>

      {/* Controls omitted for brevity */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left: stories */}
        <div>
          <ul className="divide-y divide-neutral-200">
            {showReplace ? (
              skeletons
            ) : (
              <>
                {renderListWithAds(visibleItems.length ? visibleItems : (query || cat !== "all") ? [] : items)}
                {showAppend ? skeletons : null}
              </>
            )}
          </ul>

          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>

        {/* Right rail */}
        <aside className="hidden lg:block">
          <RightRailAds
            pageType="list"
            slotIds={[
              "gam-rr-top",
              "taboola-right-rail-1",
              "gam-rr-mid",
              "taboola-right-rail-2",
              "gam-rr-bottom",
              "gam-rr-extra",
            ]}
          />
        </aside>
      </div>
    </section>
  );
}
