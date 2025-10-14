// components/StoryListWithAds.js
"use client";

import Link from "@/components/SafeLink";

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

function deriveHref(post) {
  const slug = pick(post, ["slug", "seo_slug", "post_slug"]);
  const id   = pick(post, ["id", "uuid", "guid"]);
  const href = pick(post, ["href", "url"]);
  if (href) return href;
  if (slug) return `/posts/${encodeURIComponent(slug)}`;
  if (id)   return `/posts/${encodeURIComponent(String(id))}`;
  return "#";
}

function deriveImage(post) {
  return (
    pick(post, [
      "featured_image_url",
      "featured_image",
      "featuredImage",
      "image_url",
      "image",
      "thumbnail",
      "thumb",
      "media.0.url",
      "photo",
      "og_image",
    ]) || null
  );
}
function toDate(val) { try { const d = new Date(val); return isNaN(d.getTime()) ? null : d; } catch { return null; } }
function timeAgo(dateish) {
  const d = toDate(dateish);
  if (!d) return "";
  const diff = Date.now() - d.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function StoryListWithAds({
  items = [],
  sectionTitle = "Most Recent Stories",
  adSlots = 6,
  footer = null,
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-[100px]">
      <h2 className="section-underline-local text-xl font-bold tracking-tight text-black mb-4">
        {sectionTitle}
      </h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left: stories */}
        <div>
          <ul className="divide-y divide-neutral-200">
            {items.map((raw, idx) => {
              const post = root(raw);
              const href = deriveHref(post);
              const img = deriveImage(post);
              const title = pick(post, ["title", "headline"]) || "Untitled";
              const updated =
                pick(post, ["updated", "updated_at", "modified", "date", "published_at"]) || null;

              const snippet = raw._snippet || ""; // enriched text lives here
              const id = pick(post, ["id", "uuid", "guid", "slug", "seo_slug", "post_slug"]) || `row-${idx}`;

              return (
                <li key={(post.id || post.slug || href || idx) + "::row"} className="py-4">
                  <Link href={href} className="group grid grid-cols-[160px,1fr] gap-4 md:grid-cols-[220px,1fr]">
                    {/* Thumbnail */}
                    <div className="relative h-[100px] w-[160px] overflow-hidden bg-neutral-200 md:h-[130px] md:w-[220px]">
                      {img ? (
                        <img
                          src={img}
                          alt={title}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Text block */}
                    <div>
                      {/* Title */}
                      <h3 className="font-bold text-[20px] leading-[1] text-black group-hover:underline">
                        {title}
                      </h3>

                      {/* Updated */}
                      <div className="mt-1 text-[13px] leading-[1] font-light text-neutral-500">
                        {updated ? `Updated ${timeAgo(updated)}` : ""}
                      </div>

                      {/* Snippet */}
                      <p
                        className="mt-2 text-[16px] leading-[1.5] font-normal text-neutral-800"
                        data-snipsrc={snippet ? "server" : "none"}
                        data-snippetlen={snippet ? snippet.length : 0}
                        data-postid={id}
                        title={snippet || ""}
                      >
                        {snippet}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Footer slot (Load More etc.) */}
          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>

        {/* Right: vertical ad rail (now scrolling normally) */}
        <aside className="hidden lg:block">
          <div className="flex flex-col gap-8">
            {Array.from({ length: adSlots }).map((_, i) => (
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
    </section>
  );
}
