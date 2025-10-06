export default function PodcastSection({ items = [] }) {
  const keyFor = (it, idx) =>
    it.id || it.slug || it.href || it.title || `idx-${idx}`;

  return (
  <section aria-labelledby="podcasts-heading" className="pb-20">
    <h2 id="podcasts-heading" className="section-underline-podcasts font-bold text-[32px]">
      Podcasts
    </h2>

    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((it, idx) => (
        <article key={keyFor(it, idx)} className="rounded-md border bg-white p-3 shadow-sm">
          {/* thumbnail */}
          {it.image && (
            <img src={it.image} alt="" className="h-40 w-full rounded-md object-cover" />
          )}
          {/* title */}
          <h3 className="mt-3 font-bold text-[16px] hover:underline">
            <a href={it.href || `/posts/${it.slug || it.id || ""}`}>{it.title}</a>
          </h3>
          {/* meta (optional) */}
          {it.meta && <div className="mt-1 text-[10px] text-gray-600">{it.meta}</div>}
        </article>
      ))}
    </div>
  </section>
  );
}
