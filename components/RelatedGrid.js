// components/RelatedGrid.js
import Link from "@/components/SafeLink";

export default function RelatedGrid({ items = [] }) {
  const hasItems = Array.isArray(items) && items.length > 0;

  return (
    <section className="mt-16 pb-[200px]">
      {/* Heading */}
      <h2 className="border-b-4 border-[#1e99d0] pb-3 text-[32px] font-bold leading-[100%] text-black">
        More Related Stories
      </h2>

      {hasItems && (
        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id ?? item.href ?? Math.random()} className="group">
              {/* Image (if available) */}
              {item.image?.src && (
                <Link href={item.href} className="block overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image.src}
                    alt={item.image.alt || ""}
                    className="h-48 w-full rounded-lg object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </Link>
              )}

              {/* Title */}
              <h3 className="mt-4 font-sans text-[24px] font-bold leading-[100%] text-[#1e99d0] group-hover:underline">
                <Link href={item.href}>{item.title}</Link>
              </h3>

              {/* Updated date */}
              {item.updated && (
                <p className="mt-1 font-sans text-[20px] italic font-extralight leading-[100%] text-black">
                  Updated{" "}
                  {new Date(item.updated).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
