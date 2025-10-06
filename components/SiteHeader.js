"use client";

import Link from "next/link";
import { useState, useRef, useCallback } from "react";
import { safeHref, keyOf } from "@/lib/link-helpers";

export default function SiteHeader({ logo, stations = [], menu }) {
  const [open, setOpen] = useState(false);              // mobile panel
  const [openIdx, setOpenIdx] = useState(null);         // desktop which dropdown is open
  const closeTimer = useRef(null);

  const links = Array.isArray(menu?.links) ? menu.links : [];

  // ----- flexible accessors (support many data shapes) -----
  const getText = (item) =>
    item?.title || item?.label || item?.name || item?.text || "";

  const getHref = (item) =>
    item?.link ?? item?.href ?? item?.url ?? item?.path ?? "/";

  const getSubs = (item) => {
    // direct arrays
    const direct =
      item?.sublinks ||
      item?.subLinks ||
      item?.children ||
      item?.links ||
      item?.items ||
      item?.submenu ||
      item?.subMenu;
    if (Array.isArray(direct)) return direct;

    // nested one level
    const nested =
      item?.submenu?.links ||
      item?.submenu?.items ||
      item?.subMenu?.links ||
      item?.subMenu?.items ||
      item?.children?.links ||
      item?.children?.items;
    if (Array.isArray(nested)) return nested;

    return [];
  };

  // ----- desktop hover controller (prevents flicker) -----
  const scheduleClose = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenIdx(null), 120);
  }, []);

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  // ----- link component (handles external vs internal) -----
  const Anchor = ({ item, className = "", onClick }) =>
    item?.external ? (
      <a
        href={getHref(item)}
        target={item.target || "_self"}
        rel="noreferrer"
        className={className}
        onClick={onClick}
      >
        {getText(item)}
      </a>
    ) : (
      <Link href={safeHref(getHref(item))} className={className} onClick={onClick}>
        {getText(item)}
      </Link>
    );

  return (
    <div className="relative z-50 w-full overflow-visible bg-[#012A3D] text-white">
      <div className="mx-auto max-w-[1300px] px-4 overflow-visible">
        <div className="flex items-center justify-between gap-4 py-8 lg:py-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo || "/logos/sandhillspost.svg"}
              alt="Site Logo"
              className="h-8 w-auto md:h-9"
            />
          </Link>

          {/* Desktop nav with dropdowns */}
          <nav className="relative z-50 hidden items-center gap-2 overflow-visible lg:flex">
            {links.map((item, idx) => {
              const subs = getSubs(item);
              const hasSub = subs.length > 0;
              const isOpen = openIdx === idx;

              return (
                <div
                  key={keyOf(item, idx)}
                  className="relative"
                  onMouseEnter={() => {
                    cancelClose();
                    if (hasSub) setOpenIdx(idx);
                    else setOpenIdx(null);
                  }}
                  onMouseLeave={scheduleClose}
                >
                  <Anchor
                    item={item}
                    className="px-3 py-2 text-sm uppercase font-semibold hover:underline whitespace-nowrap inline-flex items-center gap-1"
                  />

                  {hasSub && (
                    <div
                      // Keep dropdown open while cursor is inside (no gaps)
                      onMouseEnter={cancelClose}
                      onMouseLeave={scheduleClose}
                      className={[
                        "absolute left-0 top-full z-[60] mt-1 min-w-[220px] rounded-md",
                        "border border-white/10 bg-white/95 p-1 text-[#012A3D] shadow-xl backdrop-blur-sm",
                        // visibility via opacity + pointer-events (no layout jump)
                        "transition-opacity duration-150",
                        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
                      ].join(" ")}
                    >
                      {/* Hover bridge: expands hit area to avoid tiny gaps */}
                      <div className="absolute -top-2 left-0 right-0 h-2" aria-hidden="true" />
                      {subs.map((sub, sidx) => (
                        <div key={keyOf(sub, sidx)}>
                          {sub?.external ? (
                            <a
                              href={getHref(sub)}
                              target={sub.target || "_self"}
                              rel="noreferrer"
                              className="block rounded px-3 py-2 text-sm font-semibold hover:bg-black/5"
                            >
                              {getText(sub)}
                            </a>
                          ) : (
                            <Link
                              href={safeHref(getHref(sub))}
                              className="block rounded px-3 py-2 text-sm font-semibold hover:bg-black/5"
                            >
                              {getText(sub)}
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>

        {/* Mobile panel */}
        {open && (
          <div className="pb-4 lg:hidden">
            <nav className="grid gap-1">
              {links.map((item, idx) => {
                const subs = getSubs(item);
                const hasSub = subs.length > 0;

                return (
                  <div key={keyOf(item, idx)} className="rounded-md">
                    <Anchor
                      item={item}
                      className="block px-3 py-2 text-sm font-semibold hover:bg-white/10"
                      onClick={() => setOpen(false)}
                    />

                    {hasSub && (
                      <div className="ml-3 border-l border-white/10 pl-3">
                        {subs.map((sub, sidx) =>
                          sub?.external ? (
                            <a
                              key={keyOf(sub, sidx)}
                              href={getHref(sub)}
                              target={sub.target || "_self"}
                              rel="noreferrer"
                              className="block px-3 py-2 text-sm hover:bg-white/10"
                              onClick={() => setOpen(false)}
                            >
                              {getText(sub)}
                            </a>
                          ) : (
                            <Link
                              key={keyOf(sub, sidx)}
                              href={safeHref(getHref(sub))}
                              className="block px-3 py-2 text-sm hover:bg-white/10"
                              onClick={() => setOpen(false)}
                            >
                              {getText(sub)}
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
