// app/posts/[id]/page.js
import ShareRow from "@/components/ShareRow";
import { getApiBase, NO_STORE } from "@/lib/api-base";
import { getCurrentSiteKey } from "@/lib/site-detection";

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

/* ----------------------------- text utilities ------------------------------ */
function normalizeNbsp(s = "") {
  return String(s)
    .replace(/&amp;nbsp;/gi, " ")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/\u00a0/g, " ");
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

/* ------------------------------ body cleaning ------------------------------ */
/**
 * Remove the first <figure>…</figure> or leading <p><img…/></p> from the body
 * when we’re already rendering a featured image above.
 */
function stripLeadingFigureOrImage(html = "") {
  let out = String(html);

  // 1) If the very first non-whitespace block is a <figure>…</figure>, drop it.
  out = out.replace(/^\s*<figure[\s\S]*?<\/figure>\s*/i, "");

  // 2) If the first block is a <p> that only contains an <img> (and maybe a caption-ish <br>), drop it.
  out = out.replace(
    /^\s*<p>\s*(?:<a[^>]*>\s*)?<img\b[\s\S]*?\/>(?:\s*<\/a>)?(?:\s*<br\s*\/?>\s*)?\s*<\/p>\s*/i,
    ""
  );

  return out;
}

/**
 * Final sanitize: strip <script>, normalize &nbsp;, and conditionally drop the leading figure/img.
 */
function sanitizeBodyForDisplay(html = "", { dropFirstFigure = false } = {}) {
  let out = String(html).replace(/<script[\s\S]*?<\/script>/gi, "");
  if (dropFirstFigure) {
    out = stripLeadingFigureOrImage(out);
  }
  return normalizeNbsp(out);
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
  throw lastErr || new Error("[post] Not Found");
}

export const dynamic = "force-dynamic";

/* --------------------------------- page --------------------------------- */
export default async function PostPage({ params }) {
  const resolved = await params;
  const idOrSlug = resolved?.id;

  const siteKey = (await getCurrentSiteKey()) || "sandhills";

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

  // Sanitize body; if we have a featured image above, drop the first figure/img from the body
  const rawBody =
    pick(post, ["body", "content", "html", "article_html", "body_html", "content_html"]) || "";
  const bodyHtml = sanitizeBodyForDisplay(rawBody, { dropFirstFigure: Boolean(featured) });

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

  const metaPieces = [];
  if (catName) metaPieces.push(
    // category “pill” styled as a subtle chip
    `<span class="inline-block align-[2px] rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-neutral-700 uppercase">${String(catName)}</span>`
  );
  if (published) metaPieces.push(fmtDateTime(published)); // date + time
  if (bodyHtml) metaPieces.push(readingTime(bodyHtml));
  const metaLineHtml = metaPieces.join(" • ");

  /* ---------------------------------- view ---------------------------------- */
  return (
    <main className="mx-auto w-full max-w-4xl px-4">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="not-prose pt-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <a
              href="/"
              className="!text-sky-700 hover:!text-sky-800 hover:underline"
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
                  className="!text-sky-700 hover:!text-sky-800 hover:underline"
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

      {/* Meta line: inject chip + date/time + read-time */}
      {metaLineHtml ? (
        <div
          className="mt-2 text-sm text-neutral-600 not-prose"
          dangerouslySetInnerHTML={{ __html: metaLineHtml }}
        />
      ) : null}

      {/* Featured — one image, **no rounded corners** */}
      {featured ? (
        <div className="mt-6">
          <img src={featured} alt={title} className="w-full h-auto /* no rounded */" />
        </div>
      ) : null}

      {/* Body with nice paragraph spacing */}
      <article
        className="prose prose-neutral max-w-none mt-8 prose-p:my-5 prose-img:rounded-none"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      <ShareRow className="mt-10" />
    </main>
  );
}
