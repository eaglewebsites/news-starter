// app/story/[id]/page.js
import { fetchArticleById } from "@/lib/eagleApi";
import AdSlot from "@/components/AdSlot";

export default async function StoryPage({ params }) {
  const { id } = params;

  // Adjust site if you need domain-based switching later
  const article = await fetchArticleById({ id, site: "sandhills" });

  if (!article) {
    // Basic 404
    return (
      <main className="mx-auto max-w-[900px] px-4 py-10">
        <h1 className="mb-4 text-3xl font-bold">Story not found</h1>
        <p>We couldn’t load that story. It may have been moved or unpublished.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[900px] px-4 py-8">
      <div className="mb-6">
        <AdSlot network="gam" slot="article-top" />
      </div>

      <article>
        <h1 className="text-4xl font-bold leading-tight">{article.title}</h1>
        {article.updated && (
          <div className="mt-2 text-sm text-gray-600">Updated: {article.updated}</div>
        )}

        {article.image && (
          <img
            src={article.image}
            alt=""
            className="my-6 w-full rounded-lg object-cover"
          />
        )}

        {/* Body is HTML from your API. If you fully trust the source, this is fine.
           If not, run it through a sanitizer first. */}
        {article.body && (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: article.body }}
          />
        )}
      </article>

      <div className="my-8">
        <AdSlot network="gam" slot="article-bottom" />
      </div>
    </main>
  );
}

export async function generateMetadata({ params }) {
  const article = await fetchArticleById({ id: params.id, site: "sandhills" });
  if (!article) return { title: "Story not found" };

  return {
    title: article.title,
    description: article.body ? article.body.replace(/<[^>]+>/g, "").slice(0, 150) : undefined,
    openGraph: {
      title: article.title,
      images: article.image ? [article.image] : [],
    },
  };
}

