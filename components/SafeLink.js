// components/SafeLink.js
"use client";

import NextLink from "next/link"; // IMPORTANT: don't auto-replace this import
import { normalizeInternalHref, isExternalForSite } from "@/lib/link-helpers";

/**
 * Robustly convert any href prop to a comparable string (when possible).
 * Handles: string, URL, Next.js href object ({ pathname, query, hash }).
 */
function hrefToString(href) {
  if (!href) return "";
  if (typeof href === "string") return href;
  // Next.js object: { pathname, query, hash }
  if (typeof href === "object") {
    // If someone put a full absolute URL in pathname, use it as-is
    if (typeof href.pathname === "string" && /^https?:\/\//i.test(href.pathname)) {
      try {
        const u = new URL(href.pathname);
        if (href.query) Object.entries(href.query).forEach(([k, v]) => u.searchParams.set(k, String(v)));
        if (href.hash) u.hash = href.hash.startsWith("#") ? href.hash : `#${href.hash}`;
        return u.toString();
      } catch {
        return href.pathname; // fallback
      }
    }
    // Build a relative path string
    const path = typeof href.pathname === "string" ? href.pathname : "/";
    const qs =
      href.query && typeof href.query === "object"
        ? "?" +
          Object.entries(href.query)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join("&")
        : "";
    const hash =
      typeof href.hash === "string" && href.hash
        ? href.hash.startsWith("#")
          ? href.hash
          : `#${href.hash}`
        : "";
    return `${path}${qs}${hash}`;
  }
  return String(href);
}

/**
 * SafeLink:
 *  - Internal (relative or known market domains) → Next <Link>
 *  - External domains → <a target="_blank" rel="noopener noreferrer">
 *  - mailto:/tel: are treated as non-external (no forced new tab)
 */
export default function SafeLink(props) {
  const {
    href: rawHref,
    children,
    className,
    style,
    title,
    onClick,
    prefetch,
    replace,
    scroll,
    shallow,
    passHref,
    locale,
    target,  // user-provided wins
    rel,     // user-provided wins
    ...rest
  } = props;

  // Normalize potential internal market URLs to relative if rawHref is a string.
  // (If href is an object, leave it; we’ll still detect externals reliably below.)
  const normalizedHref =
    typeof rawHref === "string" ? normalizeInternalHref(rawHref) : rawHref;

  // Compute best-effort string form of href to test external-ness.
  const hrefStr = hrefToString(normalizedHref) || hrefToString(rawHref);

  // Decide if it's external (mailto/tel are handled inside isExternalForSite)
  const external = isExternalForSite(hrefStr);

  // If caller explicitly set target/rel, respect those.
  // Otherwise, enforce new tab for externals.
  if (external) {
    return (
      <a
        href={hrefStr}
        target={target ?? "_blank"}
        rel={rel ?? "noopener noreferrer"}
        className={className}
        style={style}
        title={title}
        onClick={onClick}
        {...rest}
      >
        {children}
      </a>
    );
  }

  // Internal → use Next Link (preserves SPA nav)
  return (
    <NextLink
      href={normalizedHref ?? rawHref ?? "/"}
      className={className}
      style={style}
      title={title}
      onClick={onClick}
      prefetch={prefetch}
      replace={replace}
      scroll={scroll}
      shallow={shallow}
      passHref={passHref}
      locale={locale}
      target={target} // allow explicit override if you ever need it
      rel={rel}
      {...rest}
    >
      {children}
    </NextLink>
  );
}
