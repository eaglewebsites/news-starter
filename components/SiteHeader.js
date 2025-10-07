"use client";

import Link from "next/link";
import { useState } from "react";
import { safeHref, keyOf } from "@/lib/link-helpers";

export default function SiteHeader({ logo, stations = [], menu }) {
  const [open, setOpen] = useState(false);
  const links = menu?.links ?? [];

  const Anchor = ({ item, className = "" }) =>
    item.external ? (
      <a
        href={item.link}
        target={item.target || "_self"}
        rel="noreferrer"
        className={className}
      >
        {item.title}
      </a>
    ) : (
      <Link href={safeHref(item.link)} className={className}>
        {item.title}
      </Link>
    );

  return (
    <div className="w-full bg-[#012A3D] text-white overflow-visible">
      <div className="mx-auto max-w-[1300px] px-4 overflow-visible">
        <div className="flex items-center justify-between gap-4 py-8 lg:py-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img
              src={logo || "/logos/sandhillspost.svg"}
              alt="Site Logo"
              className="h-8 w-auto md:h-9"
            />
          </Link>

          {/* Desktop nav with dropdowns */}
          <nav className="relative z-[60] hidden items-center gap-2 overflow-visible lg:flex">
            {links.map((item, idx) => {
              const hasSub = Array.isArray(item.sublinks) && item.sublinks.length > 0;
              return (
                <div key={keyOf(item, idx)} className="relative group">
                  <Anchor
                    item={item}
                    className="px-3 py-2 text-sm uppercase font-semibold hover:underline whitespace-nowrap inline-flex items-center gap-1"
                  />

                  {hasSub && (
                    <div
                      className="
                        absolute left-0 top-full z-[100] min-w-[240px]
                        translate-y-2 bg-[#012A3D] text-white shadow-xl
                        opacity-0 pointer-events-none transition-all duration-150
                        group-hover:opacity-100 group-hover:translate-y-1 group-hover:pointer-events-auto
                      "
                    >
                      {item.sublinks.map((sub, si) => {
                        const content = sub.external ? (
                          <a
                            href={sub.link}
                            target={sub.target || "_self"}
                            rel="noreferrer"
                            className="block px-3 py-2 text-sm font-semibold hover:bg-white/20 transition-colors"
                          >
                            {sub.title}
                          </a>
                        ) : (
                          <Link
                            href={safeHref(sub.link)}
                            className="block px-3 py-2 text-sm font-semibold hover:bg-white/20 transition-colors"
                          >
                            {sub.title}
                          </Link>
                        );
                        return <div key={`${item.title}-${sub.title}-${si}`}>{content}</div>;
                      })}
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
                        href={safeHref(item.link)}
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
                              href={safeHref(sub.link)}
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
