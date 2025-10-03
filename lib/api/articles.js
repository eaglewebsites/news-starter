// lib/api/articles.js
import 'server-only'
import { getCurrentSiteKey } from '../site-detection'

const BASE = process.env.EAGLE_API_BASE || 'https://api.eaglewebservices.com/v3'

/**
 * Map raw API article to UI-friendly shape
 */
function mapArticle(raw = {}) {
  const id = raw?.id ?? raw?._id ?? raw?.slug ?? ''
  return {
    id,
    slug: raw?.slug || String(id),
    title: raw?.title || 'Untitled',
    dek: raw?.dek || raw?.excerpt || '',
    body: raw?.body || raw?.html || '', // supports HTML body for now
    author: raw?.author || raw?.byline || '',
    updated: raw?.updated || raw?.updated_at || raw?.published_at || null,
    published: raw?.published_at || raw?.created_at || null,
    image: raw?.image || raw?.featured_image || null,
    imageAlt: raw?.image_alt || raw?.featured_image_alt || raw?.title || '',
    imageCaption: raw?.image_caption || raw?.caption || '',
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    category: raw?.category || raw?.primary_category || '',
    site: raw?.site || '',
    canonical: raw?.canonical || raw?.url || '',
    related: Array.isArray(raw?.related)
      ? raw.related.map(r => ({
          id: r?.id ?? r?._id ?? r?.slug,
          title: r?.title,
          href: r?.href || `/posts/${r?.id ?? r?.slug}`,
          image: r?.image || null,
          updated: r?.updated || r?.published_at || null,
        }))
      : [],
  }
}

/**
 * Fetch a single article by ID (or slug).
 * Note: Pending the final `/post` endpoint shape, this tries both common patterns.
 */
export async function fetchArticleById(id, { debug = false } = {}) {
  const site = (await getCurrentSiteKey()) || ''

  const candidates = [
    `${BASE}/post?id=${encodeURIComponent(id)}&site=${encodeURIComponent(site)}`,
    `${BASE}/posts/${encodeURIComponent(id)}?site=${encodeURIComponent(site)}`,
  ]

  let lastErr
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const data = json?.data || json?.post || json
      if (!data) throw new Error('Empty article payload')
      const article = mapArticle(data)
      if (debug) console.log('[fetchArticleById]', { url, site, id, have: !!article?.id })
      return article
    } catch (e) {
      lastErr = e
      if (debug) console.warn('[fetchArticleById] failed', url, e)
    }
  }
  throw new Error(lastErr?.message || 'Article fetch failed')
}
