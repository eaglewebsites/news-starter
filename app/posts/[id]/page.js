// app/posts/[id]/page.js
import ShareRow from "@/components/ShareRow";
import TwitterEmbeds from "@/components/TwitterEmbeds"; // upgrades <blockquote class="twitter-tweet">…
import ScriptedHtml from "@/components/ScriptedHtml";   // runs allow-listed <script> tags
import { getApiBase, NO_STORE } from "@/lib/api-base";
import { getCurrentSiteKey } from "@/lib/site-detection-server";

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
function normalizeNbspToEntity(s = "") {
  return String(s)
    .replace(/&amp;nbsp;/gi, "&#160;")
    .replace(/&nbsp;/gi, "&#160;")
    .replace(/\u00a0/g, "&#160;");
}
function stripHtmlToText(html = "") {
  return normalizeNbspToEntity(
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
  } catch {
    return "";
  }
}
function readingTime(html) {
  const words = stripHtmlToText(html).split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 220));
  return `${mins} min read`;
}

/* ------------------------------ body helpers ------------------------------- */
function extractFirstFigure(html = "") {
  const res = { imgSrc: null, figureHtml: "", strippedHtml: html || "" };
  if (!html) return res;
  const figMatch = html.match(/<figure[\s\S]*?<\/figure>/i);
  if (!figMatch) return res;

  const figureHtml = figMatch[0];
  res.figureHtml = figureHtml;

  const imgMatch = figureHtml.match(/<img[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  if (imgMatch) res.imgSrc = imgMatch[1];

  res.strippedHtml = html.replace(figureHtml, "").trim();
  return res;
}

function normalizeForDisplay(html = "") {
  return normalizeNbspToEntity(String(html));
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
async function fetchPostByIdOrSlug(idOrSlug, siteKey = "") {
  const BASE = getApiBase();
  const qpSite = siteKey ? `&sites=${siteKey}` : "";
  const tries = [
    `${BASE}/posts?slug=${encodeURIComponent(idOrSlug)}&public=true&status=published${qpSite}&limit=10`,
    `${BASE}/posts/${encodeURIComponent(idOrSlug)}?public=true&status=published${qpSite}`,
    `${BASE}/posts?id=${encodeURIComponent(idOrSlug)}&public=true&status=published${qpSite}&limit=10`,
    `${BASE}/posts?search=${encodeURIComponent(idOrSlug)}&public=true&status=published${qpSite}&limit=20`,
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

  const siteKey = (await getCurrentSiteKey()) || "";

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

  const title = pick(post, ["title", "headline"]) || "Untitled";
  const featured =
    pick(post, ["featured_image_url", "featured_image", "image", "photo", "og_image"]) || null;

  const rawBody =
    pick(post, ["body", "content", "html", "article_html", "body_html", "content_html"]) || "";

  const firstFig = extractFirstFigure(rawBody);
  const heroSrc = featured || firstFig.imgSrc || null;

  const bodyWithoutDup =
    heroSrc && firstFig.imgSrc && heroSrc === firstFig.imgSrc
      ? firstFig.strippedHtml
      : rawBody;

  const bodyHtml = normalizeForDisplay(bodyWithoutDup);

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
    `<span class="inline-block align-[2px] rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-neutral-700 uppercase">${String(catName)}</span>`
  );
  if (published) metaPieces.push(fmtDateTime(published));
  if (bodyHtml) metaPieces.push(readingTime(bodyHtml));
  const metaLineHtml = metaPieces.join(" • ");

  return (
    <main className="mx-auto w-full max-w-4xl px-4">
      <TwitterEmbeds />

      <nav aria-label="Breadcrumb" className="not-prose pt-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <a href="/" className="!text-sky-700 hover:!text-sky-800 hover:underline">Home</a>
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

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-black">{title}</h1>

      {metaLineHtml ? (
        <div
          className="mt-2 text-sm text-neutral-600 not-prose"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: metaLineHtml }}
        />
      ) : null}

      {heroSrc ? (
        <div className="mt-6">
          <img src={heroSrc} alt={title} className="w-full h-auto /* no rounded */" />
        </div>
      ) : null}

      {/* Apply .article-body so our global margins always win */}
      <article className="article-body prose prose-neutral max-w-none mt-8 prose-img:rounded-none">
        <ScriptedHtml html={bodyHtml} suppressHydrationWarning />
      </article>

      <ShareRow className="mt-10" />
    </main>
  );
}
