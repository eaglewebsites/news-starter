// components/TopBanner.js
import { safeHref } from '@/lib/link-helpers'
import Link from "next/link";

export default function TopBanner({ stations = [] }) {
  const primaryHref = stations[0]?.href || "#";

  return (
    <div className="w-full bg-[#FFFFFF] text-black">
      <div className="mx-auto flex max-w-[1300px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Listen Live */}
       {/* Left: Listen Live + Stations */}
        <div className="flex min-w-0 items-center gap-3">
        {/* Just plain text, no background */}
        <span className="text-lg font-bold uppercase tracking-wide text-black">
            LISTEN LIVE
        </span>

        {/* Station logos (horizontal scroll on small screens) */}
        <nav className="relative -mx-1 flex min-w-0 items-center gap-3 overflow-x-auto px-1">
            {stations.map((st) => (
            <Link
              key={st.name}
              href={safeHref(st.href)}
              className="inline-flex items-center"
              title={st.name}
            >
              {st.logo ? (
                <>
                  <img
                    src={st.logo}
                    alt={st.alt || st.name}
                    className="h-7 w-auto md:h-8"
                    loading="lazy"
                  />
                  <span className="sr-only">{st.name}</span>
                </>
              ) : (
                <span className="whitespace-nowrap text-sm hover:underline">
                  {st.name}
                </span>
              )}
            </Link>

            ))}
        </nav>
        </div>


        {/* Right: Slogan */}
        <div className="text-right">
          <div className="text-[20px] font-bold leading-tight md:text-[24px]">
            YOUR NEWS. <span className="text-black/90">NO DISTRACTIONS.</span>
          </div>
          <div className="text-[14px] md:text-[16px]">
            <Link href="/subscribe" className="font-bold hover:underline">
              SIGN UP FOR NO ADS.
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
