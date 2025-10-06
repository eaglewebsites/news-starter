// components/ArticleHeader.js
import Link from "next/link";

export default function ArticleHeader({
  breadcrumb = [],
  title,
  postedISO,        // e.g. "2025-07-19T12:00:00Z"
  updatedISO,       // e.g. "2025-07-19T14:35:00Z"
}) {
  const f = (iso, fmt) =>
    iso
      ? new Date(iso).toLocaleString(undefined, fmt || {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;

  return (
    <header className="mx-auto w-full max-w-[880px] px-4 pt-6 sm:pt-10">
      {/* Breadcrumbs */}
      {breadcrumb?.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="mb-3 text-[12px] leading-[100%] text-black/60"
        >
          {breadcrumb.map((b, i) => (
            <span key={`${b.href || b.label}-${i}`}>
              {i > 0 && <span className="mx-1">/</span>}
              {b.href ? (
                <Link href={b.href} className="hover:underline">
                  {b.label}
                </Link>
              ) : (
                b.label
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Section name */}
      <div className="mb-[30px] font-sans font-bold uppercase tracking-[0.02em] text-black text-[36px]">
        News
      </div>

      {/* Title — bold 36px, uppercase, 100% line height */}
      <h1 className="font-sans font-bold uppercase text-[30px] leading-[100%] tracking-[0] text-black">
        {title}
      </h1>

      {/* Posted / Updated row */}
      <div className="mt-3 flex flex-col gap-1">
        {postedISO && (
          <div className="italic font-light text-[20px] leading-[100%]">
            Posted: {f(postedISO)}
          </div>
        )}
        {updatedISO && (
          <div className="italic font-light text-[12px] leading-[100%]">
            Updated: {f(updatedISO, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        )}
      </div>
    </header>
  );
}
