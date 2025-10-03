const BASE = process.env.EAGLE_API_BASE || "https://api.eaglewebservices.com/v3";
const NO_STORE = { cache: "no-store" };
import { getCurrentSiteKey } from "./site-detection.js";

async function getSiteLower(site) {
  // prefer explicit, else detect, then lowercase
  const detected = site ?? (await getCurrentSiteKey()) ?? "";
  return String(detected).toLowerCase();
}


/**
 * Fetch home feed for a site + categories (e.g., sports)
 * Returns { hero, sportsItems }
 */

export async function fetchHomeLocal({ site, limit = 12 } = {}) {
  const siteKey = await getSiteLower(site);
  const url = `${BASE}/home?site=${encodeURIComponent(siteKey)}&categories=local`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`fetchHomeLocal HTTP ${res.status}`);
    const json = await res.json();

    // Prefer categories array named "local"
    const categories = json?.data?.categories || [];
    const localArr =
      categories.find(
        (c) => (c?.title || "").toLowerCase() === "local"
      )?.data || [];

    const items = localArr
      .filter(Boolean)
      .sort(
        (a, b) => new Date(b?.published || 0) - new Date(a?.published || 0)
      )
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        title: p.title,
        image: p.featured_image_thumbnail || p.featured_image,
        updated: p.published,
        href: `/posts/${p.id}`,
      }));

    return items;
  } catch (err) {
    console.error("[fetchHomeLocal]", err);
    return [];
  }
}

export async function fetchHomePodcasts({ site, limit = 12, debug = false } = {}) {
  const siteKey = await getSiteLower(site);

  // Try singular first (common), then plural as a fallback
  const tries = [
    `${BASE}/home?site=${encodeURIComponent(siteKey)}&categories=podcast`,
    `${BASE}/home?site=${encodeURIComponent(siteKey)}&categories=podcasts`,
  ];

  let items = [];

  for (const url of tries) {
    try {
      debug && console.log("[fetchHomePodcasts] URL:", url);
      const res = await fetch(url, NO_STORE);
      if (!res.ok) {
        debug && console.warn("[fetchHomePodcasts] non-OK:", res.status);
        continue;
      }
      const json = await res.json();

      const categories = json?.data?.categories || [];
      // accept either "podcast" or "podcasts" in the returned title
      const podArr =
        categories.find((c) => {
          const t = (c?.title || "").toLowerCase();
          return t === "podcast" || t === "podcasts";
        })?.data || [];

      items = podArr
        .filter(Boolean)
        .sort((a, b) => new Date(b?.published || 0) - new Date(a?.published || 0))
        .slice(0, limit)
        .map((p) => ({
          id: p.id,
          title: p.title,
          image: p.featured_image_thumbnail || p.featured_image,
          updated: p.published,
          href: `/posts/${p.id}`,
        }));

      if (items.length) break; // we got what we needed
    } catch (err) {
      console.error("[fetchHomePodcasts]", err);
    }
  }

  debug && console.log("[fetchHomePodcasts] items:", items.length);
  return items;
}


export async function fetchHomeRegional({ site, limit = 12 } = {}) {
  const siteKey = await getSiteLower(site);
  const url = `${BASE}/home?site=${encodeURIComponent(siteKey)}&categories=state`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`fetchHomeRegional HTTP ${res.status}`);
    const json = await res.json();

    // Prefer categories array named "regional"
    const categories = json?.data?.categories || [];
    const regionalArr =
      categories.find(
        (c) => (c?.title || "").toLowerCase() === "state"
      )?.data || [];

    const items = regionalArr
      .filter(Boolean)
      .sort(
        (a, b) => new Date(b?.published || 0) - new Date(a?.published || 0)
      )
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        title: p.title,
        image: p.featured_image_thumbnail || p.featured_image,
        updated: p.published,
        href: `/posts/${p.id}`,
      }));

    return items;
  } catch (err) {
    console.error("[fetchHomeRegional]", err);
    return [];
  }
}



export async function fetchHomeSports({ site, limit = 12 } = {}) {
 const siteKey = await getSiteLower(site);
  const url = `${BASE}/home?site=${encodeURIComponent(siteKey)}&categories=sports`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`fetchHomeSports HTTP ${res.status}`);
    const json = await res.json();

    // Prefer categories array named "sports"
    const categories = json?.data?.categories || [];
    const sportsArr =
      categories.find(
        (c) => (c?.title || "").toLowerCase() === "sports"
      )?.data || [];

    const items = sportsArr
      .filter(Boolean)
      .sort(
        (a, b) => new Date(b?.published || 0) - new Date(a?.published || 0)
      )
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        title: p.title,
        image: p.featured_image_thumbnail || p.featured_image,
        updated: p.published,
        href: `/posts/${p.id}`,
      }));

    return items;
  } catch (err) {
    console.error("[fetchHomeSports]", err);
    return [];
  }
}

function mapPostToHero(post) {
  if (!post) return null;
  return {
    id: post.id ?? null,
    slug: post.slug || post.id || null,
    title: post.title || "",
    image: post.featured_image || post.featured_image_thumbnail || null,
    updated: post.published
      ? new Date(post.published).toLocaleString(undefined, {
          year: "numeric", month: "short", day: "numeric",
        })
      : null,
  };
}

export async function fetchHomeFeatured({ site } = {}) {
  // auto-detect site if not provided, and lowercase for API
  const siteKey = await getSiteLower(site);
  const url = `${BASE}/home?site=${encodeURIComponent(siteKey)}&categories=featured`;

  try {
    const res = await fetch(url, NO_STORE);
    if (!res.ok) throw new Error(`fetchHomeFeatured HTTP ${res.status}`);
    const json = await res.json();

    // Preferred shape: data.featured_post
    const hero = json?.data?.featured_post;
    if (hero) {
      return {
        id: hero.id,
        title: hero.title,
        featured_image: hero.featured_image,
        featured_image_thumbnail: hero.featured_image_thumbnail,
        published: hero.published,
        categories: hero.categories,
        href: `/posts/${hero.id}`, // your internal article route
      };
    }

    // Fallback: categories array named "featured"
    const cats = json?.data?.categories || [];
    const featuredArr =
      cats.find(c => (c?.title || "").toLowerCase() === "featured")?.data || [];
    const first = featuredArr[0];
    return first
      ? {
          id: first.id,
          title: first.title,
          featured_image: first.featured_image,
          featured_image_thumbnail: first.featured_image_thumbnail,
          published: first.published,
          categories: first.categories,
          href: `/posts/${first.id}`,
        }
      : null;
  } catch (err) {
    console.error("[fetchHomeFeatured]", err);
    return null;
  }
}

// Normalize one post into our app shape
function mapApiPostToArticle(post) {
  if (!post) return null;
  return {
    id: post.id ?? null,
    slug: post.slug || null,
    title: post.title || "",
    body: post.body || "", // HTML
    image: post.featured_image || post.featured_image_thumbnail || null,
    updated: post.published
      ? new Date(post.published).toLocaleString(undefined, {
          year: "numeric", month: "short", day: "numeric",
        })
      : null,
  };
}

// lib/eagleApi.js

// Small helper to format “x hours ago”
function timeAgo(iso) {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - then);
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } catch {
    return "";
  }
}

/**
 * Fetch recent items for "More Stories this week".
 * - Tries multi-category first (e.g., ?categories=local,regional,state)
 * - Falls back to per-category requests and merges
 * - Optionally excludes a heroId
 */

// lib/eagleApi.js (or wherever it lives)
function mapHomeCategoriesJson(json) {
  const cats = json?.data?.categories ?? [];   // 👈 NOTE the .data here
  return cats.flatMap((cat) =>
    (cat?.data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      href: `/posts/${item.id}`, // adjust to your real route
      category: (item.categories && item.categories[0]) || cat.title || "News",
      published: item.published,
    }))
  );
}



/**
 * Fetch recent items for "More Stories this week".
 * - Tries multi-category first (?categories=local,regional,state)
 * - Falls back to per-category requests
 * - Disables Next data cache to avoid 2MB limit errors
 */
// At the top of lib/eagleApi.js (if not already there):


export async function fetchHomeMore({
  site,
  categories = ["local", "regional", "state"],
  limit = 8,
  excludeId,
  debug = false,
} = {}) {
  const siteLower = await getSiteLower(site);
  const cats = categories.map((c) => `${c}`.toLowerCase());

  if (debug) {
    console.log(`[fetchHomeMore] site="${siteLower}", cats=[${cats.join(", ")}]`);
  }

  let all = [];

  // 1) Multi-category attempt (reduces calls)
  try {
    const multiUrl = new URL("https://api.eaglewebservices.com/v3/home");
    multiUrl.searchParams.set("site", siteLower);
    multiUrl.searchParams.set("categories", cats.join(","));
    if (debug) console.log("[fetchHomeMore] multi URL:", multiUrl.toString());

    const res = await fetch(multiUrl.toString(), { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      all = mapHomeCategoriesJson(json);
      if (debug) console.log("[fetchHomeMore] multi got", all.length, "items");
    } else if (debug) {
      console.warn("[fetchHomeMore] multi non-OK:", res.status);
    }
  } catch (e) {
    if (debug) console.warn("[fetchHomeMore] multi error:", e);
  }

  // 2) Fallback per category if empty
  if (!all || all.length === 0) {
    const perCat = await Promise.allSettled(
      cats.map(async (cat) => {
        const url = new URL("https://api.eaglewebservices.com/v3/home");
        url.searchParams.set("site", siteLower);
        url.searchParams.set("categories", cat);
        if (debug) console.log("[fetchHomeMore] per-cat URL:", url.toString());

        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error(`${cat} ${res.status}`);
        const json = await res.json();
        return mapHomeCategoriesJson(json);
      })
    );
    all = perCat
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value);
  }

  // Exclude current hero
  if (excludeId) {
    all = all.filter((i) => i.id !== excludeId);
  }

  // Sort newest and dedupe
  const seen = new Set();
  all.sort((a, b) => new Date(b.published) - new Date(a.published));
  const unique = [];
  for (const item of all) {
    const key = item.id || item.href || `${item.title}-${item.published}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  const sliced = unique.slice(0, limit);

  // Shape for <MoreStories />
  return sliced.map((i) => ({
    slug: i.id,
    title: i.title,
    meta: `${i.category} • ${timeAgo(i.published)}`,
    href: i.href,
  }));
}


/**
 * Fetch a single article by id.
 *
 * ⚠️ Endpoints vary by API. Pick the one that matches your backend.
 * Below are two common patterns—uncomment the one that works:
 */
export async function fetchArticleById({ id, site = "sandhills" }) {
  // Option A: search the home lane(s) and pick by id (works if body is present there)
  // Note: This hits featured + sports. Add more categories if you want broader coverage.
  const urls = [
    `${BASE}/home?site=${encodeURIComponent(site)}&categories=featured`,
    `${BASE}/home?site=${encodeURIComponent(site)}&categories=sports`,
  ];

  for (const url of urls) {
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) continue;
    const json = await res.json();

    // featured_post
    const fp = json?.data?.featured_post;
    if (fp?.id === id) return mapApiPostToArticle(fp);

    // categories lists
    const cats = Array.isArray(json?.data?.categories) ? json.data.categories : [];
    for (const c of cats) {
      const found = (c?.data || []).find((p) => p.id === id);
      if (found) return mapApiPostToArticle(found);
    }
  }

  // Option B (preferred if your API exposes a direct endpoint):
  // const res = await fetch(`${BASE}/post?id=${encodeURIComponent(id)}`, { next: { revalidate: 30 } });
  // if (res.ok) {
  //   const json = await res.json();
  //   return mapApiPostToArticle(json?.data || json?.post);
  // }

  return null;
}
