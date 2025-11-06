// components/CategoryListWithLoadMore.js
"use client";

import CategoryLoadMore from "@/components/CategoryLoadMore";

/* tiny helpers */
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
      "featured_image_url","featured_image","featuredImage","image_url","image",
      "featured_image_thumbnail","thumbnail","thumb","media.0.url","photo","og_image",
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

export default function CategoryListWithLoadMore({
  slug,
  siteKey,
  pageSize = 24,
  sectionTitle = "Category",
  initialItems = [],
  noCropImages,
}) {
  const isObits = /obit/i.test(String(slug || ""));
  const forceNoCrop = noCropImages ?? isObits;

  // black title link; underline on hover only
  const titleLinkClasses = [
    "outline-none",
    "!text-black visited:!text-black hover:!text-black",
    "!no-underline hover:!underline underline-offset-2",
    "focus-visible:!underline",
  ].join(" ").trim();

  const thumbBoxDefault =
    "relative overflow-hidden bg-black shrink-0 w-[160px] h-[100px] md:w-[220px] md:h-[130px]";

  return (
    <div>
      {/* Initial SSR rows (left column only) */}
      <ul className="divide-y divide-neutral-200">
        {initialItems.map((raw, idx) => {
          const post = root(raw);
          const href = deriveHref(post);
          const img = deriveImage(post);
          const title = pick(post, ["title", "headline"]) || "Untitled";
          const updated =
            pick(post, ["updated","updated_at","modified","published","date","published_at"]) || null;

          const alt = `${(isObits ? "Obituary: " : "")}${title}`;

          return (
            <li key={(post.id || post.slug || href || idx) + "::row"} className="py-4">
              <div className="flex items-start gap-4 md:gap-5">
                {/* thumbnail (linked) */}
                {forceNoCrop ? (
                  <div className={thumbBoxDefault}>
                    {img ? (
                      <a href={href} className="block !text-inherit !no-underline">
                        <img
                          src={img}
                          alt={alt}
                          className="block max-w-full max-h-full w-auto h-auto object-contain"
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                        No image
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={thumbBoxDefault}>
                    {img ? (
                      <a href={href} className="block !text-inherit !no-underline">
                        <img
                          src={img}
                          alt={alt}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                        />
                      </a>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                        No image
                      </div>
                    )}
                  </div>
                )}

                {/* text column */}
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[20px] leading-[1]">
                    <a href={href} className={titleLinkClasses}>
                      {title}
                    </a>
                  </h3>

                  <div className="mt-1 text-[13px] leading-[1] font-light text-neutral-500">
                    {updated ? `Updated ${timeAgo(updated)}` : ""}
                  </div>

                  {raw._snippet ? (
                    <p
                      className="mt-2 text-[16px] leading-[1.5] font-normal text-neutral-800 line-clamp-3"
                      title={raw._snippet}
                    >
                      {raw._snippet}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Append more rows below; no rail here */}
      <CategoryLoadMore
        slug={slug}
        siteKey={siteKey}
        pageSize={pageSize}
        seedFromItems={initialItems}
        noCropImages={forceNoCrop}
        focusUnderline
        inlineAdEvery={0} // change to e.g. 5 if you want in-feed ads
      />
    </div>
  );
}
