"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Props:
 * - logo: string (path/url)
 * - stations: [{ name, href, logoSrc? }]
 * - menu: { links: [{ title, link, external, target, sublinks: [...] }]}
 */
export default function SiteHeader({ logo, stations = [], menu }) {
  const [open, setOpen] = useState(false);

  const links = menu?.links ?? [];

  const Anchor = ({ item, className = "" }) =>
    item.external ? (
      <a href={item.link} target={item.target || "_self"} rel="noreferrer" className={className}>
        {item.title}
      </a>
    ) : (
      <Link href={item.link} className={className}>
        {item.title}
      </Link>
    );

  return (
    <div className="w-full bg-[#012A3D] text-white">
      <div className="mx-auto max-w-[1300px] px-4">
        <div className="flex items-center justify-between gap-4 py-8 lg:py-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img src={logo || "/logos/sandhillspost.svg"} alt="Site Logo" className="h-8 w-auto md:h-9" />
          </Link>

          {/* Desktop nav with dropdowns */}
          <nav className="relative hidden items-center gap-2 lg:flex">
            {links.map((item) => {
              const hasSub = Array.isArray(item.sublinks) && item.sublinks.length > 0;
              return (
                <div key={item.title} className="relative group">
                  <Anchor
                    item={item}
                    className="px-3 py-2 text-sm uppercase font-semibold hover:underline whitespace-nowrap inline-flex items-center gap-1"
                  />
                  {hasSub && (
                    <div className="invisible absolute left-0 top-full z-40 min-w-[220px] translate-y-2 rounded-md border border-white/10 bg-white/95 p-1 text-[#012A3D] opacity-0 shadow-xl backdrop-blur-sm transition-all duration-150 group-hover:visible group-hover:translate-y-1 group-hover:opacity-100">
                      {item.sublinks.map((sub) => (
                        <div key={sub.title}>
                          {sub.external ? (
                            <a
                              href={sub.link}
                              target={sub.target || "_self"}
                              rel="noreferrer"
                              className="block rounded px-3 py-2 text-sm font-semibold hover:bg-black/5"
                            >
                              {sub.title}
                            </a>
                          ) : (
                            <Link
                              href={sub.link}
                              className="block rounded px-3 py-2 text-sm font-semibold hover:bg-black/5"
                            >
                              {sub.title}
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10 lg:hidden"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                 fill="currentColor" className="h-6 w-6">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
          </button>
        </div>

        {/* Mobile panel (nested) */}
        {open && (
          <div className="pb-4 lg:hidden">
            <nav className="grid gap-1">
              {links.map((item) => {
                const hasSub = Array.isArray(item.sublinks) && item.sublinks.length > 0;
                return (
                  <div key={item.title} className="rounded-md">
                    {item.external ? (
                      <a
                        href={item.link}
                        target={item.target || "_self"}
                        rel="noreferrer"
                        className="block px-3 py-2 text-sm font-semibold hover:bg-white/10"
                      >
                        {item.title}
                      </a>
                    ) : (
                      <Link
                        href={item.link}
                        className="block px-3 py-2 text-sm font-semibold hover:bg-white/10"
                        onClick={() => setOpen(false)}
                      >
                        {item.title}
                      </Link>
                    )}

                    {hasSub && (
                      <div className="ml-3 border-l border-white/10 pl-3">
                        {item.sublinks.map((sub) =>
                          sub.external ? (
                            <a
                              key={sub.title}
                              href={sub.link}
                              target={sub.target || "_self"}
                              rel="noreferrer"
                              className="block px-3 py-2 text-sm hover:bg-white/10"
                            >
                              {sub.title}
                            </a>
                          ) : (
                            <Link
                              key={sub.title}
                              href={sub.link}
                              className="block px-3 py-2 text-sm hover:bg-white/10"
                              onClick={() => setOpen(false)}
                            >
                              {sub.title}
                            </Link>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
