// app/category/[slug]/page.js
import { notFound } from "next/navigation";
import { fetchCategoryPosts } from "@/lib/api/categories";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cat = await fetchCategoryPosts(slug, { limit: 1 });
  const title = cat?.label ? `${cat.label} — ${process.env.NEXT_PUBLIC_SITE_NAME || "News"}` : "Category";
  return { title, robots: { index: true, follow: true } };
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const cat = await fetchCategoryPosts(slug, { limit: 24 });

  if (!cat || !Array.isArray(cat.items)) return notFound();

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8">
      {/* Header */}
      <header className="mb-6">
        
        <h1 className="font-sans text-[36px] font-bold leading-[100%] tracking-[0] uppercase">
          {cat.label}
        </h1>
      </header>

      {/* Grid of posts */}
      {cat.items.length === 0 ? (
        <p className="text-black/70">No stories yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cat.items.map((p) => (
            <li key={String(p.id)}>
              <a href={p.href} className="group block rounded-[6px] border border-black/10 p-3 hover:shadow-md">
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt=""
                    className="mb-3 h-40 w-full rounded-[6px] object-cover"
                    loading="lazy"
                  />
                )}
                <h3 className="mb-1 text-[20px] font-bold leading-[120%] text-slate-900 group-hover:underline">
                  {p.title}
                </h3>
                {p.updated && (
                  <div className="text-[14px] text-black/60">Updated {fmtDate(p.updated)}</div>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* Bottom spacing */}
      <div className="pb-24" />
    </main>
  );
}
