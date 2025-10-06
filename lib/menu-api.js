// lib/menu-api.js
import 'server-only'

/** Base API (override via EAGLE_API_BASE in Render/ENV) */
const API_BASE =
  process.env.EAGLE_API_BASE || 'https://api.eaglewebservices.com/v3'

/** Alternate site params the API accepts (keep/tweak as needed) */
const SITE_PARAM = {
  sandhills: ['sandhills', 'sandhillspost'],
  // hays: ['hays', 'hayspost'],
  // salina: ['salina', 'salinapost'],
}

/** Safe fallback so the UI never renders an empty menu */
const FALLBACK_MENU = {
  links: [
    { title: 'Local', link: '/section/local' },
    { title: 'Sports', link: '/section/sports' },
    { title: 'Obituaries', link: '/section/obituaries' },
    { title: 'Opinion', link: '/section/opinion' },
    { title: 'Weather', link: '/section/weather' },
  ],
}

/**
 * Remove only the contaminant domain "sandhillspost.dev".
 * Leaves ALL other external domains intact (e.g., weather.com).
 */
function stripDevDomain(str) {
  if (typeof str !== 'string') return str
  return str
    // remove when protocol is present
    .replace(/https?:\/\/sandhillspost\.dev/gi, '')
    // remove bare domain (no protocol)
    .replace(/sandhillspost\.dev/gi, '')
}

/** Pick a usable link field and clean the contaminant domain */
function pickLink(hrefish) {
  if (typeof hrefish === 'string' && hrefish.trim()) return stripDevDomain(hrefish.trim())
  return '/'
}

/** Collect sublinks from many possible shapes and normalize them recursively */
function collectSublinks(raw = {}) {
  // candidate arrays directly on the item
  const directArrays = [
    raw.sublinks,
    raw.subLinks,
    raw.children,
    raw.links,
    raw.items,
    raw.submenu,
    raw.subMenu,
    raw.menuItems,
    raw.subnav,
    raw.subNav,
  ].filter(Array.isArray)

  // candidate arrays nested under one level of object
  const nestedArrays = [
    raw?.submenu?.links,
    raw?.submenu?.items,
    raw?.subMenu?.links,
    raw?.subMenu?.items,
    raw?.children?.links,
    raw?.children?.items,
    raw?.subnav?.links,
    raw?.subnav?.items,
    raw?.subNav?.links,
    raw?.subNav?.items,
  ].filter(Array.isArray)

  // first non-empty array wins; if multiple, concat them
  const merged = []
  for (const arr of [...directArrays, ...nestedArrays]) {
    if (Array.isArray(arr) && arr.length) merged.push(...arr)
  }

  // Normalize each sublink
  return merged.map(normalizeItem)
}

/** Normalize a single menu item into a stable { title, link, external?, target?, sublinks } shape */
function normalizeItem(link = {}) {
  const title =
    link.title ||
    link.label ||
    link.name ||
    link.text ||
    ''

  const linkField =
    link.link ??
    link.href ??
    link.url ??
    link.path ??
    '/'

  const item = {
    // top-level fields we render
    title,
    link: pickLink(linkField),
    external: !!link.external,
    target: link.target || undefined,
  }

  // recursively attach sublinks if present anywhere
  const sublinks = collectSublinks(link)
  if (sublinks.length) {
    item.sublinks = sublinks
  }

  return item
}

/**
 * Fetch the site menu from the Eagle API, normalize items (including sublinks),
 * and return a consistent shape for the header:
 *   { links: [{ title, link, external?, target?, sublinks: [...] }] }
 */
export async function fetchSiteMenu(siteKey = 'sandhills') {
  const candidates = SITE_PARAM[siteKey] || [siteKey]

  for (const siteParam of candidates) {
    const url = `${API_BASE}/menus?site=${encodeURIComponent(siteParam)}`
    try {
      const res = await fetch(url, {
        cache: 'no-store', // SSR: avoid stale menus
        headers: {
          Accept: 'application/json',
          'User-Agent': 'EWS-NextApp/1.0 (+menu-fetch)',
        },
      })

      if (!res.ok) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[menu] non-200:', res.status, await res.text())
        }
        continue // try next candidate
      }

      const json = await res.json()
      const rawLinks = json?.data?.[0]?.links ?? []

      if (Array.isArray(rawLinks) && rawLinks.length > 0) {
        const links = rawLinks.map(normalizeItem)

        // Dev log to verify we actually have sublinks on at least one item
        if (process.env.NODE_ENV !== 'production') {
          //const withSubs = links.find((l) => Array.isArray(l.sublinks) && l.sublinks.length > 0)
          // eslint-disable-next-line no-console
          // console.log('[menu] sample item:', links[0])
          // eslint-disable-next-line no-console
          // console.log('[menu] has sublinks on:', withSubs?.title, withSubs?.sublinks?.length || 0)
        }

        return { links }
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[menu] fetch error for', siteParam, err)
      }
      // try next candidate
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn('[menu] using FALLBACK_MENU')
  }
  return FALLBACK_MENU
}

// Optional helpers export for testing
export const __menuHelpers = {
  stripDevDomain,
  pickLink,
  normalizeItem,
  collectSublinks,
  SITE_PARAM,
  FALLBACK_MENU,
  API_BASE,
}
