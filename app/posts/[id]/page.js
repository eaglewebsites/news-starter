// app/posts/[id]/page.js
import { fetchPostByIdOrSlug } from "@/lib/api/post";
import { getCurrentSiteKey } from "@/lib/site-detection";
import { notFound } from "next/navigation";

export const revalidate = 0;
export const dynamic = "force-dynamic";

/** Normalize an image URL/path for robust comparisons */
function normalizePathish(u) {
  if (!u) return "";
  let s = String(u).trim().toLowerCase();

  // Try URL parsing first
  try {
    const url = new URL(s);
    s = url.pathname; // drop scheme/host/query/hash
  } catch {
    // Strip scheme/host if provided (best-effort)
    s = s.replace(/^https?:\/\/[^/]+/i, "");
    // Drop query/hash
    s = s.split("?")[0].split("#")[0];
  }

  // Decode and collapse duplicate slashes
  try { s = decodeURIComponent(s); } catch {}
  s = s.replace(/\/{2,}/g, "/");

  // Remove common thumbnail/resizing suffixes like "-1200x630" before extension
  s = s.replace(/-?\d{2,4}x\d{2,4}(?=\.[a-z0-9]+$)/i, "");

  return s;
}

/** Extract the filename (without any size suffix) for looser matching */
function filenameKey(u) {
  const p = normalizePathish(u);
  const file = p.split("/").filter(Boolean).pop() || "";
  return file.replace(/-?\d{2,4}x\d{2,4}(?=\.[a-z0-9]+$)/i, "");
}

/** Decide if the featured image is already present in the HTML body */
function bodyAlreadyContainsImage(featuredUrl, bodyHtml) {
  if (!featuredUrl || !bodyHtml) return false;

  const body = String(bodyHtml).toLowerCase();

  // 1) Direct URL/path match
  const normFeat = normalizePathish(featuredUrl);
  if (normFeat && body.includes(normFeat)) return true;

  // 2) Filename match (handles CDN/host differences and resized variants)
  const key = filenameKey(featuredUrl);
  return key ? body.includes(key) : false;
}

export default async function PostPage({ params }) {
  const { id } = await params;
  const siteKey = ((await getCurrentSiteKey()) || "sandhills").toLowerCase();

  let post;
  try {
    post = await fetchPostByIdOrSlug({ idOrSlug: id, site: siteKey });
  } catch {
    notFound();
  }

  const shouldShowFeatured =
    !!post.image && !bodyAlreadyContainsImage(post.image, post.bodyHtml);

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

      {shouldShowFeatured && (
        <figure className="mt-5">
          <img
            src={post.image}
            alt={post.title || ""}
            className="w-full h-auto rounded-xl"
            loading="lazy"
          />
          {post.caption && (
            <figcaption
              className="mt-2 text-xs opacity-70"
              dangerouslySetInnerHTML={{ __html: post.caption }}
            />
          )}
        </figure>
      )}

      <article
        className="prose prose-lg max-w-none mt-6"
        dangerouslySetInnerHTML={{ __html: post.bodyHtml || "<p>(No content)</p>" }}
      />
    </main>
  );
}
