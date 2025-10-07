// app/posts/[id]/page.js
import { notFound } from "next/navigation";
import ArticleHeader from "@/components/ArticleHeader";
import FeaturedMedia from "@/components/FeaturedMedia";
import ArticleBody from "@/components/ArticleBody";
//import RelatedGrid from "@/components/RelatedGrid";
import { fetchArticleById, fetchRelated } from "@/lib/api/articles";

export const dynamic = "force-dynamic";

export default async function StoryPage({ params }) {
  const { id } = await params;

  let article;
  try {
    article = await fetchArticleById(id);
  } catch {
    return notFound();
  }
  if (!article) return notFound();

  const breadcrumb = article.section
    ? [
        {
          label: article.section?.name || article.section,
          href: `/section/${article.section?.slug || article.section}`,
        },
      ]
    : [];

  const related = await fetchRelated(article.id).catch(() => []);

  // Featured image URL for the header block
  const featuredSrc =
    article.image?.src ||
    article.featuredImage?.src ||
    article.image ||
    "";

  // Source body HTML
  let bodyHtml = article.html || article.bodyHtml || article.body || "";

  // --- helpers ---
  const decodeEntities = (s) =>
    (s || "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

  // 1) Extract first <figcaption>...</figcaption> from the body (as plain text)
  let captionFromBody = null;
  {
    const figcapRe = /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i;
    const m = bodyHtml.match(figcapRe);
    if (m && m[1]) {
      captionFromBody = decodeEntities(m[1].replace(/<[^>]+>/g, "").trim());
    }
  }

  // 2) Remove the first <figure>...</figure> block from the body (so we don't duplicate the hero image/caption)
  {
    const firstFigureRe = /<figure[^>]*>[\s\S]*?<\/figure>/i;
    bodyHtml = bodyHtml.replace(firstFigureRe, "");
  }

  // 3) Map caption/credit fields as backups if body had no caption
  const mappedCaption =
    captionFromBody ||
    article.image?.caption ||
    article.featuredImage?.caption ||
    article.imageCaption ||
    article.caption ||
    null;

  const mappedCredit =
    article.image?.credit ||
    article.featuredImage?.credit ||
    article.photoCredit ||
    article.credit ||
    null;

  return (
    <div className="bg-white text-black">
      {/* Header is rendered globally in app/layout.js */}
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-8 px-4 md:grid-cols-12">
        {/* Main content */}
        <div className="md:col-span-8">
          <ArticleHeader
            breadcrumb={breadcrumb}
            title={article.title}
            postedISO={article.published}
            updatedISO={article.updated}
          />

          {/* Space between meta and image */}
          <div className="mt-[20px]">
            <FeaturedMedia
              src={featuredSrc}
              alt={
                article.image?.alt ||
                article.featuredImage?.alt ||
                article.title
              }
              caption={mappedCaption}       // ← shows extracted figcaption text
              photoFrom={mappedCredit}      // ← still supports your "Photo from:" behavior
            />
          </div>

          {/* Body with the first figure removed */}
          <div className="pb-[100px]">
            <ArticleBody html={bodyHtml} />
          </div>

          {/* <RelatedGrid items={related} /> */}
        </div>

        {/* Right rail (weather + ads) */}
        <aside className="md:col-span-4">
          <div className="sticky top-6 space-y-4">
            <div className="rounded-[6px] border border-black/10 bg-[#F4F5F6] p-4">
              <div className="mb-2 font-bold">Weather</div>
              <div className="text-[14px]">
                Forecast: {new Date().toLocaleDateString()}
              </div>
            </div>

            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex h-[150px] items-center justify-center rounded-[6px] bg-[#D9D9D9] text-[14px] text-black/70"
              >
                AD HERE
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
