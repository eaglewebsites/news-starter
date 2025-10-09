// app/pages/[slug]/page.js
import { notFound } from "next/navigation";
import { fetchPageBySlug } from "@/lib/api/pages";
import ArticleBody from "@/components/ArticleBody";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = await fetchPageBySlug(slug);
  if (!page) return { title: "Page" };

  // Try to find a hero image either from the page fields or by peeking at the first figure in the body.
  const fig = extractFirstFigure(page.bodyHtml || "");
  const heroSrc = page.image || fig.imgSrc || null;

  const title = page.title || "Page";
  const description =
    typeof page.bodyHtml === "string"
      ? page.bodyHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)
      : "";

  const images = heroSrc ? [{ url: heroSrc, alt: title }] : [];
  return {
    title,
    description,
    openGraph: { title, description, images, type: "article" },
    twitter: { card: images.length ? "summary_large_image" : "summary", title, description, images },
  };
}

/** Escape a string for use inside a RegExp */
function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extract the FIRST <figure>…</figure> from HTML.
 * Returns { imgSrc, captionHtml, figureHtml, strippedHtml }.
 * - imgSrc: src from the first <img> inside that figure (if any)
 * - captionHtml: inner HTML of <figcaption> (if any)
 * - figureHtml: the entire matched figure block
 * - strippedHtml: original HTML with that first figure removed
 */
function extractFirstFigure(html = "") {
  const res = { imgSrc: null, captionHtml: "", figureHtml: "", strippedHtml: html || "" };
  if (!html) return res;

  const figMatch = html.match(/<figure[\s\S]*?<\/figure>/i);
  if (!figMatch) return res;

  const figureHtml = figMatch[0];
  res.figureHtml = figureHtml;

  // Find first <img ... src="...">
  const imgMatch = figureHtml.match(/<img[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  if (imgMatch) res.imgSrc = imgMatch[1];

  // Find <figcaption> inner HTML
  const capMatch = figureHtml.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
  if (capMatch) res.captionHtml = capMatch[1];

  // Remove this figure from the body
  res.strippedHtml = html.replace(figureHtml, "").trim();
  return res;
}

/** Clean up captions that may contain stray tags/quotes like:  " />  or embedded <img>/<a> */
function cleanCaption(raw = "") {
  let t = String(raw);

  // Remove any <img ...> fragments
  t = t.replace(/<img[^>]*>/gi, "");

  // Replace <br> with space
  t = t.replace(/<br\s*\/?>/gi, " ");

  // Remove stray closing fragments like  " />  or  "/>
  t = t.replace(/["']?\s*\/>\s*/g, " ");

  // Remove all remaining tags (including <a> wrappers)
  t = t.replace(/<[^>]*>/g, "");

  // Collapse whitespace
  t = t.replace(/\s+/g, " ").trim();

  return t;
}

export default async function CmsPage({ params }) {
  const { slug } = await params;
  const page = await fetchPageBySlug(slug);
  if (!page) return notFound();

  const bodyHtml = page.bodyHtml || "";

  // Pull first figure from the body (most CMS pages put the hero there)
  const firstFig = extractFirstFigure(bodyHtml);

  // Prefer page.image; fall back to the first figure's <img src>
  const heroSrc = page.image || firstFig.imgSrc || null;

  // Prefer page.imageCaption; fall back to first figure's caption
  const rawCaption = page.imageCaption || firstFig.captionHtml || "";
  const safeCaption = rawCaption ? cleanCaption(rawCaption) : "";

  // If we're using the first figure as the hero OR page.image exists and matches the figure's src,
  // strip that figure from the body to avoid duplicates.
  let bodyOut = bodyHtml;
  if (firstFig.figureHtml) {
    const matchesHero =
      (page.image && firstFig.imgSrc && page.image === firstFig.imgSrc) ||
      (!page.image && firstFig.imgSrc); // we're using fig as hero
    if (matchesHero) {
      bodyOut = firstFig.strippedHtml;
    }
  }

  return (
    <article className="mx-auto max-w-[880px] px-4 py-8 text-black">
      <header className="mb-6">
        <div className="mb-2 text-[14px] font-bold uppercase tracking-[0.06em] text-black">Page</div>
        <h1 className="font-sans text-[36px] font-bold leading-[100%] tracking-[0] uppercase">
          {page.title}
        </h1>
      </header>

      {heroSrc && (
        <figure className="mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroSrc}
            alt={page.title || ""}
            className="h-auto w-full rounded-[6px] border border-black/10"
          />
          {safeCaption && (
            <figcaption className="mt-2 text-center italic font-light text-[16px] leading-[100%] text-black/70">
              {safeCaption}
            </figcaption>
          )}
        </figure>
      )}

      <ArticleBody html={bodyOut} />
      <div className="pb-24" />
    </article>
  );
}
