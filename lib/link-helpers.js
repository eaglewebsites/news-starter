// lib/link-helpers.js

/**
 * Removes only "sandhillspost.dev" from a string, leaving other domains untouched.
 */
export function stripDevDomain(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/https?:\/\/sandhillspost\.dev/gi, "")
    .replace(/sandhillspost\.dev/gi, "");
}

/**
 * Treat these domains as "internal markets" and render them as relative links.
 * Add/remove hosts here as needed. (Normalized without "www.")
 */
const INTERNAL_HOSTS = new Set([
  "sandhillspost.com",
  "salinapost.com",
  "greatbendpost.com",
  "hutchpost.com",
  "hayspost.com",
  "jcpost.com",
  "stjosephpost.com",
  "littleapplepost.com",
]);

const SPECIAL_SCHEMES = /^(mailto:|tel:|sms:|geo:)/i;

function isRelativeLike(href) {
  return /^(\/|\.|#|\?)/.test(href);
}
function hostOf(urlStr) {
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

/**
 * Normalizes hrefs:
 *  - Leaves relative, hash-only, query-only, and special schemes (mailto/tel) as-is.
 *  - Converts absolute URLs pointing at INTERNAL_HOSTS (or localhost) into a relative path.
 *  - Keeps true externals absolute.
 */
export function normalizeInternalHref(href) {
  if (!href || typeof href !== "string") return href;

  const trimmed = href.trim();

  // Already relative or special schemes → leave as-is
  if (isRelativeLike(trimmed) || SPECIAL_SCHEMES.test(trimmed)) return trimmed;

  // Try absolute URL
  const host = hostOf(trimmed);
  if (!host) return trimmed;

  const isLocalhost =
    /^localhost(:\d+)?$/i.test(host) || /^127\.0\.0\.1$/i.test(host);

  if (INTERNAL_HOSTS.has(host) || isLocalhost) {
    try {
      const u = new URL(trimmed);
      return (u.pathname || "/") + u.search + u.hash;
    } catch {
      return trimmed;
    }
  }
  // external domain
  return trimmed;
}

/**
 * Should this href open in a new tab for the current site?
 * - Relative links and internal market domains → false
 * - mailto/tel → false (let browser/mail app handle it)
 * - Any other absolute http(s) domain → true
 */
export function isExternalForSite(href) {
  if (!href || typeof href !== "string") return false;
  const trimmed = href.trim();

  if (SPECIAL_SCHEMES.test(trimmed)) return false; // don't force new tab for mailto/tel
  if (isRelativeLike(trimmed)) return false;

  const host = hostOf(trimmed);
  if (!host) return false;

  const normalized = host.replace(/^www\./i, "");
  const isLocalhost =
    /^localhost(:\d+)?$/i.test(normalized) || /^127\.0\.0\.1$/i.test(normalized);

  if (isLocalhost) return false;
  return !INTERNAL_HOSTS.has(normalized);
}

/**
 * Accepts either a string/object (href) or a menu item object.
 * Always returns something valid for <Link href={...}> (string or object).
 * Falls back to "/" if nothing usable exists.
 *
 * Also normalizes absolute URLs from internal market domains to relative paths.
 */
export function safeHref(valOrItem) {
  // Menu item objects
  if (valOrItem && typeof valOrItem === "object" && !("pathname" in valOrItem)) {
    const candidates = [
      valOrItem.href,
      valOrItem.url,
      valOrItem.path,
      valOrItem.link,
      valOrItem.permalink,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) {
        const stripped = stripDevDomain(c.trim());
        return normalizeInternalHref(stripped);
      }
      if (c && typeof c === "object") return c; // Next.js href object
    }
    return "/";
  }

  // Direct href strings
  if (typeof valOrItem === "string" && valOrItem.trim()) {
    const stripped = stripDevDomain(valOrItem.trim());
    return normalizeInternalHref(stripped);
  }

  // Already-valid href objects (Next.js style)
  if (valOrItem && typeof valOrItem === "object") return valOrItem;

  return "/";
}

/**
 * Builds a stable, unique key for React list items.
 */
export function keyOf(item, idx) {
  const explicit =
    item?.id ??
    item?.slug ??
    item?.uid ??
    item?.key ??
    null;
  if (explicit != null && String(explicit).trim() !== "") {
    return String(explicit);
  }

  const title =
    item?.title ||
    item?.label ||
    item?.name ||
    item?.text ||
    "item";

  const linkish =
    item?.href ||
    item?.url ||
    item?.path ||
    item?.link ||
    "nohref";

  return `${title}::${linkish}::${idx}`;
}
