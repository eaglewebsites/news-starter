"use client";
import ArrowBlue from "./ArrowBlue";

// components/MoreStories.js


export default function MoreStories({ items = [] }) {
  if (!items.length) return null;

  return (
    <section aria-labelledby="more-stories-heading">
      <h2 id="more-stories-heading" className="section-underline-more font-bold text-[20px]">
        More Stories this week
      </h2>

      <ol className="mt-4 grid grid-cols-1 gap-3">
        {items.map((item) => {
          

          return (
            <li key={item.id || item.slug || item.href || item.title}>
              <a
                href={item.href ?? `/posts/${item.slug ?? item.id ?? ""}`}
                className="group flex items-start gap-2"
              >
                {/* Blue triangular arrow (SVG) */}
                <ArrowBlue className="mt-1 h-3 w-3 shrink-0 text-[--color-sky]" aria-hidden />

                <div>
                  <h3 className="font-bold text-[16px] leading-tight group-hover:underline">
                    {item.title}
                  </h3>

                  {item.meta ? (
                    <div className="mt-1 text-[10px] text-gray-600">{item.meta}</div>
                  ) : null}
                </div>
              </a>
            </li>

          );
        })}
      </ol>
    </section>
  );
}
