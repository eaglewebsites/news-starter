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

/* ------------------------------ image helpers ------------------------------ */
function filenameStem(u = "") {
  try {
    let s = String(u || "").trim();
    if (!s) return "";
    s = s.split("#")[0].split("?")[0];
    const lastSlash = s.lastIndexOf("/");
    let file = (lastSlash >= 0 ? s.slice(lastSlash + 1) : s).toLowerCase();
    try { file = decodeURIComponent(file); } catch {}
    file = file.replace(
      /-(?:\d{2,4}x\d{2,4}|scaled|rotated|edited|e\d{2,3}|crop)(?=\.(?:jpe?g|png|webp|gif|avif)\b)/g,
      ""
    );
    return file;
  } catch {
    return String(u || "").toLowerCase();
  }
}

/* --------------------------- media extraction utils ------------------------- */
/** Find the FIRST <figure>…</figure> anywhere; return { imgSrc, start, end, html } */
function findFirstFigure(html = "") {
  const m = html.match(/<figure[\s\S]*?<\/figure>/i);
  if (!m) return null;
  const htmlFrag = m[0];
  const start = html.indexOf(htmlFrag);
  const end = start + htmlFrag.length;
  const imgM = htmlFrag.match(/<img[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  return { imgSrc: imgM ? imgM[1] : null, start, end, html: htmlFrag };
}

/** Find a leading <p>(<a>)?<img…/></p> at the very top; return { imgSrc, html } */
function findLeadingParaImg(html = "") {
  const m = html.match(
    /^\s*<p>\s*(?:<a[^>]*>\s*)?<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*\/?>\s*(?:<\/a>)?\s*(?:<br\s*\/?>\s*)?\s*<\/p>/i
  );
  if (!m) return null;
  return { imgSrc: m[1] || null, html: m[0] };
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
export default async function PostPage({ params, searchParams }) {
  // Next.js 15: params/searchParams are Promises — await them before use
  const { id: idOrSlug } = await params;

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

  const rawBody =
    pick(post, ["body", "content", "html", "article_html", "body_html", "content_html"]) || "";

  // Compute for debug; hero ONLY uses the first <figure> image:
  const leadPara = findLeadingParaImg(rawBody); // ignored for hero, still available in debug
  const firstFig = findFirstFigure(rawBody);

  // Only use FIRST <figure> image as the hero
  const heroSrc = firstFig?.imgSrc || null;

  // Remove that FIRST <figure> from the body to avoid duplication
  let bodyNoDup = rawBody;
  let removalReason = "(none)";
  if (firstFig?.html && typeof firstFig.start === "number" && typeof firstFig.end === "number") {
    bodyNoDup = bodyNoDup.slice(0, firstFig.start) + bodyNoDup.slice(firstFig.end);
    removalReason = "removed first <figure> (used as hero)";
  }

  const bodyHtml = normalizeForDisplay(bodyNoDup);

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

  // Await searchParams before use (Next 15)
  const sp = await searchParams;
  const rawDebug = typeof sp?.get === "function" ? sp.get("debug") : sp?.debug;
  const debugOn = String(Array.isArray(rawDebug) ? rawDebug[0] : rawDebug || "")
    .toLowerCase() === "1";

  /* ----------------------------- layout with rail ----------------------------- */
  // Matches StoryListWithAds: 1fr content + 320px rail, rail hidden on mobile.
  // Rail uses the same placeholder boxes (300x250) and spacing classes.
  return (
    <main className="mx-auto w-full max-w-7xl px-4">
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* LEFT: story content */}
        <div>
          {heroSrc ? (
            <div className="mt-0">
              <img src={heroSrc} alt={title} className="w-full h-auto /* no rounded */" />
            </div>
          ) : null}

          <article className="article-body prose prose-neutral max-w-none mt-8 prose-img:rounded-none">
            <ScriptedHtml html={normalizeNbspToEntity(bodyHtml)} suppressHydrationWarning />
          </article>

          <ShareRow className="mt-10" />

          {debugOn && (
            <pre className="mt-6 whitespace-pre-wrap text-xs bg-yellow-50 border border-yellow-300 rounded p-3 text-black">
              HERO (first &lt;figure&gt; img): {heroSrc || "(none)"}{"\n"}
              FIRST_FIG_IMG: {firstFig?.imgSrc || "(none)"}{"\n"}
              LEADING_P_IMG (ignored for hero): {leadPara?.imgSrc || "(none)"}{"\n"}
              REMOVED: {removalReason}
            </pre>
          )}
        </div>

        {/* RIGHT: vertical ad rail — IDENTICAL placeholder markup to StoryListWithAds */}
        <aside className="hidden lg:block">
          <div className="flex flex-col gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
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
    </main>
  );
}
