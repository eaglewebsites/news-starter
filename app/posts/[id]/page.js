// app/posts/[id]/page.js
import { fetchPostByIdOrSlug } from "@/lib/api/post";
import { fetchCategoryPosts } from "@/lib/api/categories";
import { getCurrentSiteKey } from "@/lib/site-detection";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import ShareRow from "@/components/ShareRow";

export const revalidate = 0;
export const dynamic = "force-dynamic";

/* ---------- small utils ---------- */
function toDate(val) { try { const d = new Date(val); return isNaN(d.getTime()) ? null : d; } catch { return null; } }
function formatDateTime(val) {
  const d = toDate(val); if (!d) return "";
  return `${d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"2-digit"})} · ${d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}`;
}
function htmlToPlainText(html = "") {
  return String(html).replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi,"").replace(/<[^>]+>/g," ");
}
function readingTimeFromHtml(html) {
  const words = (htmlToPlainText(html).match(/\S+/g) || []).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}
function addClassesToNthImage(html, n = 2, classes = "") {
  if (!html || n < 1 || !classes) return html;
  let index = 0;
  const imgTagRe = /<img\b[^>]*?>/gi;
  return html.replace(imgTagRe, (imgTag) => {
    index += 1;
    if (index !== n) return imgTag;
    const classAttrRe = /\bclass\s*=\s*(['"])(.*?)\1/i;
    if (classAttrRe.test(imgTag)) {
      return imgTag.replace(classAttrRe, (m, q, existing) => {
        const merged = new Set(`${existing} ${classes}`.trim().split(/\s+/).filter(Boolean));
        return `class=${q}${Array.from(merged).join(" ")}${q}`;
      });
    }
    return imgTag.replace(/<img\b/i, `<img class="${classes}"`);
  });
}

/* ---------- page ---------- */
export default async function PostPage({ params }) {
  const { id } = await params;
  const siteKey = ((await getCurrentSiteKey()) || "sandhills").toLowerCase();

  let post;
  try { post = await fetchPostByIdOrSlug({ idOrSlug: id, site: siteKey }); } catch { notFound(); }

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") || "http";
  const path = `/posts/${encodeURIComponent(id)}`;
  const absoluteUrl = host ? `${proto}://${host}${path}` : path;

  const processedHtml = addClassesToNthImage(post.bodyHtml || "", 2, "mx-auto w-full sm:w-full md:w-1/2");

  const published = formatDateTime(post.updated || post.published_at || post.date);
  const readTime = readingTimeFromHtml(post.bodyHtml || "");
  const firstCategory = Array.isArray(post.categories) && post.categories.length ? String(post.categories[0]) : null;
  const categoryHref = firstCategory ? `/category/${encodeURIComponent(firstCategory)}` : "/";

  // prev/next (best-effort)
  let prev = null, next = null;
  if (firstCategory) {
    try {
      const list = await fetchCategoryPosts({ slug: firstCategory, limit: 10, offset: 0, site: siteKey });
      const selfIndex = list.findIndex((p) => {
        try {
          const seg = (p.href || "").split("/").filter(Boolean).pop();
          const pid = post.id ? String(post.id) : "";
          const pslug = post.slug ? String(post.slug) : "";
          return seg === pid || seg === pslug;
        } catch { return false; }
      });
      if (selfIndex >= 0) { prev = list[selfIndex - 1] || null; next = list[selfIndex + 1] || null; }
      else {
        const filtered = list.filter((p) => (p.href || "").split("/").pop() !== String(post.id));
        prev = filtered[0] || null; next = filtered[1] || null;
      }
    } catch {}
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-10 print:max-w-none print:px-6">
      {/* Print helper */}
      <style>{`@media print{a[href^="http"]::after{content:" (" attr(href) ")";font-weight:normal}.no-print{display:none!important}}`}</style>

      {/* Scoped styles for meta-row category pill (white on hover) */}
      <style>{`
        .meta-row a {
          color: #1f1f1f !important;
          border-color: rgba(229, 229, 229, 1); /* neutral-200 */
        }
        .meta-row a:hover {
          color: #ffffff !important;
          background-color: #012A3D !important;
          border-color: #012A3D !important;
        }
      `}</style>

      {/* Top nav crumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 no-print">
        <Link href="/" className="hover:underline">Home</Link>
        <span aria-hidden>›</span>
        <Link href={categoryHref} className="hover:underline">
          {firstCategory ? firstCategory.replace(/-/g, " ") : "Stories"}
        </Link>
      </div>

      {/* Title */}
      <h1 className="text-3xl/tight font-bold tracking-tight md:text-4xl">{post.title}</h1>

      {/* Meta row — inline styles lock color; pill hover turns white */}
      <div
        className="meta-row not-prose mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm pb-4"
        style={{ color: "#1f1f1f", opacity: 1 }}
      >
        {firstCategory && (
          <Link
            href={categoryHref}
            className="rounded-full border px-2.5 py-1 text-xs uppercase tracking-wide dark:border-neutral-700 no-print"
          >
            {firstCategory}
          </Link>
        )}
        <span aria-hidden style={{ color: "#1f1f1f", opacity: 1 }}>·</span>
        {published && <time style={{ color: "#1f1f1f", opacity: 1 }}>{published}</time>}
        <span aria-hidden style={{ color: "#1f1f1f", opacity: 1 }}>·</span>
        {readTime && <span style={{ color: "#1f1f1f", opacity: 1 }}>{readTime}</span>}
      </div>

      {/* Body */}
      <article
        className={[
          "prose prose-neutral md:prose-lg max-w-none dark:prose-invert",
          "prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-xl md:prose-h2:text-2xl",
          "prose-h3:mt-6 prose-h3:mb-2",
          "prose-a:underline hover:prose-a:no-underline",
          "prose-img:rounded-none",
          "[&_figure.full-bleed]:relative [&_figure.full-bleed]:left-1/2 [&_figure.full-bleed]:-translate-x-1/2 [&_figure.full-bleed]:w-screen [&_figure.full-bleed]:max-w-none",
          "[&_img.full-bleed]:relative [&_img.full-bleed]:left-1/2 [&_img.full-bleed]:-translate-x-1/2 [&_img.full-bleed]:w-screen [&_img.full-bleed]:max-w-none",
          "prose-figure:mt-6 prose-figure:mb-6",
          "prose-figcaption:text-center prose-figcaption:italic",
          "prose-figcaption:text-sm md:prose-figcaption:text-base",
          "prose-figcaption:mt-4",
          "prose-blockquote:text-xl md:prose-blockquote:text-2xl prose-blockquote:italic prose-blockquote:text-center",
          "prose-blockquote:border-l-4 prose-blockquote:border-neutral-300 dark:prose-blockquote:border-neutral-600 prose-blockquote:pl-4",
          "prose-ul:my-5 prose-ol:my-5",
          "[&_table]:my-6 [&_table]:w-full [&_th]:text-left [&_td]:align-top",
          "[&_tbody tr:nth-child(even)]:bg-neutral-50 dark:[&_tbody tr:nth-child(even)]:bg-neutral-800/40",
          "space-y-4",
          "[&>p]:mt-0 [&>p]:mb-4 [&>p]:leading-relaxed",
          "[&_img]:rounded-none",
        ].join(" ")}
        dangerouslySetInnerHTML={{ __html: processedHtml || "<p>(No content)</p>" }}
      />

      {/* Share row */}
      <ShareRow title={post.title} url={absoluteUrl} />

      {(prev || next) && (
        <div className="mt-12 border-t pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
          {prev ? (
            <Link href={prev.href} className="group block max-w-[48ch]">
              <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Previous</div>
              <div className="mt-1 text-base font-medium group-hover:underline">{prev.title}</div>
            </Link>
          ) : <span />}
          {next ? (
            <Link href={next.href} className="group block max-w-[48ch] text-right sm:text-left">
              <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Next</div>
              <div className="mt-1 text-base font-medium group-hover:underline">{next.title}</div>
            </Link>
          ) : <span />}
        </div>
      )}

      {/* Footer nav */}
      <div className="mt-10 flex items-center justify-between not-prose no-print">
        <Link
          href={categoryHref}
          className="rounded-lg border border-neutral-200 text-neutral-900 px-4 py-2 text-sm hover:bg-[#012A3D] hover:!text-white visited:hover:!text-white dark:border-neutral-700 transition-colors"
        >
          ← Back
        </Link>
        <Link
          href={categoryHref}
          className="rounded-lg bg-[#012A3D] px-4 py-2 text-sm font-medium text-white !text-white visited:!text-white hover:!text-white focus-visible:!text-white no-underline hover:opacity-90"
        >
          More {firstCategory ? firstCategory.replace(/-/g, " ") : "stories"}
        </Link>
      </div>
    </main>
  );
}
