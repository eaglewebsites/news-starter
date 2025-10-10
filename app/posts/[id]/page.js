// app/posts/[id]/page.js
import { fetchPostByIdOrSlug } from "@/lib/api/post";
import { getCurrentSiteKey } from "@/lib/site-detection";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 0;
export const dynamic = "force-dynamic";

/* ---------- small utils (server-side) ---------- */

function toDate(val) {
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function formatDateTime(val) {
  const d = toDate(val);
  if (!d) return "";
  return `${d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })} · ${d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function htmlToPlainText(html = "") {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ");
}

function readingTimeFromHtml(html) {
  const text = htmlToPlainText(html);
  const words = (text.match(/\S+/g) || []).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

/* ---------- page ---------- */

export default async function PostPage({ params }) {
  const { id } = await params;
  const siteKey = ((await getCurrentSiteKey()) || "sandhills").toLowerCase();

  let post;
  try {
    post = await fetchPostByIdOrSlug({ idOrSlug: id, site: siteKey });
  } catch {
    notFound();
  }

  const published = formatDateTime(post.updated || post.published_at || post.date);
  const readTime = readingTimeFromHtml(post.bodyHtml || "");
  const firstCategory =
    Array.isArray(post.categories) && post.categories.length
      ? String(post.categories[0])
      : null;

  const categoryHref = firstCategory
    ? `/category/${encodeURIComponent(firstCategory)}`
    : "/";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-10">
      {/* Top nav crumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <span aria-hidden>›</span>
        <Link href={categoryHref} className="hover:underline">
          {firstCategory ? firstCategory.replace(/-/g, " ") : "Stories"}
        </Link>
      </div>

      {/* Title */}
      <h1 className="text-3xl/tight font-bold tracking-tight md:text-4xl">
        {post.title}
      </h1>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-neutral-600">
        {firstCategory && (
          <Link
            href={categoryHref}
            className="rounded-full border px-2.5 py-1 text-xs uppercase tracking-wide hover:bg-neutral-50"
          >
            {firstCategory}
          </Link>
        )}
        {post.author && <span>By {post.author}</span>}
        {(post.author || published) && <span aria-hidden>·</span>}
        {published && <time>{published}</time>}
        {readTime && (
          <>
            <span aria-hidden>·</span>
            <span>{readTime}</span>
          </>
        )}
      </div>

      {/* Body (render CMS HTML exactly as provided) */}
      <article
        className={[
          // If @tailwindcss/typography is present, these apply:
          "prose prose-neutral md:prose-lg max-w-none",
          "prose-h2:mt-8 prose-h2:mb-3 prose-h2:text-xl md:prose-h2:text-2xl",
          "prose-h3:mt-6 prose-h3:mb-2",
          "prose-a:underline hover:prose-a:no-underline",
          "prose-img:rounded-xl prose-img:w-full",
          "prose-figure:mt-6 prose-figure:mb-6",
          "prose-figcaption:text-xs prose-figcaption:text-neutral-500",
          "prose-ul:my-5 prose-ol:my-5",
          "prose-blockquote:border-l-4 prose-blockquote:border-neutral-300 prose-blockquote:pl-4 prose-blockquote:italic",
          "prose-table:rounded-lg prose-table:overflow-hidden",

          // Fallback spacing if typography plugin isn’t active:
          "space-y-4",
          "[&>p]:mt-0 [&>p]:mb-4 [&>p]:leading-relaxed",
          "[&>h2]:mt-8 [&>h2]:mb-3 [&>h3]:mt-6 [&>h3]:mb-2",
          "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_ul]:my-5 [&_ol]:my-5",
          "[&_figure]:my-6 [&_img]:rounded-xl [&_img]:w-full",
          "[&_figcaption]:text-xs [&_figcaption]:text-neutral-500",
          "[&_blockquote]:my-5 [&&_blockquote]:border-l-4 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-4 [&_blockquote]:italic",
          "[&_table]:my-6 [&_table]:w-full [&_th]:text-left [&_td]:align-top",
        ].join(" ")}
        dangerouslySetInnerHTML={{ __html: post.bodyHtml || "<p>(No content)</p>" }}
      />

      {/* Footer nav */}
      <div className="mt-10 flex items-center justify-between not-prose">
        <Link
          href={categoryHref}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50"
        >
          ← Back
        </Link>

        {/* Force white label on brand background, resisting global/prose link colors */}
        <Link
          href={categoryHref}
          className="rounded-lg bg-[#012A3D] px-4 py-2 text-sm font-medium text-white !text-white visited:!text-white hover:!text-white focus-visible:!text-white no-underline hover:bg-[#012A3D]/90"
        >
          More {firstCategory ? firstCategory.replace(/-/g, " ") : "stories"}
        </Link>
      </div>
    </main>
  );
}
