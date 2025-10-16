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

/* ------------------------------ sanitizers --------------------------------- */
function normalizeNbsp(s = "") {
  return String(s)
    .replace(/&amp;nbsp;/gi, " ")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/\u00a0/g, " ");
}
function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return "";
  return normalizeNbsp(html.replace(/<script[\s\S]*?<\/script>/gi, ""));
}
/** Remove entire <figure>…</figure> blocks (img + caption) — for obits to avoid dup image */
function stripFigures(html = "") {
  return String(html).replace(/<figure[\s\S]*?<\/figure>/gi, " ");
}
function stripHtmlToText(html = "") {
  return normalizeNbsp(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
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
  } catch { return ""; }
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
    if (!res.ok) { lastErr = new Error(`[post] ${res.status} ${res.statusText}`); continue; }
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
  throw lastErr || new Error("[post] Not Found]");
}

export const dynamic = "force-dynamic";

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

  // Alt + caption candidates
  const imgAlt =
    pick(post, ["image_alt", "featured_image_alt", "imageAlt"]) ||
    title ||
    "";
  const imgCaption =
    pick(post, ["image_caption", "caption", "photo_credit", "featured_media.caption"]) || "";

  // raw HTML body
  let bodyRaw =
    pick(post, ["body", "content", "html", "article_html", "body_html", "content_html"]) || "";

  // obits detection from categories/tags
  const rawCats = pick(post, ["categories", "category", "tags"]) || [];
  const cats = Array.isArray(rawCats) ? rawCats : rawCats ? [rawCats] : [];
  const catName =
    (typeof cats[0] === "string" && cats[0]) ||
    (cats[0] && (cats[0].name || cats[0].title)) ||
    "";
  const isObits = String(catName || "").toLowerCase().includes("obit");

  // For obits, strip <figure>…</figure> blocks from body (to avoid duplicate image/caption),
  // then sanitize and normalize &nbsp; etc.
  const bodyHtml = sanitizeHtml(isObits ? stripFigures(bodyRaw) : bodyRaw);

  const published =
    pick(post, ["published", "published_at", "date", "created_at"]) ||
    pick(post, ["updated", "updated_at", "modified"]) ||
    null;

  const metaPieces = [];
  if (catName) metaPieces.push(catName);
  if (published) metaPieces.push(fmtDateTime(published)); // date + time
  if (bodyHtml) metaPieces.push(readingTime(bodyHtml));
  const metaLine = metaPieces.join(" • ");

  /* ---------------------------------- view ---------------------------------- */
  return (
    <main className="mx-auto w-full max-w-4xl px-4">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="not-prose pt-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <a
              href="/"
              className="before:content-[''] !text-sky-700 hover:!text-sky-800 hover:underline"
            >
              Home
            </a>
          </li>

          {catName ? (
            <>
              <li aria-hidden="true" className="select-none text-neutral-500">›</li>
              <li>
                <a
                  href={`/category/${encodeURIComponent(slugify(catName))}`}
                  className="before:content-[''] !text-sky-700 hover:!text-sky-800 hover:underline"
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

      {/* Meta line */}
      {metaLine ? (
        <div className="mt-2 text-sm text-neutral-600">{metaLine}</div>
      ) : null}

      {/* Featured image — centered, smaller on md+; NO rounded corners */}
      {featured ? (
        <figure className="py-6">
          <img
            src={featured}
            alt={imgAlt}
            className="mx-auto w-full sm:w-full md:w-1/2"
          />
          {imgCaption ? (
            <figcaption className="text-center italic text-gray-700 text-sm pt-2">
              {imgCaption}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      {/* Body — spacing guaranteed via a plain <style> block below; images have no radius */}
      <article
        data-rich
        className="mt-2 max-w-none text-[17px] leading-[1.75]"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      <ShareRow className="mt-10" />

      {/* Plain style tag (safe in Server Component) — also remove any image rounding */}
      <style>{`
        article[data-rich] p { margin: 1.25rem 0; }
        article[data-rich] ul,
        article[data-rich] ol { margin: 1.25rem 0; padding-left: 1.25rem; }
        article[data-rich] li { margin: 0.25rem 0; }
        article[data-rich] h2 { margin-top: 2rem; margin-bottom: 0.75rem; }
        article[data-rich] h3 { margin-top: 1.5rem; margin-bottom: 0.5rem; }
        article[data-rich] img { border-radius: 0; max-width: 100%; height: auto; }
        figure img { border-radius: 0; }
      `}</style>
    </main>
  );
}
