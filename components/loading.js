// app/category/[slug]/loading.js

export default function LoadingCategory() {
  // Simple page-level skeleton that visually matches your list rows
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[100px]">
      <h2 className="section-underline-local text-xl font-bold tracking-tight text-black mb-4">
        Loading…
      </h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left: skeleton list */}
        <div>
          <ul className="divide-y divide-neutral-200">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="py-4">
                <div className="flex items-start gap-4 md:gap-5 animate-pulse">
                  {/* Thumb placeholder (same size as real) */}
                  <div className="relative overflow-hidden bg-black shrink-0 w-[160px] h-[100px] md:w-[220px] md:h-[130px]">
                    <div className="absolute inset-0 bg-neutral-800/40" />
                  </div>
                  {/* Text placeholder */}
                  <div className="min-w-0 flex-1">
                    <div className="h-5 w-3/4 rounded bg-neutral-200" />
                    <div className="mt-2 h-3 w-1/3 rounded bg-neutral-200" />
                    <div className="mt-3 space-y-2">
                      <div className="h-4 w-full rounded bg-neutral-200" />
                      <div className="h-4 w-11/12 rounded bg-neutral-200" />
                      <div className="h-4 w-10/12 rounded bg-neutral-200" />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: ad rail placeholders */}
        <aside className="hidden lg:block">
          <div className="flex flex-col gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex h-[250px] w-[300px] items-center justify-center bg-neutral-200 text-neutral-500 animate-pulse">
                AD
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
