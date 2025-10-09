// app/posts/[id]/page.js
import { fetchPostByIdOrSlug } from "@/lib/api/post";
import { getCurrentSiteKey } from "@/lib/site-detection";
import { notFound } from "next/navigation";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function PostPage({ params }) {
  const { id } = await params;
  const siteKey = ((await getCurrentSiteKey()) || "sandhills").toLowerCase();

  let post;
  try {
    post = await fetchPostByIdOrSlug({ idOrSlug: id, site: siteKey });
  } catch {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>

      <div className="mt-2 text-sm opacity-70">
        {post.author && <span>By {post.author}</span>}
        {post.author && post.updated && <span> · </span>}
        {post.updated && (
          <time dateTime={new Date(post.updated).toISOString()}>
            {new Date(post.updated).toLocaleString()}
          </time>
        )}
      </div>

      {/* Simply render the CMS-provided HTML body. No separate featured image block. */}
      <article
        className="prose prose-lg max-w-none mt-6"
        dangerouslySetInnerHTML={{ __html: post.bodyHtml || "<p>(No content)</p>" }}
      />
    </main>
  );
}
