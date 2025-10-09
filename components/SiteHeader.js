"use client";

import Link from "next/link";
import { useState } from "react";
import { safeHref, keyOf } from "@/lib/link-helpers";
import WeatherBlip from "@/components/WeatherBlip";

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
      {/* Weather strip on its own line */}
      <div className="border-b border-white/10 bg-[#012A3D]/90 py-2 text-center">
        <WeatherBlip className="mx-auto" />
      </div>

      <div className="mx-auto max-w-[1300px] px-4 overflow-visible">
        <div className="flex flex-wrap items-center justify-between gap-3 py-8 lg:py-10">
          {/* Left: Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <img
              src={logo || "/logos/sandhillspost.svg"}
              alt="Site Logo"
              className="h-8 w-auto md:h-9"
            />
          </Link>

          {/* Center: Desktop nav */}
          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <nav className="relative z-[60] flex items-center gap-2 overflow-visible">
              {links.map((item, idx) => {
                const hasSub =
                  Array.isArray(item.sublinks) && item.sublinks.length > 0;
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
                          bg-[#012A3D] text-white shadow-xl
                          opacity-0 pointer-events-none
                          transition-opacity duration-200 ease-in-out
                          group-hover:opacity-100 group-hover:pointer-events-auto
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
                          return (
                            <div key={`${item.title}-${sub.title}-${si}`}>
                              {content}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Right: Desktop Search icon */}
          <div className="hidden shrink-0 items-center gap-3 lg:flex">
            <Link
              href="/search"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10"
              aria-label="Search"
              title="Search"
            >
              {/* Magnifying glass, white stroke */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
            </Link>
          </div>

          {/* Mobile: Hamburger menu */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open ? "true" : "false"}
              aria-controls="mobile-menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg白/10"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? (
                // X icon
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                  className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6l-12 12" />
                </svg>
              ) : (
                // Hamburger
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                  className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      <div
        className={[
          "fixed inset-0 z-[70] bg-black/40 transition-opacity duration-300 lg:hidden",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile panel */}
      <div
        id="mobile-menu"
        className={[
          "fixed left-0 right-0 top-0 z-[75] mx-auto w-full max-w-[1300px] px-4",
          "transition-all duration-300 ease-in-out lg:hidden",
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-3 pointer-events-none",
        ].join(" ")}
      >
        <div className="mt-20 rounded-md bg-[#012A3D] p-3 shadow-xl ring-1 ring-white/10">
          {/* Header row inside panel with close button */}
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-sm font-semibold uppercase tracking-wide">
              Menu
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10"
              aria-label="Close menu"
            >
              {/* X icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile quick actions row */}
          <div className="mb-2 flex items-center gap-2 px-1">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/15"
              onClick={() => setOpen(false)}
              aria-label="Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
              <span>Search</span>
            </Link>
          </div>

          <nav className="grid gap-1">
            {links.map((item) => {
              const hasSub =
                Array.isArray(item.sublinks) && item.sublinks.length > 0;
              return (
                <div key={item.title}>
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
      </div>
    </div>
  );
}
