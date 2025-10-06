// app/posts/[id]/page.js
import { notFound } from "next/navigation";
import ArticleHeader from "@/components/ArticleHeader";
import FeaturedMedia from "@/components/FeaturedMedia";
import ArticleBody from "@/components/ArticleBody";
import RelatedGrid from "@/components/RelatedGrid";
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
          label: article.section.name || article.section,
          href: `/section/${article.section.slug || article.section}`,
        },
      ]
    : [];

  const related = await fetchRelated(article.id).catch(() => []);

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

          {/* ✅ Added spacing below header */}
          <div className="mt-[20px]">
            <FeaturedMedia
              src={
                article.image?.src ||
                article.featuredImage?.src ||
                article.image
              }
              alt={
                article.image?.alt ||
                article.featuredImage?.alt ||
                article.title
              }
              photoFrom={
                article.image?.credit || article.featuredImage?.credit
              }
            />
          </div>

          <ArticleBody html={article.html || article.bodyHtml || article.body} />

          <RelatedGrid items={related} />
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
