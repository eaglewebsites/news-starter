// components/CategoryCard.js
"use client";

import Link from "next/link";

export default function CategoryCard({ post }) {
  const href = post?.href || "#";
  const title = post?.title || "Untitled";
  const image = post?.image || null;
  const updated = post?.updated ? new Date(post.updated) : null;

  return (
    <article className="rounded-2xl border border-neutral-200 overflow-hidden bg-white hover:shadow transition">
      <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-black">
        {image ? (
          <div className="aspect-[16/9] w-full bg-neutral-100 overflow-hidden">
            <img src={image} alt={title} className="h-full w-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="aspect-[16/9] w-full bg-neutral-100" />
        )}

        <div className="p-4">
          <h2 className="text-base font-semibold leading-snug line-clamp-2">{title}</h2>
          {updated && (
            <div className="mt-2 text-xs text-neutral-600">
              {updated.toLocaleDateString()}{" "}
              {updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}