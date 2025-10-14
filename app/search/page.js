// app/search/page.js
import Link from "@/components/SafeLink";
import SearchForm from "@/components/SearchForm";
import { searchArticles } from "@/lib/api/search";

export const dynamic = "force-dynamic";

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function SearchPage({ searchParams }) {
  // In newer Next, searchParams is async
  const sp = await searchParams;
  // Accept both ?q= and ?search=
  const raw = sp?.q ?? sp?.search ?? "";
  const term = typeof raw === "string" ? raw.trim() : "";
  const results = term ? await searchArticles(term) : [];

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8 text-black">
      {/* Headline area */}
      <header className="mb-6">
        <h1 className="text-[28px] font-bold leading-tight">
          {term ? (
            <>
              Search results for <span className="underline">&ldquo;{term}&rdquo;</span>
            </>
          ) : (
            "Search"
          )}
        </h1>
      </header>

      {/* Search box (press Enter to submit) */}
      <div className="mb-8">
        <SearchForm initialQuery={term} />
        <p className="mx-auto mt-2 max-w-[720px] px-4 text-sm text-black/60">
          Type your search and press <span className="font-semibold">Enter</span>.
        </p>
      </div>

      {/* Page grid with right rail */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        {/* Results column */}
        <section className="md:col-span-8">
          {term && (
            <div className="mb-4 border-b border-black/15 pb-2 text-lg font-bold">
              Most Relevant
            </div>
          )}

          {term && results.length === 0 && (
            <div className="rounded-md border border-black/10 bg-[#F7F8F9] p-4">
              No results found. Try a different search.
            </div>
          )}

          <ul className="space-y-6">
            {results.map((r, i) => (
              <li key={r.id || i} className="border-b border-black/10 pb-6 last:border-b-0">
                <Link href={r.href || "#"} className="group block">
                  <div className="grid grid-cols-12 gap-4">
                    {/* Thumbnail */}
                    {r.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.image}
                        alt=""
                        className="col-span-12 h-44 w-full rounded-md object-cover sm:col-span-5"
                        loading="lazy"
                      />
                    ) : (
                      <div className="col-span-12 h-44 w-full rounded-md bg-black/10 sm:col-span-5" />
                    )}

                    {/* Text content */}
                    <div className="col-span-12 sm:col-span-7">
                      <h3 className="text-[18px] font-extrabold leading-snug group-hover:underline">
                        {r.title || "Untitled"}
                      </h3>
                      <div className="mt-1 text-xs text-black/60">
                        {r.updated ? `Updated ${fmtDate(r.updated)}` : null}
                      </div>
                      {r.snippet && (
                        <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-black/80">
                          {r.snippet}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Right rail — placeholder ads */}
        <aside className="md:col-span-4">
          <div className="sticky top-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex h-[150px] items-center justify-center rounded-[6px] bg-[#D9D9D9] text-[14px] text-black/70"
              >
                AD HERE
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
