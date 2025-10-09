// app/category/[slug]/page.js
import { fetchCategoryPosts } from "@/lib/api/categories";
import CategoryCard from "@/components/CategoryCard";
import CategoryLoadMore from "@/components/CategoryLoadMore";
import { getCurrentSiteKey } from "@/lib/site-detection";

export default async function CategoryPage({ params }) {
  // Your Next version requires awaiting params:
  const { slug } = await params;

  const PAGE_SIZE = 24;

  // Detect site server-side and pass to client as prop
  const siteKey = ((await getCurrentSiteKey()) || "sandhills").toLowerCase();

  // Initial SSR batch
  const initialPosts = await fetchCategoryPosts({
    slug,
    limit: PAGE_SIZE,
    offset: 0,
    site: siteKey,
  });

  // IDs to help client de-dupe what SSR already rendered
  const initialIds = initialPosts.map((p) => p.id).filter(Boolean);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 capitalize">{slug} News</h1>

      {/* Initial stories (SSR) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {initialPosts.map((p) => (
          <div key={p.id}>
            <CategoryCard post={p} />
          </div>
        ))}
      </div>

      {/* Client-side “Load More” */}
      <CategoryLoadMore
        slug={slug}
        siteKey={siteKey}
        initialOffset={initialPosts.length}
        initialIds={initialIds}
        pageSize={PAGE_SIZE}
      />
    </main>
  );
}
