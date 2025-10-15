// app/posts/[id]/page.js
import { headers } from "next/headers";
import ShareRow from "@/components/ShareRow";
import { getApiBase, NO_STORE } from "@/lib/api-base";

/* ------------------------- tiny pick/unwrap helpers ------------------------- */
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
function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return "";
  // strip only scripts; keep the publisher’s markup
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}
function stripHtmlToText(html = "") {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function slugify(s = "") {
  return String(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
function fmtDateTime(dLike) {
  try {
    const d = new Date(dLike);
    if (isNaN(d.getTime())) return "";
    const date = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${date} · ${time}`;
  } catch {
    return "";
  }
}
function readingTime(html) {
  const words = stripHtmlToText(html).split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 220));
  return `${mins} min read`;
}

/* ------------------------- matching logic (exact hit) ------------------------ */
function matchesToken(item, token) {
  if (!item) return false;
  const t = String(token || "").toLowerCase();

  const ids = [item.id, item.post_id, item.uuid, item.guid, item.nid, item.node_id]
    .map((x) => (x == null ? "" : String(x)));
  const slugs = [item.slug, item.post_slug, item.seo_slug]
    .map((x) => (x == null ? "" : String(x).toLowerCase()));

  if (ids.some((x) => x === token)) return true;
  if (slugs.some((x) => x === t)) return true;
  return false;
}

/* ------------------------------- data fetcher -------------------------------- */
async function fetchPostByIdOrSlug(idOrSlug, siteKey = "sandhills") {
  const BASE = getApiBase();
  const tries = [
    `${BASE}/posts?slug=${encodeURIComponent(idOrSlug)}&public=true&status=published&sites=${siteKey}&limit=10`,
    `${BASE}/posts/${encodeURIComponent(idOrSlug)}?public=true&status=published&sites=${siteKey}`,
    `${BASE}/posts?id=${encodeURIComponent(idOrSlug)}&public=true&status=published&sites=${siteKey}&limit=10`,
    `${BASE}/posts?search=${encodeURIComponent(idOrSlug)}&public=true&status=published&sites=${siteKey}&limit=20`,
  ];

  let lastErr = null;
  for (const url of tries) {
    const res = await fetch(url, NO_STORE);
    if (!res.ok) {
      lastErr = new Error(`[post] ${res.status} ${res.statusText}`);
      continue;
    }
    const data = await res.json();

    if (data && typeof data === "object" && !Array.isArray(data)) {
      if (Array.isArray(data.data)) {
        const exact = data.data.find((it) => matchesToken(it, idOrSlug));
        if (exact) return exact;
      } else {
        const obj = data.data ?? data.post ?? data.entry ?? data;
        if (obj && typeof obj === "object" && matchesToken(obj, idOrSlug)) return obj;
      }
    }

    const arr =
      Array.isArray(data) ? data
      : Array.isArray(data?.items) ? data.items
      : Array.isArray(data?.results) ? data.results
      : Array.isArray(data?.posts) ? data.posts
      : Array.isArray(data?.data?.items) ? data.data.items
      : Array.isArray(data?.data) ? data.data
      : [];

    if (arr.length) {
      const exact = arr.find((it) => matchesToken(it, idOrSlug));
      if (exact) return exact;
    }
  }
  throw lastErr || new Error("[post] Not Found");
}

export const dynamic = "force-dynamic";

/* ------------------------------- hero handling ------------------------------- */
function bodyAlreadyHasHero(bodyHtml, featuredUrl) {
  if (!bodyHtml) return false;
  const head = bodyHtml.slice(0, 2000);
  const hasImgTagNearTop = /<(figure|p)[^>]*>\s*<img[\s\S]*?>/i.test(head) || /<img[\s\S]*?>/i.test(head);
  const repeatsFeatured = featuredUrl
    ? new RegExp(String(featuredUrl).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(head)
    : false;
  return hasImgTagNearTop || repeatsFeatured;
}

/* --------------------------------- page --------------------------------- */
export default async function PostPage({ params }) {
  const resolved = await params;
  const idOrSlug = resolved?.id;

  // derive siteKey from host (optional)
  let siteKey = "sandhills";
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "";
    siteKey = /sandhills/i.test(host) ? "sandhills" : "sandhills";
  } catch {}

  let post = null;
  try {
    post = await fetchPostByIdOrSlug(idOrSlug, siteKey);
  } catch (e) {
    console.error("[post] fetch failed:", e);
    post = null;
  }

  if (!post) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-bold">Post not found</h1>
        <p className="mt-2 text-neutral-600">We couldn’t find that story.</p>
      </main>
    );
  }

  /* ----------------------------- derived fields ----------------------------- */
  const title = pick(post, ["title", "headline"]) || "Untitled";
  const featured =
    pick(post, ["featured_image_url", "featured_image", "image", "photo", "og_image"]) || null;

  const imageAlt =
    pick(post, ["image_alt", "featured_image_alt", "title"]) || title;

  const imageCaption =
    pick(post, [
      "image_caption",
      "caption",
      "photo_credit",
      "featured_media.caption",
      "meta.image_caption",
    ]) || "";

  const bodyHtml = sanitizeHtml(
    pick(post, ["body", "content", "html", "article_html", "body_html", "content_html"]) || ""
  );

  const rawCats = pick(post, ["categories", "category", "tags"]) || [];
  const cats = Array.isArray(rawCats) ? rawCats : rawCats ? [rawCats] : [];
  const catName =
    (typeof cats[0] === "string" && cats[0]) ||
    (cats[0] && (cats[0].name || cats[0].title)) ||
    "";

  const published =
    pick(post, ["published", "published_at", "date", "created_at"]) ||
    pick(post, ["updated", "updated_at", "modified"]) ||
    null;

  // meta parts for one-line row
  const dateStr = published ? fmtDateTime(published) : "";
  const readStr = bodyHtml ? readingTime(bodyHtml) : "";

  const shouldRenderStandaloneHero = featured && !bodyAlreadyHasHero(bodyHtml, featured);

  /* ---------------------------------- view ---------------------------------- */
  return (
    <main className="mx-auto w-full max-w-4xl px-4">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="not-prose pt-6">
        <ol className="flex items-center gap-0 text-sm">
          <li>
            <a href="/" className="before:content-[''] hover:underline">Home</a>
          </li>
          {catName ? (
            <>
              <li aria-hidden="true" className="mx-2 select-none text-neutral-500">›</li>
              <li>
                <a
                  href={`/category/${encodeURIComponent(slugify(catName))}`}
                  className="before:content-[''] hover:underline"
                >
                  {String(catName).toLowerCase()}
                </a>
              </li>
            </>
          ) : null}
        </ol>
      </nav>

      {/* Title */}
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-black">{title}</h1>

      {/* Meta row: [STATE button] • date · time • 2 min read */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-600 not-prose">
        {catName ? (
          <a
            href={`/category/${encodeURIComponent(slugify(catName))}`}
            className="inline-block rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-wide text-neutral-700 hover:bg-neutral-50 uppercase"
          >
            {String(catName).toUpperCase()}
          </a>
        ) : null}

        {dateStr && catName ? <span className="text-neutral-400">•</span> : null}
        {dateStr ? <span>{dateStr}</span> : null}

        {readStr && (dateStr || catName) ? <span className="text-neutral-400">•</span> : null}
        {readStr ? <span>{readStr}</span> : null}
      </div>

      {/* Standalone hero (only if body doesn't already include one) */}
      {shouldRenderStandaloneHero ? (
        <figure className="mt-6">
          <img src={featured} alt={imageAlt} className="w-full h-auto rounded" />
          {imageCaption ? (
            <figcaption className="mt-2 text-xs text-neutral-600">
              {imageCaption}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      {/* Body — FORCE spacing even if a global CSS reset set p { margin: 0 } */}
      <article
        className="
          prose prose-neutral max-w-none mt-8
          prose-img:rounded
          [&_p]:!my-5
          [&_ul]:!my-5 [&_ol]:!my-5
          [&_li]:!my-1.5
          [&_h2]:!mt-10 [&_h2]:!mb-3
          [&_h3]:!mt-8  [&_h3]:!mb-2
        "
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      <ShareRow className="mt-10" />
    </main>
  );
}
